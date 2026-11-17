import * as THREE from 'three';
import { CharacterProfile, OutfitId, VehicleType } from './types';
import { ProceduralTexturePack } from './textures';
import {
  CharacterArchetype,
  CharacterHairStyle,
  CharacterPantsStyle,
  CharacterShirtStyle,
  CharacterShoeStyle,
} from './worldData';
import {
  CharacterQualityTier,
  CharacterRealismHandle,
  createHumanClothMaterial,
  createHumanCorneaMaterial,
  createHumanSkinMaterial,
  getHumanRealismTextures,
  loadRealisticHumanGlb,
} from './humanRealism';

export interface CharacterRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  pelvisGroup: THREE.Object3D;
  spineGroup: THREE.Object3D;
  torso: THREE.Mesh;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftElbow: THREE.Object3D;
  rightElbow: THREE.Object3D;
  leftWrist: THREE.Object3D;
  rightWrist: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftKnee: THREE.Object3D;
  rightKnee: THREE.Object3D;
  leftAnkle: THREE.Object3D;
  rightAnkle: THREE.Object3D;
  shirtMeshes: THREE.Mesh[];
  pantsMeshes: THREE.Mesh[];
  outfitDecorGroup: THREE.Group;
  collarMesh: THREE.Mesh;
  realism: CharacterRealismHandle;
}

export interface VehicleModelResult {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  headlights: THREE.Mesh[];
  seatY: number;
  seatZ: number;
  isOpenRide: boolean;
  halfW: number;
  halfL: number;
}

const OUTFIT_COLORS: Record<
  OutfitId,
  { shirt: number; collar: number; pants: number; metalness: number; style: CharacterShirtStyle }
> = {
  kasual: { shirt: 0x1e40af, collar: 0xe2e8f0, pants: 0x1e293b, metalness: 0.04, style: 'tshirt' },
  batik: { shirt: 0x92400e, collar: 0xfef3c7, pants: 0x1c1917, metalness: 0.06, style: 'batik' },
  jaket_motor: { shirt: 0x3f4338, collar: 0x1f2421, pants: 0x1e293b, metalness: 0.08, style: 'jaket' },
  lurik: { shirt: 0x44403c, collar: 0xd97706, pants: 0x292524, metalness: 0.06, style: 'lurik' },
};

// Bone indices in the shared 15-bone character Skeleton
const BONE_IDX = {
  PELVIS: 0,
  SPINE: 1,
  HEAD: 2,
  L_ARM: 3,
  L_ELBOW: 4,
  L_WRIST: 5,
  R_ARM: 6,
  R_ELBOW: 7,
  R_WRIST: 8,
  L_LEG: 9,
  L_KNEE: 10,
  L_ANKLE: 11,
  R_LEG: 12,
  R_KNEE: 13,
  R_ANKLE: 14,
} as const;

export const RIG_HIP_Y = 0.78;
export const RIG_THIGH_LEN = 0.35;
export const RIG_SHIN_LEN = 0.35;
export const RIG_SHIN_FOOT_LEN = 0.428;
export const RIG_SOLE_OFFSET_Y = 0.078;

const SPINE_BIND_Y = 0.85;
const HEAD_LOCAL_Y = 0.565;
const ARM_LOCAL_Y = 0.455;
const ELBOW_LOCAL_Y = -0.225;
const WRIST_LOCAL_Y = -0.22;

function createRoundedExtrude(w: number, h: number, d: number, r: number, bevel = 0.008): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const rad = Math.min(r, hw * 0.9, hh * 0.9);
  const s = new THREE.Shape();
  s.moveTo(-hw + rad, -hh);
  s.lineTo(hw - rad, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + rad);
  s.lineTo(hw, hh - rad);
  s.quadraticCurveTo(hw, hh, hw - rad, hh);
  s.lineTo(-hw + rad, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - rad);
  s.lineTo(-hw, -hh + rad);
  s.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.004, d - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function createShoeSoleGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.036, -0.068);
  s.quadraticCurveTo(-0.044, -0.015, -0.038, 0.035);
  s.quadraticCurveTo(-0.048, 0.095, -0.035, 0.135);
  s.quadraticCurveTo(0, 0.162, 0.035, 0.135);
  s.quadraticCurveTo(0.048, 0.095, 0.038, 0.035);
  s.quadraticCurveTo(0.044, -0.015, 0.036, -0.068);
  s.quadraticCurveTo(0, -0.086, -0.036, -0.068);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.015,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createShoeVampGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.064, -0.012);
  s.lineTo(0.128, -0.012);
  s.quadraticCurveTo(0.146, -0.001, 0.133, 0.019);
  s.quadraticCurveTo(0.085, 0.039, 0.028, 0.058);
  s.quadraticCurveTo(-0.014, 0.072, -0.048, 0.065);
  s.quadraticCurveTo(-0.074, 0.039, -0.064, -0.012);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.066,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.009,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.033);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createEarGeo(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.005, 0.021);
  s.quadraticCurveTo(0.014, 0.024, 0.014, 0.004);
  s.quadraticCurveTo(0.013, -0.016, 0.004, -0.021);
  s.quadraticCurveTo(-0.005, -0.022, -0.007, -0.011);
  s.lineTo(-0.005, 0.021);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.0045,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.0022,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.translate(0, 0, -0.00225);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createEyeballGeo(radius: number): THREE.BufferGeometry {
  // Frontal hemisphere planar UV so painted iris is circular and centered at +Z
  const geo = new THREE.SphereGeometry(radius, 20, 16);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (z >= 0) {
      uv.setXY(i, 0.5 + x / (2.15 * radius), 0.5 + y / (2.15 * radius));
    } else {
      uv.setXY(i, 0.06, 0.5);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function createCurvedFingerGeo(): THREE.BufferGeometry {
  // Anatomical gently flexed human finger tapering toward distal phalanx
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.018, 0.003),
    new THREE.Vector3(0, -0.036, 0.011),
    new THREE.Vector3(0, -0.052, 0.021),
  ]);
  const radialSegs = 8;
  const lengthSegs = 8;
  const geo = new THREE.TubeGeometry(curve, lengthSegs, 0.0058, radialSegs, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ringStride = radialSegs + 1;
  for (let l = 0; l <= lengthSegs; l++) {
    const t = l / lengthSegs;
    const center = curve.getPointAt(t);
    const taper = 1.04 - 0.34 * Math.pow(t, 1.3);
    for (let r = 0; r < ringStride; r++) {
      const idx = l * ringStride + r;
      const vx = pos.getX(idx) - center.x;
      const vy = pos.getY(idx) - center.y;
      const vz = pos.getZ(idx) - center.z;
      pos.setXYZ(idx, center.x + vx * taper, center.y + vy * taper, center.z + vz * taper);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function createCurvedHairCardGeo(width = 0.048, height = 0.072, curveDepth = 0.012): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 4, 4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (width * 0.5);
    const ny = (y + height * 0.5) / height; // 0 bottom tip -> 1 root top
    const zCurve = -curveDepth * (nx * nx) + 0.008 * Math.sin(ny * Math.PI);
    pos.setXYZ(i, x, y - height * 0.5, zCurve);
  }
  geo.computeVertexNormals();
  return geo;
}

function createHumanHeadGeo(isFemale: boolean): THREE.BufferGeometry {
  // phiStart = -PI/2 puts u=0.5 cleanly at +Z center front and hides the UV seam at -Z nape
  const geo = new THREE.SphereGeometry(1, 72, 54, -Math.PI / 2, Math.PI * 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  // Refined adult anatomical cranial proportions (~1:7.4 head-to-body ratio)
  const rx = isFemale ? 0.073 : 0.077;
  const ry = isFemale ? 0.105 : 0.110;
  const rz = isFemale ? 0.090 : 0.095;
  const gauss = (d2: number, sigma2: number) => Math.exp(-d2 / sigma2);

  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i);
    const ny = pos.getY(i);
    const nz = pos.getZ(i);

    let x = nx * rx;
    let y = ny * ry;
    let z = nz * rz;

    // 1. Cranial volume, narrower temples & full occipital back of head
    if (ny > 0.12 && nz > 0) {
      x *= 1 - 0.08 * Math.min(1, (ny - 0.12) * 1.45) * nz;
    }
    if (nz < -0.15 && ny > -0.35) {
      z -= 0.0065 * Math.abs(nz) * (1 - Math.abs(ny - 0.1) * 0.48);
    }

    // 2. Flatten front facial plane subtly for natural human proportions
    if (nz > 0.35) {
      const faceBlend = (nz - 0.35) / 0.65;
      z -= 0.0075 * faceBlend * (1 - Math.abs(nx) * 0.55);
    }

    // 3. Defined lower face jawline, gonial angle & chin taper
    if (ny < -0.04) {
      const t = Math.min(1, (-ny - 0.04) / 0.96);
      const jawNarrow = isFemale ? 0.46 : 0.36;
      const gonialAngle = isFemale
        ? 0.0022
        : 0.0062 * gauss((ny + 0.50) ** 2, 0.045) * gauss((nz - 0.22) ** 2, 0.12);
      x *= 1 - jawNarrow * Math.pow(t, 1.32);
      x += Math.sign(nx) * gonialAngle;

      if (nz > 0.25) {
        const chin = gauss(nx ** 2, 0.085) * gauss((ny + 0.76) ** 2, 0.048);
        z += (isFemale ? 0.0065 : 0.009) * chin;
        y -= 0.003 * chin;
      } else if (nz < 0.15) {
        y += 0.013 * t * (0.25 - nz);
      }
    }

    if (nz > 0.15) {
      // 4. Arched supraorbital brow ridge
      const browArcY = 0.205 - 0.025 * (nx * nx * 2.8);
      const brow = gauss((ny - browArcY) ** 2, 0.013) * Math.max(0, 1 - Math.abs(nx) * 1.12);
      z += 0.0068 * brow * nz;

      // 5. Recessed orbital eye sockets
      const socketR = ((Math.abs(nx) - 0.355) / 0.19) ** 2 + ((ny - 0.055) / 0.125) ** 2;
      const socket = gauss(socketR, 0.78);
      z -= 0.0115 * socket * nz;

      // 6. Zygomatic cheekbones + lower buccal hollow
      const cheekR = ((Math.abs(nx) - 0.55) / 0.24) ** 2 + ((ny + 0.10) / 0.15) ** 2;
      const cheek = gauss(cheekR, 0.82);
      x += Math.sign(nx) * 0.0045 * cheek;
      z += 0.0058 * cheek * nz;

      const hollowR = ((Math.abs(nx) - 0.45) / 0.20) ** 2 + ((ny + 0.36) / 0.17) ** 2;
      z -= 0.0038 * gauss(hollowR, 0.85) * nz;

      // 7. Continuous sculpted nose (bridge + dorsum + bulb tip + alar nostrils)
      const bridge = gauss((nx / 0.105) ** 2, 1.0) * gauss(((ny + 0.065) / 0.19) ** 2, 1.0);
      const tipBulb = gauss((nx / 0.125) ** 2, 1.0) * gauss(((ny + 0.215) / 0.085) ** 2, 1.0);
      const alarL = gauss(((nx + 0.125) / 0.075) ** 2, 1.0) * gauss(((ny + 0.24) / 0.07) ** 2, 1.0);
      const alarR = gauss(((nx - 0.125) / 0.075) ** 2, 1.0) * gauss(((ny + 0.24) / 0.07) ** 2, 1.0);
      const noseScale = isFemale ? 0.88 : 1.0;
      z += (bridge * 0.0148 + tipBulb * 0.0125 + (alarL + alarR) * 0.0052) * noseScale;
      y -= tipBulb * 0.003 * noseScale;
      x += Math.sign(nx) * (alarL + alarR) * 0.0022;

      // 8. Philtrum groove + sculpted Cupid's bow upper lip + parted mouth line + lower lip
      const philtrum = gauss((nx / 0.055) ** 2, 1.0) * gauss(((ny + 0.32) / 0.06) ** 2, 1.0);
      z -= philtrum * 0.0018;

      const mouthW = Math.max(0, 1 - (Math.abs(nx) / 0.25) ** 2);
      const cupidBow = 0.012 * (1 - Math.cos(nx * 18)) * Math.exp(-(nx * nx) / 0.025);
      const upperLip = gauss(((ny + 0.405 - cupidBow) / 0.042) ** 2, 1.0) * mouthW;
      const mouthPart = gauss(((ny + 0.452) / 0.024) ** 2, 1.0) * Math.max(0, 1 - (Math.abs(nx) / 0.235) ** 2);
      const lowerLip = gauss(((ny + 0.505) / 0.046) ** 2, 1.0) * Math.max(0, 1 - (Math.abs(nx) / 0.215) ** 2);
      const mentolabial = gauss(((ny + 0.60) / 0.065) ** 2, 1.0) * Math.max(0, 1 - (Math.abs(nx) / 0.24) ** 2);

      z += upperLip * 0.0058 + lowerLip * 0.0062 - mouthPart * 0.0030 - mentolabial * 0.0022;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function createHumanFaceTexture(): THREE.CanvasTexture {
  // Neutral warm-ivory multiplier texture aligned pixel-for-pixel with createHumanHeadGeo UVs
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#faf5f0';
  ctx.fillRect(0, 0, size, size);

  // Subtle epidermal variation so skin never looks plastic
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.8 + rand() * 2.0;
    const v = 242 + Math.floor(rand() * 12);
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

  const paintGlow = (nx: number, ny: number, rx: number, ry: number, inner: string, outer: string) => {
    const [cx, cy] = facePx(nx, ny);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Warm cheek & nose-tip subsurface glow + orbital socket ambient occlusion
  paintGlow(-0.50, -0.12, 34, 24, 'rgba(220, 118, 96, 0.17)', 'rgba(220, 118, 96, 0)');
  paintGlow(0.50, -0.12, 34, 24, 'rgba(220, 118, 96, 0.17)', 'rgba(220, 118, 96, 0)');
  paintGlow(0, -0.20, 18, 16, 'rgba(218, 122, 98, 0.16)', 'rgba(218, 122, 98, 0)');

  // Recessed eye socket shading & upper lash crease
  paintGlow(-0.355, 0.06, 22, 16, 'rgba(110, 68, 52, 0.24)', 'rgba(110, 68, 52, 0)');
  paintGlow(0.355, 0.06, 22, 16, 'rgba(110, 68, 52, 0.24)', 'rgba(110, 68, 52, 0)');

  // Subtle nostril underside & alar crease shadow
  paintGlow(-0.11, -0.265, 9, 6, 'rgba(85, 48, 36, 0.28)', 'rgba(85, 48, 36, 0)');
  paintGlow(0.11, -0.265, 9, 6, 'rgba(85, 48, 36, 0.28)', 'rgba(85, 48, 36, 0)');

  // Nasolabial fold softness
  [-1, 1].forEach((s) => {
    const [x0, y0] = facePx(s * 0.17, -0.24);
    const [x1, y1] = facePx(s * 0.27, -0.46);
    ctx.strokeStyle = 'rgba(128, 78, 60, 0.13)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) * 0.5 + s * 4, (y0 + y1) * 0.5, x1, y1);
    ctx.stroke();
  });

  // Shaded upper & lower lips + subtle mouth parting crease
  const [lxL, lyL] = facePx(-0.21, -0.45);
  const [lxC, lyTop] = facePx(0, -0.39);
  const [lxR, lyR] = facePx(0.21, -0.45);
  const [, lyBot] = facePx(0, -0.52);

  ctx.fillStyle = 'rgba(176, 86, 78, 0.44)';
  ctx.beginPath();
  ctx.moveTo(lxL, lyL);
  ctx.quadraticCurveTo(lxC - 8, lyTop - 2, lxC, lyTop + 2);
  ctx.quadraticCurveTo(lxC + 8, lyTop - 2, lxR, lyR);
  ctx.quadraticCurveTo(lxC, lyBot + 3, lxL, lyL);
  ctx.closePath();
  ctx.fill();

  // Lip parting line
  ctx.strokeStyle = 'rgba(72, 34, 30, 0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(lxL + 2, lyL);
  ctx.quadraticCurveTo(lxC, lyL + 2, lxR - 2, lyR);
  ctx.stroke();

  // Under-chin & jaw soft ambient occlusion vignette
  paintGlow(0, -0.84, 65, 28, 'rgba(95, 58, 44, 0.18)', 'rgba(95, 58, 44, 0)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBodySkinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#faf5f0';
  ctx.fillRect(0, 0, 128, 128);
  let seed = 8831;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 650; i++) {
    const v = 242 + Math.floor(rand() * 12);
    ctx.fillStyle = `rgb(${v},${v - 3},${v - 5})`;
    ctx.fillRect(rand() * 128, rand() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// Lazy fallback PBR normal & iris textures for CharacterCreatorModal (where WorldTextures isn't passed)
interface FallbackCharPbrMaps {
  faceMap: THREE.CanvasTexture;
  bodySkinMap: THREE.CanvasTexture;
  skinNormal: THREE.CanvasTexture;
  clothNormal: THREE.CanvasTexture;
  denimNormal: THREE.CanvasTexture;
  hairNormal: THREE.CanvasTexture;
  eyeIris: THREE.CanvasTexture;
  denimColor: THREE.CanvasTexture;
}

let cachedFallbackMaps: FallbackCharPbrMaps | null = null;
function getCharMaps(worldTex?: ProceduralTexturePack): FallbackCharPbrMaps {
  if (!cachedFallbackMaps) {
    const buildNormal = (size: number, strength: number, fn: (x: number, y: number) => number) => {
      const h = new Float32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) h[y * size + x] = fn(x, y);
      }
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(size, size);
      const sample = (x: number, y: number) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
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
      t.repeat.set(2, 2);
      return t;
    };

    const [denC, denCtx] = (() => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      return [c, c.getContext('2d')!] as const;
    })();
    const dImg = denCtx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const twill = Math.sin((x + y) * 1.15) * 0.5 + 0.5;
        const fold = Math.sin((y / 128) * Math.PI * 6) * 8;
        const v = Math.max(180, Math.min(246, 212 + twill * 16 + fold));
        const idx = (y * 128 + x) * 4;
        dImg.data[idx] = v;
        dImg.data[idx + 1] = v + 2;
        dImg.data[idx + 2] = Math.min(255, v + 5);
        dImg.data[idx + 3] = 255;
      }
    }
    denCtx.putImageData(dImg, 0, 0);
    const denimColor = new THREE.CanvasTexture(denC);
    denimColor.colorSpace = THREE.SRGBColorSpace;
    denimColor.wrapS = THREE.RepeatWrapping;
    denimColor.wrapT = THREE.RepeatWrapping;
    denimColor.repeat.set(2, 2);

    const eyeC = document.createElement('canvas');
    eyeC.width = 256;
    eyeC.height = 256;
    const eCtx = eyeC.getContext('2d')!;
    const sg = eCtx.createRadialGradient(128, 128, 38, 128, 128, 128);
    sg.addColorStop(0, '#f7f4f0');
    sg.addColorStop(0.7, '#efe8e2');
    sg.addColorStop(1, '#d8b4ad');
    eCtx.fillStyle = sg;
    eCtx.fillRect(0, 0, 256, 256);
    eCtx.save();
    eCtx.translate(128, 128);
    const ig = eCtx.createRadialGradient(0, 0, 10, 0, 0, 46);
    ig.addColorStop(0, '#5a361a');
    ig.addColorStop(0.45, '#432512');
    ig.addColorStop(0.85, '#29150a');
    ig.addColorStop(1, '#120a07');
    eCtx.fillStyle = ig;
    eCtx.beginPath();
    eCtx.arc(0, 0, 46, 0, Math.PI * 2);
    eCtx.fill();
    eCtx.fillStyle = '#070606';
    eCtx.beginPath();
    eCtx.arc(0, 0, 17, 0, Math.PI * 2);
    eCtx.fill();
    eCtx.fillStyle = 'rgba(255,255,255,0.22)';
    eCtx.beginPath();
    eCtx.arc(-11, -11, 5, 0, Math.PI * 2);
    eCtx.fill();
    eCtx.restore();
    const eyeIris = new THREE.CanvasTexture(eyeC);
    eyeIris.colorSpace = THREE.SRGBColorSpace;

    cachedFallbackMaps = {
      faceMap: createHumanFaceTexture(),
      bodySkinMap: createBodySkinTexture(),
      skinNormal: buildNormal(128, 1.0, (x, y) => Math.sin(x * 1.6) * Math.cos(y * 1.6) * 0.25),
      clothNormal: buildNormal(128, 1.35, (x, y) => (Math.sin(x * 1.4) + Math.cos(y * 1.4)) * 0.22 + Math.sin(x * 0.14 + Math.sin(y * 0.05)) * 0.4),
      denimNormal: buildNormal(128, 1.65, (x, y) => Math.sin((x + y) * 1.15) * 0.35 + Math.sin(y * 0.18 + Math.sin(x * 0.06)) * 0.5),
      hairNormal: buildNormal(128, 1.5, (x, y) => Math.sin(x * 1.85 + Math.sin(y * 0.08) * 2.2) * 0.45),
      eyeIris,
      denimColor,
    };
  }

  if (!worldTex) return cachedFallbackMaps;
  return {
    ...cachedFallbackMaps,
    skinNormal: worldTex.skinNormal,
    clothNormal: worldTex.clothNormal,
    denimNormal: worldTex.denimNormal,
    hairNormal: worldTex.hairNormal,
    eyeIris: worldTex.eyeIris,
    denimColor: worldTex.denim,
  };
}

// ---------- Parametric SkinnedMesh Surface Builder (Continuous Anatomy & Drape) ----------
interface SkinnedRing {
  y: number;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  weights: Array<[number, number]>;
  capBottom?: boolean;
  capTop?: boolean;
  shapeFn?: (angle: number, normU: number) => { dr?: number; dx?: number; dz?: number; wOverride?: Array<[number, number]> };
}

function buildSkinnedTubeGeometry(
  rings: SkinnedRing[],
  radialSegs: number,
  angleStart = 0,
  angleLength = Math.PI * 2
): THREE.BufferGeometry {
  const closed = Math.abs(angleLength - Math.PI * 2) < 1e-4;
  const vertCols = radialSegs + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  const indices: number[] = [];

  const pushWeights = (ws: Array<[number, number]>) => {
    let sum = 0;
    const outIdx = [0, 0, 0, 0];
    const outW = [0, 0, 0, 0];
    for (let k = 0; k < Math.min(4, ws.length); k++) {
      outIdx[k] = ws[k][0];
      outW[k] = ws[k][1];
      sum += ws[k][1];
    }
    const norm = sum > 0 ? 1 / sum : 1;
    for (let k = 0; k < 4; k++) {
      skinIndices.push(outIdx[k]);
      skinWeights.push(outW[k] * norm);
    }
  };

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const v = rings.length > 1 ? r / (rings.length - 1) : 0;
    for (let c = 0; c <= radialSegs; c++) {
      const u = c / radialSegs;
      const angle = angleStart + u * angleLength;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const mod = ring.shapeFn ? ring.shapeFn(angle, u) : undefined;
      const scaleR = mod?.dr ?? 1;
      const x = ring.cx + sinA * ring.rx * scaleR + (mod?.dx ?? 0);
      const z = ring.cz + cosA * ring.rz * scaleR + (mod?.dz ?? 0);
      positions.push(x, ring.y, z);
      uvs.push(closed ? u : u, v);
      pushWeights(mod?.wOverride ?? ring.weights);
    }
  }

  for (let r = 0; r < rings.length - 1; r++) {
    const row0 = r * vertCols;
    const row1 = (r + 1) * vertCols;
    for (let c = 0; c < radialSegs; c++) {
      const a = row0 + c;
      const b = row0 + c + 1;
      const d = row1 + c;
      const e = row1 + c + 1;
      indices.push(a, b, d);
      indices.push(b, e, d);
    }
  }

  // Optional bottom & top caps
  if (rings[0]?.capBottom) {
    const centerIdx = positions.length / 3;
    positions.push(rings[0].cx, rings[0].y, rings[0].cz);
    uvs.push(0.5, 0);
    pushWeights(rings[0].weights);
    for (let c = 0; c < radialSegs; c++) {
      indices.push(centerIdx, c + 1, c);
    }
  }
  if (rings[rings.length - 1]?.capTop) {
    const last = rings[rings.length - 1];
    const rowStart = (rings.length - 1) * vertCols;
    const centerIdx = positions.length / 3;
    positions.push(last.cx, last.y, last.cz);
    uvs.push(0.5, 1);
    pushWeights(last.weights);
    for (let c = 0; c < radialSegs; c++) {
      indices.push(centerIdx, rowStart + c, rowStart + c + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const SKINNED_GEO_CACHE = new Map<string, THREE.BufferGeometry>();
function getCachedSkinnedGeo(key: string, builder: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = SKINNED_GEO_CACHE.get(key);
  if (!g) {
    g = builder();
    g.userData.shared = true;
    SKINNED_GEO_CACHE.set(key, g);
  }
  return g;
}

function getSkinnedNeckGeo(isFemale: boolean): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`neck_anat_${isFemale ? 'f' : 'm'}`, () => {
    const s = isFemale ? 0.86 : 1.0;
    const w = BONE_IDX;
    const rings: SkinnedRing[] = [
      {
        y: 1.352,
        cx: 0,
        cz: -0.004,
        rx: 0.074 * s,
        rz: 0.066 * s,
        weights: [[w.SPINE, 0.92], [w.HEAD, 0.08]],
        shapeFn: (angle) => {
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          // Subtle clavicle / sternocleidomastoid base & trapezius slope
          const trapBack = cosA < -0.2 ? 0.006 * (-cosA) : 0;
          const clavFront = cosA > 0.3 && Math.abs(sinA) > 0.3 ? 0.004 * cosA : 0;
          return { dz: clavFront - trapBack };
        },
      },
      { y: 1.390, cx: 0, cz: -0.004, rx: 0.056 * s, rz: 0.053 * s, weights: [[w.SPINE, 0.65], [w.HEAD, 0.35]] },
      { y: 1.428, cx: 0, cz: -0.003, rx: 0.047 * s, rz: 0.047 * s, weights: [[w.SPINE, 0.35], [w.HEAD, 0.65]] },
      { y: 1.466, cx: 0, cz: -0.002, rx: 0.045 * s, rz: 0.046 * s, weights: [[w.SPINE, 0.12], [w.HEAD, 0.88]] },
      { y: 1.506, cx: 0, cz: 0.000, rx: 0.046 * s, rz: 0.046 * s, weights: [[w.SPINE, 0.02], [w.HEAD, 0.98]] },
    ];
    return buildSkinnedTubeGeometry(rings, 22);
  });
}

function getSkinnedTorsoGeo(isFemale: boolean, variant: 'tee' | 'jacket_outer' | 'fitted'): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`torso_anat_${isFemale ? 'f' : 'm'}_${variant}`, () => {
    const w = BONE_IDX;
    const sx = isFemale ? 0.92 : 1.06;
    const sz = isFemale ? 0.94 : 1.02;
    const isOuter = variant === 'jacket_outer';
    const pad = isOuter ? 0.015 : variant === 'tee' ? -0.004 : 0.0;

    // Anatomical vertical profile with refined clavicle-to-ribcage-to-waist taper
    const spec: Array<[number, number, number, number, number]> = [
      // y, rxBase, rzBase, cz, spineWeight
      [0.77, 0.140, 0.097, -0.004, 0.25],
      [0.82, 0.142, 0.099, -0.002, 0.55],
      [0.87, isFemale ? 0.120 : 0.135, 0.090, 0.000, 0.85],
      [0.94, isFemale ? 0.116 : 0.137, 0.089, 0.002, 0.98],
      [1.02, isFemale ? 0.130 : 0.149, 0.095, 0.003, 1.0],
      [1.10, isFemale ? 0.145 : 0.165, 0.104, 0.004, 1.0],
      [1.19, isFemale ? 0.155 : 0.181, isFemale ? 0.115 : 0.113, 0.005, 1.0],
      [1.27, isFemale ? 0.161 : 0.194, 0.110, 0.003, 1.0],
      [1.33, isFemale ? 0.149 : 0.178, 0.098, -0.001, 1.0],
      [1.375, isFemale ? 0.103 : 0.122, 0.078, -0.003, 1.0],
      [1.405, isFemale ? 0.064 : 0.072, 0.064, -0.004, 0.92],
    ];

    const rings: SkinnedRing[] = spec.map(([y, rxb, rzb, cz, sw], idx) => {
      const weights: Array<[number, number]> =
        sw < 1.0 ? [[w.SPINE, sw], [w.PELVIS, 1 - sw]] : [[w.SPINE, 1]];
      return {
        y,
        cx: 0,
        cz,
        rx: (rxb + pad) * sx,
        rz: (rzb + pad * 0.85) * sz,
        weights,
        capBottom: idx === 0 && !isOuter,
        capTop: idx === spec.length - 1 && !isOuter,
        shapeFn: (angle) => {
          const sinA = Math.sin(angle);
          const cosA = Math.cos(angle);
          let dz = 0;
          if (cosA > 0.15 && y > 1.08 && y < 1.32) {
            const chestBand = Math.sin(((y - 1.08) / 0.24) * Math.PI);
            const dualLobe = 0.65 + 0.35 * Math.sin(Math.abs(sinA) * Math.PI);
            dz += (isFemale ? 0.018 : 0.012) * chestBand * cosA * dualLobe;
          }
          // Subtle clavicle ridge & trapezius slope near upper torso
          if (y >= 1.29 && y <= 1.37 && cosA > 0.25) {
            dz += 0.003 * Math.sin(((y - 1.29) / 0.08) * Math.PI) * cosA;
          }
          // Natural spine hollow along center back
          if (cosA < -0.5 && y > 0.92 && y < 1.32) {
            dz += 0.0065 * (-cosA - 0.5) * 2;
          }
          // Natural fabric drape ripples near waist/ribcage
          const fold = isOuter || variant === 'fitted'
            ? 0.0024 * Math.sin(angle * 4 + y * 16)
            : 0.0016 * Math.sin(angle * 3 + y * 14);

          let wOverride: Array<[number, number]> | undefined;
          if (y >= 1.24 && Math.abs(sinA) > 0.78) {
            const armInf = 0.16 * ((Math.abs(sinA) - 0.78) / 0.22);
            wOverride = [
              [w.SPINE, 1 - armInf],
              [sinA < 0 ? w.L_ARM : w.R_ARM, armInf],
            ];
          }
          return { dr: 1 + fold / Math.max(0.08, rxb), dz, wOverride };
        },
      };
    });

    if (isOuter) {
      return buildSkinnedTubeGeometry(rings, 28, 0.30, Math.PI * 2 - 0.60);
    }
    return buildSkinnedTubeGeometry(rings, 28);
  });
}

function getSkinnedArmGeo(
  side: -1 | 1,
  isFemale: boolean,
  part: 'short_sleeve' | 'jacket_sleeve' | 'long_sleeve' | 'forearm_skin' | 'jacket_forearm_skin'
): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`arm_anat_${side < 0 ? 'L' : 'R'}_${isFemale ? 'f' : 'm'}_${part}`, () => {
    const w = BONE_IDX;
    const armBone = side < 0 ? w.L_ARM : w.R_ARM;
    const elbowBone = side < 0 ? w.L_ELBOW : w.R_ELBOW;
    const wristBone = side < 0 ? w.L_WRIST : w.R_WRIST;

    const armX = isFemale ? 0.172 : 0.194;
    const scale = isFemale ? 0.86 : 1.0;
    const yShoulder = SPINE_BIND_Y + ARM_LOCAL_Y; // 1.305
    const yElbow = yShoulder + ELBOW_LOCAL_Y; // 1.080
    const yWrist = yElbow + WRIST_LOCAL_Y; // 0.860

    const lerpW = (t: number, b0: number, b1: number): Array<[number, number]> => [
      [b0, 1 - t],
      [b1, t],
    ];

    // Anatomical deltoid cap -> bicep -> elbow taper -> forearm muscle belly -> slender wrist
    const fullPts: Array<{ t: number; y: number; cx: number; r: number; weights: Array<[number, number]> }> = [
      { t: 0.00, y: yShoulder + 0.032, cx: side * (armX * 0.72), r: 0.056 * scale, weights: [[w.SPINE, 0.82], [armBone, 0.18]] },
      { t: 0.08, y: yShoulder + 0.010, cx: side * (armX * 0.90), r: 0.057 * scale, weights: [[w.SPINE, 0.40], [armBone, 0.60]] },
      { t: 0.16, y: yShoulder - 0.025, cx: side * armX, r: 0.053 * scale, weights: [[armBone, 0.92], [w.SPINE, 0.08]] },
      { t: 0.28, y: yShoulder - 0.090, cx: side * armX, r: 0.046 * scale, weights: [[armBone, 1.0]] },
      { t: 0.37, y: yShoulder - 0.145, cx: side * armX, r: 0.043 * scale, weights: [[armBone, 1.0]] },
      { t: 0.45, y: yElbow + 0.035, cx: side * armX, r: 0.039 * scale, weights: lerpW(0.20, armBone, elbowBone) },
      { t: 0.51, y: yElbow + 0.000, cx: side * armX, r: 0.038 * scale, weights: lerpW(0.50, armBone, elbowBone) },
      { t: 0.58, y: yElbow - 0.040, cx: side * armX, r: 0.042 * scale, weights: lerpW(0.84, armBone, elbowBone) },
      { t: 0.70, y: yElbow - 0.105, cx: side * armX, r: 0.036 * scale, weights: [[elbowBone, 1.0]] },
      { t: 0.84, y: yElbow - 0.165, cx: side * armX, r: 0.028 * scale, weights: [[elbowBone, 1.0]] },
      { t: 0.94, y: yWrist + 0.022, cx: side * armX, r: 0.024 * scale, weights: lerpW(0.35, elbowBone, wristBone) },
      { t: 1.00, y: yWrist - 0.006, cx: side * armX, r: 0.023 * scale, weights: lerpW(0.75, elbowBone, wristBone) },
    ];

    let slice = fullPts;
    let rBoost = 1.0;
    let cuffAtEnd = false;
    if (part === 'short_sleeve') {
      slice = fullPts.slice(0, 5);
      rBoost = 1.08;
      cuffAtEnd = true;
    } else if (part === 'jacket_sleeve') {
      slice = fullPts.slice(0, 9);
      rBoost = 1.15;
      cuffAtEnd = true;
    } else if (part === 'long_sleeve') {
      slice = fullPts.slice(0, 11);
      rBoost = 1.10;
      cuffAtEnd = true;
    } else if (part === 'forearm_skin') {
      slice = fullPts.slice(3);
      rBoost = 0.95;
    } else if (part === 'jacket_forearm_skin') {
      slice = fullPts.slice(7);
      rBoost = 0.95;
    }

    const rings: SkinnedRing[] = slice.map((pt, i) => {
      const isCuff = cuffAtEnd && i === slice.length - 1;
      const isFabric = part === 'short_sleeve' || part === 'jacket_sleeve' || part === 'long_sleeve';
      const foldScale = isFabric ? 1 + (isCuff ? 0.04 : 0) : 1;
      return {
        y: pt.y,
        cx: pt.cx,
        cz: 0,
        rx: pt.r * rBoost * foldScale,
        rz: pt.r * rBoost * foldScale * 1.03,
        weights: pt.weights,
        shapeFn: isFabric
          ? (angle) => ({ dr: 1 + 0.026 * Math.sin(angle * 3 + pt.y * 22) })
          : undefined,
      };
    });

    return buildSkinnedTubeGeometry(rings, 18);
  });
}

