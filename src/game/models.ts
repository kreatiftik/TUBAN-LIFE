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

export interface CharacterRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  pelvisGroup: THREE.Group;
  spineGroup: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftWrist: THREE.Group;
  rightWrist: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightAnkle: THREE.Group;
  shirtMeshes: THREE.Mesh[];
  pantsMeshes: THREE.Mesh[];
  outfitDecorGroup: THREE.Group;
  collarMesh: THREE.Mesh;
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
  kasual: { shirt: 0x1e40af, collar: 0xe2e8f0, pants: 0x1e293b, metalness: 0.05, style: 'tshirt' },
  batik: { shirt: 0x92400e, collar: 0xfef3c7, pants: 0x1c1917, metalness: 0.08, style: 'batik' },
  jaket_motor: { shirt: 0x15803d, collar: 0x111827, pants: 0x0f172a, metalness: 0.15, style: 'jaket' },
  lurik: { shirt: 0x44403c, collar: 0xd97706, pants: 0x292524, metalness: 0.1, style: 'lurik' },
};

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
  // Ergonomic foot footprint extruded in XZ (shape XY -> rotated to XZ)
  const s = new THREE.Shape();
  s.moveTo(-0.044, -0.072);
  s.quadraticCurveTo(-0.056, -0.02, -0.046, 0.035);
  s.quadraticCurveTo(-0.058, 0.095, -0.042, 0.135);
  s.quadraticCurveTo(0, 0.165, 0.042, 0.135);
  s.quadraticCurveTo(0.058, 0.095, 0.046, 0.035);
  s.quadraticCurveTo(0.056, -0.02, 0.044, -0.072);
  s.quadraticCurveTo(0, -0.092, -0.044, -0.072);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

