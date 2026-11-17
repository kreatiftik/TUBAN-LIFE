import { LandmarkPoint, LocalizedText, RegionId, VehicleType } from './types';

export interface RoadSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  paved: boolean;
}

export interface BuildingCollider {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  height: number;
}

export type CharacterHairStyle =
  | 'short_part'
  | 'spiky'
  | 'fade'
  | 'curly'
  | 'bob'
  | 'undercut'
  | 'ponytail'
  | 'bun_konde'
  | 'hijab'
  | 'elder';

export type CharacterShirtStyle =
  | 'tshirt'
  | 'kemeja'
  | 'batik'
  | 'jaket'
  | 'lurik'
  | 'kebaya'
  | 'seragam';

export type CharacterPantsStyle = 'jeans' | 'celana_kain' | 'sarung' | 'shorts' | 'cargo' | 'kulot';
export type CharacterShoeStyle = 'sneakers' | 'pantofel' | 'sandal';
export type CharacterArchetype =
  | 'male'
  | 'female'
  | 'elder_male'
  | 'elder_female'
  | 'student'
  | 'uniform'
  | 'worker'
  | 'rider';

export interface NpcSpawn {
  id: string;
  name: string;
  role: LocalizedText;
  region: RegionId;
  x: number;
  z: number;
  yaw: number;
  shirtColor: number;
  pantsColor: number;
  skinColor?: number;
  hairColor?: number;
  hairStyle?: CharacterHairStyle;
  shirtStyle?: CharacterShirtStyle;
  pantsStyle?: CharacterPantsStyle;
  shoeStyle?: CharacterShoeStyle;
  hatType?: 'caping' | 'peci' | 'polisi' | 'helm' | 'topi' | 'none';
  hasMustache?: boolean;
  hasGlasses?: boolean;
  hasBackpack?: boolean;
  hasNeckTowel?: boolean;
  archetype?: CharacterArchetype;
  shopId?: string;
  missionGiverId?: string;
  ambientQuotes: LocalizedText[];
  patrolRadius?: number;
}

export interface VehicleSpawn {
  id: string;
  type: VehicleType;
  x: number;
  z: number;
  yaw: number;
  color: number;
}

export const WORLD_PLAY_LIMIT = 390;

export const ROAD_SEGMENTS: RoadSegment[] = [
  // Main East-West Highway: Hutan Jati Kerek/Grabagan <-> Desa Kerek <-> Kota Tuban (crossed by Kali Kening bridge at x=-78)
  { x1: -235, z1: 0, x2: -88, z2: 0, width: 9.5, paved: true },
  { x1: -68, z1: 0, x2: 315, z2: 0, width: 10, paved: true },

  // Desa Kerek North-South Village Road
  { x1: -12, z1: -55, x2: -12, z2: 65, width: 7, paved: false },
  // Desa West Road to Balai Desa Kerek & Peternakan Rengel
  { x1: -55, z1: -45, x2: -55, z2: 55, width: 6.5, paved: false },
  { x1: -65, z1: -42, x2: -12, z2: -42, width: 6, paved: false },

  // Desa Kulon & Hutan Jati Grabagan Loop
  { x1: -145, z1: -75, x2: -145, z2: 52, width: 6.5, paved: false },
  { x1: -235, z1: -75, x2: -235, z2: 52, width: 6.5, paved: false },
  { x1: -235, z1: -75, x2: -105, z2: -75, width: 6.2, paved: false },
  { x1: -105, z1: -75, x2: -55, z2: -42, width: 6, paved: false },
  { x1: -235, z1: 52, x2: -84, z2: 52, width: 6.2, paved: false },

  // Desa to Sawah Wooden Bridge & Wisata Bektiharjo/Goa Akbar Southwest
  { x1: -55, z1: 52, x2: -68, z2: 52, width: 6.5, paved: false },
  { x1: -104, z1: 52, x2: -140, z2: 145, width: 6, paved: false },
  { x1: -140, z1: 145, x2: -95, z2: 185, width: 6, paved: false },
  // Wisata Bukit Kapur Semanding Expansion Southwest
  { x1: -140, z1: 145, x2: -205, z2: 195, width: 6, paved: false },
  { x1: -205, z1: 195, x2: -245, z2: 225, width: 6, paved: false },
  { x1: -95, z1: 185, x2: -205, z2: 195, width: 5.8, paved: false },

  // Kota Tuban North-South Avenues (Sleko, Alun-Alun/Pasar Baru, Masjid Agung/Bonang, Terminal Kambang Putih)
  { x1: 88, z1: -72, x2: 88, z2: 162, width: 10, paved: true },
  { x1: 145, z1: -225, x2: 145, z2: 75, width: 10, paved: true },
  { x1: 185, z1: -65, x2: 185, z2: 65, width: 9, paved: true },
  { x1: 245, z1: -75, x2: 245, z2: 162, width: 9.5, paved: true },
  { x1: 315, z1: -65, x2: 315, z2: 65, width: 9, paved: true },

  // Kota Tuban East-West Streets
  { x1: 75, z1: -58, x2: 315, z2: -58, width: 9, paved: true },
  { x1: 75, z1: 42, x2: 315, z2: 42, width: 9, paved: true },

  // Jalan Raya Pantura Pantai Boom Tuban (extended East to Mercusuar Tanjung Awar-Awar)
  { x1: 45, z1: 158, x2: 290, z2: 158, width: 8, paved: true },

  // Mountain Road: Kota/Desa North -> Air Terjun Nglirip -> Bukit Kapur Grabagan -> Back to Kota x=145
  { x1: 20, z1: -4, x2: 20, z2: -75, width: 8, paved: true },
  { x1: 20, z1: -75, x2: -25, z2: -125, width: 7.5, paved: true },
  { x1: -25, z1: -125, x2: -70, z2: -176, width: 7, paved: true },
  { x1: -70, z1: -176, x2: -20, z2: -245, width: 7, paved: true },
  { x1: -20, z1: -245, x2: 65, z2: -275, width: 7, paved: true },
  { x1: 65, z1: -275, x2: 145, z2: -225, width: 7.5, paved: true },
];

export const PAVED_CROSSROADS: Array<[number, number, number, number]> = [
  [88, 0, 10.6, 10.6],
  [145, 0, 10.6, 10.6],
  [185, 0, 9.6, 10.6],
  [245, 0, 10.4, 10.6],
  [315, 0, 9.6, 10.6],
  [88, -58, 10.6, 9.6],
  [145, -58, 10.6, 9.6],
  [185, -58, 9.6, 9.6],
  [245, -58, 10.4, 9.6],
  [315, -58, 9.6, 9.6],
  [88, 42, 10.6, 9.6],
  [145, 42, 10.6, 9.6],
  [185, 42, 9.6, 9.6],
  [245, 42, 10.4, 9.6],
  [315, 42, 9.6, 9.6],
  [88, 158, 10.4, 8.6],
  [245, 158, 10.4, 8.6],
  [20, 0, 8.6, 10.4],
];