function getSkinnedLegGeo(
  side: -1 | 1,
  isFemale: boolean,
  part: 'pants_full' | 'pants_kulot' | 'pants_shorts' | 'lower_skin'
): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`leg_anat_${side < 0 ? 'L' : 'R'}_${isFemale ? 'f' : 'm'}_${part}`, () => {
    const w = BONE_IDX;
    const legBone = side < 0 ? w.L_LEG : w.R_LEG;
    const kneeBone = side < 0 ? w.L_KNEE : w.R_KNEE;
    const ankleBone = side < 0 ? w.L_ANKLE : w.R_ANKLE;

    const hipX = isFemale ? 0.092 : 0.096;
    const yHip = RIG_HIP_Y;
    const yKnee = yHip - RIG_THIGH_LEN;
    const yAnkle = yKnee - RIG_SHIN_LEN;
    const lerpW = (t: number, b0: number, b1: number): Array<[number, number]> => [
      [b0, 1 - t],
      [b1, t],
    ];

    // Refined thigh quadriceps taper & gastrocnemius calf contour
    const fullPts: Array<{ y: number; cx: number; rx: number; rz: number; weights: Array<[number, number]> }> = [
      { y: yHip + 0.045, cx: side * (hipX * 0.78), rx: 0.082, rz: 0.088, weights: [[w.PELVIS, 0.78], [legBone, 0.22]] },
      { y: yHip + 0.005, cx: side * (hipX * 0.94), rx: 0.079, rz: 0.084, weights: [[w.PELVIS, 0.42], [legBone, 0.58]] },
      { y: yHip - 0.045, cx: side * hipX, rx: 0.077, rz: 0.082, weights: [[w.PELVIS, 0.10], [legBone, 0.90]] },
      { y: yHip - 0.140, cx: side * hipX, rx: 0.072, rz: 0.076, weights: [[legBone, 1.0]] },
      { y: yHip - 0.240, cx: side * hipX, rx: 0.062, rz: 0.066, weights: [[legBone, 1.0]] },
      { y: yKnee + 0.048, cx: side * hipX, rx: 0.056, rz: 0.059, weights: lerpW(0.22, legBone, kneeBone) },
      { y: yKnee + 0.000, cx: side * hipX, rx: 0.054, rz: 0.057, weights: lerpW(0.52, legBone, kneeBone) },
      { y: yKnee - 0.050, cx: side * hipX, rx: 0.055, rz: 0.058, weights: lerpW(0.84, legBone, kneeBone) },
      { y: yKnee - 0.125, cx: side * hipX, rx: 0.058, rz: 0.062, weights: [[kneeBone, 1.0]] },
      { y: yKnee - 0.225, cx: side * hipX, rx: 0.046, rz: 0.049, weights: [[kneeBone, 1.0]] },
      { y: yAnkle + 0.032, cx: side * hipX, rx: 0.039, rz: 0.042, weights: lerpW(0.20, kneeBone, ankleBone) },
      { y: yAnkle + 0.002, cx: side * hipX, rx: 0.038, rz: 0.041, weights: lerpW(0.55, kneeBone, ankleBone) },
    ];

    let slice = fullPts;
    if (part === 'pants_shorts') {
      slice = fullPts.slice(0, 6);
    } else if (part === 'lower_skin') {
      slice = fullPts.slice(4);
    }

    const isSkin = part === 'lower_skin';
    const isKulot = part === 'pants_kulot';

    const rings: SkinnedRing[] = slice.map((pt, i) => {
      const skinShrink = isSkin ? 0.87 : 1.04;
      const kulotFlare = isKulot && pt.y < yKnee + 0.06 ? 1.0 + ((yKnee + 0.06 - pt.y) / 0.42) * 1.15 : 1.0;
      const isCuff = !isSkin && !isKulot && i === slice.length - 1;
      return {
        y: pt.y,
        cx: pt.cx,
        cz: 0,
        rx: pt.rx * skinShrink * kulotFlare * (isCuff ? 1.05 : 1),
        rz: pt.rz * skinShrink * kulotFlare * (isCuff ? 1.05 : 1),
        weights: pt.weights,
        shapeFn: isSkin
          ? undefined
          : (angle) => ({
              dr: 1 + 0.024 * Math.sin(angle * 3 + pt.y * 16),
            }),
      };
    });

    return buildSkinnedTubeGeometry(rings, 20);
  });
}

