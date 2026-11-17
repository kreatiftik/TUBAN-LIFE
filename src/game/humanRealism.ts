import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export type CharacterQualityTier = 'lancar' | 'seimbang' | 'tinggi';

export interface HumanRealismTextures {
  faceMap1024: THREE.CanvasTexture;
  faceMap512: THREE.CanvasTexture;
  skinPoreNormal: THREE.CanvasTexture;
  clothFoldNormal: THREE.CanvasTexture;
  hairStrandMap: THREE.CanvasTexture;
  hairStrandAlpha: THREE.CanvasTexture;
  eyeIris512: THREE.CanvasTexture;
}

export interface CharacterRealismHandle {
  leftEye: THREE.Object3D | null;
  rightEye: THREE.Object3D | null;
  leftEyelidPivot: THREE.Object3D | null;
  rightEyelidPivot: THREE.Object3D | null;
  detailGroup: THREE.Group;
  hairCardGroup: THREE.Group;
  glbRoot: THREE.Object3D | null;
  glbMixer: THREE.AnimationMixer | null;
  glbIdleAction: THREE.AnimationAction | null;
  glbWalkAction: THREE.AnimationAction | null;
}

export interface CharacterRealismState {
  blinkTimer: number;
  nextBlinkAt: number;
  blinkProgress: number;
  isBlinking: boolean;
  doubleBlinkQueued: boolean;
  saccadeTimer: number;
  nextSaccadeAt: number;
  targetEyeX: number;
  targetEyeY: number;
  curEyeX: number;
  curEyeY: number;
  breathPhase: number;
}

export function createCharacterRealismState(seedOffset = 0): CharacterRealismState {
  return {
    blinkTimer: seedOffset % 2.5,
    nextBlinkAt: 2.2 + (seedOffset % 3.1),
    blinkProgress: 0,
    isBlinking: false,
    doubleBlinkQueued: false,
    saccadeTimer: 0,
    nextSaccadeAt: 1.4 + (seedOffset % 1.8),
    targetEyeX: 0,
    targetEyeY: 0,
    curEyeX: 0,
    curEyeY: 0,
    breathPhase: seedOffset,
  };
}

let cachedRealismTextures: HumanRealismTextures | null = null;

