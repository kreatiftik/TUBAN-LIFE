import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BuildingCollider,
  DIRT_JUNCTION_PADS,
  LANDMARKS,
  MOUNTAIN_BEND_PADS,
  PAVED_CROSSROADS,
  ROAD_SEGMENTS,
  RoadSegment,
  SAWAH_PADS,
  getRoadSegmentElevation,
  groundHeightAt,
} from './worldData';
import { ProceduralTexturePack, ROAD_TEX_LAYER } from './textures';
import {
  CityBuildingKind,
  createAnimal,
  createCandiMajapahit,
  createCityBuilding,
  createGapuraTuban,
  createGazeboWisata,
  createJogloHouse,
  createKlentengKwanSingBio,
  createMakamSunanBonang,
  createMercusuar,
  createPendopoTuban,
  createPerahuNelayan,
  createPohonSiwalan,
  createPosRonda,
  createSPBU,
  createTuguTuban,
  createWarungKopi,
  createWitAsem,
} from './models';

export interface WorldBuildResult {
  colliders: BuildingCollider[];
  streetLampBulbs: THREE.MeshStandardMaterial[];
  waterfallMesh: THREE.Mesh;
  oceanMesh: THREE.Mesh;
  boats: THREE.Group[];
  lostGoat: THREE.Group;
  farmAnimals: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; phase: number }>;
  missionPropFishCrate: THREE.Group;
}