function getSkinnedSarungGeo(isFemale: boolean): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`sarung_${isFemale ? 'f' : 'm'}`, () => {
    const w = BONE_IDX;
    const rings: SkinnedRing[] = [];
    const steps = 12;
    const sx = isFemale ? 1.02 : 1.06;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = 0.84 - t * 0.69; // 0.84 down to 0.15
      const rBase = 0.145 + t * 0.032;
      rings.push({
        y,
        cx: 0,
        cz: 0,
        rx: rBase * sx,
        rz: rBase * 0.78,
        weights: [[w.PELVIS, 1]],
        shapeFn: (angle) => {
          const sinA = Math.sin(angle);
          const legInf = Math.min(0.65, t * 0.72);
          const sideBone = sinA < 0 ? w.L_LEG : w.R_LEG;
          const kneeBone = sinA < 0 ? w.L_KNEE : w.R_KNEE;
          const legShare = legInf * Math.min(1, Math.abs(sinA) * 1.25);
          const pelvisShare = 1 - legShare;
          return {
            dr: 1 + 0.015 * Math.sin(angle * 5 + y * 10),
            wOverride: [
              [w.PELVIS, pelvisShare],
              [sideBone, legShare * 0.65],
              [kneeBone, legShare * 0.35],
            ],
          };
        },
      });
    }
    return buildSkinnedTubeGeometry(rings, 24);
  });
}

function getSkinnedHijabDrapeGeo(isFemale: boolean): THREE.BufferGeometry {
  return getCachedSkinnedGeo(`hijab_drape_${isFemale ? 'f' : 'm'}`, () => {
    const w = BONE_IDX;
    const sx = isFemale ? 0.96 : 1.04;
    const sz = isFemale ? 0.98 : 1.02;
    // Draped scarf cascading from tucked under-chin/neck (HEAD) smoothly onto collarbones & upper chest/back (SPINE)
    const spec: Array<{ y: number; cz: number; rx: number; rz: number; weights: Array<[number, number]> }> = [
      { y: 1.462, cz: -0.010, rx: 0.062, rz: 0.056, weights: [[w.HEAD, 0.85], [w.SPINE, 0.15]] },
      { y: 1.430, cz: -0.006, rx: 0.065, rz: 0.062, weights: [[w.HEAD, 0.45], [w.SPINE, 0.55]] },
      { y: 1.398, cz: -0.002, rx: 0.078, rz: 0.074, weights: [[w.SPINE, 0.88], [w.HEAD, 0.12]] },
      { y: 1.366, cz: 0.004, rx: 0.114 * sx, rz: 0.090 * sz, weights: [[w.SPINE, 1]] },
      { y: 1.330, cz: 0.007, rx: 0.142 * sx, rz: 0.106 * sz, weights: [[w.SPINE, 1]] },
      { y: 1.288, cz: 0.008, rx: 0.146 * sx, rz: 0.118 * sz, weights: [[w.SPINE, 1]] },
      { y: 1.244, cz: 0.007, rx: 0.136 * sx, rz: 0.116 * sz, weights: [[w.SPINE, 1]] },
    ];

    const rings: SkinnedRing[] = spec.map((pt, idx) => ({
      y: pt.y,
      cx: 0,
      cz: pt.cz,
      rx: pt.rx,
      rz: pt.rz,
      weights: pt.weights,
      shapeFn: (angle) => {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // Gentle chest drape flare in front/back + soft vertical cloth pleats
        const chestCurve = cosA > 0 && idx >= 3 ? 0.014 * cosA * (idx / (spec.length - 1)) : 0;
        const shoulderTuck = Math.abs(sinA) > 0.75 && idx >= 4 ? -0.006 * (Math.abs(sinA) - 0.75) * 4 : 0;
        const pleats = idx >= 1 ? 0.0024 * Math.sin(angle * 7 + pt.y * 12) : 0;
        return {
          dr: 1 + (pleats + shoulderTuck) / Math.max(0.06, pt.rx),
          dz: chestCurve,
        };
      },
    }));

    return buildSkinnedTubeGeometry(rings, 28);
  });
}

function createHijabHoodGeo(): THREE.BufferGeometry {
  // Sculpted open-face headscarf hood sweeping backward from oval face frame rim -> crown/sides -> back bun pole.
  // Coordinates are in `head` bone local space (`skull` female center at (0, 0.145, 0)).
  const rings = 20;
  const segs = 32;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const center = new THREE.Vector3(0, 0.145, -0.012);
  const pole = new THREE.Vector3(0, 0.133, -0.122);
  const vPole = pole.clone().sub(center).normalize();
  const tmpV0 = new THREE.Vector3();
  const tmpRim = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    // Slight inward tuck right at t=0 rim edge, smoothing outward onto head wrap envelope
    const smoothEnv = t < 0.20 ? (t / 0.20) * (t / 0.20) * (3 - 2 * (t / 0.20)) : 1.0;

    for (let j = 0; j <= segs; j++) {
      const alpha = (j / segs) * Math.PI * 2;
      const c = Math.cos(alpha); // +1 top forehead, 0 cheeks/temples, -1 under chin
      const s = Math.sin(alpha); // +/-1 right/left face edge

      // Oval/superellipse face-frame rim completely clear of forehead, eyebrows, eyes, nose, lips & chin
      const cOval = Math.sign(c) * Math.pow(Math.abs(c), 0.78);
      const sOval = Math.sign(s) * Math.pow(Math.abs(s), 0.86);
      const rimX = sOval * (0.077 - 0.012 * Math.max(0, -c));
      const rimY = 0.128 + cOval * 0.084 + 0.004 * Math.pow(Math.max(0, c), 3);
      const rimZ = 0.036 + Math.max(0, c) * 0.037 + Math.max(0, -c) * 0.008;
      tmpRim.set(rimX, rimY, rimZ);

      tmpV0.copy(tmpRim).sub(center).normalize();
      const dot = Math.max(-0.998, Math.min(0.998, tmpV0.dot(vPole)));
      const omega = Math.acos(dot);
      const sinOmega = Math.sin(omega);

      if (sinOmega > 1e-4) {
        const k0 = Math.sin((1 - t) * omega) / sinOmega;
        const k1 = Math.sin(t * omega) / sinOmega;
        tmpDir.set(
          tmpV0.x * k0 + vPole.x * k1,
          tmpV0.y * k0 + vPole.y * k1,
          tmpV0.z * k0 + vPole.z * k1
        ).normalize();
      } else {
        tmpDir.copy(vPole);
      }

      // Outer cranium wrap surface
      const envX = center.x + tmpDir.x * 0.086;
      const envY = center.y + tmpDir.y * 0.119;
      const envZ = center.z + tmpDir.z * 0.105;

      let x = THREE.MathUtils.lerp(rimX, envX, smoothEnv);
      let y = THREE.MathUtils.lerp(rimY, envY, smoothEnv);
      let z = THREE.MathUtils.lerp(rimZ, envZ, smoothEnv);

      // Soft rolled front hem near face frame (t=0..0.14)
      if (t < 0.16) {
        const brimLift = 0.0035 * Math.sin((t / 0.16) * Math.PI);
        x += Math.sign(x) * brimLift * 0.65;
        y += c * brimLift * 0.55;
        z += brimLift * 0.35;
      }

      // Subtle fabric drape folds & neat back hair-bun volume
      const fold = 0.0018 * Math.sin(alpha * 5 + t * 7) * Math.sin(t * Math.PI);
      x += Math.sign(x) * fold * 0.5;
      y += fold * 0.4;
      if (t > 0.65) {
        const bun = Math.pow((t - 0.65) / 0.35, 1.45);
        z -= 0.012 * bun;
      }

      // Clamp against female skull so no scalp/temple/ear mesh clips through
      const dxSkull = x / 0.078;
      const dySkull = (y - 0.145) / 0.112;
      const dzSkull = z / 0.096;
      const skullD = Math.sqrt(dxSkull * dxSkull + dySkull * dySkull + dzSkull * dzSkull);
      if (skullD > 1e-4 && skullD < 1.045 && t > 0.02) {
        const push = 1.045 / skullD;
        x *= push;
        y = 0.145 + (y - 0.145) * push;
        if (z < 0.02) {
          z *= push;
        }
      }

      if (i === rings) {
        x = pole.x;
        y = pole.y;
        z = pole.z;
      }

      positions.push(x, y, z);
      uvs.push(j / segs, t);
    }
  }

  const stride = segs + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createHijabCiputGeo(): THREE.BufferGeometry {
  // Subtle inner underscarf (ciput) visible cleanly along upper forehead hairline above eyebrows
  const depthSteps = 4;
  const arcSegs = 22;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= depthSteps; i++) {
    const t = i / depthSteps;
    for (let j = 0; j <= arcSegs; j++) {
      const u = j / arcSegs;
      const alpha = (u - 0.5) * Math.PI * 0.72; // neatly spans upper forehead hairline above temples
      const c = Math.cos(alpha);
      const s = Math.sin(alpha);
      const cOval = Math.pow(Math.max(0, c), 0.78);
      const sOval = Math.sign(s) * Math.pow(Math.abs(s), 0.86);
      const archLift = 0.003 * Math.pow(Math.max(0, c), 2.5);
      const x = sOval * (0.075 - t * 0.002);
      const y = 0.130 + cOval * (0.077 + t * 0.011) + archLift;
      const z = 0.036 + Math.max(0, c) * (0.035 - t * 0.016);
      positions.push(x, y, z);
      uvs.push(u, t);
    }
  }

  const stride = arcSegs + 1;
  for (let i = 0; i < depthSteps; i++) {
    for (let j = 0; j < arcSegs; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Shared rigid/accessory geometries
const CHAR_GEOS = (() => {
  const pelvisMalePts = [
    new THREE.Vector2(0.0, 0.72),
    new THREE.Vector2(0.120, 0.73),
    new THREE.Vector2(0.144, 0.78),
    new THREE.Vector2(0.142, 0.84),
    new THREE.Vector2(0.132, 0.875),
    new THREE.Vector2(0.0, 0.88),
  ];
  const pelvisMale = new THREE.LatheGeometry(pelvisMalePts, 22);
  pelvisMale.scale(1.08, 1.0, 0.75);
  pelvisMale.computeVertexNormals();

  const pelvisFemalePts = [
    new THREE.Vector2(0.0, 0.72),
    new THREE.Vector2(0.124, 0.73),
    new THREE.Vector2(0.150, 0.78),
    new THREE.Vector2(0.138, 0.84),
    new THREE.Vector2(0.118, 0.875),
    new THREE.Vector2(0.0, 0.88),
  ];
  const pelvisFemale = new THREE.LatheGeometry(pelvisFemalePts, 22);
  pelvisFemale.scale(1.10, 1.0, 0.77);
  pelvisFemale.computeVertexNormals();

  const geos = {
    pelvisMale,
    pelvisFemale,
    belt: new THREE.CylinderGeometry(0.147, 0.151, 0.032, 22),
    buckle: createRoundedExtrude(0.044, 0.032, 0.016, 0.008, 0.004),
    collar: new THREE.TorusGeometry(0.068, 0.012, 8, 20),
    jacketCollar: new THREE.TorusGeometry(0.075, 0.017, 10, 22, Math.PI * 1.55),
    jacketLapel: createRoundedExtrude(0.024, 0.42, 0.022, 0.008, 0.003),
    jacketHemRib: new THREE.TorusGeometry(0.138, 0.016, 8, 24, Math.PI * 1.75),
    placket: createRoundedExtrude(0.030, 0.38, 0.014, 0.008, 0.003),
    pocket: createRoundedExtrude(0.054, 0.060, 0.012, 0.009, 0.003),
    button: new THREE.SphereGeometry(0.0075, 8, 6),
    epaulet: new THREE.CapsuleGeometry(0.010, 0.064, 4, 6),
    selendang: createRoundedExtrude(0.095, 0.50, 0.23, 0.025, 0.006),
    backpack: createRoundedExtrude(0.22, 0.30, 0.13, 0.05, 0.014),
    backpackFlap: createRoundedExtrude(0.225, 0.10, 0.135, 0.04, 0.01),
    strap: new THREE.CapsuleGeometry(0.015, 0.30, 4, 8),
    neckTowel: new THREE.TorusGeometry(0.095, 0.022, 8, 16, Math.PI * 1.45),
    cargoPocket: createRoundedExtrude(0.030, 0.105, 0.078, 0.012, 0.004),
    shoeVamp: createShoeVampGeo(),
    shoeCollar: new THREE.TorusGeometry(0.044, 0.012, 8, 16),
    shoeTongue: createRoundedExtrude(0.042, 0.036, 0.016, 0.012, 0.004),
    shoeSole: createShoeSoleGeo(),
    sandalStrap: new THREE.TorusGeometry(0.042, 0.009, 6, 12, Math.PI),
    bareFoot: createShoeVampGeo(),
    toeSegment: new THREE.CapsuleGeometry(0.007, 0.012, 4, 6),
    wristWatch: new THREE.TorusGeometry(0.027, 0.0055, 6, 14),
    palm: createRoundedExtrude(0.046, 0.060, 0.020, 0.014, 0.006),
    thenarPad: new THREE.SphereGeometry(0.014, 10, 8),
    curvedFinger: createCurvedFingerGeo(),
    thumbSegment: new THREE.CapsuleGeometry(0.0065, 0.022, 4, 6),
    headMale: createHumanHeadGeo(false),
    headFemale: createHumanHeadGeo(true),
    ear: createEarGeo(),
    eyeball: createEyeballGeo(0.0124),
    corneaCap: new THREE.SphereGeometry(0.0129, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.46),
    eyelidCap: new THREE.SphereGeometry(0.0138, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
    eyelidArc: new THREE.TorusGeometry(0.0132, 0.0022, 6, 14, Math.PI * 0.92),
    lashArc: new THREE.TorusGeometry(0.0139, 0.0014, 5, 14, Math.PI * 0.88),
    brow: new THREE.CapsuleGeometry(0.0033, 0.024, 4, 8),
    mustache: new THREE.CapsuleGeometry(0.0056, 0.038, 4, 8),
    glassesRim: new THREE.TorusGeometry(0.019, 0.0030, 6, 16),
    glassesBridge: new THREE.CapsuleGeometry(0.0024, 0.015, 3, 6),
    glassesArm: new THREE.CapsuleGeometry(0.0020, 0.075, 3, 6),
    hairCard: createCurvedHairCardGeo(0.048, 0.072, 0.011),
    hairCardLong: createCurvedHairCardGeo(0.056, 0.125, 0.014),
    hairCap: new THREE.SphereGeometry(0.093, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairBack: new THREE.SphereGeometry(0.086, 18, 14),
    hairFringe: new THREE.CapsuleGeometry(0.020, 0.080, 4, 8),
    hairSideburn: new THREE.CapsuleGeometry(0.0080, 0.036, 4, 6),
    hairSpike: new THREE.ConeGeometry(0.020, 0.054, 8),
    curlyClump: new THREE.SphereGeometry(0.027, 10, 8),
    bobSide: new THREE.CapsuleGeometry(0.024, 0.095, 4, 8),
    bobBack: new THREE.CylinderGeometry(0.076, 0.096, 0.135, 16),
    undercutTop: createRoundedExtrude(0.093, 0.046, 0.135, 0.024, 0.010),
    ponytail: new THREE.CapsuleGeometry(0.023, 0.135, 4, 8),
    hairBand: new THREE.TorusGeometry(0.025, 0.008, 6, 12),
    kondeBun: new THREE.SphereGeometry(0.047, 14, 12),
    hijabCiput: createHijabCiputGeo(),
    hijabHood: createHijabHoodGeo(),
    caping: new THREE.ConeGeometry(0.28, 0.15, 22),
    peci: new THREE.CylinderGeometry(0.084, 0.091, 0.085, 20),
    policeCap: new THREE.CylinderGeometry(0.103, 0.092, 0.08, 20),
    policeBrim: new THREE.CylinderGeometry(0.096, 0.096, 0.014, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
    helmetShell: new THREE.SphereGeometry(0.112, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
    helmetVisor: new THREE.CylinderGeometry(0.108, 0.108, 0.062, 16, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
    topiCrown: new THREE.SphereGeometry(0.093, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
  };
  Object.values(geos).forEach((g) => {
    g.userData.shared = true;
  });
  return geos;
})();

const SHARED_CHAR_MATS = {
  shoe: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.46, metalness: 0.10 }),
  pantofel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.22, metalness: 0.22 }),
  sole: new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.82 }),
  sneakerSole: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.72 }),
  darkSole: new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.85 }),
  belt: new THREE.MeshStandardMaterial({ color: 0x231a14, roughness: 0.58 }),
  buckle: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.24, metalness: 0.85 }),
  watch: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.65 }),
  glasses: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.85 }),
  backpack: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 }),
  backpackAccent: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),
  towel: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }),
  caping: new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.85 }),
  peci: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.88 }),
  policeCap: new THREE.MeshStandardMaterial({ color: 0x3f2e1d, roughness: 0.6 }),
  policeBrim: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25 }),
  visor: new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.4,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  }),
};

export interface CharacterBuildOptions {
  gender?: 'laki' | 'perempuan';
  shirtColor?: number;
  pantsColor?: number;
  shoeColor?: number;
  skinColor?: number;
  hairColor?: number;
  hairStyle?: CharacterHairStyle;
  hijab?: boolean;
  hijabColor?: number;
  shirtStyle?: CharacterShirtStyle;
  pantsStyle?: CharacterPantsStyle;
  shoeStyle?: CharacterShoeStyle;
  hatType?: 'caping' | 'peci' | 'polisi' | 'helm' | 'topi' | 'none';
  helmetColor?: number;
  hasMustache?: boolean;
  hasGlasses?: boolean;
  hasBackpack?: boolean;
  hasNeckTowel?: boolean;
  outfit?: OutfitId;
  textures?: ProceduralTexturePack;
  randomize?: boolean;
  archetype?: CharacterArchetype;
  qualityTier?: CharacterQualityTier;
  customGlbUrl?: string;
}