export const MOUNTAIN_BEND_PADS: Array<{ x: number; z: number; r: number }> = [
  { x: 20, z: -75, r: 4.3 },
  { x: -25, z: -125, r: 4.1 },
  { x: -70, z: -176, r: 4.2 },
  { x: -20, z: -245, r: 4.0 },
  { x: 65, z: -275, r: 4.3 },
  { x: 145, z: -225, r: 5.0 },
];

export const DIRT_JUNCTION_PADS: Array<[number, number, number, number]> = [
  [-12, -42, 7.2, 6.4],
  [-55, -42, 6.8, 6.4],
  [-145, 52, 6.8, 6.8],
  [-145, -75, 6.8, 6.8],
  [-235, 52, 6.8, 6.8],
  [-235, -75, 6.8, 6.8],
  [-140, 145, 6.4, 6.4],
  [-95, 185, 6.2, 6.2],
  [-205, 195, 6.4, 6.4],
];

export const SAWAH_PADS: Array<{ x: number; z: number; w: number; d: number }> = [
  { x: -46, z: 24, w: 22, d: 28 },
  { x: -46, z: 58, w: 22, d: 28 },
  { x: -102, z: 24, w: 26, d: 34 },
  { x: -102, z: 66, w: 26, d: 34 },
  { x: -190, z: 26, w: 30, d: 32 },
  { x: -190, z: -38, w: 30, d: 34 },
];

export function getRoadSegmentElevation(seg: RoadSegment, segIdx: number): number {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const isSloped = seg.z1 < -70 || seg.z2 < -70 || seg.z1 > 140 || seg.z2 > 140 || seg.x1 < -115 || seg.x2 < -115;
  const isEW = Math.abs(dx) >= Math.abs(dz);
  if (!seg.paved) {
    // Dirt roads: 0.090 .. 0.128 (always below paved roads & dirt junction pads at 0.138)
    const axisStagger = isEW ? 0.02 : 0;
    const segStagger = (segIdx % 4) * 0.006;
    return 0.09 + axisStagger + segStagger;
  }
  const baseElev = isSloped ? 0.225 : 0.155;
  const axisStagger = isEW ? 0.05 : 0;
  const segStagger = isEW ? (segIdx % 4) * 0.008 : (segIdx % 5) * 0.01;
  return baseElev + axisStagger + segStagger;
}

function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const wx = px - x1;
  const wz = pz - z1;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 0.0001) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
  const cx = x1 + t * vx;
  const cz = z1 + t * vz;
  return Math.hypot(px - cx, pz - cz);
}

export function isOnRoad(x: number, z: number): { onRoad: boolean; paved: boolean; dist: number } {
  let minD = 9999;
  let paved = false;
  let hit = false;
  for (const r of ROAD_SEGMENTS) {
    const d = distToSegment(x, z, r.x1, r.z1, r.x2, r.z2);
    if (d < r.width * 0.55) {
      hit = true;
      if (r.paved) paved = true;
    }
    if (d < minD) minD = d;
  }
  return { onRoad: hit, paved, dist: minD };
}

/**
 * Continuous deterministic terrain height across the expanded 780x780m Kabupaten Tuban map.
 */
export function groundHeightAt(x: number, z: number): number {
  let h = 0;

  // Pegunungan Kapur Utara, Air Terjun Nglirip & Bukit Grabagan (North, z < -85)
  if (z < -85) {
    const t = Math.min(1, (-85 - z) / 235);
    const ridge = t * t * 28 + Math.sin(x * 0.028) * 3.4 * t + Math.cos(z * 0.032) * 2.2 * t;
    const roadInfo = isOnRoad(x, z);
    const roadSmooth = roadInfo.dist < 11 ? 0.52 + 0.48 * (roadInfo.dist / 11) : 1;
    h += ridge * (0.72 + 0.28 * roadSmooth);
  }

  // Far outer karst hills perimeter beyond playable 390m zone
  const radial = Math.hypot(x, z);
  if (radial > 395 && z < 210) {
    const edgeT = Math.min(1, (radial - 395) / 170);
    h += edgeT * edgeT * 34 + Math.sin(x * 0.04) * Math.cos(z * 0.04) * 4.5 * edgeT;
  }

  // Gentle rolling Desa Kerek & Grabagan hills on far west (x < -140, z < 115)
  if (x < -140 && z < 115) {
    const wt = Math.min(1, (-140 - x) / 170);
    const roadInfo = isOnRoad(x, z);
    const roadSmooth = roadInfo.dist < 10 ? 0.55 + 0.45 * (roadInfo.dist / 10) : 1;
    h += (Math.sin(z * 0.035) * 1.4 * wt + wt * 2.2) * roadSmooth;
  }

  // Bukit Kapur Semanding (Far South-West, near -245, 225)
  const hillDist = Math.hypot(x - -250, z - 230);
  if (hillDist < 42) {
    const ht = 1 - hillDist / 42;
    h += ht * ht * 4.8;
  }

  // Sendang Bektiharjo natural spring pool depression at (-95, 202)
  const lakeDist = Math.hypot(x - -95, z - 202);
  if (lakeDist < 34) {
    const lt = 1 - lakeDist / 34;
    h -= lt * lt * 3.8;
  }

  // Kali Kening river bed running near x = -78 + sin, z = -65..130
  if (z > -65 && z < 130) {
    const riverCenter = -78 + Math.sin(z * 0.05) * 8;
    const rd = Math.abs(x - riverCenter);
    if (rd < 7.5) {
      const rt = 1 - rd / 7.5;
      h -= rt * rt * 1.5;
    }
  }

  // Rocky headland near Mercusuar Tanjung Awar-Awar (285, 192)
  const capeDist = Math.hypot(x - 285, z - 192);
  if (capeDist < 26) {
    const ct = 1 - capeDist / 26;
    h += ct * ct * 2.4;
  }

  // Pesisir Pantura Pantai Boom Tuban (South-East, z > 175, x > 5) slopes into Java Sea (except cape)
  if (z > 175 && x > 5) {
    const st = Math.min(1, (z - 175) / 60);
    const capeFactor = capeDist < 28 ? 0.15 + 0.85 * (capeDist / 28) : 1;
    h -= st * 2.9 * capeFactor;
  }

  // Distant Java Sea south/coastal horizon (z > 240)
  if (z > 240) {
    const ot = Math.min(1, (z - 240) / 50);
    h -= ot * 3.2;
  }

  return h;
}

/**
 * Exact walkable / drivable surface height including asphalt roads, dirt roads,
 * Alun-alun Tuban, Masjid Agung courtyard, rice field terraces, bridges + ramps, and pier.
 */