// Shared smooth anatomical geometries (reused across all characters for fast GPU rendering)
const CHAR_GEOS = (() => {
  // Anatomical torso: overlaps pelvis (-0.08), tapered waist (0.08), ribcage (0.25), chest/shoulders (0.44), sloping trapezius (0.55)
  const torsoPts = [
    new THREE.Vector2(0.0, -0.08),
    new THREE.Vector2(0.145, -0.06),
    new THREE.Vector2(0.142, 0.05),
    new THREE.Vector2(0.148, 0.14),
    new THREE.Vector2(0.178, 0.30),
    new THREE.Vector2(0.198, 0.44),
    new THREE.Vector2(0.162, 0.52),
    new THREE.Vector2(0.072, 0.56),
    new THREE.Vector2(0.0, 0.56),
  ];
  const torso = new THREE.LatheGeometry(torsoPts, 18);
  torso.scale(1.18, 1.0, 0.70);
  torso.computeVertexNormals();

  // Anatomical thigh: fuller quad & hamstring tapering cleanly into knee
  const thighPts = [
    new THREE.Vector2(0.0, 0.03),
    new THREE.Vector2(0.084, 0.01),
    new THREE.Vector2(0.091, -0.09),
    new THREE.Vector2(0.078, -0.22),
    new THREE.Vector2(0.065, -0.34),
    new THREE.Vector2(0.0, -0.35),
  ];
  const thigh = new THREE.LatheGeometry(thighPts, 14);
  thigh.scale(0.98, 1.0, 1.06);
  thigh.computeVertexNormals();

  // Anatomical calf: sculpted gastrocnemius curve tapering to slender ankle
  const calfPts = [
    new THREE.Vector2(0.0, 0.02),
    new THREE.Vector2(0.066, 0.0),
    new THREE.Vector2(0.072, -0.10),
    new THREE.Vector2(0.062, -0.21),
    new THREE.Vector2(0.044, -0.33),
    new THREE.Vector2(0.0, -0.35),
  ];
  const calf = new THREE.LatheGeometry(calfPts, 14);
  calf.computeVertexNormals();

  // Wide culotte (kulot) calf drape widening smoothly toward the ankle hem
  const kulotPts = [
    new THREE.Vector2(0.0, 0.02),
    new THREE.Vector2(0.074, 0.0),
    new THREE.Vector2(0.092, -0.11),
    new THREE.Vector2(0.108, -0.22),
    new THREE.Vector2(0.118, -0.33),
    new THREE.Vector2(0.0, -0.34),
  ];
  const kulotCalf = new THREE.LatheGeometry(kulotPts, 16);
  kulotCalf.computeVertexNormals();

  // Anatomical upper sleeve / bicep
  const sleevePts = [
    new THREE.Vector2(0.0, 0.02),
    new THREE.Vector2(0.066, 0.0),
    new THREE.Vector2(0.064, -0.09),
    new THREE.Vector2(0.052, -0.21),
    new THREE.Vector2(0.0, -0.23),
  ];
  const sleeve = new THREE.LatheGeometry(sleevePts, 12);
  sleeve.computeVertexNormals();

  // Anatomical forearm tapering cleanly to wrist
  const forearmPts = [
    new THREE.Vector2(0.0, 0.01),
    new THREE.Vector2(0.048, 0.0),
    new THREE.Vector2(0.051, -0.07),
    new THREE.Vector2(0.041, -0.16),
    new THREE.Vector2(0.032, -0.22),
    new THREE.Vector2(0.0, -0.23),
  ];
  const forearm = new THREE.LatheGeometry(forearmPts, 12);
  forearm.computeVertexNormals();

  return {
    torso,
    pelvis: new THREE.SphereGeometry(0.166, 14, 12),
    belt: new THREE.CylinderGeometry(0.169, 0.172, 0.05, 18),
    buckle: createRoundedExtrude(0.055, 0.042, 0.024, 0.012, 0.005),
    collar: new THREE.TorusGeometry(0.086, 0.024, 8, 16),
    placket: createRoundedExtrude(0.038, 0.42, 0.022, 0.012, 0.004),
    pocket: createRoundedExtrude(0.066, 0.07, 0.02, 0.014, 0.004),
    button: new THREE.SphereGeometry(0.011, 8, 6),
    jacketTee: createRoundedExtrude(0.092, 0.4, 0.022, 0.018, 0.004),
    epaulet: new THREE.CapsuleGeometry(0.014, 0.075, 4, 6),
    selendang: createRoundedExtrude(0.105, 0.54, 0.27, 0.03, 0.008),
    backpack: createRoundedExtrude(0.24, 0.32, 0.14, 0.055, 0.016),
    backpackFlap: createRoundedExtrude(0.245, 0.11, 0.145, 0.045, 0.012),
    strap: new THREE.CapsuleGeometry(0.018, 0.32, 4, 8),
    neckTowel: new THREE.TorusGeometry(0.115, 0.028, 8, 16, Math.PI * 1.45),
    sarungSkirt: new THREE.CylinderGeometry(0.168, 0.192, 0.68, 18),
    hipSphere: new THREE.SphereGeometry(0.088, 12, 10),
    thigh,
    kneeCap: new THREE.SphereGeometry(0.066, 12, 10),
    calf,
    kulotCalf,
    cargoPocket: createRoundedExtrude(0.036, 0.115, 0.088, 0.014, 0.005),
    ankleJoint: new THREE.SphereGeometry(0.043, 10, 8),
    pantCuff: new THREE.TorusGeometry(0.047, 0.015, 8, 14),
    shoeUpper: new THREE.CapsuleGeometry(0.048, 0.115, 6, 10),
    shoeHeel: new THREE.SphereGeometry(0.046, 10, 8),
    shoeSole: createShoeSoleGeo(),
    sandalStrap: new THREE.TorusGeometry(0.048, 0.011, 6, 12, Math.PI),
    shoulderCap: new THREE.SphereGeometry(0.072, 12, 10),
    sleeve,
    cuff: new THREE.TorusGeometry(0.036, 0.011, 6, 12),
    elbowJoint: new THREE.SphereGeometry(0.049, 10, 8),
    forearm,
    wristWatch: new THREE.TorusGeometry(0.035, 0.008, 6, 12),
    palm: createRoundedExtrude(0.062, 0.074, 0.032, 0.022, 0.008),
    fingers: new THREE.CapsuleGeometry(0.022, 0.028, 4, 8),
    thumb: new THREE.CapsuleGeometry(0.012, 0.028, 4, 6),
    neck: new THREE.CylinderGeometry(0.056, 0.07, 0.14, 12),
    cranium: new THREE.SphereGeometry(0.142, 18, 16),
    jaw: new THREE.SphereGeometry(0.095, 14, 12),
    ear: new THREE.SphereGeometry(0.032, 8, 8),
    nose: new THREE.CapsuleGeometry(0.015, 0.032, 4, 8),
    mouth: new THREE.CapsuleGeometry(0.007, 0.032, 4, 6),
    mustache: new THREE.CapsuleGeometry(0.011, 0.055, 4, 6),
    glassesRim: new THREE.TorusGeometry(0.031, 0.005, 6, 14),
    glassesBridge: new THREE.CapsuleGeometry(0.004, 0.028, 3, 6),
    eyeSclera: new THREE.SphereGeometry(0.022, 10, 8),
    eyeIris: new THREE.SphereGeometry(0.013, 8, 8),
    brow: new THREE.CapsuleGeometry(0.008, 0.034, 4, 6),
    hairCap: new THREE.SphereGeometry(0.148, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairBack: new THREE.SphereGeometry(0.138, 14, 12),
    hairFringe: new THREE.CapsuleGeometry(0.038, 0.12, 4, 8),
    hairSideburn: new THREE.CapsuleGeometry(0.015, 0.052, 4, 6),
    hairSpike: new THREE.ConeGeometry(0.036, 0.085, 8),
    curlyClump: new THREE.SphereGeometry(0.048, 10, 8),
    bobSide: new THREE.CapsuleGeometry(0.044, 0.125, 4, 8),
    bobBack: new THREE.CylinderGeometry(0.128, 0.156, 0.175, 14),
    undercutTop: createRoundedExtrude(0.145, 0.072, 0.21, 0.036, 0.015),
    ponytail: new THREE.CapsuleGeometry(0.038, 0.16, 4, 8),
    hairBand: new THREE.TorusGeometry(0.042, 0.012, 6, 12),
    kondeBun: new THREE.SphereGeometry(0.078, 14, 12),
    hijabWrap: new THREE.SphereGeometry(0.156, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hijabDrape: new THREE.CylinderGeometry(0.11, 0.195, 0.24, 16),
    caping: new THREE.ConeGeometry(0.34, 0.19, 20),
    peci: new THREE.CylinderGeometry(0.138, 0.148, 0.11, 18),
    policeCap: new THREE.CylinderGeometry(0.165, 0.148, 0.1, 18),
    policeBrim: new THREE.CylinderGeometry(0.15, 0.15, 0.018, 16, 1, false, -Math.PI * 0.4, Math.PI * 0.8),
    helmetShell: new THREE.SphereGeometry(0.168, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
    helmetVisor: new THREE.CylinderGeometry(0.162, 0.162, 0.085, 16, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
    topiCrown: new THREE.SphereGeometry(0.146, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  };
})();

const SHARED_CHAR_MATS = {
  shoe: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.42, metalness: 0.12 }),
  pantofel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.24, metalness: 0.2 }),
  sole: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.68 }),
  darkSole: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 }),
  belt: new THREE.MeshStandardMaterial({ color: 0x231a14, roughness: 0.65 }),
  buckle: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.85 }),
  cuffWhite: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 }),
  watch: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.65 }),
  lips: new THREE.MeshStandardMaterial({ color: 0x9d5b4c, roughness: 0.55 }),
  glasses: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.85 }),
  backpack: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
  backpackAccent: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),
  towel: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }),
  sclera: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
  iris: new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.2 }),
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

