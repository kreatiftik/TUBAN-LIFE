import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sanitizeCharacterProfile } from './characterPresets';
import { INITIAL_INVENTORY, MISSIONS, SHOPS } from './jawaData';
import { CharacterProfile, InventoryItem, LanguageMode, OutfitId, SaveData, WeatherType } from './types';
import { LANDMARKS } from './worldData';

const VALID_LANGUAGES = new Set<LanguageMode>(['ngoko', 'krama', 'indonesia']);
const VALID_WEATHERS = new Set<WeatherType>(['cerah', 'hujan']);
const VALID_OUTFITS = new Set<OutfitId>(['kasual', 'batik', 'jaket_motor', 'lurik']);
const VALID_MISSION_IDS = new Set<string>(MISSIONS.map((m) => m.id));
const VALID_LANDMARK_IDS = new Set<string>(LANDMARKS.map((l) => l.id));

const clamp = (val: number, min: number, max: number) =>
  Number.isFinite(val) ? Math.min(max, Math.max(min, val)) : min;

function buildItemCatalog(): Map<string, InventoryItem> {
  const map = new Map<string, InventoryItem>();
  for (const item of INITIAL_INVENTORY) {
    map.set(item.id, item);
  }
  for (const shop of Object.values(SHOPS)) {
    for (const sItem of shop.items) {
      if (sItem.category === 'makanan' || sItem.category === 'perlengkapan') {
        if (!map.has(sItem.id)) {
          map.set(sItem.id, {
            id: sItem.id,
            name: sItem.name,
            category: sItem.category === 'makanan' ? 'makanan' : 'perlengkapan',
            quantity: 1,
            healAmount: sItem.healAmount,
            staminaAmount: sItem.staminaAmount,
            description: sItem.description,
          });
        }
      }
    }
  }
  return map;
}

const ITEM_CATALOG = buildItemCatalog();

function toInventoryCounts(items: InventoryItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items.slice(0, 30)) {
    if (!item.id || typeof item.id !== 'string') continue;
    const cleanId = item.id.slice(0, 64);
    const qty = Math.floor(clamp(item.quantity, 1, 999));
    if (qty > 0) {
      counts[cleanId] = qty;
    }
  }
  return counts;
}

function fromInventoryCounts(raw: unknown): InventoryItem[] {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(INITIAL_INVENTORY);
  }
  const result: InventoryItem[] = [];
  for (const [id, qtyVal] of Object.entries(raw as Record<string, unknown>)) {
    const qty = typeof qtyVal === 'number' ? Math.floor(clamp(qtyVal, 0, 999)) : 0;
    if (qty <= 0) continue;
    const template = ITEM_CATALOG.get(id);
    if (template) {
      result.push({ ...structuredClone(template), quantity: qty });
    } else {
      result.push({
        id,
        name: { ngoko: id, krama: id, indonesia: id },
        category: 'perlengkapan',
        quantity: qty,
        description: { ngoko: 'Barang gawan.', krama: 'Barang gawan.', indonesia: 'Barang bawaan.' },
      });
    }
  }
  return result;
}

function sanitizeFields(saveData: SaveData) {
  const language: LanguageMode = VALID_LANGUAGES.has(saveData.language)
    ? saveData.language
    : 'ngoko';
  const weather: WeatherType = VALID_WEATHERS.has(saveData.weather)
    ? saveData.weather
    : 'cerah';
  const outfit: OutfitId = VALID_OUTFITS.has(saveData.outfit) ? saveData.outfit : 'kasual';

  const ownedOutfitsSet = new Set<OutfitId>(['kasual']);
  for (const o of saveData.ownedOutfits ?? []) {
    if (VALID_OUTFITS.has(o)) ownedOutfitsSet.add(o);
  }
  ownedOutfitsSet.add(outfit);
  const ownedOutfits = Array.from(ownedOutfitsSet).slice(0, 6);

  const completedMissionIds = Array.from(
    new Set((saveData.completedMissionIds ?? []).filter((id) => VALID_MISSION_IDS.has(id)))
  ).slice(0, 10);

  const discoveredLandmarks = Array.from(
    new Set((saveData.discoveredLandmarks ?? ['lm_desa']).filter((id) => VALID_LANDMARK_IDS.has(id)))
  ).slice(0, 30);

  const activeMissionId =
    saveData.activeMissionId && VALID_MISSION_IDS.has(saveData.activeMissionId)
      ? saveData.activeMissionId
      : '';

  const savedAt =
    typeof saveData.savedAt === 'string' && saveData.savedAt.length >= 10
      ? saveData.savedAt.slice(0, 40)
      : new Date().toISOString();

  const character = sanitizeCharacterProfile(saveData.character);

  return {
    version: 1,
    savedAt,
    language,
    health: Math.round(clamp(saveData.health, 0, 500)),
    stamina: Math.round(clamp(saveData.stamina, 0, 500)),
    money: Math.round(clamp(saveData.money, 0, 999999999)),
    xp: Math.round(clamp(saveData.xp, 0, 999999999)),
    reputation: Math.round(clamp(saveData.reputation, 0, 999999)),
    timeOfDay: Number(clamp(saveData.timeOfDay, 0, 24).toFixed(2)),
    weather,
    playerX: Number(clamp(saveData.playerX, -500, 500).toFixed(2)),
    playerZ: Number(clamp(saveData.playerZ, -500, 500).toFixed(2)),
    outfit,
    ownedOutfits,
    character,
    inventoryCounts: toInventoryCounts(saveData.inventory ?? []),
    activeMissionId,
    activeStepIndex: Math.floor(clamp(saveData.activeStepIndex ?? 0, 0, 20)),
    completedMissionIds,
    discoveredLandmarks,
  };
}