function createAnatomicalFaceTexture(size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base neutral skin multiplier so vertex/material baseSkinHex tints faithfully
  ctx.fillStyle = '#fcf8f4';
  ctx.fillRect(0, 0, size, size);

  // Subtle epidermal pore & freckle micro-variation
  let seed = 7919;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const dotCount = size >= 1024 ? 6800 : 2600;
  for (let i = 0; i < dotCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (size / 512) * (0.55 + rand() * 1.45);
    const v = 240 + Math.floor(rand() * 15);
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Exact UV inverse matching SphereGeometry(-PI/2, 2*PI)
  const facePx = (nx: number, ny: number): [number, number] => {
    const nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));
    const u = 0.5 + Math.atan2(nx, nz) / (Math.PI * 2);
    const v = 0.5 + Math.asin(THREE.MathUtils.clamp(ny, -1, 1)) / Math.PI;
    return [u * size, (1 - v) * size];
  };

  const scale = size / 512;
  const paintGlow = (nx: number, ny: number, rx: number, ry: number, inner: string, outer: string) => {
    const [cx, cy] = facePx(nx, ny);
    const srx = rx * scale;
    const sry = ry * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, sry / srx);
    const g = ctx.createRadialGradient(0, 0, srx * 0.08, 0, 0, srx);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, srx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Subsurface blood warmth across zygomatic cheeks, nose bridge/tip, forehead & chin
  paintGlow(-0.48, -0.10, 38, 26, 'rgba(222, 114, 92, 0.20)', 'rgba(222, 114, 92, 0)');
  paintGlow(0.48, -0.10, 38, 26, 'rgba(222, 114, 92, 0.20)', 'rgba(222, 114, 92, 0)');
  paintGlow(0, -0.19, 19, 17, 'rgba(220, 120, 96, 0.18)', 'rgba(220, 120, 96, 0)');
  paintGlow(0, 0.34, 46, 22, 'rgba(225, 152, 128, 0.10)', 'rgba(225, 152, 128, 0)');
  paintGlow(0, -0.68, 24, 16, 'rgba(220, 130, 108, 0.12)', 'rgba(220, 130, 108, 0)');

  // Subtle nasal bridge specular warmth highlight
  paintGlow(0, -0.02, 10, 26, 'rgba(255, 248, 240, 0.26)', 'rgba(255, 248, 240, 0)');

  // Orbital eye socket AO, upper eyelid crease & warm inner canthus corner
  paintGlow(-0.355, 0.06, 23, 17, 'rgba(104, 62, 46, 0.28)', 'rgba(104, 62, 46, 0)');
  paintGlow(0.355, 0.06, 23, 17, 'rgba(104, 62, 46, 0.28)', 'rgba(104, 62, 46, 0)');
  paintGlow(-0.22, 0.035, 8, 6, 'rgba(195, 95, 84, 0.20)', 'rgba(195, 95, 84, 0)');
  paintGlow(0.22, 0.035, 8, 6, 'rgba(195, 95, 84, 0.20)', 'rgba(195, 95, 84, 0)');

  // Subtle lower-lid tear trough & temple shadow for realistic cranial depth
  paintGlow(-0.355, -0.055, 18, 9, 'rgba(116, 76, 66, 0.14)', 'rgba(116, 76, 66, 0)');
  paintGlow(0.355, -0.055, 18, 9, 'rgba(116, 76, 66, 0.14)', 'rgba(116, 76, 66, 0)');
  paintGlow(-0.74, 0.14, 24, 34, 'rgba(118, 80, 62, 0.12)', 'rgba(118, 80, 62, 0)');
  paintGlow(0.74, 0.14, 24, 34, 'rgba(118, 80, 62, 0.12)', 'rgba(118, 80, 62, 0)');

  // Nostril underside & alar crease shadow
  paintGlow(-0.115, -0.262, 9.5, 6.5, 'rgba(72, 38, 28, 0.34)', 'rgba(72, 38, 28, 0)');
  paintGlow(0.115, -0.262, 9.5, 6.5, 'rgba(72, 38, 28, 0.34)', 'rgba(72, 38, 28, 0)');

  // Philtrum highlight ridges
  [-0.038, 0.038].forEach((px) => {
    const [x0, y0] = facePx(px, -0.27);
    const [x1, y1] = facePx(px * 1.1, -0.37);
    ctx.strokeStyle = 'rgba(255, 244, 236, 0.26)';
    ctx.lineWidth = 2.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  });

  // Soft nasolabial fold lines
  [-1, 1].forEach((s) => {
    const [x0, y0] = facePx(s * 0.165, -0.24);
    const [x1, y1] = facePx(s * 0.275, -0.465);
    ctx.strokeStyle = 'rgba(124, 74, 56, 0.15)';
    ctx.lineWidth = 4.2 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) * 0.5 + s * 4 * scale, (y0 + y1) * 0.5, x1, y1);
    ctx.stroke();
  });

  // Anatomically contoured upper & lower lips + Cupid's bow + natural moist sheen
  const [lxL, lyL] = facePx(-0.205, -0.45);
  const [lxC, lyTop] = facePx(0, -0.392);
  const [lxR, lyR] = facePx(0.205, -0.45);
  const [, lyBot] = facePx(0, -0.525);

  const lipGrad = ctx.createLinearGradient(0, lyTop, 0, lyBot);
  lipGrad.addColorStop(0, 'rgba(162, 72, 68, 0.48)');
  lipGrad.addColorStop(0.5, 'rgba(148, 66, 62, 0.44)');
  lipGrad.addColorStop(1, 'rgba(182, 90, 82, 0.42)');
  ctx.fillStyle = lipGrad;
  ctx.beginPath();
  ctx.moveTo(lxL, lyL);
  ctx.quadraticCurveTo(lxC - 8 * scale, lyTop - 2 * scale, lxC, lyTop + 2 * scale);
  ctx.quadraticCurveTo(lxC + 8 * scale, lyTop - 2 * scale, lxR, lyR);
  ctx.quadraticCurveTo(lxC, lyBot + 3 * scale, lxL, lyL);
  ctx.closePath();
  ctx.fill();

  // Subtle moist highlight on lower lip center
  paintGlow(0, -0.495, 11, 4.5, 'rgba(255, 224, 214, 0.24)', 'rgba(255, 224, 214, 0)');

  // Lip parting line & mouth corner shadows
  ctx.strokeStyle = 'rgba(66, 28, 24, 0.58)';
  ctx.lineWidth = 2.0 * scale;
  ctx.beginPath();
  ctx.moveTo(lxL + 2 * scale, lyL);
  ctx.quadraticCurveTo(lxC, lyL + 2 * scale, lxR - 2 * scale, lyR);
  ctx.stroke();
  paintGlow(-0.21, -0.45, 7, 5, 'rgba(72, 36, 30, 0.24)', 'rgba(72, 36, 30, 0)');
  paintGlow(0.21, -0.45, 7, 5, 'rgba(72, 36, 30, 0.24)', 'rgba(72, 36, 30, 0)');

  // Under-chin & jawline soft ambient occlusion vignette
  paintGlow(0, -0.84, 70, 30, 'rgba(88, 52, 40, 0.22)', 'rgba(88, 52, 40, 0)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildNormalTexture(
  size: number,
  strength: number,
  heightFn: (x: number, y: number) => number,
  repeat = 2
): THREE.CanvasTexture {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h[y * size + x] = heightFn(x, y);
    }
  }
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const sample = (x: number, y: number) =>
    h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1) || 1;
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

