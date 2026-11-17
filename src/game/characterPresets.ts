import type { CharacterProfile } from './types.ts';

export const SKIN_TONE_SWATCHES = [
  { label: 'Sawo Cerah', color: 0xdfb088 },
  { label: 'Kuning Langsat', color: 0xd8a179 },
  { label: 'Sawo Matang', color: 0xc98f64 },
  { label: 'Cokelat Hangat', color: 0xb87b4c },
  { label: 'Gelap Manis', color: 0x9c6137 },
] as const;

export const HAIR_COLOR_SWATCHES = [
  { label: 'Hitam Pekat', color: 0x171412 },
  { label: 'Cokelat Tua', color: 0x3b2a1e },
  { label: 'Cokelat Kayu', color: 0x6b4423 },
  { label: 'Pirang Emas', color: 0xb48338 },
  { label: 'Merah Marun', color: 0x6b2121 },
  { label: 'Abu Perak', color: 0x9ca3af },
] as const;

export const HIJAB_COLOR_SWATCHES = [
  { label: 'Putih Gading', color: 0xf8fafc },
  { label: 'Emas Tuban', color: 0xf59e0b },
  { label: 'Hijau Toska', color: 0x0d9488 },
  { label: 'Mawar', color: 0xbe185d },
  { label: 'Biru Indigo', color: 0x3730a3 },
  { label: 'Cokelat Kopi', color: 0x78350f },
  { label: 'Hitam Elegan', color: 0x1e293b },
] as const;

export const SHIRT_COLOR_SWATCHES = [
  { label: 'Biru Laut', color: 0x1e40af },
  { label: 'Batik Sogan', color: 0x92400e },
  { label: 'Hijau Wali', color: 0x15803d },
  { label: 'Merah Bata', color: 0xb91c1c },
  { label: 'Kuning Kunyit', color: 0xd97706 },
  { label: 'Ungu Anggrek', color: 0x6d28d9 },
  { label: 'Putih Bersih', color: 0xf1f5f9 },
  { label: 'Arang', color: 0x334155 },
] as const;

export const PANTS_COLOR_SWATCHES = [
  { label: 'Biru Denim', color: 0x1e3a8a },
  { label: 'Hitam Arang', color: 0x1e293b },
  { label: 'Abu Slate', color: 0x334155 },
  { label: 'Khaki Cokelat', color: 0x78350f },
  { label: 'Hijau Lumut', color: 0x365314 },
  { label: 'Merah Sekolah', color: 0x991b1b },
] as const;

export const SHOE_COLOR_SWATCHES = [
  { label: 'Hitam', color: 0x1c1917 },
  { label: 'Cokelat Kulit', color: 0x5c3a21 },
  { label: 'Putih', color: 0xe2e8f0 },
  { label: 'Biru Navy', color: 0x1e3a8a },
  { label: 'Merah Sport', color: 0xb91c1c },
] as const;

export const DEFAULT_CHARACTER_PROFILE: CharacterProfile = {
  name: 'Bagas',
  gender: 'laki',
  skinColor: 0xd19a72,
  hairStyle: 'short_part',
  hairColor: 0x171412,
  hijab: false,
  hijabColor: 0xf8fafc,
  shirtStyle: 'tshirt',
  shirtColor: 0x1e40af,
  pantsStyle: 'jeans',
  pantsColor: 0x1e293b,
  shoeStyle: 'sneakers',
  shoeColor: 0x1c1917,
  hatType: 'none',
  hasGlasses: false,
  hasMustache: false,
  hasBackpack: false,
};

const VALID_HAIR_STYLES = new Set([
  'short_part',
  'spiky',
  'fade',
  'curly',
  'bob',
  'undercut',
  'ponytail',
  'bun_konde',
  'elder',
]);

const VALID_SHIRT_STYLES = new Set([
  'tshirt',
  'kemeja',
  'batik',
  'jaket',
  'lurik',
  'kebaya',
  'seragam',
]);

const VALID_PANTS_STYLES = new Set([
  'jeans',
  'celana_kain',
  'sarung',
  'shorts',
  'cargo',
  'kulot',
]);

const VALID_SHOE_STYLES = new Set(['sneakers', 'pantofel', 'sandal']);
const VALID_HAT_TYPES = new Set(['none', 'peci', 'caping', 'topi', 'helm']);

function sanitizeColorInt(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 0xffffff) {
    return Math.floor(val);
  }
  return fallback;
}

export function sanitizeCharacterName(raw: unknown, fallback = 'Warga Tuban'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[^\p{L}\p{N}_\-. ]/gu, '').trim().slice(0, 20);
  return cleaned.length >= 2 ? cleaned : fallback;
}

export function sanitizeCharacterProfile(
  raw: Partial<CharacterProfile> | null | undefined,
  fallbackName = 'Bagas'
): CharacterProfile {
  const base = DEFAULT_CHARACTER_PROFILE;
  if (!raw || typeof raw !== 'object') {
    return { ...base, name: sanitizeCharacterName(fallbackName, base.name) };
  }
  const gender = raw.gender === 'perempuan' ? 'perempuan' : 'laki';
  const hijab = Boolean(raw.hijab);
  const hairStyle =
    typeof raw.hairStyle === 'string' && VALID_HAIR_STYLES.has(raw.hairStyle)
      ? (raw.hairStyle as CharacterProfile['hairStyle'])
      : gender === 'perempuan'
        ? 'ponytail'
        : 'short_part';
  const shirtStyle =
    typeof raw.shirtStyle === 'string' && VALID_SHIRT_STYLES.has(raw.shirtStyle)
      ? (raw.shirtStyle as CharacterProfile['shirtStyle'])
      : 'tshirt';
  const pantsStyle =
    typeof raw.pantsStyle === 'string' && VALID_PANTS_STYLES.has(raw.pantsStyle)
      ? (raw.pantsStyle as CharacterProfile['pantsStyle'])
      : 'jeans';
  const shoeStyle =
    typeof raw.shoeStyle === 'string' && VALID_SHOE_STYLES.has(raw.shoeStyle)
      ? (raw.shoeStyle as CharacterProfile['shoeStyle'])
      : 'sneakers';
  const hatType =
    typeof raw.hatType === 'string' && VALID_HAT_TYPES.has(raw.hatType)
      ? (raw.hatType as CharacterProfile['hatType'])
      : 'none';

  return {
    name: sanitizeCharacterName(raw.name, fallbackName),
    gender,
    skinColor: sanitizeColorInt(raw.skinColor, base.skinColor),
    hairStyle,
    hairColor: sanitizeColorInt(raw.hairColor, base.hairColor),
    hijab,
    hijabColor: sanitizeColorInt(raw.hijabColor, base.hijabColor),
    shirtStyle,
    shirtColor: sanitizeColorInt(raw.shirtColor, base.shirtColor),
    pantsStyle,
    pantsColor: sanitizeColorInt(raw.pantsColor, base.pantsColor),
    shoeStyle,
    shoeColor: sanitizeColorInt(raw.shoeColor, base.shoeColor),
    hatType: hijab && hatType !== 'caping' ? 'none' : hatType,
    hasGlasses: Boolean(raw.hasGlasses),
    hasMustache: gender === 'laki' ? Boolean(raw.hasMustache) : false,
    hasBackpack: Boolean(raw.hasBackpack),
  };
}