export function surfaceHeightAt(x: number, z: number): number {
  const baseY = groundHeightAt(x, z);
  let h = baseY;

  // Main Highway Concrete Bridge over Kali Kening at (-78, 0), deck x in [-88, -68], z in [-5.4, 5.4]
  if (z >= -5.6 && z <= 5.6 && x >= -90.5 && x <= -65.5) {
    const deckTop = 0.55;
    if (x >= -87.5 && x <= -68.5) {
      h = Math.max(h, deckTop);
    } else if (x < -87.5) {
      const t = Math.max(0, Math.min(1, (x - -90.5) / 3.0));
      h = Math.max(h, baseY + t * (deckTop - baseY));
    } else {
      const t = Math.max(0, Math.min(1, (-65.5 - x) / 3.0));
      h = Math.max(h, baseY + t * (deckTop - baseY));
    }
  }

  // Wooden Bridge over Kali Kening at (-76, 52), deck spans x in [-84.5, -67.5], z in [48.9, 55.1]
  if (z >= 48.7 && z <= 55.3 && x >= -86.5 && x <= -65.5) {
    const deckTop = 0.725;
    if (x >= -84.5 && x <= -67.5) {
      h = Math.max(h, deckTop);
    } else if (x < -84.5) {
      const t = Math.max(0, Math.min(1, (x - -86.5) / 2.0));
      h = Math.max(h, baseY + t * (deckTop - baseY));
    } else {
      const t = Math.max(0, Math.min(1, (-65.5 - x) / 2.0));
      h = Math.max(h, baseY + t * (deckTop - baseY));
    }
  }

  // Wooden Pier (Dermaga Pantai Boom) at (108, 195), width 4.5, depth 30, top at 0.65
  if (x >= 105.6 && x <= 110.4 && z >= 180 && z <= 210) {
    h = Math.max(h, 0.65);
  }

  // Alun-Alun Tuban Cobblestone Square at (116, -22), 34x28, top at 0.09
  if (x >= 99 && x <= 133 && z >= -36 && z <= -8) {
    h = Math.max(h, 0.09);
  }

  // Stadion Tuban Sport Center grass turf pad at (278, 22), 38x26
  if (x >= 259 && x <= 297 && z >= 9 && z <= 35) {
    h = Math.max(h, 0.08);
  }

  // Sawah terrace pads
  for (const p of SAWAH_PADS) {
    if (Math.abs(x - p.x) <= p.w * 0.5 && Math.abs(z - p.z) <= p.d * 0.5) {
      h = Math.max(h, baseY + 0.12);
    }
  }

  // Paved intersection pads
  for (const [ix, iz, iw, id] of PAVED_CROSSROADS) {
    if (Math.abs(x - ix) <= iw * 0.5 && Math.abs(z - iz) <= id * 0.5) {
      const padElev = iz < -70 || iz > 140 ? 0.315 : 0.248;
      h = Math.max(h, baseY + padElev);
    }
  }

  // Mountain bend pads
  for (const b of MOUNTAIN_BEND_PADS) {
    if (Math.hypot(x - b.x, z - b.z) <= b.r) {
      h = Math.max(h, baseY + 0.33);
    }
  }

  // Dirt junction pads
  for (const [ix, iz, iw, id] of DIRT_JUNCTION_PADS) {
    if (Math.abs(x - ix) <= iw * 0.5 && Math.abs(z - iz) <= id * 0.5) {
      h = Math.max(h, baseY + 0.138);
    }
  }

  // Road segments
  for (let i = 0; i < ROAD_SEGMENTS.length; i++) {
    const seg = ROAD_SEGMENTS[i];
    const d = distToSegment(x, z, seg.x1, seg.z1, seg.x2, seg.z2);
    if (d <= seg.width * 0.5 + 0.05) {
      h = Math.max(h, baseY + getRoadSegmentElevation(seg, i));
    }
  }

  return h;
}

export function getRegionAt(x: number, z: number): RegionId {
  if (z < -92) return 'pegunungan';
  if (z > 132 && x >= 15) return 'pesisir';
  if (x < -68 && z > 105) return 'wisata';
  if (x >= 55) return 'kota';
  return 'desa';
}

export const LANDMARKS: LandmarkPoint[] = [
  { id: 'lm_desa', name: 'Desa Kerek (Sentra Batik Gedog)', region: 'desa', x: -12, z: 10, type: 'desa' },
  { id: 'lm_warung', name: 'Warung Legen & Kopi Mbah Darto', region: 'desa', x: 16, z: 14, type: 'toko', shopId: 'warung_desa' },
  { id: 'lm_balai', name: 'Balai Desa Kerek & Wit Asem', region: 'desa', x: -52, z: -38, type: 'desa' },
  { id: 'lm_peternakan', name: 'Peternakan Pak Karjo (Rengel)', region: 'desa', x: -72, z: 24, type: 'desa' },
  { id: 'lm_hutanjati', name: 'Hutan Jati & Desa Grabagan', region: 'desa', x: -215, z: -42, type: 'desa' },
  { id: 'lm_spbu', name: 'SPBU Sleko Tuban', region: 'kota', x: 78, z: -28, type: 'spbu' },
  { id: 'lm_alun', name: 'Alun-Alun Tuban', region: 'kota', x: 120, z: -10, type: 'desa' },
  { id: 'lm_pendopo', name: 'Pendopo Krido Manunggal Tuban', region: 'kota', x: 130, z: -60, type: 'desa' },
  { id: 'lm_pasar', name: 'Pasar Baru Tuban', region: 'kota', x: 145, z: 28, type: 'pasar', shopId: 'pasar_kota' },
  { id: 'lm_toko_klambi', name: 'Galeri Batik Gedog Kerek', region: 'kota', x: 102, z: 26, type: 'toko', shopId: 'toko_klambi' },
  { id: 'lm_bengkel', name: 'Bengkel Motor Mas Joko Tuban', region: 'kota', x: 158, z: -14, type: 'bengkel', shopId: 'bengkel_kota' },
  { id: 'lm_polisi', name: 'Polres Tuban', region: 'kota', x: 92, z: -55, type: 'polisi' },
  { id: 'lm_rs', name: 'RSUD Dr. R. Koesma Tuban', region: 'kota', x: 165, z: -55, type: 'rs' },
  { id: 'lm_sunan_bonang', name: 'Makam & Gapura Sunan Bonang', region: 'kota', x: 202, z: -22, type: 'wisata' },
  { id: 'lm_masjid', name: 'Masjid Agung Tuban', region: 'kota', x: 224, z: -28, type: 'desa' },
  { id: 'lm_stasiun', name: 'Terminal Kambang Putih Tuban', region: 'kota', x: 295, z: -46, type: 'desa' },
  { id: 'lm_airterjun', name: 'Air Terjun Nglirip (Singgahan)', region: 'pegunungan', x: -70, z: -176, type: 'gunung' },
  { id: 'lm_kebun_teh', name: 'Bukit Kapur & Kebun Siwalan Grabagan', region: 'pegunungan', x: 65, z: -275, type: 'gunung' },
  { id: 'lm_tpi', name: 'TPI Palang & Kampung Nelayan', region: 'pesisir', x: 78, z: 162, type: 'pantai' },
  { id: 'lm_seafood', name: 'Warung Kare Rajungan Bu Wati', region: 'pesisir', x: 55, z: 152, type: 'toko', shopId: 'warung_seafood' },
  { id: 'lm_klenteng', name: 'Klenteng Kwan Sing Bio Tuban', region: 'pesisir', x: 180, z: 148, type: 'wisata' },
  { id: 'lm_mercusuar', name: 'Mercusuar Tanjung Awar-Awar', region: 'pesisir', x: 285, z: 184, type: 'pantai' },
  { id: 'lm_candi', name: 'Gapura Paduraksa Ronggolawe', region: 'wisata', x: -140, z: 145, type: 'wisata' },
  { id: 'lm_danau', name: 'Sendang Bektiharjo & Goa Akbar', region: 'wisata', x: -95, z: 185, type: 'wisata' },
  { id: 'lm_bukit_wisata', name: 'Bukit Kapur Semanding', region: 'wisata', x: -245, z: 222, type: 'wisata' },
];