export const RIG_HIP_Y = 0.78;
export const RIG_THIGH_LEN = 0.35;
export const RIG_SHIN_LEN = 0.35;
export const RIG_SHIN_FOOT_LEN = 0.428;
export const RIG_SOLE_OFFSET_Y = 0.078;

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
}

const PROCEDURAL_PALETTES = {
  skin: [0xd8a179, 0xd19a72, 0xc98f64, 0xc28658, 0xb87b4c, 0xdfb088, 0xb27345],
  hairNatural: [0x171412, 0x1e1916, 0x29211b, 0x3b2a1e, 0x111111],
  hairElder: [0x9ca3af, 0x6b7280, 0xd1d5db, 0x4b5563],
  hijab: [0xf8fafc, 0xf59e0b, 0x0d9488, 0xbe185d, 0x4f46e5, 0x0f766e, 0x92400e, 0xe11d48, 0x334155, 0x6d28d9],
  shirtCasual: [
    0x1d4ed8, 0x0369a1, 0x0f766e, 0x15803d, 0xb91c1c, 0xd97706, 0x7c3aed,
    0xbe185d, 0x334155, 0xe11d48, 0x047857, 0x4338ca, 0xc2410c, 0xf1f5f9,
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

  // Male / worker / elder_male
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
  textures?: ProceduralTexturePack
) {
  while (decorGroup.children.length > 0) {
    decorGroup.remove(decorGroup.children[0]);
  }

  const trimMat = new THREE.MeshStandardMaterial({
    color: collarColor,
    roughness: 0.58,
  });

  // Relative to spineGroup (origin at waist y = 0.85)
  if (style === 'kemeja' || style === 'batik' || style === 'seragam') {
    const placket = new THREE.Mesh(CHAR_GEOS.placket, trimMat);
    placket.position.set(0, 0.26, 0.132);
    decorGroup.add(placket);
    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(CHAR_GEOS.button, SHARED_CHAR_MATS.belt);
      btn.position.set(0, 0.17 + b * 0.12, 0.146);
      decorGroup.add(btn);
    }
    const pocket = new THREE.Mesh(CHAR_GEOS.pocket, trimMat);
    pocket.position.set(0.095, 0.34, 0.128);
    decorGroup.add(pocket);
    if (style === 'seragam') {
      [-0.165, 0.165].forEach((ex) => {
        const ep = new THREE.Mesh(CHAR_GEOS.epaulet, SHARED_CHAR_MATS.buckle);
        ep.rotation.z = Math.PI / 2;
        ep.position.set(ex, 0.515, 0);
        decorGroup.add(ep);
      });
    }
  } else if (style === 'jaket') {
    const innerTee = new THREE.Mesh(
      CHAR_GEOS.jacketTee,
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 })
    );
    innerTee.position.set(0, 0.29, 0.128);
    const zipL = new THREE.Mesh(CHAR_GEOS.placket, SHARED_CHAR_MATS.watch);
    zipL.position.set(-0.048, 0.28, 0.135);
    zipL.scale.set(0.42, 0.96, 1);
    const zipR = zipL.clone();
    zipR.position.x = 0.048;
    decorGroup.add(innerTee, zipL, zipR);
  } else if (style === 'lurik') {
    const sash = new THREE.Mesh(
      CHAR_GEOS.placket,
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        map: textures ? textures.batikWall : null,
        roughness: 0.72,
      })
    );
    sash.position.set(0.03, 0.27, 0.133);
    sash.rotation.z = -0.14;
    sash.scale.set(1.55, 0.96, 1);
    decorGroup.add(sash);
  } else if (style === 'kebaya') {
    const kutu = new THREE.Mesh(
      CHAR_GEOS.placket,
      new THREE.MeshStandardMaterial({
        color: shirtColor,
        roughness: 0.65,
      })
    );
    kutu.position.set(0, 0.27, 0.133);
    kutu.scale.set(1.9, 0.94, 1);
    const selendang = new THREE.Mesh(
      CHAR_GEOS.selendang,
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        map: textures ? textures.batikWall : null,
        roughness: 0.78,
      })
    );
    selendang.position.set(-0.135, 0.27, 0.01);
    selendang.rotation.z = 0.12;
    decorGroup.add(kutu, selendang);
  } else {
    // T-shirt chest pocket accent
    const pocket = new THREE.Mesh(CHAR_GEOS.pocket, trimMat);
    pocket.position.set(0.095, 0.34, 0.128);
    decorGroup.add(pocket);
  }
}

