import { initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function createAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const PLAYER_ID_REGEX = /^[a-z0-9_]{3,20}$/;
export const SYNTHETIC_EMAIL_DOMAIN = '@save.jawalife.app';

export function normalizePlayerId(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

export function playerIdToSyntheticEmail(playerId: string): string {
  return `${normalizePlayerId(playerId)}${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticPinUser(user: Pick<User, 'email'>): boolean {
  return Boolean(user.email && user.email.endsWith(SYNTHETIC_EMAIL_DOMAIN));
}

export function extractPlayerLabel(user: Pick<User, 'displayName' | 'email'>): string {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName;
  }
  if (user.email && user.email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
    return user.email.slice(0, -SYNTHETIC_EMAIL_DOMAIN.length);
  }
  return user.email || 'Pemain';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function validatePlayerPinCredentials(rawPlayerId: string, rawPin: string) {
  const cleanId = normalizePlayerId(rawPlayerId);
  const cleanPin = rawPin.trim();
  if (!PLAYER_ID_REGEX.test(cleanId)) {
    throw new Error('invalid-player-id');
  }
  if (cleanPin.length < 6 || cleanPin.length > 32) {
    throw new Error('invalid-pin-length');
  }
  return { cleanId, cleanPin, email: `${cleanId}${SYNTHETIC_EMAIL_DOMAIN}` };
}

export async function registerPlayerWithPin(playerId: string, pin: string): Promise<User> {
  const { cleanId, cleanPin, email } = validatePlayerPinCredentials(playerId, pin);
  const cred = await createUserWithEmailAndPassword(auth, email, cleanPin);
  await updateProfile(cred.user, { displayName: cleanId });
  return cred.user;
}

export async function signInWithPlayerPin(playerId: string, pin: string): Promise<User> {
  const { cleanPin, email } = validatePlayerPinCredentials(playerId, pin);
  const cred = await signInWithEmailAndPassword(auth, email, cleanPin);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