export const NPC_SPAWNS: NpcSpawn[] = [
  {
    id: 'bu_siti',
    name: 'Bu Siti',
    role: { ngoko: 'Pengrajin Batik Gedog', krama: 'Pengrajin Bathik Gedhog', indonesia: 'Pengrajin Batik Gedog' },
    region: 'desa',
    x: -22,
    z: 14,
    yaw: 1.2,
    shirtColor: 0xb45309,
    pantsColor: 0x3b2f2f,
    skinColor: 0xc98f64,
    hairColor: 0x1c1917,
    hairStyle: 'bun_konde',
    shirtStyle: 'kebaya',
    pantsStyle: 'sarung',
    shoeStyle: 'sandal',
    archetype: 'female',
    missionGiverId: 'misi_1_tangga',
    ambientQuotes: [
      {
        ngoko: 'Heh, Mas Bagas! Arep menyang endi? Ati-ati nek nyebrang dalan Kerek ya!',
        krama: 'Nuwun sewu, Mas Bagas. Badhe tindak pundi? Ngatos-atos menawi nyabrang margi nggih!',
        indonesia: 'Hei, Mas Bagas! Mau pergi ke mana? Hati-hati kalau menyeberang jalan Desa Kerek ya!',
      },
      {
        ngoko: 'Esuk-esuk ngene hawane seger tenan ing Desa Kerek, cocok kanggo nenun Batik Gedog.',
        krama: 'Enjang-enjang mekaten hawanipun seger sanget ing Dhusun Kerek, cocok kagem nenun Bathik Gedhog.',
        indonesia: 'Pagi-pagi begini udaranya segar sekali di Desa Kerek, pas untuk menenun Batik Gedog.',
      },
    ],
  },
  {
    id: 'pak_lurah',
    name: 'Pak Lurah Hadi',
    role: { ngoko: 'Kepala Desa Kerek', krama: 'Pangarsa Dhusun Kerek', indonesia: 'Kepala Desa Kerek' },
    region: 'desa',
    x: -52,
    z: -38,
    yaw: 0.4,
    shirtColor: 0x92400e,
    pantsColor: 0x1e293b,
    skinColor: 0xc48a5f,
    hairColor: 0x9ca3af,
    hairStyle: 'elder',
    shirtStyle: 'batik',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hatType: 'peci',
    hasMustache: true,
    hasGlasses: true,
    archetype: 'elder_male',
    missionGiverId: 'misi_6_wisata',
    ambientQuotes: [
      {
        ngoko: 'Desa Kerek kudu rukun lan gotong royong, Bagas. Nek butuh pitulung, langsung omong wae.',
        krama: 'Dhusun Kerek kedah rukun lan gotong royong, Bagas. Menawi betah pitulungan, matur kemawon.',
        indonesia: 'Desa Kerek harus rukun dan gotong royong, Bagas. Kalau perlu bantuan, bilang saja.',
      },
    ],
  },
  {
    id: 'mbah_darto',
    name: 'Mbah Darto',
    role: { ngoko: 'Bakul Legen & Kopi Cethe', krama: 'Bakul Legen & Kopi Cethe', indonesia: 'Pemilik Warung Legen & Kopi' },
    region: 'desa',
    x: 16,
    z: 14,
    yaw: -1.4,
    shirtColor: 0x57534e,
    pantsColor: 0x292524,
    skinColor: 0xb87b4e,
    hairColor: 0xd1d5db,
    hairStyle: 'elder',
    shirtStyle: 'lurik',
    pantsStyle: 'sarung',
    shoeStyle: 'sandal',
    hatType: 'peci',
    hasMustache: true,
    archetype: 'elder_male',
    shopId: 'warung_desa',
    missionGiverId: 'misi_4_pasar',
    ambientQuotes: [
      {
        ngoko: 'Monggo ngombe es legen siwalan utawa kopi cethe dhisik Le! Segere asli Bumi Wali Tuban.',
        krama: 'Sumangga ngunjuk es legen siwalan utawi kopi cethe rumiyin Nak! Seger asli Bumi Wali Tuban.',
        indonesia: 'Silakan minum es legen siwalan atau kopi cethe dulu Nak! Segarnya asli Tuban.',
      },
    ],
  },
  {
    id: 'pak_karjo',
    name: 'Pak Karjo',
    role: { ngoko: 'Peternak Sapi & Kambing Rengel', krama: 'Peternak Lembu & Menda Rengel', indonesia: 'Peternak Sapi & Kambing' },
    region: 'desa',
    x: -70,
    z: 24,
    yaw: 0.8,
    shirtColor: 0x3f6212,
    pantsColor: 0x365314,
    skinColor: 0xb27345,
    hairColor: 0x292524,
    hairStyle: 'short_part',
    shirtStyle: 'tshirt',
    pantsStyle: 'shorts',
    shoeStyle: 'sandal',
    hatType: 'caping',
    hasMustache: true,
    hasNeckTowel: true,
    archetype: 'worker',
    missionGiverId: 'misi_2_kambing',
    ambientQuotes: [
      {
        ngoko: 'Sapi karo wedhus ing pinggir Kali Kening kudu diwenehi suket seger saben dina.',
        krama: 'Lembu kaliyan menda ing pinggir Lepen Kening kedah dipun paringi suket seger saben dinten.',
        indonesia: 'Sapi dan kambing di dekat Kali Kening harus diberi rumput segar setiap hari.',
      },
    ],
  },
  {
    id: 'dik_rino',
    name: 'Dik Rino',
    role: { ngoko: 'Pelajar Tuban', krama: 'Siswa Sekolah Tuban', indonesia: 'Pelajar Kota Tuban' },
    region: 'desa',
    x: 6,
    z: -28,
    yaw: -0.3,
    shirtColor: 0xf8fafc,
    pantsColor: 0xb91c1c,
    skinColor: 0xdfb088,
    hairColor: 0x171412,
    hairStyle: 'spiky',
    shirtStyle: 'seragam',
    pantsStyle: 'shorts',
    shoeStyle: 'sneakers',
    hasBackpack: true,
    archetype: 'student',
    missionGiverId: 'misi_3_sekolah',
    ambientQuotes: [
      {
        ngoko: 'Mas Bagas, motormu apik tenan! Kapan-kapan ajari aku nyetir muteri Alun-Alun Tuban ya!',
        krama: 'Mas Bagas, motoripun sae sanget! Benjang-benjang wucalana kula nitih ing Alun-Alun Tuban nggih!',
        indonesia: 'Mas Bagas, motormu keren sekali! Kapan-kapan ajari aku mengendarai keliling Tuban ya!',
      },
    ],
  },
  {
    id: 'yu_sri',
    name: 'Yu Sri',
    role: { ngoko: 'Pedagang Pasar Baru Tuban', krama: 'Bakul Peken Enggal Tuban', indonesia: 'Pedagang Pasar Baru Tuban' },
    region: 'kota',
    x: 145,
    z: 28,
    yaw: -1.5,
    shirtColor: 0xbe185d,
    pantsColor: 0x4c1d95,
    skinColor: 0xcf9468,
    hairColor: 0x1e1b18,
    hairStyle: 'bun_konde',
    shirtStyle: 'kebaya',
    pantsStyle: 'sarung',
    shoeStyle: 'sandal',
    archetype: 'female',
    shopId: 'pasar_kota',
    ambientQuotes: [
      {
        ngoko: 'Pasar Baru Tuban rame saben esuk. Sayur, gula siwalan, iwak, beras lengkap kabeh!',
        krama: 'Peken Enggal Tuban rame saben enjang. Janganan, gendhis siwalan, uwos jangkep sedaya!',
        indonesia: 'Pasar Baru Tuban ramai setiap pagi. Sayur, gula siwalan, ikan, beras lengkap semua!',
      },
    ],
  },
  {
    id: 'mbak_ratna',
    name: 'Mbak Ratna',
    role: { ngoko: 'Bakul Batik Gedog Tuban', krama: 'Bakul Bathik Gedhog Tuban', indonesia: 'Penjaga Galeri Batik Gedog' },
    region: 'kota',
    x: 102,
    z: 26,
    yaw: 0.2,
    shirtColor: 0x92400e,
    pantsColor: 0x1c1917,
    skinColor: 0xdcb08a,
    hairColor: 0x2c1b12,
    hairStyle: 'ponytail',
    shirtStyle: 'batik',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hasGlasses: true,
    archetype: 'female',
    shopId: 'toko_klambi',
    ambientQuotes: [
      {
        ngoko: 'Batik Gedog iki asli tenunan pengrajin Kerek Tuban, Mas. Cocok kanggo sowan Pendopo!',
        krama: 'Bathik Gedhog punika asli tenunanipun pengrajin Kerek Tuban, Mas. Trep sanget!',
        indonesia: 'Batik Gedog ini asli tenunan pengrajin Kerek Tuban, Mas. Cocok untukmu!',
      },
    ],
  },
  {
    id: 'mas_joko',
    name: 'Mas Joko',
    role: { ngoko: 'Montir Bengkel Ronggolawe', krama: 'Mekanik Bengkel Ronggolawe', indonesia: 'Mekanik Bengkel Tuban' },
    region: 'kota',
    x: 158,
    z: -14,
    yaw: -2.2,
    shirtColor: 0x1d4ed8,
    pantsColor: 0x1e293b,
    skinColor: 0xc28658,
    hairColor: 0x171412,
    hairStyle: 'fade',
    shirtStyle: 'jaket',
    pantsStyle: 'jeans',
    shoeStyle: 'sneakers',
    archetype: 'worker',
    shopId: 'bengkel_kota',
    ambientQuotes: [
      {
        ngoko: 'Motor touring Pantura opo mobil keluarga kabeh iso diservis neng Bengkel Ronggolawe kene, Mas!',
        krama: 'Motor touring Pantura menapa mobil keluarga sedaya saged dipun servis wonten mriki!',
        indonesia: 'Motor touring Pantura maupun mobil keluarga semua bisa diservis di sini, Mas!',
      },
    ],
  },
  {
    id: 'pak_polisi',
    name: 'Pak Polisi Bima',
    role: { ngoko: 'Polisi Polres Tuban', krama: 'Polisi Polres Tuban', indonesia: 'Polisi Lalu Lintas Tuban' },
    region: 'kota',
    x: 96,
    z: -48,
    yaw: 0.3,
    shirtColor: 0x715a3a,
    pantsColor: 0x423522,
    skinColor: 0xc78d5f,
    hairColor: 0x171412,
    hairStyle: 'fade',
    shirtStyle: 'seragam',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hatType: 'polisi',
    hasMustache: true,
    archetype: 'uniform',
    patrolRadius: 12,
    ambientQuotes: [
      {
        ngoko: 'Ati-ati nyetir ing dalan raya Kota Tuban lan jalur Pantura, Mas! Patuhi rambu lalu lintas.',
        krama: 'Ngatos-atos nitih ing margi ageng Kitha Tuban lan jalur Pantura, Mas! Tansah tertib.',
        indonesia: 'Hati-hati berkendara di jalan raya Kota Tuban dan jalur Pantura, Mas! Jaga ketertiban lalu lintas.',
      },
    ],
  },
  {
    id: 'pak_slamet',
    name: 'Pak Slamet',
    role: { ngoko: 'Nelayan Pantai Boom & Palang', krama: 'Nelayan Pantai Boom & Palang', indonesia: 'Nelayan Pesisir Tuban' },
    region: 'pesisir',
    x: 78,
    z: 162,
    yaw: 0.6,
    shirtColor: 0x0369a1,
    pantsColor: 0x334155,
    skinColor: 0xad6f43,
    hairColor: 0x3b2f2a,
    hairStyle: 'short_part',
    shirtStyle: 'tshirt',
    pantsStyle: 'shorts',
    shoeStyle: 'sandal',
    hatType: 'caping',
    hasMustache: true,
    hasNeckTowel: true,
    archetype: 'worker',
    missionGiverId: 'misi_5_nelayan',
    ambientQuotes: [
      {
        ngoko: 'Ombak Laut Jawa Pantai Boom dina iki tenang, tangkapan rajungan lan kakap akeh banget!',
        krama: 'Alun Seganten Pantai Boom dinten punika anteng, asil rajungan lan kakap kathah sanget!',
        indonesia: 'Ombak Laut Jawa di Pantai Boom hari ini tenang, tangkapan rajungan dan kakap melimpah!',
      },
    ],
  },
  {
    id: 'bu_wati',
    name: 'Bu Wati',
    role: { ngoko: 'Bakul Kare Rajungan Tuban', krama: 'Bakul Kare Rajungan Tuban', indonesia: 'Pemilik Warung Kare Rajungan' },
    region: 'pesisir',
    x: 55,
    z: 152,
    yaw: 0.2,
    shirtColor: 0x0f766e,
    pantsColor: 0x1e293b,
    skinColor: 0xd19a72,
    hairColor: 0x0f766e,
    hairStyle: 'hijab',
    shirtStyle: 'kemeja',
    pantsStyle: 'celana_kain',
    shoeStyle: 'sandal',
    archetype: 'female',
    shopId: 'warung_seafood',
    ambientQuotes: [
      {
        ngoko: 'Mampir dhahar kare rajungan pedes sik Mas, angin Pantai Boom marai weteng luwe!',
        krama: 'Pinarak dhahar kare rajungan pedes rumiyin Mas, angin seganten damel luwe!',
        indonesia: 'Mampir makan kare rajungan pedas dulu Mas, angin Pantai Boom bikin lapar!',
      },
    ],
  },
  {
    id: 'juru_kunci',
    name: 'Mbah Sastro',
    role: { ngoko: 'Juru Kunci Gapura & Bektiharjo', krama: 'Juru Kunci Gapura & Bektiharjo', indonesia: 'Juru Kunci Situs Sejarah Tuban' },
    region: 'wisata',
    x: -135,
    z: 140,
    yaw: 0.9,
    shirtColor: 0x4338ca,
    pantsColor: 0x1c1917,
    skinColor: 0xb87b4e,
    hairColor: 0xe5e7eb,
    hairStyle: 'elder',
    shirtStyle: 'lurik',
    pantsStyle: 'sarung',
    shoeStyle: 'sandal',
    hatType: 'peci',
    hasMustache: true,
    hasGlasses: true,
    archetype: 'elder_male',
    ambientQuotes: [
      {
        ngoko: 'Gapura Paduraksa bata abang iki warisan sejarah Kadipaten Tuban. Jaganen kelestariane ya, Le.',
        krama: 'Gapura Paduraksa banon abrit punika warisan sejarah Kadipaten Tuban. Jagenen kelestarianipun nggih.',
        indonesia: 'Gapura Paduraksa bata merah ini warisan sejarah Kadipaten Tuban. Jaga kelestariannya ya, Nak.',
      },
    ],
  },
  {
    id: 'ko_tjioe',
    name: 'Ko Tjioe',
    role: { ngoko: 'Penjaga Klenteng Kwan Sing Bio', krama: 'Juru Klenteng Kwan Sing Bio', indonesia: 'Pengurus Klenteng Kwan Sing Bio' },
    region: 'pesisir',
    x: 180,
    z: 149,
    yaw: 0.1,
    shirtColor: 0xb91c1c,
    pantsColor: 0x1e293b,
    skinColor: 0xdfb088,
    hairColor: 0x9ca3af,
    hairStyle: 'elder',
    shirtStyle: 'kemeja',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hasMustache: true,
    hasGlasses: true,
    archetype: 'elder_male',
    ambientQuotes: [
      {
        ngoko: 'Sugeng rawuh ing Klenteng Kwan Sing Bio Tuban, Mas. Klenteng pinggir segara paling gedhe sa-Asia Tenggara!',
        krama: 'Sugeng rawuh ing Klenteng Kwan Sing Bio Tuban, Mas. Klenteng pinggir seganten ingkang misuwur!',
        indonesia: 'Selamat datang di Klenteng Kwan Sing Bio Tuban! Klenteng tepi laut terbesar di Asia Tenggara.',
      },
    ],
  },
  // Ambient patrolling villagers, city citizens & district NPCs
  {
    id: 'petani_1',
    name: 'Pak Tani Kromo',
    role: { ngoko: 'Petani Sawah Kerek', krama: 'Tani Sabin Kerek', indonesia: 'Petani Sawah Tuban' },
    region: 'desa',
    x: -55,
    z: 5,
    yaw: 0,
    shirtColor: 0x57534e,
    pantsColor: 0x292524,
    skinColor: 0xb07246,
    hairColor: 0x292524,
    hairStyle: 'short_part',
    shirtStyle: 'kemeja',
    pantsStyle: 'jeans',
    shoeStyle: 'sandal',
    hatType: 'caping',
    hasNeckTowel: true,
    archetype: 'worker',
    patrolRadius: 15,
    ambientQuotes: [
      {
        ngoko: 'Parine karo tanduran jagung ing Kerek wis mulai kuning, minggu ngarep siap panen!',
        krama: 'Pantunipun kaliyan jagung ing Kerek sampun wiwit jene, minggu ngajeng siap panen!',
        indonesia: 'Padi dan jagungnya sudah mulai menguning, minggu depan siap panen raya!',
      },
    ],
  },
  {
    id: 'warga_alun',
    name: 'Mbak Dewi',
    role: { ngoko: 'Warga Tuban', krama: 'Warga Kitha Tuban', indonesia: 'Warga Kota Tuban' },
    region: 'kota',
    x: 118,
    z: -8,
    yaw: 2.0,
    shirtColor: 0xd97706,
    pantsColor: 0x334155,
    skinColor: 0xdfb088,
    hairColor: 0xf59e0b,
    hairStyle: 'hijab',
    shirtStyle: 'kemeja',
    pantsStyle: 'jeans',
    shoeStyle: 'sneakers',
    hasBackpack: true,
    archetype: 'female',
    patrolRadius: 18,
    ambientQuotes: [
      {
        ngoko: 'Sore-sore mlaku ing Alun-alun Tuban ngarep Pendopo karo ngombe es legen seger banget!',
        krama: 'Sonten-sonten mlampah ing Alun-alun Tuban ngajeng Pendopo kaliyan ngunjuk es legen sekeca sanget!',
        indonesia: 'Sore-sore jalan di Alun-alun Tuban depan Pendopo sambil minum es legen segar sekali!',
      },
    ],
  },
  {
    id: 'warga_gunung',
    name: 'Kang Hendra',
    role: { ngoko: 'Pemandu Nglirip', krama: 'Pemandu Nglirip', indonesia: 'Pemandu Air Terjun Nglirip' },
    region: 'pegunungan',
    x: -64,
    z: -168,
    yaw: 1.1,
    shirtColor: 0x15803d,
    pantsColor: 0x1e293b,
    skinColor: 0xc98f64,
    hairColor: 0x171412,
    hairStyle: 'spiky',
    shirtStyle: 'jaket',
    pantsStyle: 'jeans',
    shoeStyle: 'sneakers',
    hatType: 'topi',
    archetype: 'male',
    patrolRadius: 8,
    ambientQuotes: [
      {
        ngoko: 'Banyu Air Terjun Nglirip Singgahan warnane biru tosca bening banget nganti tekan tebing kapur!',
        krama: 'Toya Grojogan Nglirip Singgahan warninipun biru tosca bening sanget ing tebing kapur!',
        indonesia: 'Air Terjun Nglirip Singgahan warnanya biru toska bening sekali di balik tebing kapur!',
      },
    ],
  },
  {
    id: 'ustadz_malik',
    name: 'Ustadz Malik',
    role: { ngoko: 'Takmir Masjid Agung Tuban', krama: 'Takmir Masjid Ageng Tuban', indonesia: 'Takmir Masjid Agung Tuban' },
    region: 'kota',
    x: 224,
    z: -18,
    yaw: 0.1,
    shirtColor: 0xf8fafc,
    pantsColor: 0x1e293b,
    skinColor: 0xcf9468,
    hairColor: 0x374151,
    hairStyle: 'fade',
    shirtStyle: 'kemeja',
    pantsStyle: 'sarung',
    shoeStyle: 'sandal',
    hatType: 'peci',
    hasMustache: true,
    hasGlasses: true,
    archetype: 'male',
    ambientQuotes: [
      {
        ngoko: 'Sugeng rawuh ing Masjid Agung Tuban lan Makam Sunan Bonang, Mas Bagas. Monggo mampir sholat.',
        krama: 'Sugeng rawuh ing Masjid Ageng Tuban lan Pasareyan Sunan Bonang, Mas Bagas. Sumangga pinarak.',
        indonesia: 'Selamat datang di Masjid Agung Tuban dan Makam Sunan Bonang, Mas Bagas. Silakan mampir sholat.',
      },
    ],
  },
  {
    id: 'pak_budi_stasiun',
    name: 'Pak Budi Dishub',
    role: { ngoko: 'Petugas Terminal Kambang Putih', krama: 'Petugas Terminal Kambang Putih', indonesia: 'Kepala Terminal Tuban' },
    region: 'kota',
    x: 295,
    z: -36,
    yaw: -0.6,
    shirtColor: 0x1e3a8a,
    pantsColor: 0x0f172a,
    skinColor: 0xc78d5f,
    hairColor: 0x171412,
    hairStyle: 'short_part',
    shirtStyle: 'seragam',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hatType: 'polisi',
    hasMustache: true,
    archetype: 'uniform',
    ambientQuotes: [
      {
        ngoko: 'Bus Pantura saka Terminal Kambang Putih arah Surabaya lan Semarang lancar kabeh dina iki, Mas!',
        krama: 'Bus Pantura saking Terminal Kambang Putih arah Surabaya lan Semarang lancar sedaya dinten punika!',
        indonesia: 'Bus Pantura dari Terminal Kambang Putih jurusan Surabaya dan Semarang berangkat lancar hari ini!',
      },
    ],
  },
  {
    id: 'mbak_laras',
    name: 'Mbak Laras',
    role: { ngoko: 'Penyadap Legen Siwalan', krama: 'Petani Siwalan Grabagan', indonesia: 'Petani Siwalan Grabagan' },
    region: 'pegunungan',
    x: 65,
    z: -268,
    yaw: 0.4,
    shirtColor: 0x0d9488,
    pantsColor: 0x334155,
    skinColor: 0xdfb088,
    hairColor: 0x161311,
    hairStyle: 'ponytail',
    shirtStyle: 'kemeja',
    pantsStyle: 'jeans',
    shoeStyle: 'sneakers',
    hatType: 'caping',
    hasBackpack: true,
    archetype: 'female',
    patrolRadius: 10,
    ambientQuotes: [
      {
        ngoko: 'Saka Bukit Kapur & Kebun Siwalan Grabagan kene, pemandangane tekan Kota Tuban lan Laut Jawa!',
        krama: 'Saking Redi Kapur Grabagan mriki, sesawanganipun ngantos Kitha Tuban lan Seganten Jawa!',
        indonesia: 'Dari Bukit Kapur & Kebun Siwalan Grabagan sini, pemandangannya membentang sampai Kota Tuban & Laut Jawa!',
      },
    ],
  },
  {
    id: 'pak_bambang',
    name: 'Pak Bambang',
    role: { ngoko: 'Penjaga Mercusuar Awar-Awar', krama: 'Juru Mercusuar Awar-Awar', indonesia: 'Penjaga Mercusuar' },
    region: 'pesisir',
    x: 282,
    z: 176,
    yaw: -0.9,
    shirtColor: 0xd97706,
    pantsColor: 0x1e293b,
    skinColor: 0xb27345,
    hairColor: 0x4b5563,
    hairStyle: 'elder',
    shirtStyle: 'jaket',
    pantsStyle: 'celana_kain',
    shoeStyle: 'pantofel',
    hatType: 'topi',
    hasMustache: true,
    archetype: 'elder_male',
    ambientQuotes: [
      {
        ngoko: 'Lampu Mercusuar Tanjung Awar-Awar madhangi kapal nelayan Tuban saben wengi supaya aman.',
        krama: 'Lampu Mercusuar Tanjung Awar-Awar madhangi kapal nelayan Tuban saben dalu.',
        indonesia: 'Lampu Mercusuar Tanjung Awar-Awar memandu perahu nelayan Tuban setiap malam agar aman.',
      },
    ],
  },
  {
    id: 'kang_wawan',
    name: 'Kang Wawan',
    role: { ngoko: 'Penjaga Hutan Jati Tuban', krama: 'Juru Wana Jati Tuban', indonesia: 'Rimba Hutan Jati Tuban' },
    region: 'desa',
    x: -215,
    z: -36,
    yaw: 0.7,
    shirtColor: 0x365314,
    pantsColor: 0x292524,
    skinColor: 0xc28658,
    hairColor: 0x171412,
    hairStyle: 'fade',
    shirtStyle: 'kemeja',
    pantsStyle: 'jeans',
    shoeStyle: 'sneakers',
    hatType: 'topi',
    archetype: 'male',
    patrolRadius: 12,
    ambientQuotes: [
      {
        ngoko: 'Wit jati ing alas Tuban kulon iki umure wis puluhan taun, kayu unggulan Jawa Timur.',
        krama: 'Wit jatos ing wana Tuban kilen punika yuswanipun sampun puluhan taun.',
        indonesia: 'Pohon jati di hutan Tuban barat ini usianya sudah puluhan tahun, kebanggaan Jawa Timur.',
      },
    ],
  },
  {
    id: 'warga_pasar_1',
    name: 'Mbak Sari',
    role: { ngoko: 'Pembeli Pasar Baru', krama: 'Warga Peken Enggal', indonesia: 'Pengunjung Pasar Baru' },
    region: 'kota',
    x: 132,
    z: 18,
    yaw: 1.5,
    shirtColor: 0x0f766e,
    pantsColor: 0x1e293b,
    archetype: 'female',
    patrolRadius: 11,
    ambientQuotes: [
      {
        ngoko: 'Belanja buah siwalan karo iwak segara ing Pasar Baru Tuban esuk-esuk paling murah!',
        krama: 'Tumbas buah siwalan kaliyan ulam seganten ing Peken Enggal Tuban enjang punika mirah sanget!',
        indonesia: 'Belanja buah siwalan dan ikan laut segar di Pasar Baru Tuban pagi-pagi paling hemat!',
      },
    ],
  },
  {
    id: 'warga_alun_2',
    name: 'Mas Dimas',
    role: { ngoko: 'Pemuda Tuban', krama: 'Pemudha Kitha Tuban', indonesia: 'Pemuda Kota Tuban' },
    region: 'kota',
    x: 126,
    z: -24,
    yaw: -1.1,
    shirtColor: 0x2563eb,
    pantsColor: 0x334155,
    archetype: 'male',
    hasBackpack: true,
    patrolRadius: 14,
    ambientQuotes: [
      {
        ngoko: 'Alun-alun Tuban lan Tugu Ronggolawe saiki resik lan rame saben sore, Mas!',
        krama: 'Alun-alun Tuban lan Tugu Ronggolawe sapunika resik lan regeng saben sonten, Mas!',
        indonesia: 'Alun-alun Tuban dan Tugu Ronggolawe sekarang bersih dan ramai setiap sore, Mas!',
      },
    ],
  },
  {
    id: 'warga_desa_1',
    name: 'Yu Minah',
    role: { ngoko: 'Warga Kerek', krama: 'Warga Dhusun Kerek', indonesia: 'Warga Desa Kerek' },
    region: 'desa',
    x: -16,
    z: -8,
    yaw: 0.9,
    shirtColor: 0xbe185d,
    pantsColor: 0x44403c,
    archetype: 'elder_female',
    patrolRadius: 9,
    ambientQuotes: [
      {
        ngoko: 'Angine semilir saka wit siwalan lan sawah kulon marai betah ing Desa Kerek.',
        krama: 'Anginipun sumilir saking wit siwalan lan sabin kilen damel betah wonten Dhusun Kerek.',
        indonesia: 'Angin sepoi-sepoi dari kebun siwalan dan sawah barat bikin betah tinggal di Desa Kerek.',
      },
    ],
  },
  {
    id: 'warga_desa_kulon',
    name: 'Kang Slamet Kulon',
    role: { ngoko: 'Warga Grabagan', krama: 'Warga Dhusun Grabagan', indonesia: 'Warga Desa Grabagan' },
    region: 'desa',
    x: -158,
    z: -4,
    yaw: -0.5,
    shirtColor: 0x78350f,
    pantsColor: 0x292524,
    archetype: 'worker',
    patrolRadius: 12,
    ambientQuotes: [
      {
        ngoko: 'Jembatan beton Kali Kening saiki nggampangake warga Kerek lan Grabagan menyang Kota Tuban.',
        krama: 'Kreteg beton Lepen Kening sapunika nggampilaken warga Kerek tindak Kitha Tuban.',
        indonesia: 'Jembatan beton Kali Kening sekarang memudahkan warga Kerek dan Grabagan menuju Kota Tuban.',
      },
    ],
  },
  {
    id: 'warga_kota_timur',
    name: 'Mbak Nadia',
    role: { ngoko: 'Penonton Tuban Sport Center', krama: 'Warga Tuban Wetan', indonesia: 'Warga Tuban Timur' },
    region: 'kota',
    x: 268,
    z: 36,
    yaw: 2.1,
    shirtColor: 0xd97706,
    pantsColor: 0x1e293b,
    archetype: 'female',
    patrolRadius: 10,
    ambientQuotes: [
      {
        ngoko: 'Sore iki ana latihan bal-balan Persatu ing Stadion Tuban Sport Center!',
        krama: 'Sonten punika wonten gladhen bal-balan Persatu ing Stadion Tuban Sport Center!',
        indonesia: 'Sore ini ada latihan sepak bola Persatu di Stadion Tuban Sport Center!',
      },
    ],
  },
  {
    id: 'warga_pantai_1',
    name: 'Mas Agus Wisata',
    role: { ngoko: 'Wisatawan Pantai Boom', krama: 'Plesiran Pantai Boom', indonesia: 'Pengunjung Pantai Boom' },
    region: 'pesisir',
    x: 112,
    z: 168,
    yaw: -0.4,
    shirtColor: 0x0284c7,
    pantsColor: 0x475569,
    archetype: 'male',
    patrolRadius: 14,
    ambientQuotes: [
      {
        ngoko: 'Pantai Boom Tuban lan Dermaga kene pemandangane apik tenan kanggo foto!',
        krama: 'Pantai Boom Tuban lan Dermaga mriki sesawanganipun endah sanget!',
        indonesia: 'Pantai Boom Tuban dan Dermaga sini pemandangannya indah sekali untuk berfoto!',
      },
    ],
  },
  {
    id: 'warga_wisata_1',
    name: 'Mbak Tari',
    role: { ngoko: 'Pelancong Bektiharjo & Goa', krama: 'Plesiran Bektiharjo & Guwa', indonesia: 'Wisatawan Goa Akbar & Bektiharjo' },
    region: 'wisata',
    x: -115,
    z: 170,
    yaw: 0.7,
    shirtColor: 0x9333ea,
    pantsColor: 0x334155,
    archetype: 'female',
    hasBackpack: true,
    patrolRadius: 12,
    ambientQuotes: [
      {
        ngoko: 'Saka Gapura Paduraksa terus mlaku menyang Sendang Bektiharjo lan Goa Akbar hawane ayem banget.',
        krama: 'Saking Gapura Paduraksa lajeng tindak dhateng Sendang Bektiharjo lan Guwa Akbar hawanipun ayem sanget.',
        indonesia: 'Dari Gapura Paduraksa lalu jalan ke Sendang Bektiharjo dan Goa Akbar suasananya sejuk sekali.',
      },
    ],
  },
];

