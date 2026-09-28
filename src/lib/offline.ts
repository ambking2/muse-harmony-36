/**
 * Offline audio storage.
 *
 * Downloaded tracks are stored as Blobs in IndexedDB so they survive a reload
 * and can be played offline. localStorage (used by the library store) keeps
 * only the metadata; the bytes live here.
 */

const DB_NAME = "muis-offline";
const DB_VERSION = 1;
const STORE = "audio";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

/** Store the audio bytes for `id`. Returns true on success. */
export async function saveAudioBlob(id: string, blob: Blob): Promise<boolean> {
  const res = await tx("readwrite", (s) => s.put(blob, id) as IDBRequest<IDBValidKey>);
  return res !== null;
}

/** Read the stored bytes for `id`, or null when missing. */
export function getAudioBlob(id: string): Promise<Blob | null> {
  return tx<Blob>("readonly", (s) => s.get(id) as IDBRequest<Blob>);
}

/** Delete the stored bytes for `id`. */
export async function deleteAudioBlob(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
}

/** All ids currently stored — used to prune metadata for vanished blobs. */
export function listAudioIds(): Promise<string[]> {
  return tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>).then(
    (keys) => (keys ?? []).map(String),
  );
}

/** Delete every stored audio file. Used by "reset all data" in settings. */
export async function clearAudioStore(): Promise<void> {
  await tx("readwrite", (s) => s.clear() as IDBRequest<undefined>);
}