export async function fetchCloudSave(userId: string): Promise<SaveData | null> {
  const path = `saves/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'saves', userId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      version: typeof d.version === 'number' ? d.version : 1,
      savedAt: typeof d.savedAt === 'string' ? d.savedAt : new Date().toISOString(),
      language: VALID_LANGUAGES.has(d.language) ? d.language : 'ngoko',
      health: typeof d.health === 'number' ? d.health : 100,
      stamina: typeof d.stamina === 'number' ? d.stamina : 100,
      money: typeof d.money === 'number' ? d.money : 50000,
      xp: typeof d.xp === 'number' ? d.xp : 0,
      reputation: typeof d.reputation === 'number' ? d.reputation : 10,
      timeOfDay: typeof d.timeOfDay === 'number' ? d.timeOfDay : 8.5,
      weather: VALID_WEATHERS.has(d.weather) ? d.weather : 'cerah',
      playerX: typeof d.playerX === 'number' ? d.playerX : -12,
      playerZ: typeof d.playerZ === 'number' ? d.playerZ : 10,
      outfit: VALID_OUTFITS.has(d.outfit) ? d.outfit : 'kasual',
      ownedOutfits: Array.isArray(d.ownedOutfits) ? d.ownedOutfits : ['kasual'],
      character:
        d.character && typeof d.character === 'object'
          ? sanitizeCharacterProfile(d.character as Partial<CharacterProfile>)
          : undefined,
      inventory: fromInventoryCounts(d.inventoryCounts),
      activeMissionId:
        typeof d.activeMissionId === 'string' && d.activeMissionId.length > 0
          ? d.activeMissionId
          : null,
      activeStepIndex: typeof d.activeStepIndex === 'number' ? d.activeStepIndex : 0,
      completedMissionIds: Array.isArray(d.completedMissionIds) ? d.completedMissionIds : [],
      discoveredLandmarks: Array.isArray(d.discoveredLandmarks)
        ? d.discoveredLandmarks
        : ['lm_desa'],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

const CLOUD_SAVE_SCHEMA_KEYS = [
  'ownerId',
  'version',
  'createdAt',
  'updatedAt',
  'savedAt',
  'language',
  'health',
  'stamina',
  'money',
  'xp',
  'reputation',
  'timeOfDay',
  'weather',
  'playerX',
  'playerZ',
  'outfit',
  'ownedOutfits',
  'character',
  'inventoryCounts',
  'activeMissionId',
  'activeStepIndex',
  'completedMissionIds',
  'discoveredLandmarks',
] as const;
const CLOUD_SAVE_KEY_SET = new Set<string>(CLOUD_SAVE_SCHEMA_KEYS);

export async function upsertCloudSave(userId: string, saveData: SaveData): Promise<string> {
  const path = `saves/${userId}`;
  const saveRef = doc(db, 'saves', userId);
  const fields = sanitizeFields(saveData);

  let exists = false;
  let existingData: Record<string, unknown> | null = null;
  try {
    const snap = await getDoc(saveRef);
    exists = snap.exists();
    existingData = exists ? (snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!exists || !existingData) {
    try {
      await setDoc(saveRef, {
        ownerId: userId,
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    const existingKeys = Object.keys(existingData);
    const existingCreatedAt = existingData.createdAt;
    const isTimestampLike =
      Boolean(existingCreatedAt) &&
      typeof existingCreatedAt === 'object' &&
      'seconds' in (existingCreatedAt as Record<string, unknown>);
    const hasExactSchema =
      existingData.ownerId === userId &&
      isTimestampLike &&
      existingKeys.length === CLOUD_SAVE_SCHEMA_KEYS.length &&
      existingKeys.every((k) => CLOUD_SAVE_KEY_SET.has(k));

    if (hasExactSchema) {
      try {
        await updateDoc(saveRef, {
          ...fields,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      try {
        await setDoc(saveRef, {
          ownerId: userId,
          ...fields,
          createdAt: isTimestampLike ? existingCreatedAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }

  return fields.savedAt;
}

export async function deleteCloudSave(userId: string): Promise<void> {
  const path = `saves/${userId}`;
  try {
    await deleteDoc(doc(db, 'saves', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