const PROCEDURAL_PALETTES = {
  skin: [0xd8a179, 0xd19a72, 0xc98f64, 0xc28658, 0xb87b4c, 0xdfb088, 0xb27345],
  hairNatural: [0x171412, 0x1e1916, 0x29211b, 0x3b2a1e, 0x111111],
  hairElder: [0x9ca3af, 0x6b7280, 0xd1d5db, 0x4b5563],
  hijab: [0xf8fafc, 0xf59e0b, 0x0d9488, 0xbe185d, 0x4f46e5, 0x0f766e, 0x92400e, 0xe11d48, 0x334155, 0x6d28d9],
  shirtCasual: [
    0x1d4ed8, 0x0369a1, 0x0f766e, 0x15803d, 0xb91c1c, 0xd97706, 0x7c3aed,
    0xbe185d, 0x334155, 0x4f5646, 0x047857, 0x4338ca, 0xc2410c, 0xe2e8f0,
  ],
  shirtTrad: [0x92400e, 0x78350f, 0x881337, 0x1e3a8a, 0x0f766e, 0x44403c, 0x7c2d12, 0x6b21a8, 0x065f46, 0xbe123c],
  pantsMain: [0x1e293b, 0x0f172a, 0x334155, 0x1e3a8a, 0x3f3f46, 0x292524, 0x44403c, 0x365314, 0x57534e, 0x78350f],
  pantsOfficial: [0x0f172a, 0x1e293b, 0x1c1917],
  pantsStudent: [0xb91c1c, 0x1e3a8a, 0x334155],
  pantsSarung: [0x1c1917, 0x312e81, 0x14532d, 0x7c2d12, 0x4c1d95, 0x1e293b],
  helmet: [0x111827, 0xf8fafc, 0xdc2626, 0x0284c7, 0xfacc15, 0x334155, 0x15803d],
} as const;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function resolveProceduralCharacterOptions(options: CharacterBuildOptions): CharacterBuildOptions {
  let archetype: CharacterArchetype | undefined = options.archetype;
  if (!archetype) {
    if (options.hatType === 'polisi') archetype = 'uniform';
    else if (options.hairStyle === 'elder') archetype = 'elder_male';
    else if (
      options.hairStyle === 'ponytail' ||
      options.hairStyle === 'bun_konde' ||
      options.hairStyle === 'hijab' ||
      options.hairStyle === 'bob' ||
      options.shirtStyle === 'kebaya'
    ) {
      archetype = 'female';
    } else {
      archetype = 'male';
    }
  }

  const skinColor = pickRandom(PROCEDURAL_PALETTES.skin);

  if (archetype === 'uniform') {
    const hairStyle = pickRandom<CharacterHairStyle>(['fade', 'short_part', 'undercut']);
    const pantsStyle = pickRandom<CharacterPantsStyle>(['celana_kain', 'cargo']);
    return {
      ...options,
      gender: 'laki',
      skinColor,
      hairStyle,
      hairColor: pickRandom(PROCEDURAL_PALETTES.hairNatural),
      shirtStyle: 'seragam',
      pantsStyle,
      pantsColor: pickRandom(PROCEDURAL_PALETTES.pantsOfficial),
      shoeStyle: 'pantofel',
      hasGlasses: options.hasGlasses ?? Math.random() < 0.2,
    };
  }

  if (archetype === 'student') {
    const hairStyle = pickRandom<CharacterHairStyle>(['spiky', 'short_part', 'fade', 'curly', 'undercut']);
    const pantsStyle = pickRandom<CharacterPantsStyle>(['shorts', 'celana_kain', 'jeans']);
    return {
      ...options,
      gender: 'laki',
      skinColor,
      hairStyle,
      hairColor: pickRandom(PROCEDURAL_PALETTES.hairNatural),
      shirtStyle: 'seragam',
      shirtColor: 0xf8fafc,
      pantsStyle,
      pantsColor: pickRandom(PROCEDURAL_PALETTES.pantsStudent),
      shoeStyle: 'sneakers',
      hasGlasses: options.hasGlasses ?? Math.random() < 0.15,
    };
  }

  if (archetype === 'rider') {
    const hairStyle = pickRandom<CharacterHairStyle>(['short_part', 'fade', 'undercut', 'curly']);
    const shirtStyle = options.shirtStyle ?? pickRandom<CharacterShirtStyle>(['jaket', 'tshirt', 'kemeja']);
    const pantsStyle = pickRandom<CharacterPantsStyle>(['jeans', 'cargo', 'celana_kain']);
    return {
      ...options,
      gender: 'laki',
      skinColor,
      hairStyle,
      hairColor: pickRandom(PROCEDURAL_PALETTES.hairNatural),
      shirtStyle,
      shirtColor: pickRandom(PROCEDURAL_PALETTES.shirtCasual),
      pantsStyle,
      pantsColor: pickRandom(PROCEDURAL_PALETTES.pantsMain),
      shoeStyle: pickRandom<CharacterShoeStyle>(['sneakers', 'pantofel']),
      helmetColor: pickRandom(PROCEDURAL_PALETTES.helmet),
    };
  }

  if (archetype === 'female' || archetype === 'elder_female') {
    const isElder = archetype === 'elder_female';
    const hairStyle = isElder
      ? pickRandom<CharacterHairStyle>(['bun_konde', 'hijab', 'bob'])
      : pickRandom<CharacterHairStyle>(['ponytail', 'bun_konde', 'hijab', 'bob', 'curly']);
    const hairColor =
      hairStyle === 'hijab'
        ? pickRandom(PROCEDURAL_PALETTES.hijab)
        : pickRandom(isElder ? PROCEDURAL_PALETTES.hairElder : PROCEDURAL_PALETTES.hairNatural);
    const shirtStyle = isElder
      ? pickRandom<CharacterShirtStyle>(['kebaya', 'batik', 'kemeja'])
      : pickRandom<CharacterShirtStyle>(['kemeja', 'batik', 'tshirt', 'kebaya', 'jaket']);
    const isTradShirt = shirtStyle === 'kebaya' || shirtStyle === 'batik';
    const shirtColor = pickRandom(isTradShirt ? PROCEDURAL_PALETTES.shirtTrad : PROCEDURAL_PALETTES.shirtCasual);
    const pantsStyle = isElder
      ? pickRandom<CharacterPantsStyle>(['sarung', 'kulot', 'celana_kain'])
      : pickRandom<CharacterPantsStyle>(['kulot', 'jeans', 'celana_kain', 'sarung']);
    const pantsColor =
      pantsStyle === 'sarung' ? pickRandom(PROCEDURAL_PALETTES.pantsSarung) : pickRandom(PROCEDURAL_PALETTES.pantsMain);
    const shoeStyle: CharacterShoeStyle =
      pantsStyle === 'sarung' ? 'sandal' : pickRandom<CharacterShoeStyle>(['sneakers', 'sandal', 'pantofel']);
    const hatType =
      options.hatType && options.hatType !== 'none'
        ? options.hatType
        : hairStyle !== 'hijab' && hairStyle !== 'bun_konde' && Math.random() < 0.14
          ? 'topi'
          : 'none';
    return {
      ...options,
      gender: 'perempuan',
      skinColor,
      hairStyle,
      hairColor,
      shirtStyle,
      shirtColor,
      pantsStyle,
      pantsColor,
      shoeStyle,
      hatType,
      hasGlasses: options.hasGlasses ?? Math.random() < (isElder ? 0.35 : 0.18),
    };
  }

  const isElder = archetype === 'elder_male';
  const hairStyle = isElder
    ? pickRandom<CharacterHairStyle>(['elder', 'short_part', 'fade'])
    : pickRandom<CharacterHairStyle>(['short_part', 'spiky', 'fade', 'curly', 'undercut']);
  const hairColor = pickRandom(isElder ? PROCEDURAL_PALETTES.hairElder : PROCEDURAL_PALETTES.hairNatural);
  const shirtStyle = isElder
    ? pickRandom<CharacterShirtStyle>(['batik', 'lurik', 'kemeja'])
    : pickRandom<CharacterShirtStyle>(['tshirt', 'kemeja', 'batik', 'jaket', 'lurik']);
  const isTradShirt = shirtStyle === 'batik' || shirtStyle === 'lurik';
  const shirtColor = pickRandom(isTradShirt ? PROCEDURAL_PALETTES.shirtTrad : PROCEDURAL_PALETTES.shirtCasual);
  const pantsStyle = isElder
    ? pickRandom<CharacterPantsStyle>(['celana_kain', 'sarung', 'cargo', 'jeans'])
    : pickRandom<CharacterPantsStyle>(['jeans', 'cargo', 'celana_kain', 'shorts', 'sarung']);
  const pantsColor =
    pantsStyle === 'sarung' ? pickRandom(PROCEDURAL_PALETTES.pantsSarung) : pickRandom(PROCEDURAL_PALETTES.pantsMain);
  const shoeStyle: CharacterShoeStyle =
    pantsStyle === 'sarung' || pantsStyle === 'shorts'
      ? pickRandom<CharacterShoeStyle>(['sandal', 'sneakers'])
      : pickRandom<CharacterShoeStyle>(['sneakers', 'pantofel', 'sandal']);
  const hatType =
    options.hatType && options.hatType !== 'none'
      ? options.hatType
      : Math.random() < 0.18
        ? 'topi'
        : 'none';
  return {
    ...options,
    gender: 'laki',
    skinColor,
    hairStyle,
    hairColor,
    shirtStyle,
    shirtColor,
    pantsStyle,
    pantsColor,
    shoeStyle,
    hatType,
    hasMustache: options.hasMustache ?? Math.random() < (isElder ? 0.55 : 0.22),
    hasGlasses: options.hasGlasses ?? Math.random() < (isElder ? 0.35 : 0.2),
  };
}

function buildOutfitDecor(
  decorGroup: THREE.Group,
  style: CharacterShirtStyle,
  shirtColor: number,
  collarColor: number,
  textures?: ProceduralTexturePack,
  isFemale = false
) {
  while (decorGroup.children.length > 0) {
    decorGroup.remove(decorGroup.children[0]);
  }

  const maps = getCharMaps(textures);
  const trimMat = new THREE.MeshStandardMaterial({
    color: collarColor,
    normalMap: maps.clothNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.68,
  });
  const chestZ = isFemale ? 0.106 : 0.114;

  if (style === 'kemeja' || style === 'batik' || style === 'seragam') {
    const placket = new THREE.Mesh(CHAR_GEOS.placket, trimMat);
    placket.position.set(0, 0.26, chestZ);
    placket.rotation.x = -0.10;
    decorGroup.add(placket);
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(CHAR_GEOS.button, SHARED_CHAR_MATS.belt);
      btn.position.set(0, 0.17 + b * 0.11, chestZ + 0.008 + b * 0.005);
      decorGroup.add(btn);
    }
    const pocket = new THREE.Mesh(CHAR_GEOS.pocket, trimMat);
    pocket.position.set(isFemale ? 0.072 : 0.082, 0.33, chestZ + 0.004);
    pocket.rotation.x = -0.10;
    decorGroup.add(pocket);
    if (style === 'seragam') {
      [-0.135, 0.135].forEach((ex) => {
        const ep = new THREE.Mesh(CHAR_GEOS.epaulet, SHARED_CHAR_MATS.buckle);
        ep.rotation.z = Math.PI / 2;
        ep.position.set(ex, 0.495, 0);
        decorGroup.add(ep);
      });
    }
  } else if (style === 'jaket') {
    // Open front bomber jacket lapels + collar standing + waist ribbing (inner crew tee is full SkinnedMesh!)
    const jacketAccentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shirtColor).multiplyScalar(0.84),
      normalMap: maps.clothNormal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughness: 0.56,
    });
    const standingCollar = new THREE.Mesh(CHAR_GEOS.jacketCollar, jacketAccentMat);
    standingCollar.rotation.set(Math.PI / 2 + 0.14, 0, Math.PI * 0.72);
    standingCollar.position.set(0, 0.545, -0.004);

    const lapelL = new THREE.Mesh(CHAR_GEOS.jacketLapel, jacketAccentMat);
    lapelL.position.set(-0.044, 0.25, chestZ - 0.002);
    lapelL.rotation.set(-0.08, 0.22, 0);
    const lapelR = new THREE.Mesh(CHAR_GEOS.jacketLapel, jacketAccentMat);
    lapelR.position.set(0.044, 0.25, chestZ - 0.002);
    lapelR.rotation.set(-0.08, -0.22, 0);

    const hemRib = new THREE.Mesh(CHAR_GEOS.jacketHemRib, jacketAccentMat);
    hemRib.rotation.set(Math.PI / 2, 0, Math.PI * 0.62);
    hemRib.position.set(0, -0.025, -0.004);
    hemRib.scale.set(isFemale ? 0.96 : 1.04, 0.75, 1.0);

    decorGroup.add(standingCollar, lapelL, lapelR, hemRib);
  } else if (style === 'lurik') {
    const sash = new THREE.Mesh(
      CHAR_GEOS.placket,
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        map: textures ? textures.batikWall : null,
        roughness: 0.72,
      })
    );
    sash.position.set(0.02, 0.26, chestZ + 0.004);
    sash.rotation.set(-0.10, 0, -0.14);
    sash.scale.set(1.4, 0.96, 1);
    decorGroup.add(sash);
  } else if (style === 'kebaya') {
    const kutu = new THREE.Mesh(
      CHAR_GEOS.placket,
      new THREE.MeshStandardMaterial({
        color: shirtColor,
        normalMap: maps.clothNormal,
        roughness: 0.68,
      })
    );
    kutu.position.set(0, 0.26, chestZ + 0.005);
    kutu.rotation.x = -0.10;
    kutu.scale.set(1.75, 0.92, 1);
    const selendang = new THREE.Mesh(
      CHAR_GEOS.selendang,
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        map: textures ? textures.batikWall : null,
        normalMap: maps.clothNormal,
        roughness: 0.78,
      })
    );
    selendang.position.set(-0.105, 0.27, 0.008);
    selendang.rotation.z = 0.10;
    decorGroup.add(kutu, selendang);
  }
}