export const VEHICLE_SPAWNS: VehicleSpawn[] = [
  // Bagas starter Motor Bebek near home in Desa
  { id: 'veh_bebek_desa', type: 'motor_bebek', x: -6, z: 6, yaw: Math.PI / 2, color: 0xb91c1c },
  // Sepeda Onthel near Pos Ronda
  { id: 'veh_sepeda_desa', type: 'sepeda', x: -16, z: -15, yaw: 0.4, color: 0x1f2937 },
  // Motor Matic near Warung Mbah Darto
  { id: 'veh_matic_warung', type: 'motor_matic', x: 22, z: 8, yaw: -1.1, color: 0x0284c7 },
  // Pickup L300 near Peternakan / Balai Desa
  { id: 'veh_pickup_desa', type: 'pickup', x: -46, z: -28, yaw: 0, color: 0x1e293b },
  // Mobil Keluarga near Alun-Alun Kota
  { id: 'veh_avanza_kota', type: 'mobil_keluarga', x: 105, z: -14, yaw: Math.PI / 2, color: 0x94a3b8 },
  // Motor Sport near Bengkel Mas Joko
  { id: 'veh_sport_bengkel', type: 'motor_sport', x: 162, z: -8, yaw: -Math.PI / 2, color: 0x16a34a },
  // Bus at Terminal Bus Kota
  { id: 'veh_bus_terminal', type: 'bus', x: 175, z: 48, yaw: Math.PI, color: 0xd97706 },
  // Truk near Pasar Baru Tuban
  { id: 'veh_truk_pasar', type: 'truk', x: 155, z: 36, yaw: 0, color: 0xeab308 },
  // Motor Bebek at Pesisir TPI
  { id: 'veh_bebek_pantai', type: 'motor_bebek', x: 70, z: 160, yaw: 1.5, color: 0x1d4ed8 },
  // Extra vehicles across expanded map
  { id: 'veh_matic_stasiun', type: 'motor_matic', x: 292, z: -12, yaw: -Math.PI / 2, color: 0xe11d48 },
  { id: 'veh_pickup_hutanjati', type: 'pickup', x: -228, z: -6, yaw: 0.4, color: 0x15803d },
  { id: 'veh_sport_mercusuar', type: 'motor_sport', x: 274, z: 164, yaw: -1.2, color: 0xeab308 },
  { id: 'veh_avanza_teh', type: 'mobil_keluarga', x: 58, z: -268, yaw: 0.8, color: 0xf8fafc },
];

export const TRAFFIC_LOOP: Array<{ x: number; z: number }> = [
  { x: -12, z: 0 },
  { x: 88, z: 0 },
  { x: 145, z: 0 },
  { x: 185, z: 0 },
  { x: 185, z: -58 },
  { x: 88, z: -58 },
  { x: 88, z: 42 },
  { x: 145, z: 42 },
  { x: 145, z: 0 },
  { x: -12, z: 0 },
];

export const TRAFFIC_LOOP_OUTER: Array<{ x: number; z: number }> = [
  { x: -210, z: 0 },
  { x: 88, z: 0 },
  { x: 245, z: 0 },
  { x: 315, z: 0 },
  { x: 315, z: -58 },
  { x: 245, z: -58 },
  { x: 245, z: 158 },
  { x: 88, z: 158 },
  { x: 88, z: 0 },
  { x: -210, z: 0 },
];