export function createCharacterRig(rawOptions: CharacterBuildOptions): CharacterRig {
  const options = rawOptions.randomize ? resolveProceduralCharacterOptions(rawOptions) : rawOptions;
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const pelvisGroup = new THREE.Group();
  const spineGroup = new THREE.Group();
  spineGroup.position.set(0, 0.85, 0);
  bodyGroup.add(pelvisGroup, spineGroup);
  group.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor ?? 0xd19a72,
    roughness: 0.62,
    metalness: 0.02,
  });

  const outfitCfg = options.outfit ? OUTFIT_COLORS[options.outfit] : null;
  const shirtColor = options.shirtColor ?? (outfitCfg ? outfitCfg.shirt : 0x2563eb);
  const pantsColor = options.pantsColor ?? (outfitCfg ? outfitCfg.pants : 0x1e293b);
  const shirtStyle: CharacterShirtStyle = options.shirtStyle ?? (outfitCfg ? outfitCfg.style : 'tshirt');
  const pantsStyle: CharacterPantsStyle = options.pantsStyle ?? 'jeans';
  const shoeStyle: CharacterShoeStyle = options.shoeStyle ?? 'sneakers';
  const useHijab = Boolean(options.hijab || options.hairStyle === 'hijab');
  const hairStyle: CharacterHairStyle = useHijab ? 'hijab' : (options.hairStyle ?? 'short_part');
  const hairColor = options.hairColor ?? 0x171412;
  const hijabColor = options.hijabColor ?? options.hairColor ?? 0xf8fafc;

  const customShoeMat =
    options.shoeColor !== undefined
      ? new THREE.MeshStandardMaterial({
          color: options.shoeColor,
          roughness: shoeStyle === 'pantofel' ? 0.24 : shoeStyle === 'sandal' ? 0.65 : 0.45,
          metalness: shoeStyle === 'pantofel' ? 0.2 : 0.08,
        })
      : null;

  const shirtMap =
    shirtStyle === 'batik' && options.textures
      ? options.textures.batikWall
      : shirtStyle === 'lurik' && options.textures
        ? options.textures.lurik
        : null;

  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtColor,
    roughness: 0.74,
    metalness: outfitCfg?.metalness ?? 0.05,
    map: shirtMap,
  });

  const collarColor = outfitCfg ? outfitCfg.collar : 0xe5e7eb;
  const collarMat = new THREE.MeshStandardMaterial({
    color: collarColor,
    roughness: 0.6,
  });

  const pantsMap =
    pantsStyle === 'jeans' && options.textures
      ? options.textures.denim
      : pantsStyle === 'sarung' && options.textures
        ? options.textures.batikWall
        : null;

  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.82,
    metalness: 0.03,
    map: pantsMap,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.85,
    metalness: 0.04,
  });
  const hijabMat = new THREE.MeshStandardMaterial({
    color: hijabColor,
    roughness: 0.78,
    metalness: 0.03,
  });

  const shirtMeshes: THREE.Mesh[] = [];
  const pantsMeshes: THREE.Mesh[] = [];

  // Articulated anatomical Legs (hip -> knee -> ankle) attached to pelvisGroup
  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, RIG_HIP_Y, 0);

    const hipSphere = new THREE.Mesh(CHAR_GEOS.hipSphere, pantsMat);
    const thigh = new THREE.Mesh(CHAR_GEOS.thigh, pantsMat);
    pantsMeshes.push(hipSphere, thigh);
    legPivot.add(hipSphere, thigh);

    if (pantsStyle === 'cargo') {
      const pocket = new THREE.Mesh(CHAR_GEOS.cargoPocket, pantsMat);
      pocket.position.set(xOff < 0 ? -0.072 : 0.072, -0.17, 0.005);
      pantsMeshes.push(pocket);
      legPivot.add(pocket);
    }

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -RIG_THIGH_LEN, 0);
    legPivot.add(kneePivot);

    const lowerMat = pantsStyle === 'shorts' ? skinMat : pantsMat;
    const kneeCap = new THREE.Mesh(CHAR_GEOS.kneeCap, lowerMat);
    const calfGeo = pantsStyle === 'kulot' ? CHAR_GEOS.kulotCalf : CHAR_GEOS.calf;
    const calf = new THREE.Mesh(calfGeo, lowerMat);
    if (pantsStyle !== 'shorts') {
      pantsMeshes.push(kneeCap, calf);
    }
    kneePivot.add(kneeCap, calf);

    if (pantsStyle === 'jeans') {
      const cuff = new THREE.Mesh(CHAR_GEOS.pantCuff, SHARED_CHAR_MATS.cuffWhite);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.325;
      kneePivot.add(cuff);
    }

    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -RIG_SHIN_LEN, 0);
    kneePivot.add(anklePivot);

    if (pantsStyle !== 'kulot') {
      const ankleJoint = new THREE.Mesh(CHAR_GEOS.ankleJoint, lowerMat);
      if (pantsStyle !== 'shorts') {
        pantsMeshes.push(ankleJoint);
      }
      anklePivot.add(ankleJoint);
    }

    // Sculpted ergonomic shoes/sandals with beveled footprint sole (bottom at y = -0.078)
    if (shoeStyle === 'sandal') {
      const bareFoot = new THREE.Mesh(CHAR_GEOS.shoeUpper, skinMat);
      bareFoot.rotation.x = Math.PI / 2;
      bareFoot.position.set(0, -0.032, 0.042);
      bareFoot.scale.set(0.96, 0.96, 0.72);

      const strap = new THREE.Mesh(CHAR_GEOS.sandalStrap, customShoeMat ?? SHARED_CHAR_MATS.belt);
      strap.position.set(0, -0.036, 0.055);
      strap.rotation.x = 0.2;

      const sole = new THREE.Mesh(CHAR_GEOS.shoeSole, SHARED_CHAR_MATS.darkSole);
      sole.position.set(0, -0.072, 0.015);
      anklePivot.add(bareFoot, strap, sole);
    } else if (shoeStyle === 'pantofel') {
      const pantofelMat = customShoeMat ?? SHARED_CHAR_MATS.pantofel;
      const shoeUpper = new THREE.Mesh(CHAR_GEOS.shoeUpper, pantofelMat);
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.position.set(0, -0.028, 0.046);
      shoeUpper.scale.set(0.98, 1.04, 0.8);

      const heelCup = new THREE.Mesh(CHAR_GEOS.shoeHeel, pantofelMat);
      heelCup.position.set(0, -0.025, -0.025);

      const shoeSole = new THREE.Mesh(CHAR_GEOS.shoeSole, SHARED_CHAR_MATS.darkSole);
      shoeSole.position.set(0, -0.072, 0.015);
      anklePivot.add(shoeUpper, heelCup, shoeSole);
    } else {
      const sneakerMat = customShoeMat ?? SHARED_CHAR_MATS.shoe;
      const shoeUpper = new THREE.Mesh(CHAR_GEOS.shoeUpper, sneakerMat);
      shoeUpper.rotation.x = Math.PI / 2;
      shoeUpper.position.set(0, -0.028, 0.042);
      shoeUpper.scale.set(1.02, 1.0, 0.84);

      const heelCup = new THREE.Mesh(CHAR_GEOS.shoeHeel, sneakerMat);
      heelCup.position.set(0, -0.025, -0.024);

      const shoeSole = new THREE.Mesh(CHAR_GEOS.shoeSole, SHARED_CHAR_MATS.sole);
      shoeSole.position.set(0, -0.072, 0.015);
      anklePivot.add(shoeUpper, heelCup, shoeSole);
    }

    return { legPivot, kneePivot, anklePivot };
  };

  const leftLegBuilt = makeLeg(-0.108);
  const rightLegBuilt = makeLeg(0.108);
  const leftLeg = leftLegBuilt.legPivot;
  const rightLeg = rightLegBuilt.legPivot;
  const leftKnee = leftLegBuilt.kneePivot;
  const rightKnee = rightLegBuilt.kneePivot;
  const leftAnkle = leftLegBuilt.anklePivot;
  const rightAnkle = rightLegBuilt.anklePivot;
  pelvisGroup.add(leftLeg, rightLeg);

  const pelvis = new THREE.Mesh(CHAR_GEOS.pelvis, pantsMat);
  pelvis.position.y = 0.79;
  pelvis.scale.set(1.22, 0.65, 0.84);
  pantsMeshes.push(pelvis);

  // Belt & rounded metallic buckle stay anchored on pelvisGroup
  const belt = new THREE.Mesh(CHAR_GEOS.belt, SHARED_CHAR_MATS.belt);
  belt.position.y = 0.805;
  belt.scale.set(1.16, 1.0, 0.76);
  const buckle = new THREE.Mesh(CHAR_GEOS.buckle, SHARED_CHAR_MATS.buckle);
  buckle.position.set(0, 0.805, 0.132);
  pelvisGroup.add(pelvis, belt, buckle);

  // Draped traditional Sarung / Jarik wrap over thighs & knees
  if (pantsStyle === 'sarung') {
    const sarungWrap = new THREE.Mesh(CHAR_GEOS.sarungSkirt, pantsMat);
    sarungWrap.position.y = 0.45;
    sarungWrap.scale.set(1.12, 1.0, 0.82);
    pantsMeshes.push(sarungWrap);
    pelvisGroup.add(sarungWrap);
  }

  // Torso, Collar, Outfit Decor, Backpack & Towel attached to articulated spineGroup (origin at waist y = 0.85)
  const torso = new THREE.Mesh(CHAR_GEOS.torso, shirtMat);
  torso.position.y = 0;
  if (options.gender === 'perempuan') {
    torso.scale.set(0.9, 0.98, 0.94);
  }
  torso.castShadow = true;
  torso.receiveShadow = true;
  shirtMeshes.push(torso);
  spineGroup.add(torso);

  const collar = new THREE.Mesh(CHAR_GEOS.collar, collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.55, 0.01);
  collar.scale.set(1.08, 0.92, 1);
  spineGroup.add(collar);

  const outfitDecorGroup = new THREE.Group();
  buildOutfitDecor(outfitDecorGroup, shirtStyle, shirtColor, collarColor, options.textures);
  spineGroup.add(outfitDecorGroup);

  if (options.hasBackpack) {
    const pack = new THREE.Mesh(CHAR_GEOS.backpack, SHARED_CHAR_MATS.backpack);
    pack.position.set(0, 0.27, -0.18);
    pack.castShadow = true;
    const flap = new THREE.Mesh(CHAR_GEOS.backpackFlap, SHARED_CHAR_MATS.backpackAccent);
    flap.position.set(0, 0.39, -0.186);
    [-0.1, 0.1].forEach((sx) => {
      const strap = new THREE.Mesh(CHAR_GEOS.strap, SHARED_CHAR_MATS.belt);
      strap.position.set(sx, 0.3, -0.02);
      spineGroup.add(strap);
    });
    spineGroup.add(pack, flap);
  }

  if (options.hasNeckTowel) {
    const towel = new THREE.Mesh(CHAR_GEOS.neckTowel, SHARED_CHAR_MATS.towel);
    towel.rotation.x = Math.PI / 2 + 0.18;
    towel.rotation.z = -Math.PI * 0.22;
    towel.position.set(0, 0.55, 0.01);
    spineGroup.add(towel);
  }

  // Articulated Arms (shoulder -> elbow -> wrist/hand) attached to spineGroup
  const makeArm = (xOff: number, withWatch: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 0.47, 0);

    const shoulderCap = new THREE.Mesh(CHAR_GEOS.shoulderCap, shirtMat);
    const sleeve = new THREE.Mesh(CHAR_GEOS.sleeve, shirtMat);
    shirtMeshes.push(shoulderCap, sleeve);
    armPivot.add(shoulderCap, sleeve);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.23, 0);
    armPivot.add(elbowPivot);

    const isLongSleeve = shirtStyle === 'jaket' || shirtStyle === 'batik' || shirtStyle === 'lurik';
    const armLowerMat = isLongSleeve ? shirtMat : skinMat;
    const elbowJoint = new THREE.Mesh(CHAR_GEOS.elbowJoint, armLowerMat);
    const forearm = new THREE.Mesh(CHAR_GEOS.forearm, armLowerMat);
    if (isLongSleeve) {
      shirtMeshes.push(elbowJoint, forearm);
      const cuff = new THREE.Mesh(CHAR_GEOS.cuff, collarMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.215;
      elbowPivot.add(cuff);
    }
    elbowPivot.add(elbowJoint, forearm);

    if (withWatch && !isLongSleeve) {
      const watch = new THREE.Mesh(CHAR_GEOS.wristWatch, SHARED_CHAR_MATS.watch);
      watch.rotation.x = Math.PI / 2;
      watch.position.y = -0.2;
      elbowPivot.add(watch);
    }

    const wristPivot = new THREE.Group();
    wristPivot.position.set(0, -0.23, 0);
    elbowPivot.add(wristPivot);

    const palm = new THREE.Mesh(CHAR_GEOS.palm, skinMat);
    palm.position.set(0, -0.032, 0.004);
    palm.rotation.y = xOff < 0 ? 0.14 : -0.14;
    const fingers = new THREE.Mesh(CHAR_GEOS.fingers, skinMat);
    fingers.position.set(0, -0.072, 0.008);
    fingers.scale.set(1.0, 0.9, 0.72);
    const thumb = new THREE.Mesh(CHAR_GEOS.thumb, skinMat);
    thumb.position.set(xOff < 0 ? 0.028 : -0.028, -0.025, 0.024);
    thumb.rotation.x = 0.45;
    wristPivot.add(palm, fingers, thumb);

    return { armPivot, elbowPivot, wristPivot };
  };

  const leftArmBuilt = makeArm(-0.242, true);
  const rightArmBuilt = makeArm(0.242, false);
  const leftArm = leftArmBuilt.armPivot;
  const rightArm = rightArmBuilt.armPivot;
  const leftElbow = leftArmBuilt.elbowPivot;
  const rightElbow = rightArmBuilt.elbowPivot;
  const leftWrist = leftArmBuilt.wristPivot;
  const rightWrist = rightArmBuilt.wristPivot;
  spineGroup.add(leftArm, rightArm);

  // Sculpted Human Head + Facial Features + Hair Varieties attached to spineGroup
  const head = new THREE.Group();
  head.position.set(0, 0.57, 0);

  const neck = new THREE.Mesh(CHAR_GEOS.neck, skinMat);
  neck.position.y = 0.04;
  head.add(neck);

  const cranium = new THREE.Mesh(CHAR_GEOS.cranium, skinMat);
  cranium.position.y = 0.21;
  cranium.scale.set(0.95, 1.08, 1.02);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(CHAR_GEOS.jaw, skinMat);
  jaw.position.set(0, 0.14, 0.03);
  jaw.scale.set(0.94, 0.85, 0.96);
  head.add(jaw);

  const earL = new THREE.Mesh(CHAR_GEOS.ear, skinMat);
  earL.position.set(-0.134, 0.2, -0.005);
  earL.scale.set(0.45, 1.15, 0.75);
  const earR = earL.clone();
  earR.position.x = 0.134;
  head.add(earL, earR);

  const nose = new THREE.Mesh(CHAR_GEOS.nose, skinMat);
  nose.position.set(0, 0.195, 0.145);
  nose.rotation.x = -0.25;
  head.add(nose);

  const mouth = new THREE.Mesh(CHAR_GEOS.mouth, SHARED_CHAR_MATS.lips);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, 0.132, 0.126);
  head.add(mouth);

  if (options.hasMustache) {
    const stache = new THREE.Mesh(CHAR_GEOS.mustache, hairMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, 0.155, 0.132);
    head.add(stache);
  }

  [-0.05, 0.05].forEach((ex) => {
    const sclera = new THREE.Mesh(CHAR_GEOS.eyeSclera, SHARED_CHAR_MATS.sclera);
    sclera.position.set(ex, 0.225, 0.125);
    sclera.scale.set(1.05, 0.85, 0.65);
    const iris = new THREE.Mesh(CHAR_GEOS.eyeIris, SHARED_CHAR_MATS.iris);
    iris.position.set(ex, 0.225, 0.136);
    const brow = new THREE.Mesh(CHAR_GEOS.brow, hairMat);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(ex, 0.256, 0.128);
    head.add(sclera, iris, brow);

    if (options.hasGlasses) {
      const rim = new THREE.Mesh(CHAR_GEOS.glassesRim, SHARED_CHAR_MATS.glasses);
      rim.position.set(ex, 0.224, 0.142);
      head.add(rim);
    }
  });

  if (options.hasGlasses) {
    const bridge = new THREE.Mesh(CHAR_GEOS.glassesBridge, SHARED_CHAR_MATS.glasses);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.226, 0.144);
    head.add(bridge);
  }

  // Distinct Hairstyles & Hijab
  if (hairStyle === 'hijab') {
    const hijabWrap = new THREE.Mesh(CHAR_GEOS.hijabWrap, hijabMat);
    hijabWrap.position.set(0, 0.205, -0.012);
    hijabWrap.scale.set(1.0, 1.06, 1.05);
    hijabWrap.rotation.x = -0.15;
    const hijabDrape = new THREE.Mesh(CHAR_GEOS.hijabDrape, hijabMat);
    hijabDrape.position.set(0, 0.05, -0.01);
    hijabDrape.scale.set(0.95, 1.0, 0.85);
    head.add(hijabWrap, hijabDrape);
  } else {
    const hairCap = new THREE.Mesh(CHAR_GEOS.hairCap, hairMat);
    hairCap.position.set(0, hairStyle === 'elder' ? 0.228 : 0.215, -0.012);
    hairCap.scale.set(0.97, 1.06, 1.04);
    hairCap.rotation.x = hairStyle === 'elder' ? -0.35 : -0.18;
    head.add(hairCap);

    const hairBack = new THREE.Mesh(CHAR_GEOS.hairBack, hairMat);
    hairBack.position.set(0, 0.18, -0.036);
    hairBack.scale.set(0.95, 0.92, 0.88);
    head.add(hairBack);

    if (hairStyle === 'short_part' || hairStyle === 'fade') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2 - 0.16;
      fringe.position.set(0.01, 0.325, 0.075);
      fringe.scale.set(hairStyle === 'fade' ? 0.55 : 0.72, 1, 0.75);
      head.add(fringe);

      if (hairStyle === 'short_part') {
        [-0.122, 0.122].forEach((sx) => {
          const sb = new THREE.Mesh(CHAR_GEOS.hairSideburn, hairMat);
          sb.position.set(sx, 0.215, 0.018);
          head.add(sb);
        });
      }
    } else if (hairStyle === 'spiky') {
      const spikePositions: Array<[number, number, number, number]> = [
        [-0.04, 0.365, 0.04, 0.25],
        [0.03, 0.375, 0.02, -0.18],
        [0.0, 0.37, -0.03, -0.35],
        [-0.06, 0.345, -0.01, 0.4],
        [0.06, 0.345, 0.03, -0.35],
      ];
      spikePositions.forEach(([sx, sy, sz, rz]) => {
        const sp = new THREE.Mesh(CHAR_GEOS.hairSpike, hairMat);
        sp.position.set(sx, sy, sz);
        sp.rotation.z = rz;
        sp.rotation.x = 0.25;
        head.add(sp);
      });
    } else if (hairStyle === 'curly') {
      const curlOffsets: Array<[number, number, number, number]> = [
        [0, 0.355, 0.045, 1.05],
        [-0.065, 0.342, 0.03, 0.95],
        [0.065, 0.342, 0.03, 0.95],
        [-0.105, 0.295, -0.01, 0.9],
        [0.105, 0.295, -0.01, 0.9],
        [-0.055, 0.345, -0.055, 1.0],
        [0.055, 0.345, -0.055, 1.0],
        [0, 0.32, -0.105, 1.05],
        [0, 0.335, 0.095, 0.85],
      ];
      curlOffsets.forEach(([cx, cy, cz, sc]) => {
        const clump = new THREE.Mesh(CHAR_GEOS.curlyClump, hairMat);
        clump.position.set(cx, cy, cz);
        clump.scale.setScalar(sc);
        head.add(clump);
      });
    } else if (hairStyle === 'bob') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2 - 0.1;
      fringe.position.set(0, 0.325, 0.075);
      fringe.scale.set(0.7, 1.05, 0.72);
      const bobBack = new THREE.Mesh(CHAR_GEOS.bobBack, hairMat);
      bobBack.position.set(0, 0.145, -0.032);
      bobBack.scale.set(1.0, 1.0, 0.92);
      const bobL = new THREE.Mesh(CHAR_GEOS.bobSide, hairMat);
      bobL.position.set(-0.125, 0.155, 0.01);
      bobL.rotation.z = -0.1;
      const bobR = new THREE.Mesh(CHAR_GEOS.bobSide, hairMat);
      bobR.position.set(0.125, 0.155, 0.01);
      bobR.rotation.z = 0.1;
      head.add(fringe, bobBack, bobL, bobR);
    } else if (hairStyle === 'undercut') {
      hairCap.scale.set(0.92, 1.04, 1.02);
      const topWave = new THREE.Mesh(CHAR_GEOS.undercutTop, hairMat);
      topWave.position.set(0, 0.318, 0.018);
      topWave.rotation.x = -0.14;
      head.add(topWave);
    } else if (hairStyle === 'ponytail') {
      const fringe = new THREE.Mesh(CHAR_GEOS.hairFringe, hairMat);
      fringe.rotation.z = Math.PI / 2;
      fringe.position.set(0, 0.322, 0.078);
      fringe.scale.set(0.65, 1.08, 0.7);
      const band = new THREE.Mesh(CHAR_GEOS.hairBand, collarMat);
      band.position.set(0, 0.25, -0.15);
      band.rotation.x = 0.35;
      const tail = new THREE.Mesh(CHAR_GEOS.ponytail, hairMat);
      tail.position.set(0, 0.16, -0.19);
      tail.rotation.x = 0.28;
      head.add(fringe, band, tail);
    } else if (hairStyle === 'bun_konde') {
      const konde = new THREE.Mesh(CHAR_GEOS.kondeBun, hairMat);
      konde.position.set(0, 0.17, -0.165);
      konde.scale.set(1.05, 0.92, 0.88);
      const pin = new THREE.Mesh(CHAR_GEOS.hairBand, SHARED_CHAR_MATS.buckle);
      pin.position.set(0, 0.17, -0.148);
      head.add(konde, pin);
    }
  }

  // Headgear
  if (options.hatType === 'caping') {
    const caping = new THREE.Mesh(CHAR_GEOS.caping, SHARED_CHAR_MATS.caping);
    caping.position.y = 0.41;
    head.add(caping);
  } else if (options.hatType === 'peci') {
    const peci = new THREE.Mesh(CHAR_GEOS.peci, SHARED_CHAR_MATS.peci);
    peci.position.set(0, 0.36, -0.005);
    peci.scale.set(0.96, 1, 1.12);
    head.add(peci);
  } else if (options.hatType === 'polisi') {
    const cap = new THREE.Mesh(CHAR_GEOS.policeCap, SHARED_CHAR_MATS.policeCap);
    cap.position.set(0, 0.365, -0.005);
    const brim = new THREE.Mesh(CHAR_GEOS.policeBrim, SHARED_CHAR_MATS.policeBrim);
    brim.position.set(0, 0.315, 0.055);
    brim.rotation.x = 0.15;
    head.add(cap, brim);
  } else if (options.hatType === 'topi') {
    const topi = new THREE.Mesh(
      CHAR_GEOS.topiCrown,
      new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 })
    );
    topi.position.set(0, 0.255, -0.005);
    const brim = new THREE.Mesh(CHAR_GEOS.policeBrim, SHARED_CHAR_MATS.policeBrim);
    brim.position.set(0, 0.275, 0.058);
    brim.rotation.x = 0.12;
    head.add(topi, brim);
  } else if (options.hatType === 'helm') {
    const helmMat = new THREE.MeshStandardMaterial({
      color: options.helmetColor ?? 0x111827,
      roughness: 0.22,
      metalness: 0.35,
    });
    const shell = new THREE.Mesh(CHAR_GEOS.helmetShell, helmMat);
    shell.position.set(0, 0.22, -0.01);
    shell.scale.set(1.02, 1.06, 1.06);
    const visor = new THREE.Mesh(CHAR_GEOS.helmetVisor, SHARED_CHAR_MATS.visor);
    visor.position.set(0, 0.23, 0.012);
    head.add(shell, visor);
  }

  spineGroup.add(head);

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
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.color.setHex(cfg.shirt);
    mat.metalness = cfg.metalness;
    mat.map = map;
    mat.needsUpdate = true;
  }

  const collarMat = rig.collarMesh.material as THREE.MeshStandardMaterial;
  collarMat.color.setHex(cfg.collar);
  collarMat.needsUpdate = true;

  for (const p of rig.pantsMeshes) {
    const pMat = p.material as THREE.MeshStandardMaterial;
    pMat.color.setHex(cfg.pants);
    pMat.needsUpdate = true;
  }

  buildOutfitDecor(rig.outfitDecorGroup, cfg.style, cfg.shirt, cfg.collar, textures);
}

export function characterProfileToBuildOptions(
  profile: CharacterProfile,
  textures?: ProceduralTexturePack
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