export function createCharacterRig(rawOptions: CharacterBuildOptions): CharacterRig {
  const options = rawOptions.randomize ? resolveProceduralCharacterOptions(rawOptions) : rawOptions;
  const maps = getCharMaps(options.textures);
  const realismTex = getHumanRealismTextures();
  const tier: CharacterQualityTier = options.qualityTier ?? 'seimbang';

  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const detailGroup = new THREE.Group();
  const hairCardGroup = new THREE.Group();

  // Use THREE.Bone for the articulated hierarchy so SkinnedMesh deforms seamlessly across all joints
  const pelvisGroup = new THREE.Bone();
  const spineGroup = new THREE.Bone();
  spineGroup.position.set(0, SPINE_BIND_Y, 0);
  bodyGroup.add(pelvisGroup, spineGroup);

  const useHijab = Boolean(options.hijab || options.hairStyle === 'hijab');
  const isFemale =
    options.gender === 'perempuan' ||
    (!options.gender &&
      (useHijab ||
        options.hairStyle === 'ponytail' ||
        options.hairStyle === 'bun_konde' ||
        options.hairStyle === 'bob' ||
        options.shirtStyle === 'kebaya'));

  const baseSkinHex = options.skinColor ?? 0xd19a72;
  const faceMap = tier === 'lancar' ? realismTex.faceMap512 : realismTex.faceMap1024;
  const skinNorm = tier === 'lancar' ? maps.skinNormal : realismTex.skinPoreNormal;
  const clothNorm = tier === 'lancar' ? maps.clothNormal : realismTex.clothFoldNormal;

  const headSkinMat = createHumanSkinMaterial({
    color: baseSkinHex,
    map: faceMap,
    normalMap: skinNorm,
    normalScale: tier === 'lancar' ? 0.35 : 0.48,
    roughness: 0.54,
    tier,
  });
  const bodySkinMat = createHumanSkinMaterial({
    color: baseSkinHex,
    map: maps.bodySkinMap,
    normalMap: skinNorm,
    normalScale: tier === 'lancar' ? 0.30 : 0.40,
    roughness: 0.56,
    tier,
  });

  const skinCol = new THREE.Color(baseSkinHex);
  const eyelidMat = createHumanSkinMaterial({
    color: skinCol.clone().multiplyScalar(0.86).getHex(),
    map: maps.bodySkinMap,
    normalMap: skinNorm,
    normalScale: 0.25,
    roughness: 0.52,
    tier,
  });

  const outfitCfg = options.outfit ? OUTFIT_COLORS[options.outfit] : null;
  const shirtColor = options.shirtColor ?? (outfitCfg ? outfitCfg.shirt : 0x2563eb);
  const pantsColor = options.pantsColor ?? (outfitCfg ? outfitCfg.pants : 0x1e293b);
  const shirtStyle: CharacterShirtStyle = options.shirtStyle ?? (outfitCfg ? outfitCfg.style : 'tshirt');
  const pantsStyle: CharacterPantsStyle = options.pantsStyle ?? 'jeans';
  const shoeStyle: CharacterShoeStyle = options.shoeStyle ?? 'sneakers';
  const hairStyle: CharacterHairStyle = useHijab ? 'hijab' : (options.hairStyle ?? 'short_part');
  const hairColor = options.hairColor ?? 0x171412;
  const hijabColor = options.hijabColor ?? options.hairColor ?? 0xf8fafc;

  const customShoeMat =
    options.shoeColor !== undefined
      ? new THREE.MeshStandardMaterial({
          color: options.shoeColor,
          roughness: shoeStyle === 'pantofel' ? 0.24 : shoeStyle === 'sandal' ? 0.65 : 0.46,
          metalness: shoeStyle === 'pantofel' ? 0.18 : 0.08,
        })
      : null;

  const shirtMap =
    shirtStyle === 'batik' && options.textures
      ? options.textures.batikWall
      : shirtStyle === 'lurik' && options.textures
        ? options.textures.lurik
        : null;

  const shirtMat = createHumanClothMaterial({
    color: shirtColor,
    roughness: shirtStyle === 'jaket' ? 0.56 : 0.78,
    metalness: outfitCfg?.metalness ?? (shirtStyle === 'jaket' ? 0.08 : 0.03),
    map: shirtMap,
    normalMap: clothNorm,
    normalScale: 0.92,
    side: shirtStyle === 'jaket' ? THREE.DoubleSide : THREE.FrontSide,
    tier,
  });

  const innerTeeMat = createHumanClothMaterial({
    color: 0xe8eaed,
    roughness: 0.84,
    metalness: 0.01,
    map: null,
    normalMap: clothNorm,
    normalScale: 0.6,
    tier,
  });

  const collarColor = outfitCfg ? outfitCfg.collar : 0xe5e7eb;
  const collarMat = createHumanClothMaterial({
    color: collarColor,
    roughness: 0.66,
    metalness: 0.02,
    map: null,
    normalMap: clothNorm,
    normalScale: 0.5,
    tier,
  });

  const pantsMap =
    pantsStyle === 'jeans'
      ? maps.denimColor
      : pantsStyle === 'sarung' && options.textures
        ? options.textures.batikWall
        : null;

  const pantsMat = createHumanClothMaterial({
    color: pantsColor,
    roughness: pantsStyle === 'jeans' ? 0.84 : 0.78,
    metalness: 0.02,
    map: pantsMap,
    normalMap: pantsStyle === 'jeans' ? maps.denimNormal : clothNorm,
    normalScale: 0.98,
    tier,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    normalMap: maps.hairNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.56,
    metalness: 0.08,
  });
  const hairCardMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    map: realismTex.hairStrandMap,
    alphaMap: realismTex.hairStrandAlpha,
    normalMap: maps.hairNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    alphaTest: 0.34,
    roughness: 0.48,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const hijabMat = createHumanClothMaterial({
    color: hijabColor,
    normalMap: clothNorm,
    normalScale: 0.72,
    roughness: 0.74,
    metalness: 0.02,
    map: null,
    side: THREE.DoubleSide,
    tier,
  });
  const hijabCiputMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hijabColor).multiplyScalar(0.80),
    roughness: 0.85,
    side: THREE.DoubleSide,
  });

  const eyeballMat = new THREE.MeshStandardMaterial({
    map: tier === 'lancar' ? maps.eyeIris : realismTex.eyeIris512,
    roughness: 0.14,
    metalness: 0.04,
  });
  const corneaMat = createHumanCorneaMaterial(tier);
  const lashMat = new THREE.MeshStandardMaterial({
    color: 0x16110e,
    roughness: 0.65,
  });

  const shirtMeshes: THREE.Mesh[] = [];
  const pantsMeshes: THREE.Mesh[] = [];

  // ----- Build 15-Bone Hierarchy (exact same coordinates as legacy pivots!) -----
  const hipX = isFemale ? 0.092 : 0.096;
  const makeLegBones = (xOff: number) => {
    const legPivot = new THREE.Bone();
    legPivot.position.set(xOff, RIG_HIP_Y, 0);
    const kneePivot = new THREE.Bone();
    kneePivot.position.set(0, -RIG_THIGH_LEN, 0);
    const anklePivot = new THREE.Bone();
    anklePivot.position.set(0, -RIG_SHIN_LEN, 0);
    legPivot.add(kneePivot);
    kneePivot.add(anklePivot);

    if (pantsStyle === 'cargo') {
      const pocket = new THREE.Mesh(CHAR_GEOS.cargoPocket, pantsMat);
      pocket.position.set(xOff < 0 ? -0.068 : 0.068, -0.17, 0.005);
      pantsMeshes.push(pocket);
      legPivot.add(pocket);
    }

    // Footwear mounted at anklePivot (bottom flush at y = -0.078)
    if (shoeStyle === 'sandal') {
      const bareFoot = new THREE.Mesh(CHAR_GEOS.bareFoot, bodySkinMat);
      bareFoot.position.set(0, -0.056, 0.0);
      bareFoot.scale.set(0.92, 0.85, 0.96);

      for (let t = 0; t < 4; t++) {
        const toe = new THREE.Mesh(CHAR_GEOS.toeSegment, bodySkinMat);
        toe.rotation.x = Math.PI / 2;
        toe.position.set(-0.021 + t * 0.014, -0.058, 0.132 - t * 0.002);
        anklePivot.add(toe);
      }

      const strap = new THREE.Mesh(CHAR_GEOS.sandalStrap, customShoeMat ?? SHARED_CHAR_MATS.belt);
      strap.position.set(0, -0.036, 0.055);
      strap.rotation.x = 0.22;

      const sole = new THREE.Mesh(CHAR_GEOS.shoeSole, SHARED_CHAR_MATS.darkSole);
      sole.position.set(0, -0.071, 0.016);
      anklePivot.add(bareFoot, strap, sole);
    } else if (shoeStyle === 'pantofel') {
      const pantofelMat = customShoeMat ?? SHARED_CHAR_MATS.pantofel;
      const shoeUpper = new THREE.Mesh(CHAR_GEOS.shoeVamp, pantofelMat);
      shoeUpper.position.set(0, -0.055, 0.004);
      shoeUpper.scale.set(0.94, 0.96, 1.03);

      const shoeCollar = new THREE.Mesh(CHAR_GEOS.shoeCollar, pantofelMat);
      shoeCollar.rotation.x = Math.PI / 2;
      shoeCollar.position.set(0, -0.008, -0.006);

      const shoeSole = new THREE.Mesh(CHAR_GEOS.shoeSole, SHARED_CHAR_MATS.darkSole);
      shoeSole.position.set(0, -0.071, 0.016);
      anklePivot.add(shoeUpper, shoeCollar, shoeSole);
    } else {
      const sneakerMat = customShoeMat ?? SHARED_CHAR_MATS.shoe;
      const shoeUpper = new THREE.Mesh(CHAR_GEOS.shoeVamp, sneakerMat);
      shoeUpper.position.set(0, -0.055, 0.002);

      const shoeCollar = new THREE.Mesh(CHAR_GEOS.shoeCollar, sneakerMat);
      shoeCollar.rotation.x = Math.PI / 2;
      shoeCollar.position.set(0, -0.006, -0.006);

      const tongue = new THREE.Mesh(CHAR_GEOS.shoeTongue, sneakerMat);
      tongue.position.set(0, -0.014, 0.034);
      tongue.rotation.x = -0.45;

      const shoeSole = new THREE.Mesh(
        CHAR_GEOS.shoeSole,
        options.shoeColor !== undefined ? SHARED_CHAR_MATS.darkSole : SHARED_CHAR_MATS.sneakerSole
      );
      shoeSole.position.set(0, -0.071, 0.016);
      anklePivot.add(shoeUpper, shoeCollar, tongue, shoeSole);
    }

    return { legPivot, kneePivot, anklePivot };
  };

  const leftLegBuilt = makeLegBones(-hipX);
  const rightLegBuilt = makeLegBones(hipX);
  const leftLeg = leftLegBuilt.legPivot;
  const rightLeg = rightLegBuilt.legPivot;
  const leftKnee = leftLegBuilt.kneePivot;
  const rightKnee = rightLegBuilt.kneePivot;
  const leftAnkle = leftLegBuilt.anklePivot;
  const rightAnkle = rightLegBuilt.anklePivot;
  pelvisGroup.add(leftLeg, rightLeg);

  const armX = isFemale ? 0.172 : 0.194;
  const makeArmBones = (xOff: number, withWatch: boolean) => {
    const armPivot = new THREE.Bone();
    armPivot.position.set(xOff, ARM_LOCAL_Y, 0);
    const elbowPivot = new THREE.Bone();
    elbowPivot.position.set(0, ELBOW_LOCAL_Y, 0);
    const wristPivot = new THREE.Bone();
    wristPivot.position.set(0, WRIST_LOCAL_Y, 0);
    armPivot.add(elbowPivot);
    elbowPivot.add(wristPivot);

    const armScale = isFemale ? 0.87 : 1.0;
    const isLongSleeve = shirtStyle === 'batik' || shirtStyle === 'lurik' || shirtStyle === 'kebaya';
    if (withWatch && !isLongSleeve) {
      const watch = new THREE.Mesh(CHAR_GEOS.wristWatch, SHARED_CHAR_MATS.watch);
      watch.rotation.x = Math.PI / 2;
      watch.position.y = -0.195;
      watch.scale.setScalar(armScale);
      elbowPivot.add(watch);
    }

    // Anatomical 5-finger human hand with tapered thenar pad & curved multi-joint fingers
    const handGroup = new THREE.Group();
    const isNegX = xOff < 0;
    handGroup.rotation.y = isNegX ? Math.PI * 0.44 : -Math.PI * 0.44;
    handGroup.scale.setScalar(isFemale ? 0.89 : 1.0);
    wristPivot.add(handGroup);

    const palm = new THREE.Mesh(CHAR_GEOS.palm, bodySkinMat);
    palm.position.set(0, -0.028, 0.002);
    palm.castShadow = true;

    const thenar = new THREE.Mesh(CHAR_GEOS.thenarPad, bodySkinMat);
    thenar.position.set(isNegX ? -0.015 : 0.015, -0.025, 0.008);
    thenar.scale.set(0.85, 1.35, 0.8);
    handGroup.add(palm, thenar);

    const fingerConfigs = [
      { x: -0.0155, len: 0.94, z: 0.004 },
      { x: -0.0052, len: 1.04, z: 0.005 },
      { x: 0.0052, len: 0.98, z: 0.004 },
      { x: 0.0155, len: 0.80, z: 0.002 },
    ];
    for (const fc of fingerConfigs) {
      const finger = new THREE.Mesh(CHAR_GEOS.curvedFinger, bodySkinMat);
      finger.position.set(fc.x * (isNegX ? 1 : -1), -0.050, fc.z);
      finger.scale.set(0.96, fc.len, 0.96);
      handGroup.add(finger);
    }

    const thumb = new THREE.Mesh(CHAR_GEOS.thumbSegment, bodySkinMat);
    const thumbX = isNegX ? -0.024 : 0.024;
    thumb.position.set(thumbX, -0.029, 0.013);
    thumb.rotation.set(-0.28, 0, isNegX ? 0.46 : -0.46);
    handGroup.add(thumb);

    return { armPivot, elbowPivot, wristPivot };
  };

  const leftArmBuilt = makeArmBones(-armX, true);
  const rightArmBuilt = makeArmBones(armX, false);
  const leftArm = leftArmBuilt.armPivot;
  const rightArm = rightArmBuilt.armPivot;
  const leftElbow = leftArmBuilt.elbowPivot;
  const rightElbow = rightArmBuilt.elbowPivot;
  const leftWrist = leftArmBuilt.wristPivot;
  const rightWrist = rightArmBuilt.wristPivot;
  spineGroup.add(leftArm, rightArm);

  const head = new THREE.Bone();
  head.position.set(0, HEAD_LOCAL_Y, 0);
  spineGroup.add(head);

  // Build Skeleton in exact BONE_IDX order & bind in bodyGroup identity pose
  const bones: THREE.Bone[] = [
    pelvisGroup,
    spineGroup,
    head,
    leftArm,
    leftElbow,
    leftWrist,
    rightArm,
    rightElbow,
    rightWrist,
    leftLeg,
    leftKnee,
    leftAnkle,
    rightLeg,
    rightKnee,
    rightAnkle,
  ];
  bodyGroup.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);

  const bindSkinned = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.castShadow = true;
    sm.receiveShadow = true;
    sm.frustumCulled = false;
    sm.bind(skeleton);
    bodyGroup.add(sm);
    return sm;
  };

  // ----- Continuous Skinned Body & Garments (Zero Spherical Joint Seams) -----
  // 1. Continuous Neck (spine -> head)
  bindSkinned(getSkinnedNeckGeo(isFemale), bodySkinMat);

  // 2. Torso & Jacket Layering
  let torso: THREE.Mesh;
  if (shirtStyle === 'jaket') {
    // Inner crew-neck cotton tee + outer open-front bomber jacket shell (Reference Image 3 style!)
    bindSkinned(getSkinnedTorsoGeo(isFemale, 'tee'), innerTeeMat);
    torso = bindSkinned(getSkinnedTorsoGeo(isFemale, 'jacket_outer'), shirtMat);
    shirtMeshes.push(torso);
  } else {
    torso = bindSkinned(getSkinnedTorsoGeo(isFemale, 'fitted'), shirtMat);
    shirtMeshes.push(torso);
  }

  // 3. Continuous Sleeves + Forearms (shoulder -> elbow -> wrist)
  if (shirtStyle === 'jaket') {
    const lSleeve = bindSkinned(getSkinnedArmGeo(-1, isFemale, 'jacket_sleeve'), shirtMat);
    const rSleeve = bindSkinned(getSkinnedArmGeo(1, isFemale, 'jacket_sleeve'), shirtMat);
    shirtMeshes.push(lSleeve, rSleeve);
    bindSkinned(getSkinnedArmGeo(-1, isFemale, 'jacket_forearm_skin'), bodySkinMat);
    bindSkinned(getSkinnedArmGeo(1, isFemale, 'jacket_forearm_skin'), bodySkinMat);
  } else if (shirtStyle === 'batik' || shirtStyle === 'lurik' || shirtStyle === 'kebaya') {
    const lSleeve = bindSkinned(getSkinnedArmGeo(-1, isFemale, 'long_sleeve'), shirtMat);
    const rSleeve = bindSkinned(getSkinnedArmGeo(1, isFemale, 'long_sleeve'), shirtMat);
    shirtMeshes.push(lSleeve, rSleeve);
  } else {
    const lSleeve = bindSkinned(getSkinnedArmGeo(-1, isFemale, 'short_sleeve'), shirtMat);
    const rSleeve = bindSkinned(getSkinnedArmGeo(1, isFemale, 'short_sleeve'), shirtMat);
    shirtMeshes.push(lSleeve, rSleeve);
    bindSkinned(getSkinnedArmGeo(-1, isFemale, 'forearm_skin'), bodySkinMat);
    bindSkinned(getSkinnedArmGeo(1, isFemale, 'forearm_skin'), bodySkinMat);
  }

  // 4. Pelvis Saddle, Belt & Continuous Skinned Legs/Trousers (hip -> knee -> ankle)
  const pelvis = new THREE.Mesh(
    isFemale ? CHAR_GEOS.pelvisFemale : CHAR_GEOS.pelvisMale,
    pantsMat
  );
  pelvis.castShadow = true;
  pelvis.receiveShadow = true;
  pantsMeshes.push(pelvis);

  const belt = new THREE.Mesh(CHAR_GEOS.belt, SHARED_CHAR_MATS.belt);
  belt.position.y = 0.848;
  belt.scale.set(isFemale ? 0.92 : 1.0, 1.0, 0.74);
  const buckle = new THREE.Mesh(CHAR_GEOS.buckle, SHARED_CHAR_MATS.buckle);
  buckle.position.set(0, 0.848, 0.112);
  pelvisGroup.add(pelvis, belt, buckle);

  if (pantsStyle === 'sarung') {
    const sarungMesh = bindSkinned(getSkinnedSarungGeo(isFemale), pantsMat);
    pantsMeshes.push(sarungMesh);
    bindSkinned(getSkinnedLegGeo(-1, isFemale, 'lower_skin'), bodySkinMat);
    bindSkinned(getSkinnedLegGeo(1, isFemale, 'lower_skin'), bodySkinMat);
  } else if (pantsStyle === 'shorts') {
    const lShort = bindSkinned(getSkinnedLegGeo(-1, isFemale, 'pants_shorts'), pantsMat);
    const rShort = bindSkinned(getSkinnedLegGeo(1, isFemale, 'pants_shorts'), pantsMat);
    pantsMeshes.push(lShort, rShort);
    bindSkinned(getSkinnedLegGeo(-1, isFemale, 'lower_skin'), bodySkinMat);
    bindSkinned(getSkinnedLegGeo(1, isFemale, 'lower_skin'), bodySkinMat);
  } else if (pantsStyle === 'kulot') {
    const lKulot = bindSkinned(getSkinnedLegGeo(-1, isFemale, 'pants_kulot'), pantsMat);
    const rKulot = bindSkinned(getSkinnedLegGeo(1, isFemale, 'pants_kulot'), pantsMat);
    pantsMeshes.push(lKulot, rKulot);
  } else {
    const lPants = bindSkinned(getSkinnedLegGeo(-1, isFemale, 'pants_full'), pantsMat);
    const rPants = bindSkinned(getSkinnedLegGeo(1, isFemale, 'pants_full'), pantsMat);
    pantsMeshes.push(lPants, rPants);
  }

  // ----- Collar, Decor, Backpack & Neck Towel on Spine -----
  const collar = new THREE.Mesh(CHAR_GEOS.collar, shirtStyle === 'jaket' ? innerTeeMat : collarMat);
  collar.rotation.x = Math.PI / 2 + 0.14;
  collar.position.set(0, 0.542, 0.006);
  collar.scale.set(isFemale ? 0.94 : 1.02, 0.9, 1);
  spineGroup.add(collar);

  const outfitDecorGroup = new THREE.Group();
  buildOutfitDecor(outfitDecorGroup, shirtStyle, shirtColor, collarColor, options.textures, isFemale);
  spineGroup.add(outfitDecorGroup);

  if (options.hasBackpack) {
    const pack = new THREE.Mesh(CHAR_GEOS.backpack, SHARED_CHAR_MATS.backpack);
    pack.position.set(0, 0.27, -0.155);
    pack.castShadow = true;
    const flap = new THREE.Mesh(CHAR_GEOS.backpackFlap, SHARED_CHAR_MATS.backpackAccent);
    flap.position.set(0, 0.38, -0.16);
    [-0.088, 0.088].forEach((sx) => {
      const strap = new THREE.Mesh(CHAR_GEOS.strap, SHARED_CHAR_MATS.belt);
      strap.position.set(sx, 0.30, -0.01);
      spineGroup.add(strap);
    });
    spineGroup.add(pack, flap);
  }

  if (options.hasNeckTowel) {
    const towel = new THREE.Mesh(CHAR_GEOS.neckTowel, SHARED_CHAR_MATS.towel);
    towel.rotation.x = Math.PI / 2 + 0.18;
    towel.rotation.z = -Math.PI * 0.22;
    towel.position.set(0, 0.54, 0.008);
    spineGroup.add(towel);
  }

  // ----- Unified Sculpted 64x48 Human Head + UV-Aligned Face + Recessed Eyes -----
  const skull = new THREE.Mesh(
    isFemale ? CHAR_GEOS.headFemale : CHAR_GEOS.headMale,
    headSkinMat
  );
  skull.position.set(0, 0.145, 0);
  skull.castShadow = true;
  skull.receiveShadow = true;
  head.add(skull);

  if (hairStyle !== 'hijab') {
    const earX = isFemale ? 0.072 : 0.076;
    const earL = new THREE.Mesh(CHAR_GEOS.ear, bodySkinMat);
    earL.position.set(-earX, 0.144, -0.005);
    earL.rotation.y = -0.24;
    const earR = new THREE.Mesh(CHAR_GEOS.ear, bodySkinMat);
    earR.position.set(earX, 0.144, -0.005);
    earR.rotation.y = 0.24;
    head.add(earL, earR);
  }

  if (options.hasMustache) {
    const stache = new THREE.Mesh(CHAR_GEOS.mustache, hairMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, 0.107, 0.090);
    stache.scale.set(0.85, 0.9, 0.72);
    head.add(stache);
  }

  const eyeX = isFemale ? 0.0258 : 0.0276;
  const eyeY = 0.1510;
  const eyeZ = 0.0748;
  let leftEyeObj: THREE.Object3D | null = null;
  let rightEyeObj: THREE.Object3D | null = null;
  let leftEyelidPivot: THREE.Object3D | null = null;
  let rightEyelidPivot: THREE.Object3D | null = null;

  [-eyeX, eyeX].forEach((ex, eyeIdx) => {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(ex, eyeY, eyeZ);

    const eyeball = new THREE.Mesh(CHAR_GEOS.eyeball, eyeballMat);
    eyeball.scale.set(1.03, 0.89, 0.92);
    eyeSocket.add(eyeball);

    if (corneaMat) {
      const cornea = new THREE.Mesh(CHAR_GEOS.corneaCap, corneaMat);
      cornea.rotation.x = Math.PI / 2;
      cornea.position.z = 0.0014;
      cornea.scale.set(1.03, 0.92, 0.89);
      eyeSocket.add(cornea);
    }

    // Articulated upper eyelid pivot centered on eyeball for natural human blinking
    const lidPivot = new THREE.Group();
    lidPivot.rotation.set(-0.18, 0, 0);
    const lidShell = new THREE.Mesh(CHAR_GEOS.eyelidCap, eyelidMat);
    lidShell.rotation.x = -0.05;
    lidShell.scale.set(1.04, 0.94, 0.96);
    lidPivot.add(lidShell);

    const lashRim = new THREE.Mesh(CHAR_GEOS.lashArc, lashMat);
    lashRim.position.set(0, 0.0008, 0.0028);
    lashRim.rotation.x = 0.18;
    lidPivot.add(lashRim);

    const creaseRim = new THREE.Mesh(CHAR_GEOS.eyelidArc, eyelidMat);
    creaseRim.position.set(0, 0.0032, 0.0046);
    creaseRim.rotation.set(0.32, ex < 0 ? -0.08 : 0.08, ex < 0 ? 0.04 : -0.04);
    creaseRim.scale.set(1.08, 0.82, 0.85);

    const brow = new THREE.Mesh(CHAR_GEOS.brow, hairMat);
    brow.rotation.z = Math.PI / 2 + (ex < 0 ? 0.09 : -0.09);
    brow.rotation.y = ex < 0 ? 0.22 : -0.22;
    brow.position.set(ex, eyeY + 0.0172, eyeZ + 0.0112);
    brow.scale.set(0.84, 0.95, 0.65);

    eyeSocket.add(lidPivot, creaseRim);
    head.add(eyeSocket, brow);

    if (eyeIdx === 0) {
      leftEyeObj = eyeball;
      leftEyelidPivot = lidPivot;
    } else {
      rightEyeObj = eyeball;
      rightEyelidPivot = lidPivot;
    }

    if (options.hasGlasses) {
      const rim = new THREE.Mesh(CHAR_GEOS.glassesRim, SHARED_CHAR_MATS.glasses);
      rim.position.set(ex, eyeY, eyeZ + 0.017);
      head.add(rim);
      const templeArm = new THREE.Mesh(CHAR_GEOS.glassesArm, SHARED_CHAR_MATS.glasses);
      templeArm.rotation.x = Math.PI / 2;
      templeArm.position.set(ex < 0 ? ex - 0.022 : ex + 0.022, eyeY + 0.002, eyeZ - 0.020);
      head.add(templeArm);
    }
  });

  if (options.hasGlasses) {
    const bridge = new THREE.Mesh(CHAR_GEOS.glassesBridge, SHARED_CHAR_MATS.glasses);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, eyeY + 0.002, eyeZ + 0.018);
    head.add(bridge);
  }

  head.add(hairCardGroup);
  spineGroup.add(detailGroup);
  hairCardGroup.visible = tier !== 'lancar';
  detailGroup.visible = tier !== 'lancar';

  // Distinct Fitted Hairstyles + Layered Hair-Strand Cards & Hijab
  const headScaleX = isFemale ? 0.94 : 1.0;
  if (hairStyle === 'hijab') {
    const ciput = new THREE.Mesh(CHAR_GEOS.hijabCiput, hijabCiputMat);
    const hijabHood = new THREE.Mesh(CHAR_GEOS.hijabHood, hijabMat);
    hijabHood.castShadow = true;
    hijabHood.receiveShadow = true;
    head.add(ciput, hijabHood);

    bindSkinned(getSkinnedHijabDrapeGeo(isFemale), hijabMat);
  } else {
    const hairCap = new THREE.Mesh(CHAR_GEOS.hairCap, hairMat);
    hairCap.position.set(0, hairStyle === 'elder' ? 0.163 : 0.153, -0.010);
    hairCap.scale.set(headScaleX * 0.87, 1.15, 1.04);
    hairCap.rotation.x = hairStyle === 'elder' ? -0.34 : -0.18;
    head.add(hairCap);

    const hairBack = new THREE.Mesh(CHAR_GEOS.hairBack, hairMat);
    hairBack.position.set(0, 0.130, -0.024);
    hairBack.scale.set(headScaleX * 0.86, 1.03, 0.89);
    head.add(hairBack);

    const addHairCard = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number,
      sx = 1,
      sy = 1,
      longCard = false
    ) => {
      const card = new THREE.Mesh(longCard ? CHAR_GEOS.hairCardLong : CHAR_GEOS.hairCard, hairCardMat);
      card.position.set(x, y, z);
      card.rotation.set(rx, ry, rz);
      card.scale.set(sx, sy, 1);
      hairCardGroup.add(card);
    };

    if (hairStyle === 'short_part' || hairStyle === 'fade') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2 - 0.14;
      fringe.position.set(0.008, 0.224, 0.047);
      fringe.scale.set(hairStyle === 'fade' ? 0.55 : 0.72, 1, 0.72);
      head.add(fringe);

      // Feathered front hairline & temple strand cards
      addHairCard(-0.022, 0.246, 0.056, -0.28, -0.18, 0.14, 1.05, 0.72);
      addHairCard(0.022, 0.248, 0.054, -0.26, 0.20, -0.16, 1.05, 0.68);
      if (hairStyle === 'short_part') {
        [-0.070, 0.070].forEach((sx) => {
          const sb = new THREE.Mesh(CHAR_GEOS.hairSideburn, hairMat);
          sb.position.set(sx, 0.152, 0.014);
          head.add(sb);
          addHairCard(sx * 1.04, 0.195, 0.016, 0.04, sx < 0 ? -Math.PI * 0.45 : Math.PI * 0.45, 0, 0.75, 0.78);
        });
      }
    } else if (hairStyle === 'spiky') {
      const spikePositions: Array<[number, number, number, number]> = [
        [-0.024, 0.252, 0.028, 0.25],
        [0.020, 0.258, 0.016, -0.18],
        [0.0, 0.256, -0.020, -0.35],
        [-0.038, 0.238, -0.008, 0.40],
        [0.038, 0.238, 0.020, -0.35],
      ];
      spikePositions.forEach(([sx, sy, sz, rz]) => {
        const sp = new THREE.Mesh(CHAR_GEOS.hairSpike, hairMat);
        sp.position.set(sx, sy, sz);
        sp.rotation.z = rz;
        sp.rotation.x = 0.25;
        head.add(sp);
      });
      addHairCard(0, 0.250, 0.055, -0.35, 0, 0.08, 1.1, 0.75);
      addHairCard(-0.042, 0.238, 0.036, -0.2, -0.45, 0.22, 0.9, 0.75);
      addHairCard(0.042, 0.238, 0.036, -0.2, 0.45, -0.22, 0.9, 0.75);
    } else if (hairStyle === 'curly') {
      const curlOffsets: Array<[number, number, number, number]> = [
        [0, 0.248, 0.032, 1.0],
        [-0.040, 0.238, 0.020, 0.90],
        [0.040, 0.238, 0.020, 0.90],
        [-0.064, 0.205, -0.006, 0.86],
        [0.064, 0.205, -0.006, 0.86],
        [-0.035, 0.240, -0.038, 0.94],
        [0.035, 0.240, -0.038, 0.94],
        [0, 0.222, -0.070, 1.0],
        [0, 0.232, 0.060, 0.80],
      ];
      curlOffsets.forEach(([cx, cy, cz, sc]) => {
        const clump = new THREE.Mesh(CHAR_GEOS.curlyClump, hairMat);
        clump.position.set(cx, cy, cz);
        clump.scale.setScalar(sc);
        head.add(clump);
      });
      addHairCard(-0.025, 0.242, 0.066, -0.24, -0.15, 0.1, 0.95, 0.65);
      addHairCard(0.025, 0.242, 0.066, -0.24, 0.15, -0.1, 0.95, 0.65);
    } else if (hairStyle === 'bob') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2 - 0.1;
      fringe.position.set(0, 0.222, 0.049);
      fringe.scale.set(0.68, 1.0, 0.70);
      const bobBack = new THREE.Mesh(CHAR_GEOS.bobBack, hairMat);
      bobBack.position.set(0, 0.104, -0.024);
      bobBack.scale.set(0.95, 1.0, 0.95);
      const bobL = new THREE.Mesh(CHAR_GEOS.bobSide, hairMat);
      bobL.position.set(-0.072, 0.110, 0.008);
      bobL.rotation.z = -0.08;
      const bobR = new THREE.Mesh(CHAR_GEOS.bobSide, hairMat);
      bobR.position.set(0.072, 0.110, 0.008);
      bobR.rotation.z = 0.08;
      head.add(fringe, bobBack, bobL, bobR);

      // Feathered bangs & jaw-grazing layered bob strand cards
      addHairCard(-0.022, 0.240, 0.056, -0.22, -0.15, 0.08, 1.05, 0.72);
      addHairCard(0.022, 0.240, 0.056, -0.22, 0.15, -0.08, 1.05, 0.72);
      addHairCard(-0.078, 0.185, 0.015, 0.04, -Math.PI * 0.45, -0.06, 1.05, 1.02, true);
      addHairCard(0.078, 0.185, 0.015, 0.04, Math.PI * 0.45, 0.06, 1.05, 1.02, true);
    } else if (hairStyle === 'undercut') {
      hairCap.scale.set(0.82, 1.12, 1.02);
      const topWave = new THREE.Mesh(CHAR_GEOS.undercutTop, hairMat);
      topWave.position.set(0, 0.224, 0.010);
      topWave.rotation.x = -0.14;
      head.add(topWave);
      addHairCard(0.010, 0.246, 0.066, -0.32, 0.12, -0.14, 1.15, 0.72);
    } else if (hairStyle === 'ponytail') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2;
      fringe.position.set(0, 0.220, 0.049);
      fringe.scale.set(0.62, 1.0, 0.68);
      const band = new THREE.Mesh(CHAR_GEOS.hairBand, collarMat);
      band.position.set(0, 0.170, -0.100);
      band.rotation.x = 0.35;
      const tail = new THREE.Mesh(CHAR_GEOS.ponytail, hairMat);
      tail.position.set(0, 0.104, -0.125);
      tail.rotation.x = 0.28;
      head.add(fringe, band, tail);
      addHairCard(-0.064, 0.188, 0.022, 0.04, -Math.PI * 0.42, 0.10, 0.85, 0.90);
      addHairCard(0.064, 0.188, 0.022, 0.04, Math.PI * 0.42, -0.10, 0.85, 0.90);
      addHairCard(0, 0.168, -0.115, 0.30, Math.PI, 0, 1.1, 1.08, true);
    } else if (hairStyle === 'bun_konde') {
      const konde = new THREE.Mesh(CHAR_GEOS.kondeBun, hairMat);
      konde.position.set(0, 0.118, -0.112);
      konde.scale.set(1.04, 0.92, 0.88);
      const pin = new THREE.Mesh(CHAR_GEOS.hairBand, SHARED_CHAR_MATS.buckle);
      pin.position.set(0, 0.118, -0.096);
      head.add(konde, pin);
      addHairCard(-0.062, 0.192, 0.020, 0.02, -Math.PI * 0.42, 0.08, 0.78, 0.72);
      addHairCard(0.062, 0.192, 0.020, 0.02, Math.PI * 0.42, -0.08, 0.78, 0.72);
    }
  }

  // Fitted Headgear
  if (options.hatType === 'caping') {
    const caping = new THREE.Mesh(CHAR_GEOS.caping, SHARED_CHAR_MATS.caping);
    caping.position.y = 0.288;
    head.add(caping);
  } else if (options.hatType === 'peci') {
    const peci = new THREE.Mesh(CHAR_GEOS.peci, SHARED_CHAR_MATS.peci);
    peci.position.set(0, 0.246, -0.005);
    peci.scale.set(0.95, 1, 1.12);
    head.add(peci);
  } else if (options.hatType === 'polisi') {
    const cap = new THREE.Mesh(CHAR_GEOS.policeCap, SHARED_CHAR_MATS.policeCap);
    cap.position.set(0, 0.248, -0.004);
    const brim = new THREE.Mesh(CHAR_GEOS.policeBrim, SHARED_CHAR_MATS.policeBrim);
    brim.position.set(0, 0.214, 0.036);
    brim.rotation.x = 0.15;
    head.add(cap, brim);
  } else if (options.hatType === 'topi') {
    const topi = new THREE.Mesh(
      CHAR_GEOS.topiCrown,
      new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 })
    );
    topi.position.set(0, 0.178, -0.005);
    topi.scale.set(0.92, 1.0, 1.06);
    const brim = new THREE.Mesh(CHAR_GEOS.policeBrim, SHARED_CHAR_MATS.policeBrim);
    brim.position.set(0, 0.191, 0.038);
    brim.rotation.x = 0.12;
    head.add(topi, brim);
  } else if (options.hatType === 'helm') {
    const helmMat = new THREE.MeshStandardMaterial({
      color: options.helmetColor ?? 0x111827,
      roughness: 0.22,
      metalness: 0.35,
    });
    const shell = new THREE.Mesh(CHAR_GEOS.helmetShell, helmMat);
    shell.position.set(0, 0.156, -0.008);
    shell.scale.set(0.96, 1.08, 1.06);
    const visor = new THREE.Mesh(CHAR_GEOS.helmetVisor, SHARED_CHAR_MATS.visor);
    visor.position.set(0, 0.163, 0.008);
    head.add(shell, visor);
  }

  const realism: CharacterRealismHandle = {
    leftEye: leftEyeObj,
    rightEye: rightEyeObj,
    leftEyelidPivot,
    rightEyelidPivot,
    detailGroup,
    hairCardGroup,
    glbRoot: null,
    glbMixer: null,
    glbIdleAction: null,
    glbWalkAction: null,
  };

  // Hybrid GLB Realistic Human Base (active on Seimbang/Tinggi when a GLB URL is configured, safe fallback to procedural rig)
  if (options.customGlbUrl && tier !== 'lancar') {
    void loadRealisticHumanGlb(options.customGlbUrl).then((loaded) => {
      if (!loaded || !group.parent) return;
      bodyGroup.visible = false;
      realism.glbRoot = loaded.scene;
      group.add(loaded.scene);
      if (loaded.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(loaded.scene);
        const idleClip =
          THREE.AnimationClip.findByName(loaded.animations, 'Idle') ??
          THREE.AnimationClip.findByName(loaded.animations, 'idle') ??
          loaded.animations[0];
        const walkClip =
          THREE.AnimationClip.findByName(loaded.animations, 'Walk') ??
          THREE.AnimationClip.findByName(loaded.animations, 'walk') ??
          THREE.AnimationClip.findByName(loaded.animations, 'Run') ??
          loaded.animations[0];
        const idleAct = mixer.clipAction(idleClip);
        const walkAct = mixer.clipAction(walkClip);
        idleAct.play();
        if (walkClip !== idleClip) {
          walkAct.setEffectiveWeight(0);
          walkAct.play();
          realism.glbWalkAction = walkAct;
        }
        realism.glbIdleAction = idleAct;
        realism.glbMixer = mixer;
      }
    });
  }

  return {
    group,
    bodyGroup,
    pelvisGroup,
    spineGroup,
    torso,
    head,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
    shirtMeshes,
    pantsMeshes,
    outfitDecorGroup,
    collarMesh: collar,
    realism,
  };
}

