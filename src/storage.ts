import { EMPTY_STATE } from "./data";
import type { PhotoRecord, ScratchbookState } from "./types";

const DB_NAME = "photo-walk-scratchbook";
const STORE_NAME = "field-kit";
const STATE_KEY = "scratchbook-state-v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

export async function loadState(): Promise<ScratchbookState> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve((request.result as ScratchbookState | undefined) ?? structuredClone(EMPTY_STATE));
    request.onerror = () => reject(request.error ?? new Error("Could not read your local field notes."));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveState(state: ScratchbookState): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("This device could not save the latest change.")); };
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read a photograph for backup."));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const match = /^data:([^;]+);base64$/.exec(header);
  if (!match || !encoded) throw new Error("The backup contains an unreadable photograph.");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

type PortablePhoto = Omit<PhotoRecord, "blob"> & { dataUrl: string };
type PortableState = Omit<ScratchbookState, "sessions"> & {
  exportedAt: string;
  sessions: Array<Omit<ScratchbookState["sessions"][number], "photos"> & { photos: PortablePhoto[] }>;
};

export async function createBackup(state: ScratchbookState): Promise<PortableState> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    activeSessionId: state.activeSessionId,
    activeView: state.activeView,
    sessions: await Promise.all(state.sessions.map(async (session) => ({
      ...session,
      photos: await Promise.all(session.photos.map(async ({ blob, ...photo }) => ({ ...photo, dataUrl: await blobToDataUrl(blob) })))
    })))
  };
}

export function readBackup(input: unknown): ScratchbookState {
  if (!input || typeof input !== "object") throw new Error("Choose a Scratchbook JSON backup.");
  const portable = input as Partial<PortableState>;
  if (portable.version !== 1 || !Array.isArray(portable.sessions)) throw new Error("This backup format is not supported.");
  const sessions = portable.sessions.map((session) => {
    if (!session.id || !session.title || !Array.isArray(session.photos)) throw new Error("A walk in this backup is incomplete.");
    return {
      ...session,
      photos: session.photos.map(({ dataUrl, ...photo }) => ({ ...photo, blob: dataUrlToBlob(dataUrl) }))
    };
  });
  return { version: 1, sessions, activeSessionId: portable.activeSessionId, activeView: portable.activeView ?? "prompt" };
}