function createHiResIrisTexture(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size * 0.5;
  const scale = size / 256;

  // Sclera with realistic gentle corner vascular warmth
  const sg = ctx.createRadialGradient(half, half, 36 * scale, half, half, half);
  sg.addColorStop(0, '#f8f5f1');
  sg.addColorStop(0.68, '#f0e9e2');
  sg.addColorStop(1, '#d6ada6');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(half, half);

  const irisR = 47 * scale;
  const ig = ctx.createRadialGradient(0, 0, 12 * scale, 0, 0, irisR);
  ig.addColorStop(0, '#6a401f');
  ig.addColorStop(0.45, '#472813');
  ig.addColorStop(0.84, '#29160b');
  ig.addColorStop(1, '#100906');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(0, 0, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Radial stromal iris fibers for lifelike iris texture
  for (let i = 0; i < 64; i++) {
    const ang = (i / 64) * Math.PI * 2;
    const inner = 17 * scale;
    const outer = (39 + (i % 3) * 2) * scale;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(138, 92, 50, 0.34)' : 'rgba(26, 12, 6, 0.28)';
    ctx.lineWidth = (1.1 + (i % 2) * 0.5) * scale;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
    ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
    ctx.stroke();
  }

  // Dark limbal ring
  ctx.strokeStyle = 'rgba(14, 9, 7, 0.85)';
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, irisR - 1.5 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp pupil
  ctx.fillStyle = '#060505';
  ctx.beginPath();
  ctx.arc(0, 0, 17.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Subtle baked secondary catchlight complement (primary catchlight comes from physical cornea clearcoat)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.beginPath();
  ctx.arc(-11 * scale, -11 * scale, 4.4 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHairStrandTextures(): { map: THREE.CanvasTexture; alpha: THREE.CanvasTexture } {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = size;
  alphaCanvas.height = size;
  const aCtx = alphaCanvas.getContext('2d')!;

  cCtx.fillStyle = '#d4d4d8';
  cCtx.fillRect(0, 0, size, size);
  aCtx.fillStyle = '#000000';
  aCtx.fillRect(0, 0, size, size);

  let seed = 3191;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 150; i++) {
    const x = (i / 150) * size + (rand() - 0.5) * 2.5;
    const tipY = size * (0.68 + rand() * 0.30);
    const sway = (rand() - 0.5) * 14;
    const tone = Math.floor(196 + rand() * 58);
    cCtx.strokeStyle = `rgb(${tone},${tone - 2},${tone - 4})`;
    cCtx.lineWidth = 1.4 + rand() * 2.1;
    cCtx.beginPath();
    cCtx.moveTo(x, 0);
    cCtx.quadraticCurveTo(x + sway * 0.5, tipY * 0.5, x + sway, tipY);
    cCtx.stroke();

    const grad = aCtx.createLinearGradient(0, 0, 0, tipY);
    grad.addColorStop(0, 'rgba(255,255,255,0.96)');
    grad.addColorStop(0.62, 'rgba(255,255,255,0.92)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    aCtx.strokeStyle = grad;
    aCtx.lineWidth = 2.0 + rand() * 2.4;
    aCtx.beginPath();
    aCtx.moveTo(x, 0);
    aCtx.quadraticCurveTo(x + sway * 0.5, tipY * 0.5, x + sway, tipY);
    aCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const alpha = new THREE.CanvasTexture(alphaCanvas);
  alpha.colorSpace = THREE.NoColorSpace;
  return { map, alpha };
}

export function getHumanRealismTextures(): HumanRealismTextures {
  if (!cachedRealismTextures) {
    const hair = createHairStrandTextures();
    cachedRealismTextures = {
      faceMap1024: createAnatomicalFaceTexture(1024),
      faceMap512: createAnatomicalFaceTexture(512),
      skinPoreNormal: buildNormalTexture(
        256,
        1.15,
        (x, y) =>
          Math.sin(x * 1.35) * Math.cos(y * 1.35) * 0.22 +
          Math.sin(x * 0.45 + y * 0.32) * 0.14,
        3
      ),
      clothFoldNormal: buildNormalTexture(
        256,
        1.65,
        (x, y) =>
          (Math.sin(x * 1.25) + Math.cos(y * 1.25)) * 0.18 +
          Math.sin(x * 0.11 + Math.sin(y * 0.06) * 1.9) * 0.48 +
          Math.sin((x + y) * 0.09) * 0.22,
        2
      ),
      hairStrandMap: hair.map,
      hairStrandAlpha: hair.alpha,
      eyeIris512: createHiResIrisTexture(512),
    };
  }
  return cachedRealismTextures;
}

export function createHumanSkinMaterial(params: {
  color: number;
  map: THREE.Texture;
  normalMap: THREE.Texture;
  normalScale: number;
  roughness: number;
  tier: CharacterQualityTier;
}): THREE.MeshStandardMaterial {
  if (params.tier === 'lancar') {
    return new THREE.MeshStandardMaterial({
      color: params.color,
      map: params.map,
      normalMap: params.normalMap,
      normalScale: new THREE.Vector2(params.normalScale, params.normalScale),
      roughness: params.roughness,
      metalness: 0.01,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: params.color,
    map: params.map,
    normalMap: params.normalMap,
    normalScale: new THREE.Vector2(params.normalScale, params.normalScale),
    roughness: params.roughness,
    metalness: 0.01,
    sheen: 0.24,
    sheenRoughness: 0.82,
    sheenColor: new THREE.Color(0xf6b89e),
    specularIntensity: 0.42,
    clearcoat: params.tier === 'tinggi' ? 0.06 : 0,
    clearcoatRoughness: 0.65,
  });
}

export function createHumanClothMaterial(params: {
  color: number;
  roughness: number;
  metalness: number;
  map: THREE.Texture | null;
  normalMap: THREE.Texture;
  normalScale: number;
  side?: THREE.Side;
  tier: CharacterQualityTier;
}): THREE.MeshStandardMaterial {
  if (params.tier === 'lancar') {
    return new THREE.MeshStandardMaterial({
      color: params.color,
      roughness: params.roughness,
      metalness: params.metalness,
      map: params.map,
      normalMap: params.normalMap,
      normalScale: new THREE.Vector2(params.normalScale, params.normalScale),
      side: params.side ?? THREE.FrontSide,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: params.color,
    roughness: params.roughness,
    metalness: params.metalness,
    map: params.map,
    normalMap: params.normalMap,
    normalScale: new THREE.Vector2(params.normalScale, params.normalScale),
    side: params.side ?? THREE.FrontSide,
    sheen: 0.58,
    sheenRoughness: 0.68,
    sheenColor: new THREE.Color(params.color).lerp(new THREE.Color(0xffffff), 0.35),
  });
}

export function createHumanCorneaMaterial(tier: CharacterQualityTier): THREE.MeshPhysicalMaterial | null {
  if (tier === 'lancar') return null;
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 1.4,
    depthWrite: false,
  });
}

// ---------- Hybrid GLB Realistic Human Cache & Loader (GLTFLoader + DRACOLoader) ----------
let sharedGltfLoader: GLTFLoader | null = null;
const GLB_HUMAN_CACHE = new Map<string, { scene: THREE.Group; animations: THREE.AnimationClip[] }>();

function getGltfLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.setDRACOLoader(draco);
  }
  return sharedGltfLoader;
}

export async function loadRealisticHumanGlb(
  url: string
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] } | null> {
  if (!url) return null;
  const cached = GLB_HUMAN_CACHE.get(url);
  if (cached) {
    return { scene: cached.scene.clone(true), animations: cached.animations };
  }
  try {
    const loader = getGltfLoader();
    const gltf = await loader.loadAsync(url);
    const root = gltf.scene;

    // Normalize scale & bottom-center grounding to ~1.70m human height
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    if (size.y > 0.05 && Number.isFinite(size.y)) {
      const targetHeight = 1.70;
      const scale = targetHeight / size.y;
      root.scale.multiplyScalar(scale);
      root.updateMatrixWorld(true);
      const normBox = new THREE.Box3().setFromObject(root);
      const normCenter = new THREE.Vector3();
      normBox.getCenter(normCenter);
      root.position.x -= normCenter.x;
      root.position.z -= normCenter.z;
      root.position.y -= normBox.min.y;
    }

    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    GLB_HUMAN_CACHE.set(url, { scene: root, animations: gltf.animations ?? [] });
    return { scene: root.clone(true), animations: gltf.animations ?? [] };
  } catch {
    return null;
  }
}

export function updateCharacterRealism(
  realism: CharacterRealismHandle,
  anim: CharacterRealismState,
  dt: number,
  tier: CharacterQualityTier,
  distSq = 0,
  isMoving = false
) {
  const safeDt = Math.min(dt, 0.05);

  // Distance-based LOD for multiplayer FPS stability
  const showDetail = tier !== 'lancar' && distSq < 22 * 22;
  const showHairCards = tier !== 'lancar' && distSq < 18 * 18;
  if (realism.detailGroup.visible !== showDetail) {
    realism.detailGroup.visible = showDetail;
  }
  if (realism.hairCardGroup.visible !== showHairCards) {
    realism.hairCardGroup.visible = showHairCards;
  }

  // Natural human eye blinking
  anim.blinkTimer += safeDt;
  if (!anim.isBlinking && anim.blinkTimer >= anim.nextBlinkAt) {
    anim.isBlinking = true;
    anim.blinkProgress = 0;
    anim.blinkTimer = 0;
    anim.doubleBlinkQueued = Math.random() < 0.16;
  }

  let blinkAmount = 0;
  if (anim.isBlinking) {
    anim.blinkProgress += safeDt * 7.8; // ~0.13s crisp human blink
    if (anim.blinkProgress >= 1) {
      anim.isBlinking = false;
      anim.blinkProgress = 0;
      if (anim.doubleBlinkQueued) {
        anim.doubleBlinkQueued = false;
        anim.nextBlinkAt = 0.14;
      } else {
        anim.nextBlinkAt = 2.8 + Math.random() * 3.4;
      }
    } else {
      blinkAmount = Math.sin(anim.blinkProgress * Math.PI);
    }
  }

  if (realism.leftEyelidPivot && realism.rightEyelidPivot) {
    // Upper eyelid rotates downward around eyeball center to close cleanly
    const lidRotX = -0.18 + blinkAmount * 0.92;
    realism.leftEyelidPivot.rotation.x = lidRotX;
    realism.rightEyelidPivot.rotation.x = lidRotX;
  }

  // Living micro eye saccades / subtle gaze shift
  anim.saccadeTimer += safeDt;
  if (anim.saccadeTimer >= anim.nextSaccadeAt) {
    anim.saccadeTimer = 0;
    anim.nextSaccadeAt = 1.2 + Math.random() * 2.4;
    if (isMoving) {
      anim.targetEyeX = 0;
      anim.targetEyeY = 0;
    } else {
      anim.targetEyeX = (Math.random() - 0.5) * 0.08;
      anim.targetEyeY = (Math.random() - 0.5) * 0.11;
    }
  }
  anim.curEyeX = THREE.MathUtils.damp(anim.curEyeX, anim.targetEyeX, 16, safeDt);
  anim.curEyeY = THREE.MathUtils.damp(anim.curEyeY, anim.targetEyeY, 16, safeDt);
  if (realism.leftEye && realism.rightEye) {
    realism.leftEye.rotation.x = anim.curEyeX;
    realism.leftEye.rotation.y = anim.curEyeY;
    realism.rightEye.rotation.x = anim.curEyeX;
    realism.rightEye.rotation.y = anim.curEyeY;
  }

  // Optional GLB animation mixer crossfade if active
  if (realism.glbMixer) {
    if (realism.glbIdleAction && realism.glbWalkAction) {
      const targetWalk = isMoving ? 1 : 0;
      const curWalk = realism.glbWalkAction.getEffectiveWeight();
      const nextWalk = THREE.MathUtils.damp(curWalk, targetWalk, 10, safeDt);
      realism.glbWalkAction.setEffectiveWeight(nextWalk);
      realism.glbIdleAction.setEffectiveWeight(1 - nextWalk);
    }
    realism.glbMixer.update(safeDt);
  }
}