export function applyOutfitToRig(
  rig: CharacterRig,
  outfit: OutfitId,
  textures: ProceduralTexturePack
) {
  const cfg = OUTFIT_COLORS[outfit];
  const map =
    outfit === 'batik'
      ? textures.batikWall
      : outfit === 'lurik'
        ? textures.lurik
        : null;

  for (const m of rig.shirtMeshes) {
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    mat.color.setHex(cfg.shirt);
    mat.metalness = cfg.metalness;
    mat.map = map;
    mat.needsUpdate = true;
  }

  const collarMat = rig.collarMesh.material as THREE.MeshStandardMaterial;
  collarMat.color.setHex(cfg.collar);
  collarMat.needsUpdate = true;

  for (const p of rig.pantsMeshes) {
    const pMat = (Array.isArray(p.material) ? p.material[0] : p.material) as THREE.MeshStandardMaterial;
    pMat.color.setHex(cfg.pants);
    pMat.needsUpdate = true;
  }

  buildOutfitDecor(rig.outfitDecorGroup, cfg.style, cfg.shirt, cfg.collar, textures);
}

export function characterProfileToBuildOptions(
  profile: CharacterProfile,
  textures?: ProceduralTexturePack,
  qualityTier?: CharacterQualityTier,
  customGlbUrl?: string
): CharacterBuildOptions {
  return {
    gender: profile.gender,
    skinColor: profile.skinColor,
    hairStyle: profile.hairStyle,
    hairColor: profile.hairColor,
    hijab: profile.hijab,
    hijabColor: profile.hijabColor,
    shirtStyle: profile.shirtStyle,
    shirtColor: profile.shirtColor,
    pantsStyle: profile.pantsStyle,
    pantsColor: profile.pantsColor,
    shoeStyle: profile.shoeStyle,
    shoeColor: profile.shoeColor,
    hatType: profile.hatType,
    hasGlasses: profile.hasGlasses,
    hasMustache: profile.hasMustache,
    hasBackpack: profile.hasBackpack,
    textures,
    qualityTier,
    customGlbUrl,
  };
}

export function createFloatingLabelSprite(
  text: string,
  variant: 'name' | 'chat' = 'name'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const font = variant === 'chat' ? '600 28px "Plus Jakarta Sans", sans-serif' : '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.font = font;
  const clipped = text.length > 30 ? `${text.slice(0, 29)}…` : text;
  const textW = Math.min(468, ctx.measureText(clipped).width + 44);
  const boxX = (canvas.width - textW) / 2;
  const boxY = 20;
  const boxH = 62;

  ctx.fillStyle = variant === 'chat' ? 'rgba(245, 185, 66, 0.95)' : 'rgba(15, 20, 17, 0.84)';
  ctx.strokeStyle = variant === 'chat' ? 'rgba(17, 19, 17, 0.9)' : 'rgba(56, 189, 248, 0.78)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, textW, boxH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = variant === 'chat' ? '#111311' : '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(clipped, canvas.width / 2, boxY + boxH / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.52, 1);
  return sprite;
}

export function createVehicleModel(type: VehicleType, primaryColor: number): VehicleModelResult {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const headlights: THREE.Mesh[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.24,
    metalness: 0.65,
    envMapIntensity: 1.15,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.75,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.92,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.88,
    metalness: 0.05,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.56,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
  });
  const makeHeadlightMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfef08a,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });

  const makeWheel = (radius: number, width: number, x: number, y: number, z: number) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), tireMat);
    tire.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.02, 10),
      chromeMat
    );
    rim.rotation.z = Math.PI / 2;
    wGroup.add(tire, rim);
    group.add(wGroup);
    wheels.push(wGroup);
    return wGroup;
  };

  if (type === 'motor_bebek' || type === 'motor_matic' || type === 'motor_sport' || type === 'sepeda') {
    const r = type === 'sepeda' ? 0.36 : 0.31;
    const w = type === 'sepeda' ? 0.07 : type === 'motor_sport' ? 0.17 : 0.13;
    makeWheel(r, w, 0, r, 0.72);
    makeWheel(r, w, 0, r, -0.68);

    // Frame / body
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(type === 'sepeda' ? 0.1 : 0.34, type === 'sepeda' ? 0.12 : 0.36, 1.32),
      bodyMat
    );
    frame.position.set(0, r + 0.28, 0);
    frame.castShadow = true;
    group.add(frame);

    if (type === 'motor_sport') {
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.62), bodyMat);
      tank.position.set(0, r + 0.52, 0.22);
      const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.52), bodyMat);
      fairing.position.set(0, r + 0.46, 0.62);
      fairing.rotation.x = 0.25;
      group.add(tank, fairing);
    } else if (type === 'motor_matic' || type === 'motor_bebek') {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.56, 0.22), bodyMat);
      shield.position.set(0, r + 0.46, 0.54);
      shield.rotation.x = -0.18;
      group.add(shield);
    }

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.68), seatMat);
    seat.position.set(0, r + 0.48, -0.22);
    group.add(seat);

    // Front Fork & Handlebar + Mirrors
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8), chromeMat);
    fork.position.set(0, r + 0.44, 0.62);
    fork.rotation.x = -0.22;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 8), darkMetalMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, r + 0.78, 0.52);
    group.add(fork, bar);

    if (type !== 'sepeda') {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.85, 8), chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(0.2, r + 0.06, -0.35);
      group.add(exhaust);

      // Rear-view mirrors
      [-0.28, 0.28].forEach((mx) => {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), chromeMat);
        stem.position.set(mx, r + 0.86, 0.52);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), darkMetalMat);
        mirror.position.set(mx * 1.08, r + 0.93, 0.51);
        group.add(stem, mirror);
      });
    }

    // Headlight & Taillight
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), makeHeadlightMat());
    hl.position.set(0, r + 0.65, 0.71);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), tailMat);
    tl.position.set(0, r + 0.48, -0.76);
    group.add(hl, tl);
    headlights.push(hl);

    return {
      group,
      wheels,
      headlights,
      seatY: r + 0.42,
      seatZ: -0.12,
      isOpenRide: true,
      halfW: 0.48,
      halfL: 1.05,
    };
  }

  // 4-Wheeled Vehicles
  const isTruck = type === 'truk';
  const isBus = type === 'bus';
  const isPickup = type === 'pickup';

  const width = isBus ? 2.35 : isTruck ? 2.15 : 1.85;
  const length = isBus ? 7.2 : isTruck ? 5.2 : isPickup ? 4.3 : 4.1;
  const wheelR = isBus || isTruck ? 0.46 : 0.36;
  const wheelZFront = length * 0.33;
  const wheelZBack = -length * 0.32;

  makeWheel(wheelR, 0.26, -width * 0.46, wheelR, wheelZFront);
  makeWheel(wheelR, 0.26, width * 0.46, wheelR, wheelZFront);
  makeWheel(wheelR, 0.26, -width * 0.46, wheelR, wheelZBack);
  makeWheel(wheelR, 0.26, width * 0.46, wheelR, wheelZBack);

  // Chassis
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.1, 0.36, length - 0.1),
    darkMetalMat
  );
  chassis.position.y = wheelR + 0.12;
  chassis.castShadow = true;
  group.add(chassis);

  // Subtle interior driver silhouette behind windshield
  const drvHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xc98f64, roughness: 0.7 })
  );
  const drvTorso = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.4, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
  );

  if (isBus) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, 2.05, length), bodyMat);
    hull.position.y = wheelR + 1.25;
    hull.castShadow = true;
    hull.receiveShadow = true;
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, 0.26, length + 0.02),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
    );
    stripe.position.y = wheelR + 0.95;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, 0.85, 0.08), glassMat);
    windshield.position.set(0, wheelR + 1.68, length * 0.5 + 0.01);
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.65, length * 0.78), glassMat);
    sideGlass.position.set(0, wheelR + 1.65, -0.1);
    drvHead.position.set(-0.55, wheelR + 1.65, length * 0.42);
    drvTorso.position.set(-0.55, wheelR + 1.32, length * 0.42);
    group.add(hull, stripe, windshield, sideGlass, drvHead, drvTorso);
  } else if (isTruck) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 1.35, 1.55), bodyMat);
    cab.position.set(0, wheelR + 0.92, length * 0.5 - 0.82);
    cab.castShadow = true;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.62, 0.08), glassMat);
    windshield.position.set(0, wheelR + 1.15, length * 0.5 - 0.02);
    const cargoBox = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.75, length - 1.8),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75 })
    );
    cargoBox.position.set(0, wheelR + 1.14, -0.82);
    cargoBox.castShadow = true;
    drvHead.position.set(-0.45, wheelR + 1.18, length * 0.5 - 0.35);
    group.add(cab, windshield, cargoBox, drvHead);
  } else if (isPickup) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 1.08, 1.65), bodyMat);
    cab.position.set(0, wheelR + 0.78, 0.85);
    cab.castShadow = true;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.22, 0.55, 0.08), glassMat);
    windshield.position.set(0, wheelR + 0.98, 1.69);
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.52, 2.2), bodyMat);
    bedFloor.position.set(0, wheelR + 0.52, -1.0);
    bedFloor.castShadow = true;
    drvHead.position.set(-0.4, wheelR + 1.0, 1.1);
    group.add(cab, windshield, bedFloor, drvHead);
  } else {
    // Mobil Keluarga MPV
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(width, 0.68, length), bodyMat);
    lowerBody.position.y = wheelR + 0.52;
    lowerBody.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, 0.66, length * 0.64), bodyMat);
    cabin.position.set(0, wheelR + 1.15, -0.22);
    cabin.castShadow = true;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.54, 0.08), glassMat);
    windshield.position.set(0, wheelR + 1.12, length * 0.32 - 0.18);
    windshield.rotation.x = -0.35;
    const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, 0.45, length * 0.55), glassMat);
    sideWindows.position.set(0, wheelR + 1.16, -0.25);
    drvHead.position.set(-0.38, wheelR + 1.1, 0.15);
    group.add(lowerBody, cabin, windshield, sideWindows, drvHead);
  }

  // Headlights & Taillights
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), makeHeadlightMat());
  hlL.position.set(-width * 0.33, wheelR + 0.48, length * 0.5 + 0.01);
  const hlR = hlL.clone();
  hlR.material = makeHeadlightMat();
  hlR.position.x = width * 0.33;
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), tailMat);
  tlL.position.set(-width * 0.33, wheelR + 0.48, -length * 0.5 - 0.01);
  const tlR = tlL.clone();
  tlR.position.x = width * 0.33;
  group.add(hlL, hlR, tlL, tlR);
  headlights.push(hlL, hlR);

  return {
    group,
    wheels,
    headlights,
    seatY: wheelR + 0.55,
    seatZ: 0.1,
    isOpenRide: false,
    halfW: width * 0.55,
    halfL: length * 0.55,
  };
}

