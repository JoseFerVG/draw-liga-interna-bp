import type { FirebaseWebConfig, TournamentState } from '../types';

const CLOUD_CONFIG_KEY = 'draw-liga-interna-bp:firebase-config:v1';

export interface CloudConfigStorage {
  firebase: FirebaseWebConfig;
  roomCode: string;
}

export function loadCloudConfig(): CloudConfigStorage | null {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudConfigStorage;
    if (parsed?.firebase?.projectId && parsed?.firebase?.apiKey && parsed?.roomCode) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCloudConfig(cfg: CloudConfigStorage | null): void {
  try {
    if (!cfg) {
      localStorage.removeItem(CLOUD_CONFIG_KEY);
    } else {
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cfg));
    }
  } catch {
    // ignore
  }
}

function docUrl(cfg: CloudConfigStorage): string {
  const safeRoom = encodeURIComponent(cfg.roomCode.trim() || 'liga-interna-bp');
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.firebase.projectId.trim(),
  )}/databases/(default)/documents/tournaments/${safeRoom}?key=${encodeURIComponent(
    cfg.firebase.apiKey.trim(),
  )}`;
}

export async function pullCloudState(cfg: CloudConfigStorage): Promise<TournamentState | null> {
  const res = await fetch(docUrl(cfg), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Error Firestore (${res.status})`);
  }
  const data = (await res.json()) as {
    fields?: { payload?: { stringValue?: string } };
  };
  const payload = data.fields?.payload?.stringValue;
  if (!payload) return null;
  return JSON.parse(payload) as TournamentState;
}

export async function pushCloudState(cfg: CloudConfigStorage, state: TournamentState): Promise<void> {
  const body = {
    fields: {
      payload: { stringValue: JSON.stringify(state) },
      updatedAt: { stringValue: state.updatedAt },
    },
  };
  const res = await fetch(docUrl(cfg), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Error al guardar en Firestore (${res.status})`);
  }
}