export function buildJawaWorld(
  scene: THREE.Scene,
  textures: ProceduralTexturePack
): WorldBuildResult {
  const colliders: BuildingCollider[] = [];
  const streetLampBulbs: THREE.MeshStandardMaterial[] = [];
  const farmAnimals: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; phase: number }> = [];
  const boats: THREE.Group[] = [];

  // 1. CONTINUOUS TERRAIN MESH (1360x1360m extending smoothly beyond playable 780x780m)
  const terrainSize = 1360;
  const terrainHalf = terrainSize * 0.5;
  const segs = 128;
  const stride = segs + 1;
  const cellSize = terrainSize / segs;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const terrainHeights = new Float32Array(posAttr.count);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);
    terrainHeights[i] = y;

    // Biome vertex tinting blended with grass texture
    if (z > 175 && x > 5) {
      const capeDist = Math.hypot(x - 285, z - 192);
      tmpColor.setHex(capeDist < 24 ? 0x64748b : 0xe8d09a);
    } else if (z < -190) {
      tmpColor.setHex(0x6d7d52); // Bukit Kapur & Kebun Siwalan Grabagan
    } else if (z < -95) {
      tmpColor.setHex(y > 14 ? 0x7c8468 : 0x5c733d);
    } else if (x >= 72 && x <= 335 && z >= -80 && z <= 75) {
      tmpColor.setHex(0x6c756d); // Kota Tuban + Tuban Timur
    } else if (x < -42 && x > -128 && z > -5 && z < 92) {
      tmpColor.setHex(0x65a30d); // Sawah Kerek & Rengel
    } else if (x <= -128 && z <= 115) {
      tmpColor.setHex(0x3e622b); // Hutan Jati & Desa Grabagan
    } else if (x <= -128 && z > 115) {
      tmpColor.setHex(0x888f64); // Bukit Kapur Semanding & Goa Akbar
    } else {
      tmpColor.setHex(0x528238);
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({
    map: textures.grass,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: 3,
    polygonOffsetUnits: 3,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.renderOrder = 0;
  scene.add(terrainMesh);

  // Exact barycentric terrain triangle height lookup so roads never clip through interpolated terrain slopes
  const sampleRoadBaseY = (wx: number, wz: number): number => {
    const exactY = groundHeightAt(wx, wz);
    const gx = THREE.MathUtils.clamp((wx + terrainHalf) / cellSize, 0, segs - 0.0001);
    const gz = THREE.MathUtils.clamp((wz + terrainHalf) / cellSize, 0, segs - 0.0001);
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const ya = terrainHeights[iz * stride + ix];
    const yb = terrainHeights[(iz + 1) * stride + ix];
    const yc = terrainHeights[(iz + 1) * stride + (ix + 1)];
    const yd = terrainHeights[iz * stride + (ix + 1)];
    const triY =
      fx + fz <= 1
        ? ya + fx * (yd - ya) + fz * (yb - ya)
        : yc + (1 - fx) * (yb - yc) + (1 - fz) * (yd - yc);
    return Math.max(exactY, triY);
  };

  // 2. WATER BODIES: Laut Jawa Pantura, Sendang Bektiharjo, Kali Kening River & Dual Bridges
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    map: textures.water,
    roughness: 0.18,
    metalness: 0.25,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 0.88,
  });

  // Laut Jawa Pesisir Pantura Tuban (widened for Tanjung Awar-Awar Cape)
  const oceanGeo = new THREE.PlaneGeometry(1600, 480, 16, 10);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMesh = new THREE.Mesh(oceanGeo, waterMat);
  oceanMesh.position.set(120, -0.75, 420);
  scene.add(oceanMesh);

  // Sendang Bektiharjo (Southwest Natural Spring Lake)
  const lakeGeo = new THREE.CircleGeometry(31, 24);
  lakeGeo.rotateX(-Math.PI / 2);
  const lakeMesh = new THREE.Mesh(lakeGeo, waterMat);
  lakeMesh.position.set(-95, -0.55, 202);
  scene.add(lakeMesh);

  // Kali Kening River ribbon (z: -68..132 matching groundHeightAt sin curve)
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    map: textures.water,
    roughness: 0.2,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
  });
  const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 200, 8, 32), riverMat);
  riverMesh.rotation.x = -Math.PI / 2;
  const rPos = riverMesh.geometry.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const rz = rPos.getY(i);
    const worldZ = 32 - rz;
    rPos.setX(i, rPos.getX(i) + Math.sin(worldZ * 0.05) * 8);
  }
  riverMesh.position.set(-78, -0.42, 32);
  scene.add(riverMesh);

  // Concrete Highway Bridge over Kali Kening at (-78, 0) matching surfaceHeightAt (top = 0.55)
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  const highwayAsphaltMat = new THREE.MeshLambertMaterial({
    map: textures.asphalt,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const highwayBridge = new THREE.Group();
  const hwDeck = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.44, 10.6), concreteMat);
  hwDeck.position.y = 0.33;
  hwDeck.castShadow = true;
  hwDeck.receiveShadow = true;
  const hwRoadStrip = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.06, 9.6), highwayAsphaltMat);
  hwRoadStrip.position.y = 0.555;
  hwRoadStrip.receiveShadow = true;
  const hwRampGeo = new THREE.BoxGeometry(3.2, 0.2, 10.2);
  const hwRampW = new THREE.Mesh(hwRampGeo, concreteMat);
  hwRampW.position.set(-11.0, 0.24, 0);
  hwRampW.rotation.z = 0.18;
  const hwRampE = new THREE.Mesh(hwRampGeo, concreteMat);
  hwRampE.position.set(11.0, 0.24, 0);
  hwRampE.rotation.z = -0.18;
  [-5.1, 5.1].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(20, 0.72, 0.34), concreteMat);
    rail.position.set(0, 0.9, rz);
    highwayBridge.add(rail);
  });
  [-5, 5].forEach((px) => {
    [-3.8, 3.8].forEach((pz) => {
      const pierCol = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.8, 8), concreteMat);
      pierCol.position.set(px, -0.5, pz);
      highwayBridge.add(pierCol);
    });
  });
  highwayBridge.add(hwDeck, hwRoadStrip, hwRampW, hwRampE);
  highwayBridge.position.set(-78, 0, 0);
  scene.add(highwayBridge);

  // Wooden Bridge over Kali Kening at (-76, 52)
  const bridgeWoodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const bridge = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(17, 0.35, 6.2), bridgeWoodMat);
  deck.position.y = 0.55;
  deck.castShadow = true;
  deck.receiveShadow = true;
  const rampGeo = new THREE.BoxGeometry(2.2, 0.16, 6.1);
  const rampW = new THREE.Mesh(rampGeo, bridgeWoodMat);
  rampW.position.set(-9.4, 0.34, 0);
  rampW.rotation.z = 0.30;
  rampW.receiveShadow = true;
  const rampE = new THREE.Mesh(rampGeo, bridgeWoodMat);
  rampE.position.set(9.4, 0.34, 0);
  rampE.rotation.z = -0.30;
  rampE.receiveShadow = true;
  const railF = new THREE.Mesh(new THREE.BoxGeometry(17, 0.8, 0.2), bridgeWoodMat);
  railF.position.set(0, 1.0, 2.9);
  const railB = railF.clone();
  railB.position.z = -2.9;
  bridge.add(deck, rampW, rampE, railF, railB);
  bridge.position.set(-76, 0, 52);
  scene.add(bridge);

  // 3. UNIFIED ROAD NETWORK (Single merged mesh + DataArrayTexture shader, non-overlapping layers & shoulder skirts)
  const buildRoadSegmentGeo = (seg: RoadSegment, segIdx: number): THREE.BufferGeometry => {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const length = Math.hypot(dx, dz);
    const fx = dx / length;
    const fz = dz / length;
    // Right perpendicular in XZ when +Y is up
    const rx = -fz;
    const rz = fx;

    const isSloped = seg.z1 < -70 || seg.z2 < -70 || seg.z1 > 140 || seg.z2 > 140 || seg.x1 < -115 || seg.x2 < -115;
    const steps = Math.max(8, Math.ceil(length / (isSloped ? 3.0 : 6.5)));
    const elev = getRoadSegmentElevation(seg, segIdx);
    const halfW = seg.width * 0.5;
    const skirtW = 0.5;
    const cols = 5; // outerL, edgeL, center, edgeR, outerR
    const acrossOffsets = [-halfW - skirtW, -halfW, 0, halfW, halfW + skirtW];
    const uCoords = [0.02, 0.0, 0.5, 1.0, 0.98];
    const wearVals = [0.0, 0.94, 1.0, 0.94, 0.0];
    const skirtDrops = [-0.22, 0.0, 0.0, 0.0, -0.22];
    const layer = seg.paved ? ROAD_TEX_LAYER.ASPHALT_MARKED : ROAD_TEX_LAYER.DIRT_ROAD;

    const vertCount = (steps + 1) * cols;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const layers = new Float32Array(vertCount);
    const wears = new Float32Array(vertCount);
    const indices: number[] = [];

    for (let r = 0; r <= steps; r++) {
      const t = r / steps;
      const cx = seg.x1 + dx * t;
      const cz = seg.z1 + dz * t;
      const vCoord = (t * length) / 14.0;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const off = acrossOffsets[c];
        const wx = cx + rx * off;
        const wz = cz + rz * off;
        const wy = sampleRoadBaseY(wx, wz) + elev + skirtDrops[c];
        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = wy;
        positions[idx * 3 + 2] = wz;
        uvs[idx * 2] = uCoords[c];
        uvs[idx * 2 + 1] = vCoord;
        layers[idx] = layer;
        wears[idx] = wearVals[c];
      }
    }

    for (let r = 0; r < steps; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const p00 = r * cols + c;
        const p01 = p00 + 1;
        const p10 = (r + 1) * cols + c;
        const p11 = p10 + 1;
        indices.push(p00, p01, p10);
        indices.push(p01, p11, p10);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aRoadLayer', new THREE.BufferAttribute(layers, 1));
    geo.setAttribute('aRoadWear', new THREE.BufferAttribute(wears, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const buildRectPadGeo = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    elev: number,
    layer: number
  ): THREE.BufferGeometry => {
    const skirt = 0.45;
    const hw = w * 0.5;
    const hd = d * 0.5;
    const xs = [-hw - skirt, -hw, -hw * 0.34, hw * 0.34, hw, hw + skirt];
    const zs = [-hd - skirt, -hd, -hd * 0.34, hd * 0.34, hd, hd + skirt];
    const cols = xs.length;
    const rows = zs.length;
    const vertCount = cols * rows;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const layers = new Float32Array(vertCount);
    const wears = new Float32Array(vertCount);
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const isOuterZ = r === 0 || r === rows - 1;
      for (let c = 0; c < cols; c++) {
        const isOuterX = c === 0 || c === cols - 1;
        const idx = r * cols + c;
        const wx = cx + xs[c];
        const wz = cz + zs[r];
        const isSkirt = isOuterX || isOuterZ;
        const wy = sampleRoadBaseY(wx, wz) + elev + (isSkirt ? -0.22 : 0);
        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = wy;
        positions[idx * 3 + 2] = wz;
        uvs[idx * 2] = wx / 14.0;
        uvs[idx * 2 + 1] = wz / 14.0;
        layers[idx] = layer;
        wears[idx] = isSkirt ? 0.0 : 1.0;
      }
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const p00 = r * cols + c;
        const p01 = p00 + 1;
        const p10 = (r + 1) * cols + c;
        const p11 = p10 + 1;
        indices.push(p00, p10, p01);
        indices.push(p10, p11, p01);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aRoadLayer', new THREE.BufferAttribute(layers, 1));
    geo.setAttribute('aRoadWear', new THREE.BufferAttribute(wears, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const buildBendDiscGeo = (cx: number, cz: number, radius: number, elev: number): THREE.BufferGeometry => {
    const radialSegs = 16;
    const rings = [radius * 0.5, radius, radius + 0.5];
    const vertCount = 1 + radialSegs * rings.length;
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const layers = new Float32Array(vertCount);
    const wears = new Float32Array(vertCount);
    const indices: number[] = [];

    // Center vertex
    positions[0] = cx;
    positions[1] = sampleRoadBaseY(cx, cz) + elev;
    positions[2] = cz;
    uvs[0] = cx / 14.0;
    uvs[1] = cz / 14.0;
    layers[0] = ROAD_TEX_LAYER.ASPHALT_PLAIN;
    wears[0] = 1.0;

    for (let ri = 0; ri < rings.length; ri++) {
      const rVal = rings[ri];
      const isSkirt = ri === rings.length - 1;
      for (let s = 0; s < radialSegs; s++) {
        const theta = (s / radialSegs) * Math.PI * 2;
        const wx = cx + Math.cos(theta) * rVal;
        const wz = cz + Math.sin(theta) * rVal;
        const idx = 1 + ri * radialSegs + s;
        positions[idx * 3] = wx;
        positions[idx * 3 + 1] = sampleRoadBaseY(wx, wz) + elev + (isSkirt ? -0.22 : 0);
        positions[idx * 3 + 2] = wz;
        uvs[idx * 2] = wx / 14.0;
        uvs[idx * 2 + 1] = wz / 14.0;
        layers[idx] = ROAD_TEX_LAYER.ASPHALT_PLAIN;
        wears[idx] = isSkirt ? 0.0 : 1.0;
      }
    }

    // Center fan (clockwise theta in XZ gives CCW upward normal when ordered center -> next -> curr)
    for (let s = 0; s < radialSegs; s++) {
      const curr = 1 + s;
      const next = 1 + ((s + 1) % radialSegs);
      indices.push(0, next, curr);
    }

    // Outer rings
    for (let ri = 0; ri < rings.length - 1; ri++) {
      const baseA = 1 + ri * radialSegs;
      const baseB = 1 + (ri + 1) * radialSegs;
      for (let s = 0; s < radialSegs; s++) {
        const sNext = (s + 1) % radialSegs;
        const a0 = baseA + s;
        const a1 = baseA + sNext;
        const b0 = baseB + s;
        const b1 = baseB + sNext;
        indices.push(a0, a1, b0);
        indices.push(a1, b1, b0);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aRoadLayer', new THREE.BufferAttribute(layers, 1));
    geo.setAttribute('aRoadWear', new THREE.BufferAttribute(wears, 1));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const roadGeos: THREE.BufferGeometry[] = [];
  ROAD_SEGMENTS.forEach((seg, segIdx) => {
    roadGeos.push(buildRoadSegmentGeo(seg, segIdx));
  });
  PAVED_CROSSROADS.forEach(([ix, iz, iw, id]) => {
    const padElev = iz < -70 || iz > 140 ? 0.315 : 0.248;
    roadGeos.push(buildRectPadGeo(ix, iz, iw, id, padElev, ROAD_TEX_LAYER.ASPHALT_PLAIN));
  });
  MOUNTAIN_BEND_PADS.forEach((b) => {
    roadGeos.push(buildBendDiscGeo(b.x, b.z, b.r, 0.33));
  });
  DIRT_JUNCTION_PADS.forEach(([ix, iz, iw, id]) => {
    roadGeos.push(buildRectPadGeo(ix, iz, iw, id, 0.138, ROAD_TEX_LAYER.DIRT_JUNCTION));
  });

  const mergedRoadGeo = mergeGeometries(roadGeos, false);
  roadGeos.forEach((g) => g.dispose());

  const roadNetworkMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  roadNetworkMat.customProgramCacheKey = () => 'jawa-road-texarray-v1';
  roadNetworkMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadTexArray = { value: textures.roadArray };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aRoadLayer;
attribute float aRoadWear;
varying vec2 vRoadUv;
varying float vRoadLayer;
varying float vRoadWear;
varying vec3 vRoadWorldPos;`
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
vRoadUv = uv;
vRoadLayer = aRoadLayer;
vRoadWear = aRoadWear;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vRoadWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2DArray uRoadTexArray;
varying vec2 vRoadUv;
varying float vRoadLayer;
varying float vRoadWear;
varying vec3 vRoadWorldPos;

vec3 jawaSrgbToLinear(vec3 c) {
  return mix(
    pow(c * 0.9478672986 + vec3(0.0521327014), vec3(2.4)),
    c * 0.0773993808,
    vec3(lessThanEqual(c, vec3(0.04045)))
  );
}`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
float jawaLayerIdx = floor(vRoadLayer + 0.5);
vec4 jawaRoadSample = texture(uRoadTexArray, vec3(vRoadUv, jawaLayerIdx));
vec3 jawaRoadLinear = jawaSrgbToLinear(jawaRoadSample.rgb);
float jawaMacroVar = 0.96 + 0.04 * sin(vRoadWorldPos.x * 0.045) * cos(vRoadWorldPos.z * 0.045);
float jawaShoulderShade = mix(0.68, 1.0, clamp(vRoadWear, 0.0, 1.0));
diffuseColor.rgb *= jawaRoadLinear * jawaMacroVar * jawaShoulderShade;`
      );
  };

  if (mergedRoadGeo) {
    const roadNetworkMesh = new THREE.Mesh(mergedRoadGeo, roadNetworkMat);
    roadNetworkMesh.receiveShadow = true;
    roadNetworkMesh.renderOrder = 2;
    scene.add(roadNetworkMesh);
  }

  // 4. SAWAH (Terraced Green Rice Paddies in Desa West & Kulon)
  const sawahMat = new THREE.MeshLambertMaterial({ map: textures.sawah });
  const bundMat = new THREE.MeshLambertMaterial({ color: 0x5c4028 });
  SAWAH_PADS.forEach((p) => {
    const gy = groundHeightAt(p.x, p.z);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.16, p.d), sawahMat);
    pad.position.set(p.x, gy + 0.04, p.z);
    pad.receiveShadow = true;
    const border = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.8, 0.24, p.d + 0.8), bundMat);
    border.position.set(p.x, gy - 0.02, p.z);
    scene.add(border, pad);
  });

  // 5. DESA KEREK & DESA GRABAGAN STRUCTURES
  const placeJoglo = (x: number, z: number, yaw: number, wallColor: number, scale = 1) => {
    const house = createJogloHouse(textures, wallColor, scale);
    house.position.set(x, groundHeightAt(x, z), z);
    house.rotation.y = yaw;
    scene.add(house);
    colliders.push({ x, z, halfW: 4.5 * scale, halfD: 3.8 * scale, height: 6 });
  };

  // Desa Kerek Core (Sentra Batik Gedog)
  placeJoglo(-22, 8, Math.PI / 2, 0xfef3c7, 0.95);
  placeJoglo(-24, 24, Math.PI / 2, 0xfde68a, 0.92);
  placeJoglo(4, -22, -Math.PI / 2, 0xe7e5e4, 0.95);
  placeJoglo(-22, -24, Math.PI / 2, 0xfecdd3, 0.9);
  placeJoglo(12, 34, Math.PI, 0xd9f99d, 0.9);
  // Balai Desa Kerek & Pak Lurah's Pendopo
  placeJoglo(-52, -46, 0, 0xfef9c3, 1.32);

  // Desa Grabagan & Hutan Jati Hamlet
  placeJoglo(-165, -28, Math.PI / 2, 0xfef3c7, 0.95);
  placeJoglo(-218, -52, 0, 0xfde68a, 1.02);
  placeJoglo(-160, 26, Math.PI / 2, 0xe7e5e4, 0.92);

  const posRondaKulon = createPosRonda(textures);
  posRondaKulon.position.set(-152, groundHeightAt(-152, -10), -10);
  scene.add(posRondaKulon);
  colliders.push({ x: -152, z: -10, halfW: 1.8, halfD: 1.8, height: 4 });

  // Wit Asem Gedhe (Big Tamarind Tree) near Balai Desa Kerek
  const witAsem = createWitAsem(1.65);
  witAsem.position.set(-40, groundHeightAt(-40, -34), -34);
  scene.add(witAsem);
  colliders.push({ x: -40, z: -34, halfW: 1.4, halfD: 1.4, height: 8 });

  // Signature Pohon Siwalan around Desa Kerek & Warung Legen
  [
    [-8, 22],
    [26, 22],
    [-34, 6],
    [28, -16],
  ].forEach(([sx, sz]) => {
    const siwalan = createPohonSiwalan();
    siwalan.position.set(sx, groundHeightAt(sx, sz), sz);
    scene.add(siwalan);
  });

  // Warung Legen & Kopi Mbah Darto
  const warung = createWarungKopi(textures);
  warung.position.set(18, groundHeightAt(18, 16), 16);
  warung.rotation.y = -Math.PI / 2;
  scene.add(warung);
  colliders.push({ x: 18, z: 16, halfW: 3.4, halfD: 3.6, height: 4.5 });

  // Pos Ronda Desa
  const posRonda = createPosRonda(textures);
  posRonda.position.set(-4, groundHeightAt(-4, -18), -18);
  scene.add(posRonda);
  colliders.push({ x: -4, z: -18, halfW: 1.8, halfD: 1.8, height: 4 });

  // Peternakan Pak Karjo
  const fenceMat = new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.85 });
  const barnGroup = new THREE.Group();
  const barnRoof = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 1.8, 4),
    new THREE.MeshStandardMaterial({ map: textures.roofTile, roughness: 0.85 })
  );
  barnRoof.position.y = 3.2;
  barnRoof.rotation.y = Math.PI / 4;
  barnGroup.add(barnRoof);
  [
    [-3.2, -3.2],
    [3.2, -3.2],
    [-3.2, 3.2],
    [3.2, 3.2],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 0.25), fenceMat);
    post.position.set(px, 1.3, pz);
    barnGroup.add(post);
  });
  barnGroup.position.set(-76, groundHeightAt(-76, 24), 24);
  scene.add(barnGroup);

  const animalConfigs: Array<{ kind: 'sapi' | 'kambing'; x: number; z: number; white: boolean }> = [
    { kind: 'sapi', x: -75, z: 18, white: false },
    { kind: 'sapi', x: -79, z: 27, white: false },
    { kind: 'kambing', x: -67, z: 19, white: true },
    { kind: 'kambing', x: -69, z: 29, white: false },
  ];
  animalConfigs.forEach((a, idx) => {
    const mesh = createAnimal(a.kind, a.white);
    mesh.position.set(a.x, groundHeightAt(a.x, a.z), a.z);
    scene.add(mesh);
    farmAnimals.push({ mesh, baseX: a.x, baseZ: a.z, phase: idx * 1.4 });
  });

  // Lost Goat for Mission 2 at (-95, 74)
  const lostGoat = createAnimal('kambing', true);
  lostGoat.position.set(-95, groundHeightAt(-95, 74), 74);
  scene.add(lostGoat);

  // 6. KOTA TUBAN (BUMI WALI) & TUBAN TIMUR
  const alunFloor = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.14, 28),
    new THREE.MeshLambertMaterial({
      map: textures.cobblestone,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  alunFloor.position.set(116, 0.02, -22);
  alunFloor.receiveShadow = true;
  scene.add(alunFloor);

  // Twin Pohon Beringin in Alun-Alun Tuban
  const beringin1 = createWitAsem(1.7);
  beringin1.position.set(110, 0, -18);
  const beringin2 = createWitAsem(1.7);
  beringin2.position.set(122, 0, -18);
  scene.add(beringin1, beringin2);
  colliders.push(
    { x: 110, z: -18, halfW: 1.5, halfD: 1.5, height: 8 },
    { x: 122, z: -18, halfW: 1.5, halfD: 1.5, height: 8 }
  );

  // Tugu Kuda Adipati Ronggolawe on Alun-Alun Tuban
  const tuguRonggolawe = createTuguTuban();
  tuguRonggolawe.position.set(116, 0.08, -28);
  scene.add(tuguRonggolawe);
  colliders.push({ x: 116, z: -28, halfW: 2.0, halfD: 2.0, height: 5.5 });

  // Gapura Selamat Datang Kabupaten Tuban (Bumi Wali) straddling the main East-West highway at x = 64
  const gapuraTuban = createGapuraTuban(textures);
  gapuraTuban.position.set(64, groundHeightAt(64, 0), 0);
  gapuraTuban.rotation.y = Math.PI / 2;
  scene.add(gapuraTuban);
  colliders.push(
    { x: 64, z: -6.8, halfW: 1.3, halfD: 1.3, height: 8.5 },
    { x: 64, z: 6.8, halfW: 1.3, halfD: 1.3, height: 8.5 }
  );

  // SPBU Sleko Tuban
  const spbu = createSPBU();
  spbu.position.set(76, 0, -28);
  spbu.rotation.y = Math.PI / 2;
  scene.add(spbu);
  colliders.push({ x: 76, z: -28, halfW: 4.5, halfD: 6.5, height: 5.5 });

  // Helper for city buildings with specialized architectural kind
  const placeCityBldg = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    accent = 0xe2e8f0,
    kind: CityBuildingKind = 'ruko'
  ) => {
    const b = createCityBuilding(w, h, d, color, accent, kind, textures);
    b.position.set(x, groundHeightAt(x, z), z);
    scene.add(b);
    colliders.push({ x, z, halfW: w * 0.5, halfD: d * 0.5, height: h });
  };

  // Sekolah Kota Tuban
  placeCityBldg(114, -50, 14, 6.5, 9, 0xfef3c7, 0x991b1b, 'sekolah');
  // Pendopo Krido Manunggal Tuban (North of Alun-Alun)
  const pendopoTuban = createPendopoTuban(textures);
  pendopoTuban.position.set(130, groundHeightAt(130, -68), -68);
  scene.add(pendopoTuban);
  colliders.push({ x: 130, z: -68, halfW: 7.5, halfD: 5.0, height: 7.5 });
  // Polres Tuban
  placeCityBldg(96, -68, 13, 7.5, 10, 0x78716c, 0x1e293b, 'polisi');
  // RSUD Dr. R. Koesma Tuban
  placeCityBldg(166, -68, 20, 11, 12, 0xf8fafc, 0xdc2626, 'rsud');
  // Galeri Batik Gedog Kerek
  placeCityBldg(102, 26, 12, 6, 9, 0x92400e, 0xfde68a, 'toko');
  // Bengkel & Showroom Ronggolawe Mas Joko
  placeCityBldg(162, -16, 14, 5.5, 10, 0x1e3a8a, 0x38bdf8, 'bengkel');
  // Pertokoan Ruko Tuban row
  placeCityBldg(124, 24, 12, 7.5, 9, 0x475569, 0xf59e0b, 'ruko');
  placeCityBldg(165, 22, 13, 8.5, 10, 0x334155, 0x10b981, 'ruko');
  // Terminal Shelter
  placeCityBldg(175, 56, 18, 5, 10, 0x64748b, 0xfacc15, 'terminal');

  // Kota Tuban Timur & Kawasan Wisata Religi Sunan Bonang
  // Makam & Gapura Sunan Bonang (adjacent to Masjid Agung Tuban)
  const makamSunanBonang = createMakamSunanBonang(textures);
  makamSunanBonang.position.set(202, groundHeightAt(202, -28), -28);
  scene.add(makamSunanBonang);
  colliders.push({ x: 202, z: -28, halfW: 5.0, halfD: 5.0, height: 6.5 });

  // Masjid Agung Tuban
  placeCityBldg(224, -28, 18, 8.5, 14, 0xf8fafc, 0x15803d, 'masjid');
  // Terminal Kambang Putih Tuban
  placeCityBldg(295, -52, 22, 7, 11, 0xfef3c7, 0x0369a1, 'stasiun');
  placeCityBldg(205, 24, 12, 7.8, 9, 0x475569, 0x38bdf8, 'ruko');
  placeCityBldg(262, -16, 13, 8.5, 9, 0x334155, 0xf59e0b, 'ruko');
  placeCityBldg(296, 18, 12, 7.2, 9, 0x64748b, 0x10b981, 'ruko');
  placeCityBldg(215, -68, 14, 6.8, 9, 0xb45309, 0xfde68a, 'toko');

  // Stadion Tuban Sport Center at (278, 22)
  const pitch = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.12, 24),
    new THREE.MeshLambertMaterial({ color: 0x15803d })
  );
  pitch.position.set(278, 0.03, 22);
  pitch.receiveShadow = true;
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const midLine = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 23), lineMat);
  midLine.rotation.x = -Math.PI / 2;
  midLine.position.set(278, 0.105, 22);
  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.5, 24), lineMat);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(278, 0.105, 22);
  scene.add(pitch, midLine, centerCircle);

  // Bleachers north side of stadium
  const standMesh = new THREE.Mesh(
    new THREE.BoxGeometry(34, 2.4, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x475569 })
  );
  standMesh.position.set(278, 1.2, 8.2);
  standMesh.castShadow = true;
  scene.add(standMesh);
  colliders.push({ x: 278, z: 8.2, halfW: 17, halfD: 2.2, height: 2.5 });

  // Pasar Tradisional Stalls
  const tarpColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706];
  for (let i = 0; i < 4; i++) {
    const sx = 136 + (i % 2) * 14;
    const sz = 22 + Math.floor(i / 2) * 10;
    const stall = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.8, 4.5),
      new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.85 })
    );
    base.position.y = 0.4;
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.14, 5.6),
      new THREE.MeshStandardMaterial({ color: tarpColors[i], roughness: 0.65 })
    );
    canopy.position.y = 2.9;
    stall.add(base, canopy);
    stall.position.set(sx, 0, sz);
    scene.add(stall);
    colliders.push({ x: sx, z: sz, halfW: 4.2, halfD: 2.5, height: 3 });
  }

  // 7. BUKIT KAPUR & AIR TERJUN NGLIRIP (SINGGAHAN & GRABAGAN TUBAN)
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0xd6d1c7, roughness: 0.9 });
  const cliffX = -70;
  const cliffZ = -194;
  const cliffBaseY = groundHeightAt(cliffX, cliffZ);
  const cliff = new THREE.Mesh(new THREE.DodecahedronGeometry(14, 1), cliffMat);
  cliff.scale.set(1.4, 1.8, 0.9);
  cliff.position.set(cliffX, cliffBaseY + 10, cliffZ);
  cliff.castShadow = true;
  scene.add(cliff);

  // Air Terjun Nglirip signature turquoise-tosca water
  const waterfallMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.35,
    roughness: 0.18,
    transparent: true,
    opacity: 0.88,
  });
  const waterfallMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 22, 4, 12), waterfallMat);
  waterfallMesh.position.set(cliffX, cliffBaseY + 9, cliffZ + 11.2);
  scene.add(waterfallMesh);

  const ngliripPoolMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    map: textures.water,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const poolMesh = new THREE.Mesh(new THREE.CircleGeometry(10, 20), ngliripPoolMat);
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.set(cliffX, groundHeightAt(cliffX, -178) + 0.18, -178);
  scene.add(poolMesh);

  // Bukit Kapur & Kebun Siwalan Grabagan (limestone karst boulders + Pohon Siwalan grove + viewpoint gazebo)
  for (let row = 0; row < 3; row++) {
    const tz = -290 - row * 7;
    for (let tx = 38; tx <= 92; tx += 13) {
      if (row === 0 && tx % 2 === 0) {
        const limestone = new THREE.Mesh(new THREE.DodecahedronGeometry(2.3, 0), cliffMat);
        limestone.scale.set(1.3, 0.9, 1.1);
        limestone.position.set(tx + 3, groundHeightAt(tx + 3, tz) + 0.9, tz - 2);
        scene.add(limestone);
      }
      const siwalan = createPohonSiwalan();
      siwalan.position.set(tx, groundHeightAt(tx, tz), tz);
      siwalan.rotation.y = (tx + row) * 0.8;
      scene.add(siwalan);
    }
  }
  const gazeboTeh = createGazeboWisata(textures);
  gazeboTeh.position.set(76, groundHeightAt(76, -264), -264);
  scene.add(gazeboTeh);
  colliders.push({ x: 76, z: -264, halfW: 2.2, halfD: 2.2, height: 4 });

  // 8. PESISIR PANTURA TUBAN (TPI Palang, Warung Bu Wati, Pantai Boom, Klenteng Kwan Sing Bio, Mercusuar Tanjung Awar-Awar)
  const tpiBuilding = createCityBuilding(14, 4.5, 9, 0x0ea5e9, 0xfef08a, 'tpi', textures);
  tpiBuilding.position.set(78, groundHeightAt(78, 168), 168);
  scene.add(tpiBuilding);
  colliders.push({ x: 78, z: 168, halfW: 7, halfD: 4.5, height: 4.5 });

  const seafoodWarung = createWarungKopi(textures);
  seafoodWarung.position.set(55, groundHeightAt(55, 152), 152);
  scene.add(seafoodWarung);
  colliders.push({ x: 55, z: 152, halfW: 3.5, halfD: 3.2, height: 4 });

  // Klenteng Kwan Sing Bio Tuban along Jalan Raya Pantura (180, 140)
  const klenteng = createKlentengKwanSingBio(textures);
  klenteng.position.set(180, groundHeightAt(180, 140), 140);
  scene.add(klenteng);
  colliders.push({ x: 180, z: 140, halfW: 7.0, halfD: 5.5, height: 8.5 });

  // Signature Pohon Siwalan along Pantura Pantai Boom & Bukit Kapur entrance
  [
    [94, 170],
    [158, 168],
    [226, 168],
    [-12, -108],
  ].forEach(([sx, sz]) => {
    const siwalan = createPohonSiwalan();
    siwalan.position.set(sx, groundHeightAt(sx, sz), sz);
    scene.add(siwalan);
  });

  // Wooden Pier (Dermaga Pantai Boom)
  const pier = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 30), bridgeWoodMat);
  pier.position.set(108, 0.45, 195);
  pier.receiveShadow = true;
  scene.add(pier);

  // Mercusuar Tanjung Awar-Awar at (285, 192)
  const mercusuar = createMercusuar();
  mercusuar.position.set(285, groundHeightAt(285, 192), 192);
  scene.add(mercusuar);
  colliders.push({ x: 285, z: 192, halfW: 4.6, halfD: 4.6, height: 18 });

  // Moored Fishing Boats (Perahu Nelayan Tuban)
  [
    { x: 102, z: 204, yaw: 0.15 },
    { x: 115, z: 208, yaw: -0.25 },
    { x: 132, z: 215, yaw: 0.4 },
    { x: 256, z: 210, yaw: 0.2 },
  ].forEach((bCfg) => {
    const boat = createPerahuNelayan();
    boat.position.set(bCfg.x, -0.5, bCfg.z);
    boat.rotation.y = bCfg.yaw;
    scene.add(boat);
    boats.push(boat);
  });

  // Mission 5 Fish Crate Prop on Pier
  const missionPropFishCrate = new THREE.Group();
  const crateBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.8), bridgeWoodMat);
  crateBox.position.y = 0.375;
  const fishSilver = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.18, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.25 })
  );
  fishSilver.position.y = 0.78;
  missionPropFishCrate.add(crateBox, fishSilver);
  missionPropFishCrate.position.set(110, 0.65, 196);
  scene.add(missionPropFishCrate);

  // 9. TEMPAT WISATA TUBAN (Gapura Paduraksa Ronggolawe, Goa Akbar & Sendang Bektiharjo, Bukit Kapur Semanding)
  const candi = createCandiMajapahit(textures);
  candi.position.set(-140, groundHeightAt(-140, 145), 145);
  candi.rotation.y = 0.4;
  scene.add(candi);
  colliders.push({ x: -140, z: 145, halfW: 6.2, halfD: 6.2, height: 12 });

  const gazeboDanau = createGazeboWisata(textures);
  gazeboDanau.position.set(-118, groundHeightAt(-118, 178), 178);
  scene.add(gazeboDanau);
  colliders.push({ x: -118, z: 178, halfW: 2.2, halfD: 2.2, height: 4 });

  const gazeboBukit = createGazeboWisata(textures);
  gazeboBukit.position.set(-252, groundHeightAt(-252, 220), 220);
  scene.add(gazeboBukit);
  colliders.push({ x: -252, z: 220, halfW: 2.2, halfD: 2.2, height: 4 });

  // Goa Akbar Limestone Cave Arch at (-158, 206), facing North toward the Bektiharjo–Semanding road
  const goaGroup = new THREE.Group();
  const goaArch = new THREE.Mesh(new THREE.DodecahedronGeometry(8, 1), cliffMat);
  goaArch.scale.set(1.45, 1.1, 1.15);
  goaArch.position.y = 4.2;
  const goaMouth = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 4.2, 4),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 1 })
  );
  goaMouth.position.set(0, 2.1, 4.2);
  const goaLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
  );
  goaLantern.position.set(2.8, 2.4, 5.8);
  goaGroup.add(goaArch, goaMouth, goaLantern);
  goaGroup.position.set(-158, groundHeightAt(-158, 206), 206);
  goaGroup.rotation.y = Math.PI;
  scene.add(goaGroup);
  colliders.push({ x: -158, z: 206, halfW: 7.5, halfD: 6.5, height: 8 });

  // 10. STREETLAMPS (Kota, Kota Timur & Pesisir Road)
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.35 });
  const lampPositions: Array<[number, number]> = [
    [-12, 8],
    [35, 8],
    [82, 8],
    [118, 8],
    [152, 8],
    [205, 8],
    [245, 8],
    [290, 8],
    [94, -36],
    [152, -36],
    [245, -36],
    [290, -36],
    [94, 48],
    [152, 48],
    [245, 48],
    [82, 118],
    [165, 152],
    [230, 152],
  ];
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 5.2, 8);
  const armGeo = new THREE.BoxGeometry(1.1, 0.1, 0.1);
  const bulbGeo = new THREE.SphereGeometry(0.22, 8, 8);

  lampPositions.forEach(([lx, lz]) => {
    const gy = groundHeightAt(lx, lz);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(lx, gy + 2.6, lz);
    pole.castShadow = true;
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(lx, gy + 5.1, lz - 0.45);
    arm.rotation.y = Math.PI / 2;
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(lx, gy + 4.95, lz - 0.9);
    streetLampBulbs.push(bulbMat);
    scene.add(pole, arm, bulb);
  });

  // 11. INSTANCED FOLIAGE (Tropical Coconut Palms, Banyan/Teak Trees, Rocks)
  let seed = 133742;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const isClearSpot = (x: number, z: number, minPad = 9): boolean => {
    for (const c of colliders) {
      if (Math.abs(x - c.x) < c.halfW + minPad && Math.abs(z - c.z) < c.halfD + minPad) {
        return false;
      }
    }
    for (const lm of LANDMARKS) {
      if (Math.hypot(x - lm.x, z - lm.z) < minPad) return false;
    }
    // Keep Alun-alun Tuban, Stadion Tuban Sport Center, Kebun Siwalan Grabagan & Sawah clear
    if (x > 96 && x < 138 && z > -40 && z < 4) return false;
    if (x > 255 && x < 302 && z > 6 && z < 38) return false;
    if (x > 28 && x < 102 && z < -258 && z > -320) return false;
    if (x > -122 && x < -32 && z > 6 && z < 90) return false;
    if (x > -210 && x < -170 && z > -58 && z < 46) return false;
    // Keep road corridors clear
    for (const r of ROAD_SEGMENTS) {
      const vx = r.x2 - r.x1;
      const vz = r.z2 - r.z1;
      const lenSq = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1, ((x - r.x1) * vx + (z - r.z1) * vz) / lenSq));
      const d = Math.hypot(x - (r.x1 + t * vx), z - (r.z1 + t * vz));
      if (d < r.width * 0.8 + 3.5) return false;
    }
    return true;
  };

  // A. Teak / Banyan Forest Trees (wider coverage + dense Hutan Jati cluster)
  const treeSpots: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < 650 && treeSpots.length < 220; i++) {
    const x = (rand() - 0.5) * 700;
    const z = (rand() - 0.5) * 540 - 60;
    if (z > 175) continue;
    if (Math.hypot(x - -95, z - 202) < 35) continue;
    if (Math.abs(x - -78) < 12 && z > -65 && z < 130) continue;
    if (!isClearSpot(x, z, 6.5)) continue;
    treeSpots.push({ x, z, s: 0.85 + rand() * 0.45 });
  }
  for (let i = 0; i < 140 && treeSpots.length < 265; i++) {
    const x = -270 + rand() * 115;
    const z = -95 + rand() * 135;
    if (!isClearSpot(x, z, 6.0)) continue;
    treeSpots.push({ x, z, s: 1.0 + rand() * 0.45 });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 3.6, 6);
  trunkGeo.translate(0, 1.8, 0);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a301d });
  const crownGeo = new THREE.DodecahedronGeometry(2.15, 0);
  crownGeo.translate(0, 4.6, 0);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f6b24 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeSpots.length);
  trunkInst.castShadow = false;
  crownInst.castShadow = false;
  crownInst.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  treeSpots.forEach((t, idx) => {
    const gy = groundHeightAt(t.x, t.z);
    dummy.position.set(t.x, gy, t.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(t.s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setMatrixAt(idx, dummy.matrix);
    tint.setHSL(0.27 + (rand() - 0.5) * 0.05, 0.48, 0.28 + (rand() - 0.5) * 0.08);
    crownInst.setColorAt(idx, tint);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  scene.add(trunkInst, crownInst);

  // B. Coconut & Siwalan Palms along Pesisir Pantura Pantai Boom & Tanjung Awar-Awar
  const palmSpots: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < 180 && palmSpots.length < 78; i++) {
    const x = 15 + rand() * 295;
    const z = 132 + rand() * 58;
    if (!isClearSpot(x, z, 5)) continue;
    palmSpots.push({ x, z, s: 0.9 + rand() * 0.35 });
  }
  const palmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 6.2, 6);
  palmTrunkGeo.translate(0, 3.1, 0);
  const palmHeadGeo = new THREE.ConeGeometry(2.4, 1.3, 6);
  palmHeadGeo.translate(0, 6.3, 0);
  const palmTrunkInst = new THREE.InstancedMesh(palmTrunkGeo, trunkMat, palmSpots.length);
  const palmHeadInst = new THREE.InstancedMesh(
    palmHeadGeo,
    new THREE.MeshLambertMaterial({ color: 0x4d7c0f }),
    palmSpots.length
  );
  palmTrunkInst.castShadow = false;
  palmHeadInst.castShadow = false;

  palmSpots.forEach((p, idx) => {
    const gy = groundHeightAt(p.x, p.z);
    dummy.position.set(p.x, gy, p.z);
    dummy.rotation.set((rand() - 0.5) * 0.14, rand() * Math.PI * 2, (rand() - 0.5) * 0.14);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    palmTrunkInst.setMatrixAt(idx, dummy.matrix);
    palmHeadInst.setMatrixAt(idx, dummy.matrix);
  });
  palmTrunkInst.instanceMatrix.needsUpdate = true;
  palmHeadInst.instanceMatrix.needsUpdate = true;
  palmTrunkInst.computeBoundingSphere();
  palmHeadInst.computeBoundingSphere();
  scene.add(palmTrunkInst, palmHeadInst);

  // C. Instanced Limestone Karst Boulders (Bukit Kapur Tuban) & Coastal Reef Rocks
  const rockGeo = new THREE.DodecahedronGeometry(1.1, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
  const rockCount = 92;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  for (let i = 0; i < rockCount; i++) {
    const isCapeRock = i >= 72;
    const rx = isCapeRock ? 265 + rand() * 38 : (rand() - 0.5) * 660;
    const rz = isCapeRock ? 175 + rand() * 34 : -95 - rand() * 225;
    const ry = groundHeightAt(rx, rz);
    dummy.position.set(rx, ry + 0.3, rz);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(0.7 + rand() * 1.4, 0.6 + rand() * 1.0, 0.7 + rand() * 1.4);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  rockInst.computeBoundingSphere();
  scene.add(rockInst);

  return {
    colliders,
    streetLampBulbs,
    waterfallMesh,
    oceanMesh,
    boats,
    lostGoat,
    farmAnimals,
    missionPropFishCrate,
  };
}