export function createJogloHouse(
  textures: ProceduralTexturePack,
  wallColor = 0xfef3c7,
  scale = 1
): THREE.Group {
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.75 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.3,
    roughness: 0.35,
  });

  // Stepped stone foundation plinth & porch steps
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.52, 8.6), stoneMat);
  plinth.position.y = 0.26;
  plinth.receiveShadow = true;
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.26, 1.1), darkStoneMat);
  step1.position.set(0, 0.13, 4.5);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 0.6), darkStoneMat);
  step2.position.set(0, 0.21, 4.1);
  g.add(plinth, step1, step2);

  // Main Dalem room
  const body = new THREE.Mesh(new THREE.BoxGeometry(8.2, 3.1, 5.2), wallMat);
  body.position.set(0, 2.05, -1.0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Carved wooden door frame, double doors, & brass handles
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.45, 0.18), darkWoodMat);
  doorFrame.position.set(0, 1.72, 1.62);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.22, 0.12), woodMat);
  doorLeaf.position.set(0, 1.62, 1.68);
  const handleL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), brassMat);
  handleL.position.set(-0.14, 1.5, 1.78);
  const handleR = handleL.clone();
  handleR.position.x = 0.14;
  g.add(doorFrame, doorLeaf, handleL, handleR);

  // Framed wooden Javanese windows with shutters
  [-2.5, 2.5].forEach((wx) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.32, 0.18), darkWoodMat);
    frame.position.set(wx, 2.05, 1.62);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 0.12), winMat);
    pane.position.set(wx, 2.05, 1.68);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.14), darkWoodMat);
    bar.position.set(wx, 2.05, 1.69);
    g.add(frame, pane, bar);
  });

  // Pendopo front pillars (Soko Guru) with carved umpak stone bases & porch railings
  const pillarGeo = new THREE.BoxGeometry(0.24, 2.95, 0.24);
  const umpakGeo = new THREE.BoxGeometry(0.42, 0.34, 0.42);
  [-3.8, -1.45, 1.45, 3.8].forEach((px) => {
    const u = new THREE.Mesh(umpakGeo, darkStoneMat);
    u.position.set(px, 0.67, 3.55);
    const p = new THREE.Mesh(pillarGeo, woodMat);
    p.position.set(px, 2.15, 3.55);
    g.add(u, p);
  });

  // Porch wooden railings flanking stairs
  [-2.65, 2.65].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.14), darkWoodMat);
    rail.position.set(rx, 1.15, 3.55);
    g.add(rail);
  });

  // Veranda warm hanging lantern
  const lanternCord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), darkWoodMat);
  lanternCord.position.set(0, 3.3, 2.6);
  const lanternGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.1 })
  );
  lanternGlow.position.set(0, 3.0, 2.6);
  g.add(lanternCord, lanternGlow);

  // Lower Limasan Roof + fascia trim + Upper Joglo Tajug crown
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 9.2), darkWoodMat);
  fascia.position.set(0, 3.58, 0.3);
  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 2.1, 4), roofMat);
  lowerRoof.position.set(0, 4.6, 0.3);
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.scale.set(1.1, 1, 0.96);
  lowerRoof.castShadow = true;

  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.35, 4), roofMat);
  upperRoof.position.set(0, 6.25, -0.2);
  upperRoof.rotation.y = Math.PI / 4;
  g.add(fascia, lowerRoof, upperRoof);

  g.scale.setScalar(scale);
  return g;
}

export function createWarungKopi(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3b2313 });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });
  const tarpMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.45,
    roughness: 0.15,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.25,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.32, 6.6), woodMat);
  floor.position.y = 0.16;
  floor.receiveShadow = true;
  const frontStep = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.7), darkWoodMat);
  frontStep.position.set(0, 0.08, 3.55);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 2.9, 0.28),
    new THREE.MeshLambertMaterial({ color: 0x15803d })
  );
  backWall.position.set(0, 1.75, -2.8);
  backWall.castShadow = true;

  // Side support posts
  [-3.5, 3.5].forEach((px) => {
    const postF = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 0.18), darkWoodMat);
    postF.position.set(px, 1.7, 2.8);
    const postB = postF.clone();
    postB.position.z = -2.6;
    g.add(postF, postB);
  });

  // Serving Counter + Glass Etalase food showcase
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.05, 0.85), woodMat);
  counter.position.set(-0.6, 0.84, -0.9);
  const etalaseFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.6), darkWoodMat);
  etalaseFrame.position.set(1.0, 1.68, -0.9);
  const etalaseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.56, 0.54), glassMat);
  etalaseGlass.position.set(1.0, 1.68, -0.9);

  // Dining bench & table with coffee mugs
  const bench = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.42, 0.52), woodMat);
  bench.position.set(-0.5, 0.52, 1.45);
  const table = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.75), woodMat);
  table.position.set(-0.5, 0.92, 0.65);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  [-1.6, -0.4, 0.7].forEach((cx) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.11, 8), cupMat);
    cup.position.set(cx, 1.02, 0.65);
    g.add(cup);
  });

  // Signboard & Roof + Striped Awning
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 0.1), darkWoodMat);
  sign.position.set(0, 2.55, 2.9);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 1.8, 4), roofMat);
  roof.position.set(0, 3.9, -0.3);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  const awning = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.08, 2.4), tarpMat);
  awning.position.set(0, 2.8, 2.4);
  awning.rotation.x = 0.22;

  [-2.2, 0, 2.2].forEach((lx) => {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), lanternMat);
    bulb.position.set(lx, 2.48, 2.2);
    g.add(bulb);
  });

  g.add(floor, frontStep, backWall, counter, etalaseFrame, etalaseGlass, bench, table, sign, roof, awning);
  return g;
}

export function createPosRonda(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x3b2313 });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.46, 3.6), woodMat);
  deck.position.y = 0.23;
  deck.receiveShadow = true;
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.55), darkWoodMat);
  step.position.set(0, 0.11, 1.98);

  const postGeo = new THREE.BoxGeometry(0.18, 2.45, 0.18);
  [
    [-1.45, -1.45],
    [1.45, -1.45],
    [-1.45, 1.45],
    [1.45, 1.45],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, darkWoodMat);
    post.position.set(px, 1.62, pz);
    g.add(post);
  });

  // Back & side railings
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.1), woodMat);
  backRail.position.set(0, 1.15, -1.45);
  [-1.45, 1.45].forEach((rx) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 3.0), woodMat);
    sideRail.position.set(rx, 1.15, 0);
    g.add(sideRail);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.05, 1.45, 4), roofMat);
  roof.position.y = 3.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  // Kentongan bamboo drum + lantern
  const kentongan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.72, 8),
    new THREE.MeshLambertMaterial({ color: 0xa16207 })
  );
  kentongan.position.set(1.45, 2.1, 1.58);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
  );
  lantern.position.set(0, 2.68, 0);

  g.add(deck, step, backRail, roof, kentongan, lantern);
  return g;
}

export type CityBuildingKind =
  | 'ruko'
  | 'polisi'
  | 'rsud'
  | 'sekolah'
  | 'bengkel'
  | 'toko'
  | 'terminal'
  | 'tpi'
  | 'stasiun'
  | 'masjid';

export function createCityBuilding(
  w: number,
  h: number,
  d: number,
  color: number,
  accentColor = 0xe2e8f0,
  kind: CityBuildingKind = 'ruko',
  textures?: ProceduralTexturePack
): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({
    color,
    map: textures ? textures.stuccoWall : null,
  });
  const trimMat = new THREE.MeshLambertMaterial({ color: accentColor });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xfde68a,
    emissiveIntensity: 0.24,
    roughness: 0.22,
    metalness: 0.45,
  });

  // Special Landmark: Masjid Agung Tuban (Colorful Moorish-Javanese Multi-Dome Architecture & Minaret)
  if (kind === 'masjid') {
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(w + 5, 0.28, d + 5), stoneMat);
    plaza.position.y = 0.14;
    plaza.receiveShadow = true;

    const creamMat = new THREE.MeshLambertMaterial({ color: 0xfaf6eb });
    const turquoiseDomeMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.28, metalness: 0.35 });
    const emeraldDomeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.28, metalness: 0.35 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.85 });
    const archTrimMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });

    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.68, d), creamMat);
    mainHall.position.y = h * 0.34 + 0.28;
    mainHall.castShadow = true;
    mainHall.receiveShadow = true;

    // Decorative parapet crown with Moorish merlons
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.45, d + 0.5), archTrimMat);
    parapet.position.y = h * 0.68 + 0.45;

    // Arched front arcade colonnade
    for (let px = -w * 0.42; px <= w * 0.43; px += w * 0.21) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, h * 0.56, 10), creamMat);
      col.position.set(px, h * 0.28 + 0.28, d * 0.5 + 1.25);
      g.add(col);
    }
    const verandaRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 2.6, 0.34, 2.8), archTrimMat);
    verandaRoof.position.set(0, h * 0.56 + 0.32, d * 0.5 + 0.65);

    // Central grand turquoise onion-style dome + golden finial
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 1.3, 16), creamMat);
    domeBase.position.y = h * 0.68 + 1.1;
    const centralDome = new THREE.Mesh(new THREE.SphereGeometry(3.3, 18, 14), turquoiseDomeMat);
    centralDome.scale.set(1, 1.05, 1);
    centralDome.position.y = h * 0.68 + 2.8;
    const centralSpire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.5, 8), goldMat);
    centralSpire.position.y = h * 0.68 + 6.5;

    // Colorful flanking smaller domes (emerald & gold/amber signature of Masjid Agung Tuban)
    [-w * 0.34, w * 0.34].forEach((dx, idx) => {
      const subBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.8, 12), creamMat);
      subBase.position.set(dx, h * 0.68 + 0.9, 0.5);
      const subDome = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 14, 12),
        idx === 0 ? emeraldDomeMat : goldMat
      );
      subDome.position.set(dx, h * 0.68 + 1.9, 0.5);
      const subTip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), goldMat);
      subTip.position.set(dx, h * 0.68 + 3.65, 0.5);
      g.add(subBase, subDome, subTip);
    });

    // Tall white-and-gold Minaret Tower on side
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.45, h + 8.5, 12), creamMat);
    minaret.position.set(w * 0.5 + 2.6, (h + 8.5) * 0.5, d * 0.2);
    minaret.castShadow = true;
    const minBalcony = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.3, 0.35, 12), archTrimMat);
    minBalcony.position.set(w * 0.5 + 2.6, h + 4.8, d * 0.2);
    const minDome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 10), turquoiseDomeMat);
    minDome.position.set(w * 0.5 + 2.6, h + 8.9, d * 0.2);
    const minTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 8), goldMat);
    minTip.position.set(w * 0.5 + 2.6, h + 10.4, d * 0.2);

    // Tall grand entrance portal
    const doorPortal = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.1, 0.3), archTrimMat);
    doorPortal.position.set(0, 2.25, d * 0.5 + 0.05);
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.4, 0.34), goldMat);
    doorLeaf.position.set(0, 1.9, d * 0.5 + 0.08);

    g.add(
      plaza,
      mainHall,
      parapet,
      verandaRoof,
      domeBase,
      centralDome,
      centralSpire,
      minaret,
      minBalcony,
      minDome,
      minTip,
      doorPortal,
      doorLeaf
    );
    return g;
  }

  // Raised concrete base plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 1.1, 0.24, d + 1.4), stoneMat);
  plinth.position.y = 0.12;
  plinth.receiveShadow = true;
  g.add(plinth);

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2 + 0.24;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Roof cornice & parapet
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.42, d + 0.45), trimMat);
  parapet.position.y = h + 0.38;
  g.add(parapet);

  // Rooftop AC/Water Tank prop on multi-story buildings
  if (h >= 6) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    tank.position.set(-w * 0.3, h + 1.15, -d * 0.22);
    g.add(tank);
  }

  // Front Portico / Shop Awning & Glass Entrance Doors
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.72, 8.2), 0.24, 2.4), trimMat);
  canopy.position.set(0, 3.0, d * 0.5 + 1.0);
  g.add(canopy);
  [-Math.min(w * 0.3, 3.5), Math.min(w * 0.3, 3.5)].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.8, 0.28), trimMat);
    col.position.set(cx, 1.62, d * 0.5 + 2.0);
    g.add(col);
  });

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.35, 0.16), frameMat);
  doorFrame.position.set(0, 1.42, d * 0.5 + 0.04);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 0.18), glassMat);
  doorGlass.position.set(0, 1.42, d * 0.5 + 0.05);
  g.add(doorFrame, doorGlass);

  // Individual framed multi-pane windows across all floors (front & back facades)
  const floors = Math.max(1, Math.floor((h - 0.5) / 3.2));
  const cols = Math.max(2, Math.floor((w - 1.5) / 3.2));
  const winW = 1.6;
  const winH = 1.2;

  for (let f = 0; f < floors; f++) {
    const wy = f === 0 ? 1.9 : 2.1 + f * 3.1;
    if (wy > h - 0.5) break;
    for (let c = 0; c < cols; c++) {
      const wx = -((cols - 1) * 0.5) * 2.8 + c * 2.8;
      // Skip ground-floor center where main entrance door is
      if (f === 0 && Math.abs(wx) < 1.8) continue;

      [d * 0.5 + 0.04, -d * 0.5 - 0.04].forEach((wz) => {
        const wFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.2, winH + 0.2, 0.1), frameMat);
        wFrame.position.set(wx, wy, wz);
        const wGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.12), glassMat);
        wGlass.position.set(wx, wy, wz);
        const wSill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.32, 0.12, 0.24), trimMat);
        wSill.position.set(wx, wy - winH * 0.52, wz + (wz > 0 ? 0.05 : -0.05));
        g.add(wFrame, wGlass, wSill);
      });
    }
  }

  // Signature architectural touches by building kind
  if (kind === 'rsud') {
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.35,
    });
    const cVert = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.0, 0.2), crossMat);
    cVert.position.set(0, h - 1.5, d * 0.5 + 0.12);
    const cHoriz = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.2), crossMat);
    cHoriz.position.set(0, h - 1.5, d * 0.5 + 0.12);
    g.add(cVert, cHoriz);
  } else if (kind === 'polisi' || kind === 'sekolah') {
    // Terracotta hip roof over public building
    const roofMat = textures
      ? new THREE.MeshLambertMaterial({ map: textures.roofTile })
      : new THREE.MeshLambertMaterial({ color: 0x9a3412 });
    const hip = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4), roofMat);
    hip.position.y = h + 1.55;
    hip.rotation.y = Math.PI / 4;
    hip.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    g.add(hip);

    // Merah-Putih Flagpole in front
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 })
    );
    pole.position.set(w * 0.42, 3.1, d * 0.5 + 2.4);
    const flagRed = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.36, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xdc2626 })
    );
    flagRed.position.set(w * 0.42 + 0.55, 5.9, d * 0.5 + 2.4);
    const flagWhite = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.36, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    flagWhite.position.set(w * 0.42 + 0.55, 5.54, d * 0.5 + 2.4);
    g.add(pole, flagRed, flagWhite);
  } else if (kind === 'bengkel') {
    // Garage rolling door & stacked tires outside
    const roller = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.7, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.6 })
    );
    roller.position.set(w * 0.24, 1.58, d * 0.5 + 0.08);
    g.add(roller);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.88 });
    for (let t = 0; t < 3; t++) {
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 12), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(-w * 0.38, 0.35 + t * 0.22, d * 0.5 + 1.0);
      g.add(tire);
    }
  } else if (kind === 'toko') {
    // Galeri Batik Gedog & Oleh-Oleh Tuban: Limasan terracotta roof cap + Batik frieze
    const roofMat = textures
      ? new THREE.MeshLambertMaterial({ map: textures.roofTile })
      : new THREE.MeshLambertMaterial({ color: 0x9a3412 });
    const friezeMat = textures
      ? new THREE.MeshLambertMaterial({ color: 0xfde68a, map: textures.batikWall })
      : trimMat;
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.7, d + 0.25), friezeMat);
    frieze.position.y = 3.35;
    const limasan = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.0, 4), roofMat);
    limasan.position.y = h + 1.45;
    limasan.rotation.y = Math.PI / 4;
    limasan.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    g.add(frieze, limasan);
  } else if (kind === 'tpi') {
    // TPI Palang Tuban: Coastal awning overhang & unloading fish crates
    const awningMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const coastalAwning = new THREE.Mesh(new THREE.BoxGeometry(w + 2.2, 0.18, 3.6), awningMat);
    coastalAwning.position.set(0, 3.4, d * 0.5 + 1.5);
    coastalAwning.rotation.x = 0.16;
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      map: textures ? textures.woodPlank : null,
      roughness: 0.85,
    });
    [-w * 0.34, -w * 0.24].forEach((cx) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.85), crateMat);
      crate.position.set(cx, 0.6, d * 0.5 + 1.4);
      g.add(crate);
    });
    g.add(coastalAwning);
  } else if (kind === 'terminal') {
    // Halte / Shelter Kota Tuban: Extended bus shelter canopy & waiting bench
    const shelterCanopy = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.22, 4.2), trimMat);
    shelterCanopy.position.set(0, 3.55, d * 0.5 + 1.8);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.45, 0.65), frameMat);
    bench.position.set(0, 0.48, d * 0.5 + 1.4);
    g.add(shelterCanopy, bench);
  } else if (kind === 'stasiun') {
    // Terminal Kambang Putih Tuban: Cantilevered Pantura bus bay canopy & Javanese gateway crest
    const bayCanopy = new THREE.Mesh(new THREE.BoxGeometry(w + 3.2, 0.28, 4.8), trimMat);
    bayCanopy.position.set(0, 3.7, d * 0.5 + 2.1);
    bayCanopy.rotation.x = -0.06;
    [-w * 0.44, -w * 0.15, w * 0.15, w * 0.44].forEach((px) => {
      const bayPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.5, 8), stoneMat);
      bayPillar.position.set(px, 1.9, d * 0.5 + 3.8);
      g.add(bayPillar);
    });
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 1.1, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.35 })
    );
    signBoard.position.set(0, h + 0.95, d * 0.5 + 0.15);
    const crestRoof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 2.0, 4),
      textures ? new THREE.MeshLambertMaterial({ map: textures.roofTile }) : trimMat
    );
    crestRoof.position.set(0, h + 1.6, 0);
    crestRoof.rotation.y = Math.PI / 4;
    crestRoof.scale.set(1.8, 1, 0.9);
    g.add(bayCanopy, signBoard, crestRoof);
  }

  return g;
}

