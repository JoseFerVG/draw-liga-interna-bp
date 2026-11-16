import type { TournamentState } from '../types';

const STORAGE_KEY = 'draw-liga-interna-bp:state:v1';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeStateToHash(state: TournamentState): Promise<string> {
  const json = JSON.stringify(state);
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return `#s=z.${bytesToBase64Url(compressed)}`;
  }
  return `#s=j.${bytesToBase64Url(raw)}`;
}

export async function decodeStateFromHash(hash: string): Promise<TournamentState | null> {
  try {
    if (!hash.startsWith('#s=')) return null;
    const payload = hash.slice(3);
    if (payload.startsWith('z.') && typeof DecompressionStream !== 'undefined') {
      const compressed = base64UrlToBytes(payload.slice(2));
      const stream = new Blob([compressed.buffer as ArrayBuffer])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      const text = await new Response(stream).text();
      return JSON.parse(text) as TournamentState;
    }
    if (payload.startsWith('j.')) {
      const bytes = base64UrlToBytes(payload.slice(2));
      return JSON.parse(new TextDecoder().decode(bytes)) as TournamentState;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadLocalState(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TournamentState;
    if (!parsed || !Array.isArray(parsed.teams) || !Array.isArray(parsed.rounds)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalState(state: TournamentState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}
