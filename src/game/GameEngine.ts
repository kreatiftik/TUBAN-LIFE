import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ActiveDialogue,
  CharacterProfile,
  GameHudState,
  InteractPrompt,
  InventoryItem,
  LanguageMode,
  MinimapEntity,
  MissionDef,
  OnlineChatMessage,
  OnlinePlayerInfo,
  OutfitId,
  SaveData,
  VehicleType,
  WeatherType,
} from './types';
import {
  INITIAL_INVENTORY,
  MISSIONS,
  REGION_NAMES,
  SHOPS,
  VEHICLE_LABELS,
  t,
} from './jawaData';
import {
  BuildingCollider,
  LANDMARKS,
  NPC_SPAWNS,
  NpcSpawn,
  TRAFFIC_LOOP,
  TRAFFIC_LOOP_OUTER,
  VEHICLE_SPAWNS,
  WORLD_PLAY_LIMIT,
  getRegionAt,
  surfaceHeightAt,
} from './worldData';
import { createProceduralTextures, ProceduralTexturePack } from './textures';
import {
  CharacterRig,
  RIG_HIP_Y,
  RIG_SHIN_LEN,
  RIG_SOLE_OFFSET_Y,
  RIG_THIGH_LEN,
  VehicleModelResult,
  characterProfileToBuildOptions,
  createCharacterRig,
  createFloatingLabelSprite,
  createVehicleModel,
} from './models';
import { DEFAULT_CHARACTER_PROFILE, sanitizeCharacterProfile } from './characterPresets';
import { TubanMultiplayerClient } from './multiplayer';
import { buildJawaWorld } from './worldBuilder';
import { JawaAudioEngine } from './audio';

// Pre-allocated math helpers for zero GC in render loop
const _vec3 = new THREE.Vector3();
const _camIdeal = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _skyDay = new THREE.Color(0x7cc4f8);
const _skySunset = new THREE.Color(0xf59e6b);
const _skyNight = new THREE.Color(0x0b1326);
const _skyRain = new THREE.Color(0x4b5c6b);
const _skyCurrent = new THREE.Color();

interface VehicleRuntime {
  id: string;
  type: VehicleType;
  color: number;
  model: VehicleModelResult;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  isTraffic: boolean;
  trafficIndex: number;
  trafficLoop: Array<{ x: number; z: number }>;
  riderRig?: CharacterRig;
}

interface RemotePlayerRuntime {
  info: OnlinePlayerInfo;
  group: THREE.Group;
  rig: CharacterRig;
  anim: CharacterAnimState;
  nameSprite: THREE.Sprite;
  chatSprite: THREE.Sprite | null;
  chatExpiresAt: number;
  vehicleModel: VehicleModelResult | null;
  vehicleTypeLoaded: VehicleType | null;
  vehicleColorLoaded: number;
  curX: number;
  curY: number;
  curZ: number;
  curYaw: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetYaw: number;
  targetSpeed: number;
}

interface CharacterAnimState {
  moveBlend: number;
  sprintBlend: number;
  airBlend: number;
  landSquash: number;
  walkPhase: number;
  idlePhase: number;
  turnLean: number;
  headLookY: number;
  wasGrounded: boolean;
}

function createAnimState(phaseOffset = 0): CharacterAnimState {
  return {
    moveBlend: 0,
    sprintBlend: 0,
    airBlend: 0,
    landSquash: 0,
    walkPhase: phaseOffset,
    idlePhase: phaseOffset * 1.7,
    turnLean: 0,
    headLookY: 0,
    wasGrounded: true,
  };
}

interface NpcRuntime {
  spawn: NpcSpawn;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  patrolAngle: number;
  anim: CharacterAnimState;
}

export class GameEngine {
  private container: HTMLElement;
  private onHudUpdate: (state: GameHudState) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTexturePack;
  private audio = new JawaAudioEngine();

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private externalSuspended = false;
  private lastTime = performance.now();

  // Lighting
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private streetLampBulbs: THREE.MeshStandardMaterial[] = [];

