import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { FirebaseWebConfig, TournamentState } from '../types';

const CLOUD_CONFIG_KEY = 'draw-liga-interna-bp:firebase-config:v1';

export const DEFAULT_FIREBASE_CONFIG: FirebaseWebConfig = {
  projectId: 'liga-interna-bp-jf26',
  appId: '1:791131178565:web:43ec93e31659014748452c',
  storageBucket: 'liga-interna-bp-jf26.firebasestorage.app',
  apiKey: 'AIzaSyAvmMdB9ntVNJ57kxLDs9moUXlh2YCVM3A',
  authDomain: 'liga-interna-bp-jf26.firebaseapp.com',
  messagingSenderId: '791131178565',
};

export const DEFAULT_ROOM_CODE = 'liga-interna-bp';

export interface CloudConfigStorage {
  firebase: FirebaseWebConfig;
  roomCode: string;
}

export function getDefaultCloudConfig(): CloudConfigStorage {
  return {
    firebase: { ...DEFAULT_FIREBASE_CONFIG },
    roomCode: DEFAULT_ROOM_CODE,
  };
}

export function loadCloudConfig(): CloudConfigStorage | null {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return getDefaultCloudConfig();
    if (raw === 'disabled') return null;
    const parsed = JSON.parse(raw) as CloudConfigStorage;
    if (parsed?.firebase?.projectId && parsed?.firebase?.apiKey && parsed?.roomCode) {
      return parsed;
    }
    return getDefaultCloudConfig();
  } catch {
    return getDefaultCloudConfig();
  }
}

export function saveCloudConfig(cfg: CloudConfigStorage | null): void {
  try {
    if (!cfg) {
      localStorage.setItem(CLOUD_CONFIG_KEY, 'disabled');
    } else {
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cfg));
    }
  } catch {
    // ignore
  }
}

function getDb(cfg: CloudConfigStorage): Firestore {
  const appName = `liga-${cfg.firebase.projectId}`;
  let app: FirebaseApp;
  if (getApps().some((a) => a.name === appName)) {
    app = getApp(appName);
  } else {
    app = initializeApp(cfg.firebase, appName);
  }
  return getFirestore(app);
}

function sanitizeRoomCode(code: string): string {
  const cleaned = code.trim().replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64);
  return cleaned || DEFAULT_ROOM_CODE;
}

function parseValidTournament(payload?: string): TournamentState | null {
  if (!payload) return null;
  const parsed = JSON.parse(payload) as Partial<TournamentState>;
  if (
    parsed &&
    Array.isArray(parsed.teams) &&
    Array.isArray(parsed.rounds) &&
    typeof parsed.updatedAt === 'string'
  ) {
    return parsed as TournamentState;
  }
  return null;
}

export async function pullCloudState(cfg: CloudConfigStorage): Promise<TournamentState | null> {
  const db = getDb(cfg);
  const ref = doc(db, 'tournaments', sanitizeRoomCode(cfg.roomCode));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as { payload?: string };
  return parseValidTournament(data?.payload);
}

export async function pushCloudState(cfg: CloudConfigStorage, state: TournamentState): Promise<void> {
  const db = getDb(cfg);
  const ref = doc(db, 'tournaments', sanitizeRoomCode(cfg.roomCode));
  await setDoc(ref, {
    payload: JSON.stringify(state),
    updatedAt: state.updatedAt,
    version: Math.max(1, Math.trunc(state.version || 1)),
  });
}

export function subscribeCloudState(
  cfg: CloudConfigStorage,
  onRemoteState: (state: TournamentState | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const db = getDb(cfg);
  const ref = doc(db, 'tournaments', sanitizeRoomCode(cfg.roomCode));
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onRemoteState(null);
        return;
      }
      try {
        const data = snap.data() as { payload?: string };
        onRemoteState(parseValidTournament(data?.payload));
      } catch (e) {
        onError(e instanceof Error ? e : new Error('Invalid cloud payload'));
      }
    },
    (err) => onError(err),
  );
}
