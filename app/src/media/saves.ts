// Tiny IndexedDB wrapper for emulator save states.
// Save states are a few hundred kilobytes, which is too much for localStorage.

const DB_NAME = 'vidik-saves';
const STORE = 'states';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export async function putSave(id: string, blob: Blob): Promise<void> {
  await tx('readwrite', (store) => store.put(blob, id));
}

export async function getSave(id: string): Promise<Blob | undefined> {
  try {
    return await tx<Blob | undefined>('readonly', (store) => store.get(id));
  } catch {
    return undefined;
  }
}

export async function listSaves(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
    return keys.map(String);
  } catch {
    return [];
  }
}