  // World & animated props
  private colliders: BuildingCollider[] = [];
  private waterfallMesh!: THREE.Mesh;
  private oceanMesh!: THREE.Mesh;
  private boats: THREE.Group[] = [];
  private lostGoat!: THREE.Group;
  private lostGoatCollected = false;
  private missionPropFishCrate!: THREE.Group;
  private farmAnimals: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; phase: number }> = [];

  // Rain particles
  private rainPoints!: THREE.Points;
  private rainPositions!: Float32Array;

  // GPS 3D Beacon
  private gpsBeacon!: THREE.Group;
  private gpsRing!: THREE.Mesh;

  // Player (Bagas)
  private playerRig!: CharacterRig;
  private playerContactShadow!: THREE.Mesh;
  private playerX = -12;
  private playerY = 0;
  private playerZ = 10;
  private playerVy = 0;
  private playerYaw = 0;
  private isGrounded = true;
  private playerAnim: CharacterAnimState = createAnimState();

  // Camera orbit
  private camYaw = 0;
  private camPitch = 0.28;
  private isDraggingCamera = false;
  private cameraPointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Entities
  private vehicles: VehicleRuntime[] = [];
  private npcs: NpcRuntime[] = [];
  private currentVehicle: VehicleRuntime | null = null;

  // Input state
  private keys = new Set<string>();
  private virtualMove = { x: 0, y: 0 };

  // Gameplay state
  private state: GameHudState;
  private hudSyncAccum = 0;
  private menuRenderAccum = 0;
  private shadowFrameCount = 0;
  private wasPaused = false;
  private toastTimeout: number | null = null;
  private elapsedTotal = 0;
  private onSaveListener: ((payload: SaveData, silent: boolean) => void) | null = null;
  private authUid: string | null = null;
  private multiplayer!: TubanMultiplayerClient;
  private remotePlayers = new Map<string, RemotePlayerRuntime>();
  private localChatSprite: THREE.Sprite | null = null;
  private localChatExpiresAt = 0;
  private mpSendAccum = 0;
  private mpLastSent = { x: 0, y: 0, z: 0, yaw: 0, inVehicle: false };

  private static readonly STATIC_LANDMARK_ENTITIES: MinimapEntity[] = LANDMARKS.map((lm) => ({
    x: lm.x,
    z: lm.z,
    kind: 'landmark',
    label: lm.name,
  }));

  constructor(container: HTMLElement, onHudUpdate: (state: GameHudState) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    this.state = {
      screen: 'menu',
      language: 'ngoko',
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      money: 50000,
      xp: 0,
      level: 1,
      reputation: 10,
      region: 'desa',
      timeOfDay: 8.5,
      weather: 'cerah',
      playerX: this.playerX,
      playerY: 0,
      playerZ: this.playerZ,
      playerYaw: 0,
      inVehicle: false,
      vehicleName: '',
      vehicleType: null,
      speedKmh: 0,
      outfit: 'kasual',
      ownedOutfits: ['kasual'],
      character: { ...DEFAULT_CHARACTER_PROFILE },
      hasCustomCharacter: false,
      inventory: structuredClone(INITIAL_INVENTORY),
      activeMissionId: 'misi_1_tangga',
      activeStepIndex: 0,
      completedMissionIds: [],
      discoveredLandmarks: ['lm_desa'],
      gpsTarget: null,
      interactPrompt: null,
      activeDialogue: null,
      activeShopId: null,
      toastMessage: null,
      minimapEntities: [],
      onlineConnected: false,
      onlinePlayers: [],
      recentChat: [],
      audioMuted: false,
      gamelanEnabled: true,
      graphicsMode: 'seimbang',
    };

    this.initThree();
    this.initMultiplayer();
    this.bindEvents();
    this.updateGpsTarget();
    this.emitHud();
    this.startLoop();
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }

  private initThree() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7cc4f8);
    this.scene.fog = new THREE.FogExp2(0x7cc4f8, 0.0052);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.45, 280);

    // 3-Point Outdoor Lighting Rig (Warm Sun Key + Cool Hemisphere Fill)
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x3f6212, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(512, 512);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 95;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Procedural textures & world build
    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    const world = buildJawaWorld(this.scene, this.textures);
    this.colliders = world.colliders;
    this.streetLampBulbs = world.streetLampBulbs;
    this.waterfallMesh = world.waterfallMesh;
    this.oceanMesh = world.oceanMesh;
    this.boats = world.boats;
    this.lostGoat = world.lostGoat;
    this.farmAnimals = world.farmAnimals;
    this.missionPropFishCrate = world.missionPropFishCrate;

    // Custom player character rig
    this.playerRig = createCharacterRig(
      characterProfileToBuildOptions(this.state.character, this.textures)
    );
    this.playerY = surfaceHeightAt(this.playerX, this.playerZ);
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerRig.group);

    // Subtle soft ground contact shadow under Bagas so feet visibly anchor to asphalt & dirt
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    sGrad.addColorStop(0, 'rgba(8, 12, 20, 0.45)');
    sGrad.addColorStop(0.55, 'rgba(8, 12, 20, 0.20)');
    sGrad.addColorStop(1, 'rgba(8, 12, 20, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
    shadowGeo.rotateX(-Math.PI / 2);
    this.playerContactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerContactShadow.position.set(this.playerX, this.playerY + 0.014, this.playerZ);
    this.playerContactShadow.renderOrder = 5;
    this.scene.add(this.playerContactShadow);

    // Spawn Detailed Varied NPCs (procedurally randomized hair, clothing colors & pants styles per archetype)
    NPC_SPAWNS.forEach((spawn) => {
      const rig = createCharacterRig({
        shirtColor: spawn.shirtColor,
        pantsColor: spawn.pantsColor,
        skinColor: spawn.skinColor,
        hairColor: spawn.hairColor,
        hairStyle: spawn.hairStyle,
        shirtStyle: spawn.shirtStyle,
        pantsStyle: spawn.pantsStyle,
        shoeStyle: spawn.shoeStyle,
        hatType: spawn.hatType,
        hasMustache: spawn.hasMustache,
        hasGlasses: spawn.hasGlasses,
        hasBackpack: spawn.hasBackpack,
        hasNeckTowel: spawn.hasNeckTowel,
        archetype: spawn.archetype,
        randomize: true,
        textures: this.textures,
      });
      const gy = surfaceHeightAt(spawn.x, spawn.z);
      rig.group.position.set(spawn.x, gy, spawn.z);
      rig.group.rotation.y = spawn.yaw;
      this.scene.add(rig.group);
      const phaseOffset = Math.random() * Math.PI * 2;
      this.npcs.push({
        spawn,
        rig,
        x: spawn.x,
        y: gy,
        z: spawn.z,
        yaw: spawn.yaw,
        patrolAngle: phaseOffset,
        anim: createAnimState(phaseOffset),
      });
    });

    // Spawn Playable Vehicles
    VEHICLE_SPAWNS.forEach((vs) => {
      const model = createVehicleModel(vs.type, vs.color);
      const gy = surfaceHeightAt(vs.x, vs.z);
      model.group.position.set(vs.x, gy, vs.z);
      model.group.rotation.y = vs.yaw;
      this.scene.add(model.group);
      this.vehicles.push({
        id: vs.id,
        type: vs.type,
        color: vs.color,
        model,
        x: vs.x,
        y: gy,
        z: vs.z,
        yaw: vs.yaw,
        speed: 0,
        isTraffic: false,
        trafficIndex: 0,
        trafficLoop: TRAFFIC_LOOP,
      });
    });

    // Spawn Autonomous Traffic Vehicles across Inner & Outer Road Loops (including helmeted human riders on motorcycles!)
    const trafficSpecs: Array<{
      type: VehicleType;
      color: number;
      idx: number;
      outer?: boolean;
      riderShirt?: number;
      riderHelmet?: number;
      riderSkin?: number;
    }> = [
      { type: 'mobil_keluarga', color: 0xe2e8f0, idx: 0 },
      { type: 'motor_bebek', color: 0xb91c1c, idx: 1, riderShirt: 0x15803d, riderHelmet: 0x111827, riderSkin: 0xd19a72 },
      { type: 'motor_matic', color: 0x0284c7, idx: 3, riderShirt: 0xbe185d, riderHelmet: 0xf8fafc, riderSkin: 0xdfb088 },
      { type: 'pickup', color: 0x1d4ed8, idx: 5 },
      { type: 'bus', color: 0xd97706, idx: 7 },
      { type: 'motor_sport', color: 0x16a34a, idx: 9, riderShirt: 0x1e293b, riderHelmet: 0xdc2626, riderSkin: 0xc28658 },
      { type: 'truk', color: 0x15803d, idx: 1, outer: true },
      { type: 'motor_bebek', color: 0x0f172a, idx: 3, outer: true, riderShirt: 0xd97706, riderHelmet: 0x1e3a8a, riderSkin: 0xb87b4c },
      { type: 'mobil_keluarga', color: 0x475569, idx: 6, outer: true },
      { type: 'sepeda', color: 0x334155, idx: 8, outer: true, riderShirt: 0x0369a1, riderHelmet: 0xfacc15, riderSkin: 0xd19a72 },
    ];
    trafficSpecs.forEach((ts, k) => {
      const loop = ts.outer ? TRAFFIC_LOOP_OUTER : TRAFFIC_LOOP;
      const pt = loop[ts.idx % loop.length];
      const model = createVehicleModel(ts.type, ts.color);
      const gy = surfaceHeightAt(pt.x, pt.z);
      model.group.position.set(pt.x, gy, pt.z);
      this.scene.add(model.group);

      let riderRig: CharacterRig | undefined;
      if (model.isOpenRide) {
        riderRig = createCharacterRig({
          shirtColor: ts.riderShirt ?? 0x15803d,
          pantsColor: 0x1e293b,
          skinColor: ts.riderSkin ?? 0xd19a72,
          hairStyle: 'short_part',
          shirtStyle: ts.type === 'sepeda' ? 'tshirt' : 'jaket',
          pantsStyle: 'jeans',
          shoeStyle: 'sneakers',
          hatType: ts.type === 'sepeda' ? 'topi' : 'helm',
          helmetColor: ts.riderHelmet ?? 0x111827,
          archetype: 'rider',
          randomize: true,
          textures: this.textures,
        });
        riderRig.bodyGroup.position.y = 0;
        riderRig.pelvisGroup.rotation.set(0, 0, 0);
        riderRig.spineGroup.position.y = 0.85;
        riderRig.spineGroup.rotation.set(0.18, 0, 0);
        riderRig.head.rotation.set(-0.14, 0, 0);
        riderRig.leftLeg.rotation.set(-0.92, 0, -0.08);
        riderRig.rightLeg.rotation.set(-0.92, 0, 0.08);
        riderRig.leftKnee.rotation.x = 1.02;
        riderRig.rightKnee.rotation.x = 1.02;
        riderRig.leftAnkle.rotation.x = 0.15;
        riderRig.rightAnkle.rotation.x = 0.15;
        riderRig.leftArm.rotation.set(-0.66, 0, -0.14);
        riderRig.rightArm.rotation.set(-0.66, 0, 0.14);
        riderRig.leftElbow.rotation.x = -0.44;
        riderRig.rightElbow.rotation.x = -0.44;
        riderRig.leftWrist.rotation.x = 0.18;
        riderRig.rightWrist.rotation.x = 0.18;
        riderRig.group.position.set(pt.x, gy + model.seatY - 0.55, pt.z + model.seatZ);
        this.scene.add(riderRig.group);
      }

      this.vehicles.push({
        id: `traffic_${k}`,
        type: ts.type,
        color: ts.color,
        model,
        x: pt.x,
        y: gy,
        z: pt.z,
        yaw: 0,
        speed: ts.type === 'sepeda' ? 5.2 : 8.5,
        isTraffic: true,
        trafficIndex: (ts.idx + 1) % loop.length,
        trafficLoop: loop,
        riderRig,
      });
    });

    // 3D GPS Beacon Pillar
    this.gpsBeacon = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.4, 24, 16, 1, true), beamMat);
    beam.position.y = 12;
    this.gpsRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.gpsRing.rotation.x = -Math.PI / 2;
    this.gpsRing.position.y = 0.25;
    this.gpsBeacon.add(beam, this.gpsRing);
    this.scene.add(this.gpsBeacon);

    // Rain Particle System
    const rainCount = 850;
    this.rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 75;
      this.rainPositions[i * 3 + 1] = Math.random() * 28;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 75;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({
        color: 0xcbd5e1,
        size: 0.24,
        transparent: true,
        opacity: 0.68,
      })
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // WebGL context loss guard
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.audio.init();
    if (this.state.screen !== 'playing' || this.state.activeDialogue || this.state.activeShopId) return;
    if (this.cameraPointerId !== null) return;
    this.isDraggingCamera = true;
    this.cameraPointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDraggingCamera || e.pointerId !== this.cameraPointerId) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.camYaw -= dx * 0.0055;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.06, 0.85);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.cameraPointerId) return;
    this.isDraggingCamera = false;
    this.cameraPointerId = null;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    this.keys.add(code);
    this.audio.init();

    if (this.state.screen === 'playing') {
      if (code === 'Escape') {
        if (this.state.activeDialogue) {
          this.closeDialogue();
        } else if (this.state.activeShopId) {
          this.closeShop();
        } else {
          this.setScreen('paused');
        }
        return;
      }

      if (this.state.activeDialogue || this.state.activeShopId) return;

      if (code === 'KeyE') {
        this.triggerInteract();
      } else if (code === 'KeyF') {
        this.toggleVehicle();
      } else if (code === 'KeyH' && this.currentVehicle) {
        this.audio.playHorn();
        this.showToast('Tin! Tin! Klakson muni.');
      } else if (code === 'Space' && !this.currentVehicle && this.isGrounded) {
        this.playerVy = 7.4;
        this.isGrounded = false;
      }
    } else if (this.state.screen === 'paused' && code === 'Escape') {
      this.setScreen('playing');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public setSuspended(suspended: boolean) {
    if (this.externalSuspended === suspended) return;
    this.externalSuspended = suspended;
    if (suspended) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
      this.renderer.domElement.style.display = 'none';
    } else if (!this.disposed) {
      this.renderer.domElement.style.display = '';
      this.lastTime = performance.now();
      this.handleResize();
      this.startLoop();
    }
  }

  private startLoop() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    const tick = () => {
      if (this.disposed || this.externalSuspended) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (this.state.screen === 'paused') {
        if (!this.wasPaused) {
          this.wasPaused = true;
          this.renderer.render(this.scene, this.camera);
        }
        this.frameId = requestAnimationFrame(tick);
        return;
      }
      this.wasPaused = false;

      let didDraw = false;
      if (this.state.screen === 'menu') {
        this.menuRenderAccum += dt;
        if (this.menuRenderAccum >= 0.033) {
          const stepDt = this.menuRenderAccum;
          this.menuRenderAccum = 0;
          this.stepSimulation(stepDt);
          if (this.renderer.shadowMap.enabled) {
            this.renderer.shadowMap.needsUpdate = this.shadowFrameCount++ % 4 === 0;
          }
          this.renderer.render(this.scene, this.camera);
          didDraw = true;
        }
      } else {
        this.stepSimulation(dt);
        if (this.renderer.shadowMap.enabled) {
          const interval = this.state.graphicsMode === 'tinggi' ? 2 : 3;
          this.renderer.shadowMap.needsUpdate = this.shadowFrameCount++ % interval === 0;
        }
        this.renderer.render(this.scene, this.camera);
        didDraw = true;
      }

      if (this.externalSuspended || this.disposed) return;

      if (this.isSoftwareGl && didDraw) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number) {
    this.elapsedTotal += dt;

    // Gentle menu camera orbit when on main menu
    if (this.state.screen === 'menu') {
      const angle = this.elapsedTotal * 0.14;
      this.camera.position.set(
        this.playerX + Math.sin(angle) * 24,
        this.playerY + 11,
        this.playerZ + Math.cos(angle) * 24
      );
      this.camera.lookAt(this.playerX, this.playerY + 2.2, this.playerZ);
      this.updateAtmosphere(dt * 0.15);
      return;
    }

    if (this.state.screen === 'paused') {
      return;
    }

    // 1. Update Time of Day & Weather Atmosphere
    this.updateAtmosphere(dt);

    // 2. Animate Water, Boats, Waterfall, Farm Animals, GPS Beacon
    this.animateWorldProps(dt);

    // 3. Autonomous Traffic, NPCs & Online Multiplayer Players
    this.updateTraffic(dt);
    this.updateNpcs(dt);
    this.updateRemotePlayers(dt);

    // 4. Player / Vehicle Controls (paused during dialogue/shop)
    const inputBlocked = Boolean(this.state.activeDialogue || this.state.activeShopId);
    let isWalking = false;

    if (!inputBlocked) {
      // Keyboard camera rotation Q / Z
      if (this.keys.has('KeyQ')) this.camYaw += 1.9 * dt;
      if (this.keys.has('KeyC')) this.camYaw -= 1.9 * dt;

      if (this.currentVehicle) {
        this.updateDriving(dt);
      } else {
        isWalking = this.updateOnFoot(dt);
      }
    }

    this.syncMultiplayerState(dt);
    this.updateLocalChatBubble();

    // 5. Update Region & Landmark Discovery & Mission Proximity
    const newRegion = getRegionAt(this.playerX, this.playerZ);
    if (newRegion !== this.state.region) {
      this.state.region = newRegion;
      this.showToast(`Mlebu ing ${t(REGION_NAMES[newRegion], this.state.language)}`);
    }

    for (const lm of LANDMARKS) {
      if (!this.state.discoveredLandmarks.includes(lm.id)) {
        if (Math.hypot(this.playerX - lm.x, this.playerZ - lm.z) < 22) {
          this.state.discoveredLandmarks.push(lm.id);
          this.gainXp(25);
          this.showToast(`Lokasi ditemokake: ${lm.name} (+25 XP)`);
          this.audio.playChime();
        }
      }
    }

    this.checkMissionStepProgress();
    this.updateInteractPrompt();

    // 6. Smooth Third-Person Camera Follow
    this.updateCamera(dt);

    // 7. Audio Update
    const vehSpec = this.currentVehicle ? VEHICLE_LABELS[this.currentVehicle.type] : null;
    const speedRatio =
      this.currentVehicle && vehSpec
        ? Math.min(1, Math.abs(this.currentVehicle.speed) / vehSpec.maxSpeed)
        : 0;
    const nearDesaOrCandi = this.state.region === 'desa' || this.state.region === 'wisata';
    this.audio.update(dt, {
      inVehicle: Boolean(this.currentVehicle),
      speedRatio,
      isWalking,
      isRaining: this.state.weather === 'hujan',
      timeOfDay: this.state.timeOfDay,
      nearCandiOrDesa: nearDesaOrCandi,
    });

    // 8. Sync HUD at ~6.5Hz to keep React ultra-snappy without overhead
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.15) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private lastLampNight: boolean | null = null;

  private updateAtmosphere(dt: number) {
    // 1 game hour every ~28 real seconds
    this.state.timeOfDay = (this.state.timeOfDay + dt * 0.035) % 24;
    const hr = this.state.timeOfDay;
    const sunAngle = ((hr - 6) / 24) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    const isDay = sunHeight > 0;

    // Snap Sun shadow target to 2m grid around player to reduce shadow shimmer
    const snapX = Math.round(this.playerX * 0.5) * 2;
    const snapZ = Math.round(this.playerZ * 0.5) * 2;
    const sunDist = 55;
    this.sunLight.position.set(
      snapX + Math.cos(sunAngle) * sunDist,
      Math.max(12, Math.abs(sunHeight) * sunDist + 10),
      snapZ + 24
    );
    this.sunLight.target.position.set(snapX, this.playerY, snapZ);

    // Sky & Fog color blending
    if (this.state.weather === 'hujan') {
      _skyCurrent.copy(_skyRain);
      if (!isDay) _skyCurrent.lerp(_skyNight, 0.72);
    } else if (hr >= 5.5 && hr < 7.5) {
      const k = (hr - 5.5) / 2;
      _skyCurrent.copy(_skySunset).lerp(_skyDay, k);
    } else if (hr >= 7.5 && hr < 16.5) {
      _skyCurrent.copy(_skyDay);
    } else if (hr >= 16.5 && hr < 18.8) {
      const k = (hr - 16.5) / 2.3;
      _skyCurrent.copy(_skyDay).lerp(_skySunset, Math.min(1, k * 1.4));
      if (k > 0.65) _skyCurrent.lerp(_skyNight, (k - 0.65) / 0.35);
    } else {
      _skyCurrent.copy(_skyNight);
    }

    (this.scene.background as THREE.Color).copy(_skyCurrent);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_skyCurrent);
      this.scene.fog.density = this.state.weather === 'hujan' ? 0.0075 : isDay ? 0.0032 : 0.0052;
    }

    // Light intensities
    const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.15) / 0.7, 0, 1);
    const rainDim = this.state.weather === 'hujan' ? 0.62 : 1.0;
    this.sunLight.intensity = (0.28 + dayFactor * 1.75) * rainDim;
    this.sunLight.color.setHex(hr > 16.2 && hr < 18.6 ? 0xffb37a : isDay ? 0xfff3db : 0x818cf8);
    this.hemiLight.intensity = (0.38 + dayFactor * 0.55) * rainDim;

    // Streetlamps & Vehicle Headlights glow at dusk/night (only update materials when state changes)
    const isLampNight = hr < 6 || hr > 17.6;
    if (this.lastLampNight !== isLampNight) {
      this.lastLampNight = isLampNight;
      const lampGlow = isLampNight ? 1.8 : 0.12;
      for (const bulb of this.streetLampBulbs) {
        bulb.emissiveIntensity = lampGlow;
      }
      for (const v of this.vehicles) {
        for (const hl of v.model.headlights) {
          (hl.material as THREE.MeshStandardMaterial).emissiveIntensity = isLampNight ? 2.2 : 0.2;
        }
      }
    }

    // Rain particle movement
    this.rainPoints.visible = this.state.weather === 'hujan';
    if (this.rainPoints.visible) {
      this.rainPoints.position.set(this.playerX, this.playerY, this.playerZ);
      const count = this.rainPositions.length / 3;
      for (let i = 0; i < count; i++) {
        this.rainPositions[i * 3 + 1] -= 32 * dt;
        if (this.rainPositions[i * 3 + 1] < -2) {
          this.rainPositions[i * 3 + 1] = 26 + Math.random() * 4;
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  private animateWorldProps(dt: number) {
    // Waterfall texture scroll & ocean bobbing
    this.textures.water.offset.y -= dt * 0.25;
    if (this.playerZ > 45) {
      this.oceanMesh.position.y = -0.75 + Math.sin(this.elapsedTotal * 1.6) * 0.12;
      this.boats.forEach((b, idx) => {
        b.position.y = -0.45 + Math.sin(this.elapsedTotal * 1.8 + idx) * 0.12;
        b.rotation.z = Math.sin(this.elapsedTotal * 1.3 + idx) * 0.04;
      });
    }

    // Farm animals gentle grazing sway (only when within 95m)
    for (const a of this.farmAnimals) {
      const dx = a.baseX - this.playerX;
      const dz = a.baseZ - this.playerZ;
      if (dx * dx + dz * dz < 9025) {
        a.mesh.visible = true;
        a.mesh.position.x = a.baseX + Math.sin(this.elapsedTotal * 0.4 + a.phase) * 1.2;
        a.mesh.rotation.y = Math.cos(this.elapsedTotal * 0.4 + a.phase) * 0.6;
      } else {
        a.mesh.visible = false;
      }
    }

    // Lost goat visibility
    this.lostGoat.visible = !this.lostGoatCollected;
    if (this.lostGoat.visible) {
      this.lostGoat.rotation.y = Math.sin(this.elapsedTotal * 1.2) * 0.5;
    }

    // GPS Beacon pulse rotation (non-UI 3D marker)
    if (this.state.gpsTarget) {
      this.gpsBeacon.visible = true;
      const gy = surfaceHeightAt(this.state.gpsTarget.x, this.state.gpsTarget.z);
      this.gpsBeacon.position.set(this.state.gpsTarget.x, gy, this.state.gpsTarget.z);
      this.gpsRing.rotation.z += dt * 1.5;
    } else {
      this.gpsBeacon.visible = false;
    }
  }

  private updateOnFoot(dt: number): boolean {
    let moveX = this.virtualMove.x;
    let moveZ = this.virtualMove.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    const isMoving = inputLen > 0.05;
    const isSprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && this.state.stamina > 2;

    if (isMoving && isSprinting) {
      this.state.stamina = Math.max(0, this.state.stamina - 18 * dt);
    } else {
      this.state.stamina = Math.min(this.state.maxStamina, this.state.stamina + 14 * dt);
    }

    const speedBase = isSprinting ? 11.2 : 6.6;
    const analogScale = Math.min(1, inputLen / 0.78);
    const speed = speedBase * analogScale;

    let turnRate = 0;
    if (isMoving) {
      const nx = moveX / inputLen;
      const nz = moveZ / inputLen;
      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      // Convert camera-relative input to world XZ
      const worldDx = nx * cosY + nz * sinY;
      const worldDz = -nx * sinY + nz * cosY;

      const nextX = THREE.MathUtils.clamp(this.playerX + worldDx * speed * dt, -WORLD_PLAY_LIMIT, WORLD_PLAY_LIMIT);
      const nextZ = THREE.MathUtils.clamp(this.playerZ + worldDz * speed * dt, -WORLD_PLAY_LIMIT, WORLD_PLAY_LIMIT);

      const resolved = this.resolveBuildingCollision(nextX, nextZ, 0.55);
      this.playerX = resolved.x;
      this.playerZ = resolved.z;

      const targetYaw = Math.atan2(worldDx, worldDz);
      const prevYaw = this.playerYaw;
      this.playerYaw = this.lerpAngle(this.playerYaw, targetYaw, Math.min(1, 12 * dt));
      let deltaYaw = this.playerYaw - prevYaw;
      while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      turnRate = THREE.MathUtils.clamp((deltaYaw / Math.max(dt, 0.008)) * 0.22, -1.2, 1.2);
    }

    // Vertical gravity & ground collision (uses exact surfaceHeightAt including asphalt, dirt, bridge, plazas)
    const floorY = Math.max(-0.6, surfaceHeightAt(this.playerX, this.playerZ));
    if (!this.isGrounded || this.playerY > floorY + 0.35) {
      this.playerVy -= 20 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= floorY) {
        this.playerY = floorY;
        this.playerVy = 0;
        this.isGrounded = true;
      }
    } else {
      const diff = Math.abs(floorY - this.playerY);
      this.playerY = diff < 0.18 ? floorY : THREE.MathUtils.damp(this.playerY, floorY, 20, dt);
    }

    // Apply transform & smooth interpolated human animation
    this.playerRig.group.visible = true;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerYaw;

    // Ground contact shadow positioned directly on walkable surface below Bagas
    const heightAboveFloor = Math.max(0, this.playerY - floorY);
    const shadowScale = THREE.MathUtils.clamp(1 - heightAboveFloor * 0.25, 0.35, 1);
    this.playerContactShadow.visible = true;
    this.playerContactShadow.position.set(this.playerX, floorY + 0.014, this.playerZ);
    this.playerContactShadow.scale.setScalar(shadowScale);
    (this.playerContactShadow.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(
      0.95 - heightAboveFloor * 0.35,
      0.2,
      0.95
    );

    this.animateHumanRig(
      this.playerRig,
      this.playerAnim,
      isMoving ? analogScale : 0,
      isMoving && isSprinting ? 1 : 0,
      this.isGrounded,
      turnRate,
      turnRate * 0.42,
      dt
    );

    this.state.playerX = this.playerX;
    this.state.playerY = this.playerY;
    this.state.playerZ = this.playerZ;
    this.state.playerYaw = this.playerYaw;
    this.state.speedKmh = isMoving ? Math.round(speed * 3.6) : 0;

    return isMoving && this.isGrounded;
  }

  private animateHumanRig(
    rig: CharacterRig,
    anim: CharacterAnimState,
    targetMove: number,
    targetSprint: number,
    isGrounded: boolean,
    turnRate: number,
    headTargetYaw: number,
    dt: number
  ) {
    const safeDt = Math.min(dt, 0.05);
    anim.moveBlend = THREE.MathUtils.damp(anim.moveBlend, THREE.MathUtils.clamp(targetMove, 0, 1), 11, safeDt);
    anim.sprintBlend = THREE.MathUtils.damp(anim.sprintBlend, THREE.MathUtils.clamp(targetSprint, 0, 1), 9, safeDt);
    anim.airBlend = THREE.MathUtils.damp(anim.airBlend, isGrounded ? 0 : 1, isGrounded ? 16 : 12, safeDt);
    if (!anim.wasGrounded && isGrounded) {
      anim.landSquash = 1.0;
    }
    anim.wasGrounded = isGrounded;
    anim.landSquash = THREE.MathUtils.damp(anim.landSquash, 0, 14, safeDt);
    anim.turnLean = THREE.MathUtils.damp(anim.turnLean, THREE.MathUtils.clamp(turnRate, -1.2, 1.2), 10, safeDt);
    anim.headLookY = THREE.MathUtils.damp(anim.headLookY, THREE.MathUtils.clamp(headTargetYaw, -0.75, 0.75), 8, safeDt);

    anim.idlePhase += safeDt * 2.1;
    const strideFreq = THREE.MathUtils.lerp(7.6, 11.4, anim.sprintBlend);
    anim.walkPhase += safeDt * strideFreq * (0.22 + 0.78 * anim.moveBlend);

    const m = anim.moveBlend;
    const s = anim.sprintBlend;
    const air = anim.airBlend;
    const sq = anim.landSquash;

    const p = anim.walkPhase;
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);
    const breathe = Math.sin(anim.idlePhase);
    const weightShift = Math.sin(anim.idlePhase * 0.45);

    const hipAmp = THREE.MathUtils.lerp(0.42, 0.72, s) * m;
    const kneeSwingAmp = THREE.MathUtils.lerp(0.68, 1.05, s);
    const armAmp = THREE.MathUtils.lerp(0.36, 0.76, s) * m;

    // Grounded locomotion + idle targets
    const gLeftLegX = -sinP * hipAmp - 0.04 * m - sq * 0.18;
    const gRightLegX = sinP * hipAmp - 0.04 * m - sq * 0.18;
    const gLeftKneeX = (0.06 + 0.12 * s) * m + Math.max(0, cosP) * kneeSwingAmp * m + Math.max(0, sinP) * 0.14 * m + sq * 0.34;
    const gRightKneeX = (0.06 + 0.12 * s) * m + Math.max(0, -cosP) * kneeSwingAmp * m + Math.max(0, -sinP) * 0.14 * m + sq * 0.34;
    const gLeftAnkleX = (-0.08 * Math.max(0, sinP) + 0.22 * Math.max(0, -sinP) + 0.1 * Math.max(0, cosP)) * m - sq * 0.14;
    const gRightAnkleX = (-0.08 * Math.max(0, -sinP) + 0.22 * Math.max(0, sinP) + 0.1 * Math.max(0, -cosP)) * m - sq * 0.14;

    const gLeftArmX = sinP * armAmp + breathe * 0.018 * (1 - m);
    const gRightArmX = -sinP * armAmp - breathe * 0.018 * (1 - m);
    const gLeftElbowX = -0.22 - (0.14 + 0.46 * s) * m - Math.max(0, -sinP) * (0.28 + 0.35 * s) * m + breathe * 0.025 * (1 - m);
    const gRightElbowX = -0.22 - (0.14 + 0.46 * s) * m - Math.max(0, sinP) * (0.28 + 0.35 * s) * m + breathe * 0.025 * (1 - m);
    const gLeftWristX = 0.06 + sinP * 0.14 * m;
    const gRightWristX = 0.06 - sinP * 0.14 * m;
    const armOut = 0.115 + 0.022 * m + 0.025 * s;

    // Blend smoothly with airborne jump pose
    const tLeftLegX = THREE.MathUtils.lerp(gLeftLegX, -0.45, air);
    const tRightLegX = THREE.MathUtils.lerp(gRightLegX, 0.28, air);
    const tLeftKneeX = THREE.MathUtils.lerp(gLeftKneeX, 0.72, air);
    const tRightKneeX = THREE.MathUtils.lerp(gRightKneeX, 0.48, air);
    const tLeftAnkleX = THREE.MathUtils.lerp(gLeftAnkleX, 0.24, air);
    const tRightAnkleX = THREE.MathUtils.lerp(gRightAnkleX, 0.18, air);

    const tLeftArmX = THREE.MathUtils.lerp(gLeftArmX, -0.58, air);
    const tRightArmX = THREE.MathUtils.lerp(gRightArmX, -0.44, air);
    const tLeftElbowX = THREE.MathUtils.lerp(gLeftElbowX, -0.56, air);
    const tRightElbowX = THREE.MathUtils.lerp(gRightElbowX, -0.52, air);
    const tArmOut = THREE.MathUtils.lerp(armOut, 0.19, air);

    // Pelvis & spine counter-rotation, weight shift, turn bank, breathing & landing compression
    const tPelvisY = sinP * (0.075 + 0.055 * s) * m * (1 - air);
    const tPelvisZ = (cosP * (0.038 + 0.02 * s) * m + weightShift * 0.022 * (1 - m)) * (1 - air);
    const tSpineX = (0.048 + 0.135 * s) * m + breathe * 0.014 * (1 - m) + sq * 0.16 + air * 0.08;
    const tSpineY = -sinP * (0.1 + 0.07 * s) * m * (1 - air);
    const tSpineZ = -tPelvisZ * 0.55 + anim.turnLean * 0.22 * m;
    const tSpinePosY = 0.85 + breathe * 0.004 * (1 - m) - sq * 0.052;
    const tHeadX = -tSpineX * 0.55 + breathe * 0.015 * (1 - m) - air * 0.08;
    const tHeadY = anim.headLookY - tSpineY * 0.45 + weightShift * 0.035 * (1 - m);

    const dampSpeed = 18;
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, tLeftLegX, dampSpeed, safeDt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, tRightLegX, dampSpeed, safeDt);
    rig.leftLeg.rotation.z = THREE.MathUtils.damp(rig.leftLeg.rotation.z, -0.032 * (1 - m), dampSpeed, safeDt);
    rig.rightLeg.rotation.z = THREE.MathUtils.damp(rig.rightLeg.rotation.z, 0.032 * (1 - m), dampSpeed, safeDt);

    rig.leftKnee.rotation.x = THREE.MathUtils.damp(rig.leftKnee.rotation.x, tLeftKneeX, dampSpeed, safeDt);
    rig.rightKnee.rotation.x = THREE.MathUtils.damp(rig.rightKnee.rotation.x, tRightKneeX, dampSpeed, safeDt);
    rig.leftAnkle.rotation.x = THREE.MathUtils.damp(rig.leftAnkle.rotation.x, tLeftAnkleX, dampSpeed, safeDt);
    rig.rightAnkle.rotation.x = THREE.MathUtils.damp(rig.rightAnkle.rotation.x, tRightAnkleX, dampSpeed, safeDt);

    rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, tLeftArmX, dampSpeed, safeDt);
    rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, tRightArmX, dampSpeed, safeDt);
    rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, -tArmOut, dampSpeed, safeDt);
    rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, tArmOut, dampSpeed, safeDt);
    rig.leftElbow.rotation.x = THREE.MathUtils.damp(rig.leftElbow.rotation.x, tLeftElbowX, dampSpeed, safeDt);
    rig.rightElbow.rotation.x = THREE.MathUtils.damp(rig.rightElbow.rotation.x, tRightElbowX, dampSpeed, safeDt);
    rig.leftWrist.rotation.x = THREE.MathUtils.damp(rig.leftWrist.rotation.x, gLeftWristX, dampSpeed, safeDt);
    rig.rightWrist.rotation.x = THREE.MathUtils.damp(rig.rightWrist.rotation.x, gRightWristX, dampSpeed, safeDt);

    rig.pelvisGroup.rotation.y = THREE.MathUtils.damp(rig.pelvisGroup.rotation.y, tPelvisY, dampSpeed, safeDt);
    rig.pelvisGroup.rotation.z = THREE.MathUtils.damp(rig.pelvisGroup.rotation.z, tPelvisZ, dampSpeed, safeDt);
    rig.spineGroup.position.y = THREE.MathUtils.damp(rig.spineGroup.position.y, tSpinePosY, dampSpeed, safeDt);
    rig.spineGroup.rotation.x = THREE.MathUtils.damp(rig.spineGroup.rotation.x, tSpineX, dampSpeed, safeDt);
    rig.spineGroup.rotation.y = THREE.MathUtils.damp(rig.spineGroup.rotation.y, tSpineY, dampSpeed, safeDt);
    rig.spineGroup.rotation.z = THREE.MathUtils.damp(rig.spineGroup.rotation.z, tSpineZ, dampSpeed, safeDt);
    rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, tHeadX, 14, safeDt);
    rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, tHeadY, 12, safeDt);

    const groundedY = this.computeRigGroundOffset(rig, 0.002);
    rig.bodyGroup.position.y = THREE.MathUtils.lerp(groundedY, 0.04, air);
  }

  private computeRigGroundOffset(rig: CharacterRig, clearance = 0.002): number {
    const lLeg = rig.leftLeg.rotation.x;
    const rLeg = rig.rightLeg.rotation.x;
    const lKnee = rig.leftKnee.rotation.x;
    const rKnee = rig.rightKnee.rotation.x;
    const lTotal = lLeg + lKnee + rig.leftAnkle.rotation.x;
    const rTotal = rLeg + rKnee + rig.rightAnkle.rotation.x;

    const lAnkleY = RIG_HIP_Y - RIG_THIGH_LEN * Math.cos(lLeg) - RIG_SHIN_LEN * Math.cos(lLeg + lKnee);
    const rAnkleY = RIG_HIP_Y - RIG_THIGH_LEN * Math.cos(rLeg) - RIG_SHIN_LEN * Math.cos(rLeg + rKnee);

    const lSoleDrop = RIG_SOLE_OFFSET_Y * Math.cos(lTotal) + Math.max(0.125 * Math.sin(lTotal), -0.065 * Math.sin(lTotal));
    const rSoleDrop = RIG_SOLE_OFFSET_Y * Math.cos(rTotal) + Math.max(0.125 * Math.sin(rTotal), -0.065 * Math.sin(rTotal));

    const lowestFootY = Math.min(lAnkleY - lSoleDrop, rAnkleY - rSoleDrop);
    return clearance - lowestFootY;
  }

  private groundCharacterRig(rig: CharacterRig, clearance = 0.002) {
    rig.bodyGroup.position.y = this.computeRigGroundOffset(rig, clearance);
  }

  private updateDriving(dt: number) {
    const veh = this.currentVehicle!;
    const spec = VEHICLE_LABELS[veh.type];

    let throttle = -this.virtualMove.y;
    let steer = -this.virtualMove.x;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;

    if (throttle > 0.05) {
      veh.speed += spec.accel * throttle * dt;
    } else if (throttle < -0.05) {
      veh.speed += spec.accel * 1.15 * throttle * dt;
    } else {
      // Natural rolling friction
      veh.speed = THREE.MathUtils.damp(veh.speed, 0, 2.4, dt);
    }

    // Handbrake on Space
    if (this.keys.has('Space')) {
      veh.speed = THREE.MathUtils.damp(veh.speed, 0, 6.5, dt);
    }

    veh.speed = THREE.MathUtils.clamp(veh.speed, -spec.maxSpeed * 0.4, spec.maxSpeed);

    // Steering scales with speed
    if (Math.abs(veh.speed) > 0.5) {
      const dirSign = veh.speed >= 0 ? 1 : -1;
      const speedFactor = Math.min(1, Math.abs(veh.speed) / 8);
      veh.yaw += steer * spec.turnSpeed * speedFactor * dirSign * dt;
    }

    const fwdX = Math.sin(veh.yaw);
    const fwdZ = Math.cos(veh.yaw);
    const nextX = THREE.MathUtils.clamp(veh.x + fwdX * veh.speed * dt, -WORLD_PLAY_LIMIT, WORLD_PLAY_LIMIT);
    const nextZ = THREE.MathUtils.clamp(veh.z + fwdZ * veh.speed * dt, -WORLD_PLAY_LIMIT, WORLD_PLAY_LIMIT);

    const pad = Math.max(veh.model.halfW, veh.model.halfL) * 0.78;
    const resolved = this.resolveBuildingCollision(nextX, nextZ, pad);
    if (Math.abs(resolved.x - nextX) > 0.05 || Math.abs(resolved.z - nextZ) > 0.05) {
      veh.speed *= 0.25;
    }
    veh.x = resolved.x;
    veh.z = resolved.z;
    veh.y = Math.max(-0.4, surfaceHeightAt(veh.x, veh.z));
    this.playerContactShadow.visible = false;

    veh.model.group.position.set(veh.x, veh.y, veh.z);
    veh.model.group.rotation.y = veh.yaw;

    // Spin wheels
    const wheelSpin = veh.speed * dt * 2.5;
    for (const w of veh.model.wheels) {
      w.rotation.x += wheelSpin;
    }

    // Position Bagas on open vehicles (motorcycles & bicycle) or hide inside closed cabins
    if (veh.model.isOpenRide) {
      this.playerRig.group.visible = true;
      const cosY = Math.cos(veh.yaw);
      const sinY = Math.sin(veh.yaw);
      this.playerRig.group.position.set(
        veh.x + sinY * veh.model.seatZ,
        veh.y + veh.model.seatY - 0.55,
        veh.z + cosY * veh.model.seatZ
      );
      this.playerRig.group.rotation.y = veh.yaw;
      this.playerRig.bodyGroup.position.y = 0;
      this.playerRig.pelvisGroup.rotation.set(0, 0, 0);
      this.playerRig.spineGroup.position.y = 0.85;
      const steerBank = THREE.MathUtils.clamp(-steer * 0.14 * Math.min(1, Math.abs(veh.speed) / 8), -0.16, 0.16);
      this.playerRig.spineGroup.rotation.set(0.18, 0, steerBank);
      this.playerRig.head.rotation.set(-0.14, steer * 0.15, -steerBank * 0.45);
      this.playerRig.leftLeg.rotation.set(-0.95, 0, -0.08);
      this.playerRig.rightLeg.rotation.set(-0.95, 0, 0.08);
      this.playerRig.leftKnee.rotation.x = 1.05;
      this.playerRig.rightKnee.rotation.x = 1.05;
      this.playerRig.leftAnkle.rotation.x = 0.15;
      this.playerRig.rightAnkle.rotation.x = 0.15;
      this.playerRig.leftArm.rotation.set(-0.65, 0, -0.14);
      this.playerRig.rightArm.rotation.set(-0.65, 0, 0.14);
      this.playerRig.leftElbow.rotation.x = -0.45;
      this.playerRig.rightElbow.rotation.x = -0.45;
      this.playerRig.leftWrist.rotation.x = 0.18;
      this.playerRig.rightWrist.rotation.x = 0.18;
    } else {
      this.playerRig.group.visible = false;
    }

    this.playerX = veh.x;
    this.playerY = veh.y;
    this.playerZ = veh.z;
    this.playerYaw = veh.yaw;
    this.state.playerX = veh.x;
    this.state.playerY = veh.y;
    this.state.playerZ = veh.z;
    this.state.playerYaw = veh.yaw;
    this.state.speedKmh = Math.round(Math.abs(veh.speed) * 3.6);

    // Gentle auto-chase camera alignment behind moving vehicle when not dragging
    if (!this.isDraggingCamera && Math.abs(veh.speed) > 2.5) {
      const targetCamYaw = veh.yaw + Math.PI;
      this.camYaw = this.lerpAngle(this.camYaw, targetCamYaw, Math.min(1, 2.2 * dt));
    }
  }

  private updateTraffic(dt: number) {
    for (const v of this.vehicles) {
      if (v === this.currentVehicle) {
        v.model.group.visible = true;
        if (v.riderRig) v.riderRig.group.visible = false;
        continue;
      }

      const pdx = this.playerX - v.x;
      const pdz = this.playerZ - v.z;
      const pDistSq = pdx * pdx + pdz * pdz;

      if (!v.isTraffic) {
        v.model.group.visible = pDistSq < 25600;
        if (v.riderRig) v.riderRig.group.visible = false;
        continue;
      }

      const loop = v.trafficLoop;
      const wp = loop[v.trafficIndex];
      const dx = wp.x - v.x;
      const dz = wp.z - v.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4.5) {
        v.trafficIndex = (v.trafficIndex + 1) % loop.length;
      }

      // Slow down if Bagas or player vehicle is right in front
      const cruise = v.type === 'sepeda' ? 5.2 : 8.5;
      const targetSpeed = pDistSq < 81 ? 0 : cruise;
      v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, 4, dt);

      const targetYaw = Math.atan2(dx, dz);
      v.yaw = this.lerpAngle(v.yaw, targetYaw, Math.min(1, 4.5 * dt));

      const sinY = Math.sin(v.yaw);
      const cosY = Math.cos(v.yaw);
      v.x += sinY * v.speed * dt;
      v.z += cosY * v.speed * dt;
      v.y = surfaceHeightAt(v.x, v.z);
      v.model.group.position.set(v.x, v.y, v.z);
      v.model.group.rotation.y = v.yaw;

      const isVis = pDistSq < 25600;
      v.model.group.visible = isVis;
      if (isVis) {
        for (const w of v.model.wheels) {
          w.rotation.x += v.speed * dt * 2.2;
        }
      }

      if (v.riderRig) {
        v.riderRig.group.visible = isVis;
        if (isVis) {
          v.riderRig.group.position.set(
            v.x + sinY * v.model.seatZ,
            v.y + v.model.seatY - 0.55,
            v.z + cosY * v.model.seatZ
          );
          v.riderRig.group.rotation.y = v.yaw;
        }
      }
    }
  }

  private updateNpcs(dt: number) {
    const isNight = this.state.timeOfDay < 5.5 || this.state.timeOfDay > 19.5;
    for (const npc of this.npcs) {
      const distSq = (this.playerX - npc.x) ** 2 + (this.playerZ - npc.z) ** 2;
      // Hide distant NPCs (> 135m) to save GPU draw calls
      if (distSq > 18225) {
        npc.rig.group.visible = false;
        continue;
      }
      npc.rig.group.visible = true;

      if (npc.spawn.patrolRadius && npc.spawn.patrolRadius > 0) {
        const walkSpeed = isNight ? 0.25 : 0.65;
        npc.patrolAngle += dt * walkSpeed * 0.45;
        const tx = npc.spawn.x + Math.cos(npc.patrolAngle) * npc.spawn.patrolRadius;
        const tz = npc.spawn.z + Math.sin(npc.patrolAngle) * npc.spawn.patrolRadius;
        const dx = tx - npc.x;
        const dz = tz - npc.z;
        npc.x += dx * dt * 0.7;
        npc.z += dz * dt * 0.7;
        npc.y = surfaceHeightAt(npc.x, npc.z);

        const prevYaw = npc.yaw;
        npc.yaw = this.lerpAngle(npc.yaw, Math.atan2(dx, dz), Math.min(1, 5.5 * dt));
        let deltaYaw = npc.yaw - prevYaw;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        const turnRate = THREE.MathUtils.clamp((deltaYaw / Math.max(dt, 0.008)) * 0.2, -0.8, 0.8);

        npc.rig.group.position.set(npc.x, npc.y, npc.z);
        npc.rig.group.rotation.y = npc.yaw;

        // Smooth interpolated walk cycle when within 90m
        if (distSq < 8100) {
          this.animateHumanRig(npc.rig, npc.anim, isNight ? 0.42 : 0.7, 0, true, turnRate, turnRate * 0.35, dt);
        }
      } else {
        let headTargetYaw = 0;
        if (distSq < 81) {
          const faceYaw = Math.atan2(this.playerX - npc.x, this.playerZ - npc.z);
          if (distSq < 36) {
            npc.rig.group.rotation.y = this.lerpAngle(npc.rig.group.rotation.y, faceYaw, Math.min(1, 4.5 * dt));
          }
          let relYaw = faceYaw - npc.rig.group.rotation.y;
          while (relYaw > Math.PI) relYaw -= Math.PI * 2;
          while (relYaw < -Math.PI) relYaw += Math.PI * 2;
          headTargetYaw = THREE.MathUtils.clamp(relYaw, -0.65, 0.65);
        }
        if (distSq < 8100) {
          this.animateHumanRig(npc.rig, npc.anim, 0, 0, true, 0, headTargetYaw, dt);
        }
      }
    }
  }

  private updateCamera(dt: number) {
    const dist = this.currentVehicle
      ? this.currentVehicle.type === 'bus'
        ? 12.5
        : this.currentVehicle.type === 'truk'
          ? 10.5
          : 8.2
      : 5.6;
    const heightOffset = this.currentVehicle ? 2.4 : 1.7;

    // Speed-based FOV widening
    const targetFov = 60 + Math.min(16, this.state.speedKmh * 0.14);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    const horizDist = dist * Math.cos(this.camPitch);
    const vertDist = dist * Math.sin(this.camPitch) + heightOffset;

    _camIdeal.set(
      this.playerX + Math.sin(this.camYaw) * horizDist,
      Math.max(surfaceHeightAt(this.playerX, this.playerZ) + 1.2, this.playerY + vertDist),
      this.playerZ + Math.cos(this.camYaw) * horizDist
    );

    const smooth = 1 - Math.exp(-10 * dt);
    this.camera.position.lerp(_camIdeal, smooth);
    _camTarget.set(this.playerX, this.playerY + (this.currentVehicle ? 1.4 : 1.5), this.playerZ);
    this.camera.lookAt(_camTarget);
  }

  private resolveBuildingCollision(x: number, z: number, radius: number): { x: number; z: number } {
    let rx = x;
    let rz = z;
    for (const c of this.colliders) {
      const minX = c.x - c.halfW - radius;
      const maxX = c.x + c.halfW + radius;
      const minZ = c.z - c.halfD - radius;
      const maxZ = c.z + c.halfD + radius;
      if (rx > minX && rx < maxX && rz > minZ && rz < maxZ) {
        const dLeft = Math.abs(rx - minX);
        const dRight = Math.abs(maxX - rx);
        const dBack = Math.abs(rz - minZ);
        const dFront = Math.abs(maxZ - rz);
        const m = Math.min(dLeft, dRight, dBack, dFront);
        if (m === dLeft) rx = minX;
        else if (m === dRight) rx = maxX;
        else if (m === dBack) rz = minZ;
        else rz = maxZ;
      }
    }
    return { x: rx, z: rz };
  }

  private lerpAngle(a: number, b: number, tAmt: number): number {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * tAmt;
  }

  private updateInteractPrompt() {
    let prompt: InteractPrompt | null = null;

    if (!this.currentVehicle) {
      // Check nearest NPC within 3.8m
      let bestNpcDist = 3.8;
      for (const npc of this.npcs) {
        const d = Math.hypot(this.playerX - npc.x, this.playerZ - npc.z);
        if (d < bestNpcDist) {
          bestNpcDist = d;
          prompt = {
            id: `npc_${npc.spawn.id}`,
            kind: 'npc',
            npcId: npc.spawn.id,
            shopId: npc.spawn.shopId,
            label: {
              ngoko: `Ngomong karo ${npc.spawn.name}`,
              krama: `Matur kaliyan ${npc.spawn.name}`,
              indonesia: `Bicara dengan ${npc.spawn.name}`,
            },
            sublabel: t(npc.spawn.role, this.state.language),
            targetX: npc.x,
            targetZ: npc.z,
          };
        }
      }

      // Check nearest Vehicle within 4.2m if no closer NPC
      if (!prompt) {
        let bestVehDist = 4.2;
        for (const v of this.vehicles) {
          const d = Math.hypot(this.playerX - v.x, this.playerZ - v.z);
          if (d < bestVehDist) {
            bestVehDist = d;
            const vInfo = VEHICLE_LABELS[v.type];
            prompt = {
              id: `veh_${v.id}`,
              kind: 'vehicle',
              vehicleId: v.id,
              label: {
                ngoko: `Numpak ${vInfo.name}`,
                krama: `Nitih ${vInfo.name}`,
                indonesia: `Naik ${vInfo.name}`,
              },
              sublabel: 'Tekan F / E',
              targetX: v.x,
              targetZ: v.z,
            };
          }
        }
      }
    }

    this.state.interactPrompt = prompt;
  }

  public triggerInteract() {
    if (this.state.screen !== 'playing') return;
    const prompt = this.state.interactPrompt;
    if (!prompt) return;

    if (prompt.kind === 'vehicle' && prompt.vehicleId) {
      this.toggleVehicle(prompt.vehicleId);
      return;
    }

    if (prompt.kind === 'npc' && prompt.npcId) {
      this.openNpcDialogue(prompt.npcId);
    }
  }

  public toggleVehicle(explicitId?: string) {
    if (this.currentVehicle) {
      // Exit vehicle safely to the left
      const veh = this.currentVehicle;
      veh.speed = 0;
      const exitX = veh.x - Math.cos(veh.yaw) * (veh.model.halfW + 1.1);
      const exitZ = veh.z + Math.sin(veh.yaw) * (veh.model.halfW + 1.1);
      const resolved = this.resolveBuildingCollision(exitX, exitZ, 0.5);
      this.playerX = resolved.x;
      this.playerZ = resolved.z;
      this.playerY = surfaceHeightAt(this.playerX, this.playerZ);
      this.playerRig.group.visible = true;
      this.playerRig.spineGroup.rotation.set(0, 0, 0);
      this.playerRig.pelvisGroup.rotation.set(0, 0, 0);
      this.playerRig.head.rotation.set(0, 0, 0);
      this.playerAnim.moveBlend = 0;
      this.playerAnim.airBlend = 0;
      this.playerAnim.wasGrounded = true;
      this.currentVehicle = null;
      this.state.inVehicle = false;
      this.state.vehicleName = '';
      this.state.vehicleType = null;
      this.state.speedKmh = 0;
      this.emitHud();
      return;
    }

    // Find closest vehicle
    let target: VehicleRuntime | null = null;
    if (explicitId) {
      target = this.vehicles.find((v) => v.id === explicitId) ?? null;
    } else {
      let best = 4.6;
      for (const v of this.vehicles) {
        const d = Math.hypot(this.playerX - v.x, this.playerZ - v.z);
        if (d < best) {
          best = d;
          target = v;
        }
      }
    }

    if (target) {
      target.isTraffic = false; // Player takes control
      if (target.riderRig) {
        target.riderRig.group.visible = false;
      }
      this.currentVehicle = target;
      this.state.inVehicle = true;
      this.state.vehicleName = VEHICLE_LABELS[target.type].name;
      this.state.vehicleType = target.type;
      this.audio.playChime();
      this.showToast(`Numpak ${VEHICLE_LABELS[target.type].name}`);
      this.emitHud();
    }
  }

  private openNpcDialogue(npcId: string) {
    const npc = this.npcs.find((n) => n.spawn.id === npcId);
    if (!npc) return;

    this.audio.playChime();
    const activeMission = this.getActiveMission();
    const activeStep = activeMission ? activeMission.steps[this.state.activeStepIndex] : null;

    // 1. Check if this NPC completes the current active mission step!
    if (activeMission && activeStep && activeStep.type === 'talk' && activeStep.targetNpcId === npcId) {
      const isLastStep = this.state.activeStepIndex >= activeMission.steps.length - 1;
      if (isLastStep) {
        this.completeActiveMission();
        const dialogue: ActiveDialogue = {
          npcId,
          npcName: npc.spawn.name,
          npcRole: npc.spawn.role,
          region: npc.spawn.region,
          text: activeMission.completeDialogue,
          options: [
            {
              label: { ngoko: 'Sami-sami, matur nuwun!', krama: 'Sami-sami, matur nuwun!', indonesia: 'Sama-sama, terima kasih!' },
              action: 'close',
            },
          ],
        };
        this.state.activeDialogue = dialogue;
        this.emitHud();
        return;
      } else {
        this.advanceMissionStep();
        const dialogue: ActiveDialogue = {
          npcId,
          npcName: npc.spawn.name,
          npcRole: npc.spawn.role,
          region: npc.spawn.region,
          text: {
            ngoko: 'Apik Mas Bagas! Iki barang wis siap, saiki langsung terusna menyang tujuan sabanjure ya!',
            krama: 'Sae sanget Mas Bagas! Punika sampun siap, sakmenika langsung dipun lajengaken dhateng tujuan salajengipun!',
            indonesia: 'Bagus Mas Bagas! Ini sudah siap, sekarang lanjutkan ke tujuan berikutnya ya!',
          },
          options: [
            {
              label: { ngoko: 'Siap, tak terusake!', krama: 'Inggih, sendika dawuh!', indonesia: 'Siap, saya lanjutkan!' },
              action: 'close',
            },
          ],
        };
        this.state.activeDialogue = dialogue;
        this.emitHud();
        return;
      }
    }

    // 2. Check if NPC offers an uncompleted mission
    const availableMission = MISSIONS.find(
      (m) =>
        m.giverNpcId === npcId &&
        !this.state.completedMissionIds.includes(m.id) &&
        this.state.activeMissionId !== m.id
    );

    const options: ActiveDialogue['options'] = [];

    if (availableMission) {
      options.push({
        label: {
          ngoko: `Tampani Misi: ${availableMission.title.ngoko}`,
          krama: `Tampi Ayahan: ${availableMission.title.krama}`,
          indonesia: `Terima Misi: ${availableMission.title.indonesia}`,
        },
        action: 'accept_mission',
        missionId: availableMission.id,
      });
    }

    if (npc.spawn.shopId) {
      options.push({
        label: {
          ngoko: 'Bukak Warung / Toko',
          krama: 'Bikak Wande / Toko',
          indonesia: 'Buka Warung / Toko',
        },
        action: 'open_shop',
        shopId: npc.spawn.shopId,
      });
    }

    options.push({
      label: {
        ngoko: 'Takon arah sekitar kene',
        krama: 'Nyuwun pirsa arah mriki',
        indonesia: 'Tanya arah sekitar sini',
      },
      action: 'ask_direction',
      reply: {
        ngoko: 'Oalah, nek arep menyang Pasar Baru utawa Alun-Alun Tuban, tinggal melu dalan aspal ngulon-ngetan iki wae. Ati-ati ing dalan!',
        krama: 'Oalah, menawi badhe dhateng Peken Enggal utawi Alun-Alun Tuban, ndherek margi aspal punika kemawon. Ngatos-atos!',
        indonesia: 'Kalau mau ke Pasar Baru atau Alun-Alun Tuban, ikuti saja jalan aspal utama ini ke arah timur. Hati-hati di jalan!',
      },
    });

    options.push({
      label: { ngoko: 'Pamit dhisik', krama: 'Nyuwun pamit rumiyin', indonesia: 'Pamit dulu' },
      action: 'close',
    });

    const quote = availableMission
      ? availableMission.startDialogue
      : npc.spawn.ambientQuotes[Math.floor(Math.random() * npc.spawn.ambientQuotes.length)];

    this.state.activeDialogue = {
      npcId,
      npcName: npc.spawn.name,
      npcRole: npc.spawn.role,
      region: npc.spawn.region,
      text: quote,
      options,
    };
    this.emitHud();
  }

  public chooseDialogueOption(idx: number) {
    const dlg = this.state.activeDialogue;
    if (!dlg) return;
    const opt = dlg.options[idx];
    if (!opt) return;

    if (opt.action === 'close') {
      this.closeDialogue();
    } else if (opt.action === 'accept_mission' && opt.missionId) {
      this.startMission(opt.missionId);
      this.closeDialogue();
    } else if (opt.action === 'open_shop' && opt.shopId) {
      this.state.activeDialogue = null;
      this.state.activeShopId = opt.shopId;
      this.emitHud();
    } else if (opt.action === 'ask_direction' && opt.reply) {
      this.state.activeDialogue = {
        ...dlg,
        text: opt.reply,
        options: [
          {
            label: { ngoko: 'Matur nuwun infone!', krama: 'Matur nuwun pangandikanipun!', indonesia: 'Terima kasih infonya!' },
            action: 'close',
          },
        ],
      };
      this.emitHud();
    }
  }

  public closeDialogue() {
    this.state.activeDialogue = null;
    this.emitHud();
  }

  public closeShop() {
    this.state.activeShopId = null;
    this.emitHud();
  }

  public startMission(missionId: string) {
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    this.state.activeMissionId = m.id;
    this.state.activeStepIndex = 0;
    if (m.id === 'misi_2_kambing') {
      this.lostGoatCollected = false;
    }
    this.updateGpsTarget();
    this.audio.playChime();
    this.showToast(`${m.code}: ${t(m.title, this.state.language)}`);
    this.emitHud();
  }

  private checkMissionStepProgress() {
    const m = this.getActiveMission();
    if (!m) return;
    const step = m.steps[this.state.activeStepIndex];
    if (!step) return;

    const dist = Math.hypot(this.playerX - step.targetX, this.playerZ - step.targetZ);
    if (dist > step.targetRadius) return;

    if (step.type === 'goto' || step.type === 'collect' || step.type === 'escort_vehicle') {
      if (step.type === 'escort_vehicle' && !this.currentVehicle) {
        return; // Needs to arrive on a vehicle
      }
      if (m.id === 'misi_2_kambing' && step.id === 'm2_s1') {
        this.lostGoatCollected = true;
        this.showToast('Wedhus ketemu! Gawa balik menyang Pak Karjo!');
      }
      if (m.id === 'misi_5_nelayan' && step.id === 'm5_s1') {
        this.missionPropFishCrate.visible = false;
        this.showToast('Peti iwak dijupuk! Kirim menyang TPI Palang Tuban!');
      }

      if (this.state.activeStepIndex >= m.steps.length - 1) {
        this.completeActiveMission();
      } else {
        this.advanceMissionStep();
      }
    }
  }

  private advanceMissionStep() {
    this.state.activeStepIndex += 1;
    this.audio.playChime();
    this.updateGpsTarget();
    const m = this.getActiveMission();
    if (m) {
      const s = m.steps[this.state.activeStepIndex];
      if (s) this.showToast(t(s.title, this.state.language));
    }
    this.emitHud();
  }

  private completeActiveMission() {
    const m = this.getActiveMission();
    if (!m) return;
    if (!this.state.completedMissionIds.includes(m.id)) {
      this.state.completedMissionIds.push(m.id);
    }
    this.state.money += m.rewardMoney;
    this.state.reputation += m.rewardRep;
    this.gainXp(m.rewardXp);
    this.audio.playMissionFanfare();
    this.showToast(
      `Misi Rampung! +Rp ${m.rewardMoney.toLocaleString('id-ID')} · +${m.rewardXp} XP · +${m.rewardRep} Reputasi`
    );

    // Auto-select next uncompleted mission if available
    const nextMission = MISSIONS.find((x) => !this.state.completedMissionIds.includes(x.id));
    this.state.activeMissionId = nextMission ? nextMission.id : null;
    this.state.activeStepIndex = 0;
    this.missionPropFishCrate.visible = true;
    this.updateGpsTarget();
    this.saveGame(true);
    this.emitHud();
  }

  private gainXp(amount: number) {
    this.state.xp += amount;
    const nextLevel = 1 + Math.floor(this.state.xp / 250);
    if (nextLevel > this.state.level) {
      this.state.level = nextLevel;
      this.state.maxHealth = 100 + (nextLevel - 1) * 10;
      this.state.health = this.state.maxHealth;
    }
  }

  private getActiveMission(): MissionDef | null {
    if (!this.state.activeMissionId) return null;
    return MISSIONS.find((m) => m.id === this.state.activeMissionId) ?? null;
  }

  private updateGpsTarget() {
    const m = this.getActiveMission();
    if (m) {
      const s = m.steps[this.state.activeStepIndex];
      if (s) {
        this.state.gpsTarget = {
          x: s.targetX,
          z: s.targetZ,
          label: s.waypointLabel || t(s.title, this.state.language),
        };
        return;
      }
    }
    this.state.gpsTarget = null;
  }

  public setCustomGpsTarget(x: number, z: number, label: string) {
    this.state.gpsTarget = { x, z, label };
    this.showToast(`GPS diarahake menyang: ${label}`);
    this.emitHud();
  }

  public buyShopItem(shopId: string, itemId: string) {
    const shop = SHOPS[shopId];
    if (!shop) return;
    const item = shop.items.find((i) => i.id === itemId);
    if (!item) return;

    if (this.state.money < item.price) {
      this.showToast('Dhuwite durung cukup, Mas!');
      return;
    }

    this.state.money -= item.price;
    this.audio.playChime();

    if (item.category === 'pakaian' && item.outfitId) {
      if (!this.state.ownedOutfits.includes(item.outfitId)) {
        this.state.ownedOutfits.push(item.outfitId);
      }
      this.equipOutfit(item.outfitId);
      this.showToast(`Klambi anyar dipasang: ${t(item.name, this.state.language)}`);
    } else if (item.category === 'kendaraan' && item.vehicleType) {
      this.spawnPurchasedVehicle(item.vehicleType);
      this.showToast(`${t(item.name, this.state.language)} wis siap ing cedhak bengkel!`);
      this.closeShop();
    } else {
      const existing = this.state.inventory.find((inv) => inv.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.state.inventory.push({
          id: item.id,
          name: item.name,
          category: item.category === 'makanan' ? 'makanan' : 'perlengkapan',
          quantity: 1,
          healAmount: item.healAmount,
          staminaAmount: item.staminaAmount,
          description: item.description,
        });
      }
      this.showToast(`Tuku sukses: ${t(item.name, this.state.language)}`);
    }
    this.emitHud();
  }

  private spawnPurchasedVehicle(type: VehicleType) {
    const sx = this.playerX + 4.5;
    const sz = this.playerZ + 4.5;
    const colors: Record<VehicleType, number> = {
      motor_bebek: 0xdc2626,
      motor_matic: 0x0284c7,
      motor_sport: 0x16a34a,
      mobil_keluarga: 0xe2e8f0,
      pickup: 0x1e293b,
      truk: 0xeab308,
      bus: 0xf59e0b,
      sepeda: 0x334155,
    };
    const model = createVehicleModel(type, colors[type]);
    const gy = surfaceHeightAt(sx, sz);
    model.group.position.set(sx, gy, sz);
    this.scene.add(model.group);
    this.vehicles.push({
      id: `owned_${Date.now()}`,
      type,
      color: colors[type],
      model,
      x: sx,
      y: gy,
      z: sz,
      yaw: 0,
      speed: 0,
      isTraffic: false,
      trafficIndex: 0,
      trafficLoop: TRAFFIC_LOOP,
    });
  }

  public useInventoryItem(itemId: string) {
    const idx = this.state.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = this.state.inventory[idx];
    if (item.category !== 'makanan') {
      this.showToast(t(item.description, this.state.language));
      return;
    }

    this.state.health = Math.min(this.state.maxHealth, this.state.health + (item.healAmount ?? 25));
    this.state.stamina = Math.min(this.state.maxStamina, this.state.stamina + (item.staminaAmount ?? 30));
    item.quantity -= 1;
    if (item.quantity <= 0) {
      this.state.inventory.splice(idx, 1);
    }
    this.audio.playChime();
    this.showToast(`Mangan ${t(item.name, this.state.language)} (+Tenaga & Waras)`);
    this.emitHud();
  }

  public equipOutfit(outfit: OutfitId) {
    if (!this.state.ownedOutfits.includes(outfit)) return;
    this.state.outfit = outfit;
    const outfitStyles: Record<
      OutfitId,
      { shirtStyle: CharacterProfile['shirtStyle']; shirtColor: number; pantsColor: number }
    > = {
      kasual: { shirtStyle: 'tshirt', shirtColor: 0x1e40af, pantsColor: 0x1e293b },
      batik: { shirtStyle: 'batik', shirtColor: 0x92400e, pantsColor: 0x1c1917 },
      jaket_motor: { shirtStyle: 'jaket', shirtColor: 0x15803d, pantsColor: 0x0f172a },
      lurik: { shirtStyle: 'lurik', shirtColor: 0x44403c, pantsColor: 0x292524 },
    };
    const nextStyle = outfitStyles[outfit];
    this.state.character = {
      ...this.state.character,
      shirtStyle: nextStyle.shirtStyle,
      shirtColor: nextStyle.shirtColor,
      pantsColor: nextStyle.pantsColor,
    };
    this.rebuildPlayerRig();
    this.multiplayer?.sendProfile(this.state.character);
    this.emitHud();
  }

  public setAuthUid(uid: string | null) {
    this.authUid = uid;
    if (this.state.screen === 'playing') {
      this.multiplayer.disconnect();
      this.clearRemotePlayers();
      this.multiplayer.connect();
    }
  }

  public resetToMenuOnSignOut() {
    if (this.currentVehicle) this.toggleVehicle();
    this.authUid = null;
    this.multiplayer.disconnect();
    this.clearRemotePlayers();
    this.state.screen = 'menu';
    this.state.character = { ...DEFAULT_CHARACTER_PROFILE };
    this.state.hasCustomCharacter = false;
    this.state.activeDialogue = null;
    this.state.activeShopId = null;
    this.rebuildPlayerRig();
    this.emitHud();
  }

  public setCharacterProfile(
    profile: CharacterProfile,
    opts?: { persistSave?: boolean; notify?: boolean }
  ) {
    const clean = sanitizeCharacterProfile(profile);
    this.state.character = clean;
    this.state.hasCustomCharacter = true;
    this.rebuildPlayerRig();
    this.multiplayer?.sendProfile(clean);
    if (opts?.persistSave !== false && this.authUid) {
      this.saveGame(true);
    }
    if (opts?.notify) {
      this.audio.playChime();
      this.showToast(`Karakter "${clean.name}" wis disimpen menyang Cloud!`);
    }
    this.emitHud();
  }

  public sendOnlineChat(text: string) {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!clean) return;
    this.multiplayer.sendChat(clean);
    this.showLocalChatBubble(clean);
  }

  private rebuildPlayerRig() {
    const wasVisible = this.playerRig ? this.playerRig.group.visible : true;
    if (this.playerRig) {
      this.scene.remove(this.playerRig.group);
    }
    this.playerRig = createCharacterRig(
      characterProfileToBuildOptions(this.state.character, this.textures)
    );
    this.playerRig.group.visible = wasVisible;
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerYaw;
    if (this.localChatSprite) {
      this.playerRig.group.add(this.localChatSprite);
    }
    this.scene.add(this.playerRig.group);
  }

  private showLocalChatBubble(text: string) {
    if (this.localChatSprite) {
      this.playerRig.group.remove(this.localChatSprite);
      this.localChatSprite.material.map?.dispose();
      this.localChatSprite.material.dispose();
      this.localChatSprite = null;
    }
    const sprite = createFloatingLabelSprite(text, 'chat');
    sprite.position.set(0, 2.52, 0);
    this.playerRig.group.add(sprite);
    this.localChatSprite = sprite;
    this.localChatExpiresAt = performance.now() + 5000;
  }

  private updateLocalChatBubble() {
    if (this.localChatSprite && performance.now() > this.localChatExpiresAt) {
      this.playerRig.group.remove(this.localChatSprite);
      this.localChatSprite.material.map?.dispose();
      this.localChatSprite.material.dispose();
      this.localChatSprite = null;
    }
  }

  public setLanguage(lang: LanguageMode) {
    this.state.language = lang;
    this.updateGpsTarget();
    this.emitHud();
  }

  public setWeather(weather: WeatherType) {
    this.state.weather = weather;
    this.showToast(weather === 'hujan' ? 'Langit mendhung, udan deres mulai mudhun...' : 'Cuaca bali cerah lan padhang.');
    this.emitHud();
  }

  public setTimeOfDay(hour: number) {
    this.state.timeOfDay = ((hour % 24) + 24) % 24;
    this.emitHud();
  }

  public setAudioMuted(muted: boolean) {
    this.audio.init();
    this.audio.setMuted(muted);
    this.state.audioMuted = muted;
    this.emitHud();
  }

  public setGamelanEnabled(enabled: boolean) {
    this.audio.init();
    this.audio.setGamelanEnabled(enabled);
    this.state.gamelanEnabled = enabled;
    this.emitHud();
  }

  public setGraphicsMode(mode: 'lancar' | 'seimbang' | 'tinggi') {
    this.state.graphicsMode = mode;
    if (this.isSoftwareGl) {
      this.emitHud();
      return;
    }
    if (mode === 'lancar') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else if (mode === 'seimbang') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(512, 512);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.renderer.shadowMap.needsUpdate = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.handleResize();
    this.showToast(
      mode === 'lancar'
        ? 'Mode Grafis: Lancar (FPS Maksimal)'
        : mode === 'seimbang'
          ? 'Mode Grafis: Seimbang'
          : 'Mode Grafis: Tinggi'
    );
    this.emitHud();
  }

  public setVirtualMove(x: number, y: number) {
    this.virtualMove.x = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMove.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  public jump() {
    this.audio.init();
    if (this.state.screen !== 'playing' || this.state.activeDialogue || this.state.activeShopId) return;
    if (!this.currentVehicle && this.isGrounded) {
      this.playerVy = 7.4;
      this.isGrounded = false;
    }
  }

  public setScreen(screen: 'menu' | 'playing' | 'paused') {
    this.audio.init();
    this.state.screen = screen;
    if (screen === 'playing') {
      this.multiplayer.connect();
    } else if (screen === 'menu') {
      this.multiplayer.disconnect();
      this.clearRemotePlayers();
    }
    this.emitHud();
  }

  public startNewGame() {
    this.audio.init();
    if (this.currentVehicle) this.toggleVehicle();
    this.playerX = -12;
    this.playerZ = 10;
    this.playerY = surfaceHeightAt(this.playerX, this.playerZ);
    this.playerYaw = 0;
    this.lostGoatCollected = false;
    this.state = {
      ...this.state,
      screen: 'playing',
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      money: 50000,
      xp: 0,
      level: 1,
      reputation: 10,
      region: 'desa',
      timeOfDay: 8.5,
      weather: 'cerah',
      outfit: 'kasual',
      ownedOutfits: ['kasual'],
      inventory: structuredClone(INITIAL_INVENTORY),
      activeMissionId: 'misi_1_tangga',
      activeStepIndex: 0,
      completedMissionIds: [],
      discoveredLandmarks: ['lm_desa'],
      activeDialogue: null,
      activeShopId: null,
    };
    this.rebuildPlayerRig();
    this.multiplayer.connect();
    this.updateGpsTarget();
    this.showToast(`Sugeng rawuh ing Tuban, ${this.state.character.name}!`);
    if (this.authUid) {
      this.saveGame(true);
    }
    this.emitHud();
  }

  public setOnSaveListener(cb: ((payload: SaveData, silent: boolean) => void) | null) {
    this.onSaveListener = cb;
  }

  public exportSavePayload(): SaveData {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      language: this.state.language,
      health: this.state.health,
      stamina: this.state.stamina,
      money: this.state.money,
      xp: this.state.xp,
      reputation: this.state.reputation,
      timeOfDay: this.state.timeOfDay,
      weather: this.state.weather,
      playerX: this.playerX,
      playerZ: this.playerZ,
      outfit: this.state.outfit,
      ownedOutfits: this.state.ownedOutfits,
      character: this.state.character,
      inventory: this.state.inventory,
      activeMissionId: this.state.activeMissionId,
      activeStepIndex: this.state.activeStepIndex,
      completedMissionIds: this.state.completedMissionIds,
      discoveredLandmarks: this.state.discoveredLandmarks,
    };
  }

  public saveGame(silent = false) {
    if (!this.authUid) {
      if (!silent) {
        this.showToast('Masuk akun online dhisik kanggo nyimpen menyang Cloud!');
        this.emitHud();
      }
      return;
    }
    const payload = this.exportSavePayload();
    if (!silent) {
      this.audio.playChime();
    }
    this.onSaveListener?.(payload, silent);
    this.emitHud();
  }

  public applySaveData(data: SaveData, toastText = 'Sugeng rawuh malih ing Bumi Wali Tuban!'): boolean {
    if (this.currentVehicle) this.toggleVehicle();
    this.playerX = data.playerX ?? -12;
    this.playerZ = data.playerZ ?? 10;
    this.playerY = surfaceHeightAt(this.playerX, this.playerZ);

    this.state.language = data.language ?? 'ngoko';
    this.state.health = data.health ?? 100;
    this.state.stamina = data.stamina ?? 100;
    this.state.money = data.money ?? 50000;
    this.state.xp = data.xp ?? 0;
    this.state.level = 1 + Math.floor(this.state.xp / 250);
    this.state.maxHealth = 100 + (this.state.level - 1) * 10;
    this.state.reputation = data.reputation ?? 10;
    this.state.timeOfDay = data.timeOfDay ?? 8.5;
    this.state.weather = data.weather ?? 'cerah';
    this.state.outfit = data.outfit ?? 'kasual';
    this.state.ownedOutfits = data.ownedOutfits ?? ['kasual'];
    if (data.character) {
      this.state.character = sanitizeCharacterProfile(data.character);
      this.state.hasCustomCharacter = true;
    }
    this.state.inventory = data.inventory ?? structuredClone(INITIAL_INVENTORY);
    this.state.activeMissionId = data.activeMissionId ?? null;
    this.state.activeStepIndex = data.activeStepIndex ?? 0;
    this.state.completedMissionIds = data.completedMissionIds ?? [];
    this.state.discoveredLandmarks = data.discoveredLandmarks ?? ['lm_desa'];
    this.state.screen = 'playing';
    this.state.activeDialogue = null;
    this.state.activeShopId = null;

    this.rebuildPlayerRig();
    this.multiplayer.connect();
    this.multiplayer.sendProfile(this.state.character);
    this.updateGpsTarget();
    this.showToast(toastText);
    this.emitHud();
    return true;
  }

  public notifyToast(msg: string) {
    this.showToast(msg);
    this.emitHud();
  }

  public teleportToLandmark(x: number, z: number, label: string) {
    if (this.currentVehicle) this.toggleVehicle();
    this.playerX = x;
    this.playerZ = z;
    this.playerY = surfaceHeightAt(x, z);
    this.showToast(`Pindhah menyang ${label}`);
    this.emitHud();
  }

  private showToast(msg: string) {
    this.state.toastMessage = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      this.state.toastMessage = null;
      this.emitHud();
    }, 4000);
  }

  private initMultiplayer() {
    this.multiplayer = new TubanMultiplayerClient(
      () => ({
        uid: this.authUid,
        character: this.state.character,
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        yaw: this.playerYaw,
        speed: this.currentVehicle ? Math.abs(this.currentVehicle.speed) : this.state.speedKmh / 3.6,
        region: this.state.region,
        inVehicle: Boolean(this.currentVehicle),
        vehicleType: this.currentVehicle?.type ?? null,
        vehicleColor: this.currentVehicle?.color ?? 0x1e40af,
      }),
      {
        onConnectionChange: (connected) => {
          this.state.onlineConnected = connected;
          if (!connected) {
            this.clearRemotePlayers();
          }
          this.emitHud();
        },
        onWelcome: (_selfId, players) => {
          this.clearRemotePlayers();
          for (const p of players) {
            this.upsertRemotePlayer(p);
          }
          this.emitHud();
        },
        onPlayerJoined: (player) => {
          const isNew = !this.remotePlayers.has(player.id);
          this.upsertRemotePlayer(player);
          if (isNew && this.state.screen === 'playing') {
            this.showToast(`${player.character.name} mlebu ing Tuban Online!`);
          }
          this.emitHud();
        },
        onPlayerState: (update) => {
          const rp = this.remotePlayers.get(update.id);
          if (!rp) return;
          rp.targetX = update.x;
          rp.targetY = update.y;
          rp.targetZ = update.z;
          rp.targetYaw = update.yaw;
          rp.targetSpeed = update.speed;
          rp.info.x = update.x;
          rp.info.y = update.y;
          rp.info.z = update.z;
          rp.info.yaw = update.yaw;
          rp.info.speed = update.speed;
          rp.info.region = update.region;
          rp.info.inVehicle = update.inVehicle;
          rp.info.vehicleType = update.vehicleType;
          rp.info.vehicleColor = update.vehicleColor;
          this.syncRemoteVehicleModel(rp);
        },
        onPlayerProfile: (id, character) => {
          const rp = this.remotePlayers.get(id);
          if (!rp) return;
          rp.info.character = sanitizeCharacterProfile(character);
          rp.group.remove(rp.rig.group);
          rp.rig = createCharacterRig(
            characterProfileToBuildOptions(rp.info.character, this.textures)
          );
          rp.group.add(rp.rig.group);
          rp.group.remove(rp.nameSprite);
          rp.nameSprite.material.map?.dispose();
          rp.nameSprite.material.dispose();
          rp.nameSprite = createFloatingLabelSprite(rp.info.character.name, 'name');
          rp.nameSprite.position.set(0, 2.22, 0);
          rp.group.add(rp.nameSprite);
          this.emitHud();
        },
        onPlayerLeft: (id) => {
          const rp = this.remotePlayers.get(id);
          if (rp) {
            this.removeRemotePlayer(id);
            this.emitHud();
          }
        },
        onChat: (msg: OnlineChatMessage) => {
          if (!this.state.recentChat.some((m) => m.id === msg.id)) {
            this.state.recentChat = [...this.state.recentChat.slice(-14), msg];
          }
          const rp = this.remotePlayers.get(msg.senderId);
          if (rp) {
            if (rp.chatSprite) {
              rp.group.remove(rp.chatSprite);
              rp.chatSprite.material.map?.dispose();
              rp.chatSprite.material.dispose();
            }
            const bubble = createFloatingLabelSprite(msg.text, 'chat');
            bubble.position.set(0, 2.72, 0);
            rp.group.add(bubble);
            rp.chatSprite = bubble;
            rp.chatExpiresAt = performance.now() + 5000;
          }
          this.emitHud();
        },
      }
    );
  }

  private upsertRemotePlayer(info: OnlinePlayerInfo) {
    if (this.remotePlayers.has(info.id)) {
      this.removeRemotePlayer(info.id);
    }
    const cleanChar = sanitizeCharacterProfile(info.character);
    const group = new THREE.Group();
    const gy = Number.isFinite(info.y) ? info.y : surfaceHeightAt(info.x, info.z);
    group.position.set(info.x, gy, info.z);

    const rig = createCharacterRig(characterProfileToBuildOptions(cleanChar, this.textures));
    rig.group.rotation.y = info.yaw;
    group.add(rig.group);

    const nameSprite = createFloatingLabelSprite(cleanChar.name, 'name');
    nameSprite.position.set(0, 2.22, 0);
    group.add(nameSprite);

    this.scene.add(group);
    const rp: RemotePlayerRuntime = {
      info: { ...info, character: cleanChar },
      group,
      rig,
      anim: createAnimState(Math.random() * Math.PI * 2),
      nameSprite,
      chatSprite: null,
      chatExpiresAt: 0,
      vehicleModel: null,
      vehicleTypeLoaded: null,
      vehicleColorLoaded: info.vehicleColor,
      curX: info.x,
      curY: gy,
      curZ: info.z,
      curYaw: info.yaw,
      targetX: info.x,
      targetY: gy,
      targetZ: info.z,
      targetYaw: info.yaw,
      targetSpeed: info.speed ?? 0,
    };
    this.syncRemoteVehicleModel(rp);
    this.remotePlayers.set(info.id, rp);
  }

  private syncRemoteVehicleModel(rp: RemotePlayerRuntime) {
    if (!rp.info.inVehicle || !rp.info.vehicleType) {
      if (rp.vehicleModel) {
        rp.group.remove(rp.vehicleModel.group);
        rp.vehicleModel = null;
        rp.vehicleTypeLoaded = null;
      }
      rp.rig.group.visible = true;
      rp.rig.group.position.set(0, 0, 0);
      rp.nameSprite.position.set(0, 2.22, 0);
      return;
    }
    if (
      rp.vehicleTypeLoaded !== rp.info.vehicleType ||
      rp.vehicleColorLoaded !== rp.info.vehicleColor
    ) {
      if (rp.vehicleModel) {
        rp.group.remove(rp.vehicleModel.group);
      }
      rp.vehicleModel = createVehicleModel(rp.info.vehicleType, rp.info.vehicleColor);
      rp.vehicleTypeLoaded = rp.info.vehicleType;
      rp.vehicleColorLoaded = rp.info.vehicleColor;
      rp.group.add(rp.vehicleModel.group);
    }
    if (rp.vehicleModel) {
      rp.rig.group.visible = rp.vehicleModel.isOpenRide;
      rp.nameSprite.position.set(0, rp.vehicleModel.isOpenRide ? 2.4 : 2.65, 0);
    }
  }

  private removeRemotePlayer(id: string) {
    const rp = this.remotePlayers.get(id);
    if (!rp) return;
    rp.nameSprite.material.map?.dispose();
    rp.nameSprite.material.dispose();
    if (rp.chatSprite) {
      rp.chatSprite.material.map?.dispose();
      rp.chatSprite.material.dispose();
    }
    this.scene.remove(rp.group);
    this.remotePlayers.delete(id);
  }

  private clearRemotePlayers() {
    for (const id of Array.from(this.remotePlayers.keys())) {
      this.removeRemotePlayer(id);
    }
  }

  private updateRemotePlayers(dt: number) {
    const now = performance.now();
    for (const rp of this.remotePlayers.values()) {
      rp.curX = THREE.MathUtils.damp(rp.curX, rp.targetX, 11, dt);
      rp.curY = THREE.MathUtils.damp(rp.curY, rp.targetY, 14, dt);
      rp.curZ = THREE.MathUtils.damp(rp.curZ, rp.targetZ, 11, dt);
      rp.curYaw = this.lerpAngle(rp.curYaw, rp.targetYaw, Math.min(1, 12 * dt));
      rp.group.position.set(rp.curX, rp.curY, rp.curZ);

      const distMoved = Math.hypot(rp.targetX - rp.curX, rp.targetZ - rp.curZ);
      const effectiveSpeed = Math.max(rp.targetSpeed, distMoved * 6);

      if (rp.vehicleModel) {
        rp.vehicleModel.group.rotation.y = rp.curYaw;
        const spin = effectiveSpeed * dt * 2.5;
        for (const w of rp.vehicleModel.wheels) {
          w.rotation.x += spin;
        }
        if (rp.vehicleModel.isOpenRide) {
          const sinY = Math.sin(rp.curYaw);
          const cosY = Math.cos(rp.curYaw);
          rp.rig.group.position.set(
            sinY * rp.vehicleModel.seatZ,
            rp.vehicleModel.seatY - 0.55,
            cosY * rp.vehicleModel.seatZ
          );
          rp.rig.group.rotation.y = rp.curYaw;
          rp.rig.spineGroup.rotation.set(0.18, 0, 0);
          rp.rig.leftLeg.rotation.set(-0.95, 0, -0.08);
          rp.rig.rightLeg.rotation.set(-0.95, 0, 0.08);
          rp.rig.leftKnee.rotation.x = 1.05;
          rp.rig.rightKnee.rotation.x = 1.05;
          rp.rig.leftArm.rotation.set(-0.65, 0, -0.14);
          rp.rig.rightArm.rotation.set(-0.65, 0, 0.14);
        }
      } else {
        rp.rig.group.rotation.y = rp.curYaw;
        const moveScale = THREE.MathUtils.clamp(effectiveSpeed / 5.2, 0, 1);
        const sprintBlend = effectiveSpeed > 6.5 ? 1 : 0;
        this.animateHumanRig(rp.rig, rp.anim, moveScale, sprintBlend, true, 0, 0, dt);
      }

      if (rp.chatSprite && now > rp.chatExpiresAt) {
        rp.group.remove(rp.chatSprite);
        rp.chatSprite.material.map?.dispose();
        rp.chatSprite.material.dispose();
        rp.chatSprite = null;
      }
    }
  }

  private syncMultiplayerState(dt: number) {
    if (!this.state.onlineConnected) return;
    this.mpSendAccum += dt;
    const movedDist = Math.hypot(this.playerX - this.mpLastSent.x, this.playerZ - this.mpLastSent.z);
    const yawDiff = Math.abs(this.playerYaw - this.mpLastSent.yaw);
    const vehChanged = Boolean(this.currentVehicle) !== this.mpLastSent.inVehicle;
    const isActive = movedDist > 0.04 || yawDiff > 0.04 || vehChanged;
    const interval = isActive ? 0.09 : 1.0;

    if (this.mpSendAccum < interval) return;
    this.mpSendAccum = 0;
    this.mpLastSent = {
      x: this.playerX,
      y: this.playerY,
      z: this.playerZ,
      yaw: this.playerYaw,
      inVehicle: Boolean(this.currentVehicle),
    };

    this.multiplayer.sendState({
      x: this.playerX,
      y: this.playerY,
      z: this.playerZ,
      yaw: this.playerYaw,
      speed: this.currentVehicle ? Math.abs(this.currentVehicle.speed) : this.state.speedKmh / 3.6,
      region: this.state.region,
      inVehicle: Boolean(this.currentVehicle),
      vehicleType: this.currentVehicle?.type ?? null,
      vehicleColor: this.currentVehicle?.color ?? 0x1e40af,
    });
  }

  private emitHud() {
    const entities: MinimapEntity[] = [...GameEngine.STATIC_LANDMARK_ENTITIES];
    for (const n of this.npcs) {
      entities.push({ x: n.x, z: n.z, kind: 'npc', label: n.spawn.name });
    }
    for (const v of this.vehicles) {
      if (!v.isTraffic) {
        entities.push({ x: v.x, z: v.z, kind: 'vehicle' });
      }
    }
    const onlineList: OnlinePlayerInfo[] = [];
    for (const rp of this.remotePlayers.values()) {
      entities.push({
        x: rp.curX,
        z: rp.curZ,
        kind: 'remote_player',
        label: rp.info.character.name,
      });
      onlineList.push({
        ...rp.info,
        x: rp.curX,
        y: rp.curY,
        z: rp.curZ,
        yaw: rp.curYaw,
      });
    }
    if (this.state.gpsTarget) {
      entities.push({ x: this.state.gpsTarget.x, z: this.state.gpsTarget.z, kind: 'mission' });
    }

    this.state.onlinePlayers = onlineList;
    this.state.minimapEntities = entities;
    this.onHudUpdate({ ...this.state });
  }

  public dispose() {
    this.disposed = true;
    this.multiplayer?.disconnect();
    this.clearRemotePlayers();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry && !obj.geometry.userData?.shared) {
          obj.geometry.dispose();
        }
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.audio.dispose();
  }
}