export function createSPBU(): THREE.Group {
  const g = new THREE.Group();
  const concrete = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
  const darkCurb = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
  const blueMat = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.85,
  });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(15, 0.26, 11), concrete);
  pad.position.y = 0.13;
  pad.receiveShadow = true;

  // Pump curb island
  const island = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.36, 1.5), darkCurb);
  island.position.y = 0.18;

  const pillarGeo = new THREE.BoxGeometry(0.68, 4.7, 0.68);
  [-4.6, 4.6].forEach((px) => {
    const p = new THREE.Mesh(pillarGeo, whiteMat);
    p.position.set(px, 2.45, 0);
    const pBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), redMat);
    pBase.position.set(px, 0.55, 0);
    g.add(p, pBase);
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.95, 8.6), whiteMat);
  canopy.position.y = 5.0;
  canopy.castShadow = true;
  const redBand = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.34, 8.7), redMat);
  redBand.position.y = 5.3;
  const blueBand = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.26, 8.7), blueMat);
  blueBand.position.y = 4.65;

  // Under-canopy recessed LED lights
  [-3.2, 0, 3.2].forEach((lx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.55), glowMat);
    lamp.position.set(lx, 4.5, 0);
    g.add(lamp);
  });

  // Detailed Fuel Pumps + Screens
  [-2.2, 2.2].forEach((px) => {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.85, 0.68), redMat);
    pump.position.set(px, 1.15, 0);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.72), glowMat);
    screen.position.set(px, 1.62, 0);
    g.add(pump, screen);
  });

  // Tall roadside price totem sign
  const totemPole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.2, 0.45), redMat);
  totemPole.position.set(-6.4, 2.6, 4.2);
  const totemPanel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.5), whiteMat);
  totemPanel.position.set(-6.4, 4.2, 4.2);

  g.add(pad, island, canopy, redBand, blueBand, totemPole, totemPanel);
  return g;
}

export function createCandiMajapahit(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const brickMat = new THREE.MeshLambertMaterial({ map: textures.redBrick });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

  // Stone Flagstone Courtyard Base
  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.16, 20), stoneMat);
  courtyard.position.set(0, 0.08, 4.5);
  courtyard.receiveShadow = true;
  g.add(courtyard);

  const tiers = [
    { w: 12, h: 1.6, d: 12, y: 0.96 },
    { w: 9.2, h: 2.2, d: 9.2, y: 2.86 },
    { w: 6.4, h: 2.8, d: 6.4, y: 5.36 },
    { w: 4.4, h: 2.2, d: 4.4, y: 7.86 },
    { w: 2.6, h: 1.8, d: 2.6, y: 9.86 },
    { w: 1.3, h: 1.4, d: 1.3, y: 11.46 },
  ];
  tiers.forEach((t, idx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), brickMat);
    m.position.y = t.y;
    if (idx < 3) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    g.add(m);

    // Carved corner pinnacles (Ratna) on main body tiers
    if (idx >= 1 && idx <= 3) {
      const r = t.w * 0.46;
      [
        [-r, -r],
        [r, -r],
        [-r, r],
        [r, r],
      ].forEach(([rx, rz]) => {
        const ratna = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.95, 4), brickMat);
        ratna.position.set(rx, t.y + t.h * 0.5 + 0.45, rz);
        ratna.rotation.y = Math.PI / 4;
        g.add(ratna);
      });
    }
  });

  // Sanctuary doorway & carved Kala lintel
  const doorway = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.3, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x09090b })
  );
  doorway.position.set(0, 4.2, 3.0);
  const kala = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.5), stoneMat);
  kala.position.set(0, 5.5, 3.35);
  g.add(doorway, kala);

  // Grand staircase front (+Z) & Dvarapala stone pedestals
  for (let s = 0; s < 5; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.1), brickMat);
    step.position.set(0, 0.42 + s * 0.55, 6.4 - s * 0.75);
    g.add(step);
  }
  [-2.2, 2.2].forEach((dx) => {
    const statue = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.95), stoneMat);
    statue.position.set(dx, 1.0, 7.2);
    g.add(statue);
  });

  // Split Gate (Candi Bentar) in front
  [-3.2, 3.2].forEach((gx) => {
    const gateHalf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 5.4, 2.2), brickMat);
    gateHalf.position.set(gx, 2.8, 12.6);
    gateHalf.castShadow = true;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.1, 4), brickMat);
    crown.position.set(gx, 6.5, 12.6);
    crown.rotation.y = Math.PI / 4;
    g.add(gateHalf, crown);
  });

  return g;
}

export function createMercusuar(): THREE.Group {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
  const redMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.6,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.1, 2.2, 12), darkMat);
  base.position.y = 1.1;
  g.add(base);

  const bands = [
    { y: 4.0, h: 3.6, rB: 3.1, rT: 2.6, mat: whiteMat },
    { y: 7.6, h: 3.6, rB: 2.6, rT: 2.1, mat: redMat },
    { y: 11.2, h: 3.6, rB: 2.1, rT: 1.7, mat: whiteMat },
    { y: 14.5, h: 3.0, rB: 1.7, rT: 1.4, mat: redMat },
  ];
  bands.forEach((b) => {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(b.rT, b.rB, b.h, 12), b.mat);
    seg.position.y = b.y;
    seg.castShadow = true;
    g.add(seg);
  });

  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.9, 0.5, 12), darkMat);
  gallery.position.y = 16.2;
  const lanternRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.9, 10), beamMat);
  lanternRoom.position.y = 17.35;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.4, 10), redMat);
  cap.position.y = 19.0;

  // Keeper house beside lighthouse
  const house = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 4.2), whiteMat);
  house.position.set(4.8, 1.4, 0.5);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 1.5, 4), redMat);
  roof.position.set(4.8, 3.55, 0.5);
  roof.rotation.y = Math.PI / 4;

  g.add(gallery, lanternRoom, cap, house, roof);
  return g;
}

export function createGazeboWisata(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 4.4), woodMat);
  deck.position.y = 0.175;
  deck.receiveShadow = true;
  g.add(deck);

  [-1.9, 1.9].forEach((px) => {
    [-1.9, 1.9].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), woodMat);
      post.position.set(px, 1.5, pz);
      g.add(post);
    });
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 1.6, 4), roofMat);
  roof.position.y = 3.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  return g;
}

export function createPerahuNelayan(): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 5.2), hullMat);
  hull.position.y = 0.35;
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 4), trimMat);
  prow.rotation.x = Math.PI / 2;
  prow.rotation.y = Math.PI / 4;
  prow.position.set(0, 0.45, 3.3);

  // Outriggers (Katir)
  [-1.6, 1.6].forEach((ox) => {
    const floatBar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 6), woodMat);
    floatBar.rotation.x = Math.PI / 2;
    floatBar.position.set(ox, 0.18, 0);
    const armF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.1), woodMat);
    armF.position.set(ox * 0.5, 0.42, 1.1);
    const armB = armF.clone();
    armB.position.z = -1.1;
    g.add(floatBar, armF, armB);
  });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6), woodMat);
  mast.position.set(0, 2.0, 0.5);

  g.add(hull, prow, mast);
  return g;
}

export function createAnimal(kind: 'kambing' | 'sapi', white = true): THREE.Group {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshLambertMaterial({
    color: kind === 'kambing' ? (white ? 0xf5f5f4 : 0x78350f) : 0x9a3412,
  });
  const spotMat = new THREE.MeshLambertMaterial({ color: 0xfafaf9 });
  const scale = kind === 'sapi' ? 1.55 : 0.95;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.98), coatMat);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);

  if (kind === 'sapi') {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.34, 0.42), spotMat);
    patch.position.set(0, 0.68, 0.05);
    g.add(patch);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.42), coatMat);
  head.position.set(0, 0.88, 0.58);
  g.add(head);

  const legGeo = new THREE.BoxGeometry(0.11, 0.44, 0.11);
  [
    [-0.18, 0.34],
    [0.18, 0.34],
    [-0.18, -0.34],
    [0.18, -0.34],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, 0.22, lz);
    g.add(leg);
  });

  g.scale.setScalar(scale);
  return g;
}

export function createWitAsem(scale = 1.4): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x452b18 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6b25 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 4.2, 8), trunkMat);
  trunk.position.y = 2.1;
  trunk.castShadow = true;
  g.add(trunk);

  const crowns = [
    { x: 0, y: 5.2, z: 0, r: 3.1 },
    { x: -1.8, y: 4.5, z: 1.2, r: 2.2 },
    { x: 1.9, y: 4.6, z: -1.0, r: 2.3 },
    { x: 0.5, y: 6.2, z: 0.6, r: 2.1 },
  ];
  crowns.forEach((c) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 0), leafMat);
    m.position.set(c.x, c.y, c.z);
    g.add(m);
  });

  g.scale.setScalar(scale);
  return g;
}

export function createKlentengKwanSingBio(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const crimsonMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
  const darkRedMat = new THREE.MeshLambertMaterial({ color: 0x7f1d1d });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const roofTealMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45, metalness: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.85 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
  });

  // Elevated stone terrace + front stairs
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.6, 12.5), stoneMat);
  plinth.position.y = 0.3;
  plinth.receiveShadow = true;
  const stair = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 1.8), stoneMat);
  stair.position.set(0, 0.175, 6.7);
  g.add(plinth, stair);

  // Main Sanctuary Hall
  const hall = new THREE.Mesh(new THREE.BoxGeometry(12.2, 4.4, 8.6), crimsonMat);
  hall.position.set(0, 2.8, -0.5);
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  // Ornate Entrance Gate Plaque & Doors
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.9, 0.24), darkRedMat);
  door.position.set(0, 2.05, 3.85);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.85, 0.25), goldMat);
  plaque.position.set(0, 4.1, 4.05);
  g.add(door, plaque);

  // 4 Crimson Dragon Columns on Front Veranda
  [-4.8, -2.0, 2.0, 4.8].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.3, 10), crimsonMat);
    col.position.set(cx, 2.75, 5.2);
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.75), stoneMat);
    colBase.position.set(cx, 0.78, 5.2);
    g.add(col, colBase);
  });

  // Sweeping Double-Tiered Pagoda Roof with upturned golden ridges
  const roofLower = new THREE.Mesh(new THREE.ConeGeometry(10.6, 2.3, 4), roofTealMat);
  roofLower.position.set(0, 6.0, 0.2);
  roofLower.rotation.y = Math.PI / 4;
  roofLower.scale.set(1.15, 1, 0.92);
  roofLower.castShadow = true;

  const upperWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.0, 5.2), crimsonMat);
  upperWall.position.set(0, 7.2, -0.2);

  const roofUpper = new THREE.Mesh(new THREE.ConeGeometry(7.0, 2.4, 4), roofTealMat);
  roofUpper.position.set(0, 9.2, -0.2);
  roofUpper.rotation.y = Math.PI / 4;
  roofUpper.scale.set(1.15, 1, 0.9);

  // Golden roof ridge & pearls
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 0.36), goldMat);
  ridge.position.set(0, 10.35, -0.2);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), goldMat);
  pearl.position.set(0, 10.75, -0.2);

  // Hanging red-gold lanterns along veranda
  [-3.4, 0, 3.4].forEach((lx) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), lanternMat);
    l.scale.set(1, 1.25, 1);
    l.position.set(lx, 4.15, 5.35);
    g.add(l);
  });

  // Flanking stone lion pedestals
  [-3.2, 3.2].forEach((sx) => {
    const lionBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.1), stoneMat);
    lionBase.position.set(sx, 0.95, 6.4);
    const lionTop = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshLambertMaterial({ color: 0x94a3b8, map: textures.stuccoWall }));
    lionTop.position.set(sx, 1.8, 6.4);
    g.add(lionBase, lionTop);
  });

  g.add(roofLower, upperWall, roofUpper, ridge, pearl);
  return g;
}

export function createMakamSunanBonang(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const brickMat = new THREE.MeshLambertMaterial({ map: textures.redBrick });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.75 });

  // Stone Courtyard
  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.24, 11.5), stoneMat);
  courtyard.position.y = 0.12;
  courtyard.receiveShadow = true;
  g.add(courtyard);

  // Red-brick Gapura Paduraksa front gate (+Z)
  [-1.9, 1.9].forEach((gx) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.2, 1.4), brickMat);
    pillar.position.set(gx, 2.2, 4.4);
    pillar.castShadow = true;
    const tier = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.3, 4), brickMat);
    tier.position.set(gx, 4.9, 4.4);
    tier.rotation.y = Math.PI / 4;
    g.add(pillar, tier);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 1.5), brickMat);
  lintel.position.set(0, 4.2, 4.4);
  const gateCrown = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.1, 4), brickMat);
  gateCrown.position.set(0, 5.7, 4.4);
  gateCrown.rotation.y = Math.PI / 4;
  g.add(lintel, gateCrown);

  // Cungkup Joglo Sanctuary Pavilion (Teakwood & Terracotta Tajug)
  [-2.6, 2.6].forEach((px) => {
    [-2.4, 1.6].forEach((pz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.0, 0.24), woodMat);
      post.position.set(px, 1.7, pz);
      g.add(post);
    });
  });
  const sanctuaryWall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 3.4), stoneMat);
  sanctuaryWall.position.set(0, 1.0, -0.4);
  const cungkupRoof1 = new THREE.Mesh(new THREE.ConeGeometry(5.6, 1.7, 4), roofMat);
  cungkupRoof1.position.set(0, 3.8, -0.4);
  cungkupRoof1.rotation.y = Math.PI / 4;
  const cungkupRoof2 = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 4), roofMat);
  cungkupRoof2.position.set(0, 5.2, -0.4);
  cungkupRoof2.rotation.y = Math.PI / 4;
  const mustaka = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), goldMat);
  mustaka.position.set(0, 6.2, -0.4);

  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.1 })
  );
  lantern.position.set(0, 2.9, 1.6);

  g.add(sanctuaryWall, cungkupRoof1, cungkupRoof2, mustaka, lantern);
  return g;
}

export function createPendopoTuban(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const creamMat = new THREE.MeshLambertMaterial({ color: 0xfef9c3 });
  const woodMat = new THREE.MeshLambertMaterial({ map: textures.woodPlank });
  const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
  const roofMat = new THREE.MeshLambertMaterial({ map: textures.roofTile });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.8 });

  // Grand Regency Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(16, 0.55, 11), stoneMat);
  plinth.position.y = 0.275;
  plinth.receiveShadow = true;
  const steps = new THREE.Mesh(new THREE.BoxGeometry(6, 0.28, 1.4), stoneMat);
  steps.position.set(0, 0.14, 5.8);
  g.add(plinth, steps);

  // Rear Regency Hall (Dalem)
  const backHall = new THREE.Mesh(new THREE.BoxGeometry(13.5, 3.6, 4.5), creamMat);
  backHall.position.set(0, 2.35, -2.5);
  backHall.castShadow = true;
  g.add(backHall);

  // Open Pendopo Soko Guru Pillars
  [-5.6, -2.0, 2.0, 5.6].forEach((px) => {
    [1.8, 4.6].forEach((pz) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.28), woodMat);
      p.position.set(px, 2.25, pz);
      g.add(p);
    });
  });

  // Broad Joglo-Limasan Regency Roof
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.22, 11.6), darkWoodMat);
  fascia.position.set(0, 4.0, 0.2);
  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(10.8, 2.3, 4), roofMat);
  lowerRoof.position.set(0, 5.2, 0.2);
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.scale.set(1.25, 1, 0.88);
  lowerRoof.castShadow = true;

  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.4, 4), roofMat);
  upperRoof.position.set(0, 7.0, 0.2);
  upperRoof.rotation.y = Math.PI / 4;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), goldMat);
  finial.position.set(0, 8.3, 0.2);

  // Merah-Putih Flagpole in front
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 6.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 })
  );
  pole.position.set(6.4, 3.1, 5.8);
  const flagRed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 0.04), new THREE.MeshLambertMaterial({ color: 0xdc2626 }));
  flagRed.position.set(6.95, 5.9, 5.8);
  const flagWhite = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.36, 0.04), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
  flagWhite.position.set(6.95, 5.54, 5.8);

  g.add(fascia, lowerRoof, upperRoof, finial, pole, flagRed, flagWhite);
  return g;
}

export function createTuguTuban(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const creamMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.82 });

  // Stepped Monument Base
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 4.2), stoneMat);
  tier1.position.y = 0.275;
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 2.8), creamMat);
  tier2.position.y = 1.25;
  tier2.castShadow = true;
  const tier3 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 2.1), stoneMat);
  tier3.position.y = 2.15;

  // Adipati Ronggolawe Horse Silhouette Sculpture
  const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 1.45), bronzeMat);
  horseBody.position.set(0, 3.15, 0);
  horseBody.rotation.x = -0.35;
  const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.9, 0.42), bronzeMat);
  horseNeck.position.set(0, 3.75, 0.55);
  horseNeck.rotation.x = 0.3;
  const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.56), bronzeMat);
  horseHead.position.set(0, 4.15, 0.82);
  const riderTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.95, 8), bronzeMat);
  riderTorso.position.set(0, 3.85, -0.05);
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bronzeMat);
  riderHead.position.set(0, 4.5, -0.05);

  // Rear support legs on pedestal
  [-0.22, 0.22].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.85, 6), bronzeMat);
    leg.position.set(lx, 2.68, -0.45);
    g.add(leg);
  });

  g.add(tier1, tier2, tier3, horseBody, horseNeck, horseHead, riderTorso, riderHead);
  return g;
}

export function createPohonSiwalan(): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });
  const bambooMat = new THREE.MeshLambertMaterial({ color: 0xca8a04 });
  const fruitMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });

  // Tall ringed palm trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 7.2, 7), trunkMat);
  trunk.position.y = 3.6;
  trunk.castShadow = true;
  g.add(trunk);

  // Bamboo tapping pole (sigai) leaning along trunk — signature Tuban siwalan detail
  const sigai = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6.4, 5), bambooMat);
  sigai.position.set(0.32, 3.2, 0);
  sigai.rotation.z = 0.04;
  g.add(sigai);

  // Fan-shaped crown fronds
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 5), frondMat);
    frond.position.set(Math.cos(angle) * 1.05, 7.35, Math.sin(angle) * 1.05);
    frond.rotation.z = -Math.cos(angle) * 0.95;
    frond.rotation.x = Math.sin(angle) * 0.95;
    g.add(frond);
  }
  const topCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25, 0), frondMat);
  topCrown.position.y = 7.75;
  g.add(topCrown);

  // Cluster of ental / siwalan fruit below fronds
  [-0.3, 0.3].forEach((fx) => {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 7), fruitMat);
    fruit.position.set(fx, 6.7, 0.25);
    g.add(fruit);
  });

  return g;
}

export function createGapuraTuban(textures: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const brickMat = new THREE.MeshLambertMaterial({ map: textures.redBrick });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.8 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
  });

  // Twin red-brick Paduraksa gate pillars straddling the 10m highway (local X = ±6.8)
  [-6.8, 6.8].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.4), stoneMat);
    plinth.position.set(px, 0.45, 0);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 5.4, 1.7), brickMat);
    pillar.position.set(px, 3.6, 0);
    pillar.castShadow = true;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 2.1), stoneMat);
    collar.position.set(px, 6.45, 0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 4), brickMat);
    spire.position.set(px, 7.75, 0);
    spire.rotation.y = Math.PI / 4;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), goldMat);
    tip.position.set(px, 8.95, 0);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lanternMat);
    lamp.position.set(px * 0.85, 5.4, 0);
    g.add(plinth, pillar, collar, spire, tip, lamp);
  });

  // Overhead Bumi Wali Tuban lintel beam (clearance >= 5.6m for buses & cement trucks)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(15.2, 1.1, 1.4), brickMat);
  lintel.position.set(0, 6.15, 0);
  lintel.castShadow = true;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.22, 1.6), goldMat);
  trim.position.set(0, 6.75, 0);
  const centerCrown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 4), brickMat);
  centerCrown.position.set(0, 7.6, 0);
  centerCrown.rotation.y = Math.PI / 4;
  centerCrown.scale.set(1.8, 1, 0.9);
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.5, 12), goldMat);
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, 6.15, 0);

  g.add(lintel, trim, centerCrown, emblem);
  return g;
}
