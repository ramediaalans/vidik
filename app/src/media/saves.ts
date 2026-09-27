// Сохранения эмулятора в IndexedDB: один автослот и три ручных на каждую игру.
// Одно состояние весит от сотни килобайт (NES) до пары мегабайт (SNES),
// поэтому localStorage не годится и всё лежит блобами.
//
// Кроме save state храним SRAM — родную «батарейку» картриджа. В играх,
// где сохранение было предусмотрено оригиналом, оно так переживёт даже перезапуск игры.

const DB_NAME = 'vidik-saves';
const LEGACY_STORE = 'states';
const STORE = 'slots';
const DB_VERSION = 2;

export type SaveSlot = 'auto' | 's1' | 's2' | 's3';

export const MANUAL_SLOTS: SaveSlot[] = ['s1', 's2', 's3'];

export type SaveRecord = {
  key: string;
  romId: string;
  slot: SaveSlot;
  state: Blob;
  sram?: Blob;
  thumb?: Blob;
  savedAt: number;
  playedMs: number;
};

export function slotKey(romId: string, slot: SaveSlot): string {
  return `${romId}::${slot}`;
}

export function slotLabel(slot: SaveSlot): string {
  return slot === 'auto' ? 'Авто' : `Ячейка ${slot.slice(1)}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('romId', 'romId');
      }
      // Старый стор оставляем на месте: его переносит migrateLegacy().
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = body(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

// Сохранёнки из первой версии (плоские blob по ключу romId) переезжают в ячейку 1.
let migrated = false;

export async function migrateLegacy(): Promise<void> {
  if (migrated) return;
  migrated = true;
  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains(LEGACY_STORE)) return;
    const old = await new Promise<Array<{ id: string; blob: Blob }>>((resolve, reject) => {
      const transaction = db.transaction(LEGACY_STORE, 'readonly');
      const store = transaction.objectStore(LEGACY_STORE);
      const keys = store.getAllKeys();
      const values = store.getAll();
      transaction.oncomplete = () =>
        resolve(
          (keys.result as IDBValidKey[]).map((key, i) => ({
            id: String(key),
            blob: (values.result as Blob[])[i]
          }))
        );
      transaction.onerror = () => reject(transaction.error);
    });
    for (const item of old) {
      if (!(item.blob instanceof Blob)) continue;
      const exists = await getSlot(item.id, 's1');
      if (exists) continue;
      await putSlot({
        key: slotKey(item.id, 's1'),
        romId: item.id,
        slot: 's1',
        state: item.blob,
        savedAt: Date.now(),
        playedMs: 0
      });
    }
  } catch {
    // миграция — дело добровольное, падать из-за неё нельзя
  }
}

export async function putSlot(record: SaveRecord): Promise<void> {
  await run('readwrite', (store) => store.put(record));
}

export async function getSlot(romId: string, slot: SaveSlot): Promise<SaveRecord | undefined> {
  try {
    return await run<SaveRecord | undefined>('readonly', (store) => store.get(slotKey(romId, slot)));
  } catch {
    return undefined;
  }
}

export async function deleteSlot(romId: string, slot: SaveSlot): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(slotKey(romId, slot)));
  } catch {
    // нет так нет
  }
}

export async function listSlots(romId: string): Promise<SaveRecord[]> {
  try {
    const db = await openDb();
    return await new Promise<SaveRecord[]>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const index = transaction.objectStore(STORE).index('romId');
      const request = index.getAll(romId);
      request.onsuccess = () => resolve(request.result as SaveRecord[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function listAllSlots(): Promise<SaveRecord[]> {
  try {
    const all = await run<SaveRecord[]>('readonly', (store) => store.getAll());
    return all.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function usageBytes(): Promise<number> {
  const all = await listAllSlots();
  return all.reduce(
    (sum, item) => sum + item.state.size + (item.sram?.size ?? 0) + (item.thumb?.size ?? 0),
    0
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

// Формат файла для выгрузки на диск: IndexedDB стирается вместе с кешем браузера,
// а человек может проходить одну Contra месяц. Контейнер свой, без зависимостей:
// 'VIDIKSAV' + версия + длина JSON + JSON + бинарные блоки подряд.
const MAGIC = 'VIDIKSAV';

export async function exportSlot(record: SaveRecord, romTitle: string): Promise<void> {
  const state = new Uint8Array(await record.state.arrayBuffer());
  const sram = record.sram ? new Uint8Array(await record.sram.arrayBuffer()) : new Uint8Array();
  const thumb = record.thumb ? new Uint8Array(await record.thumb.arrayBuffer()) : new Uint8Array();
  const meta = JSON.stringify({
    romId: record.romId,
    slot: record.slot,
    savedAt: record.savedAt,
    playedMs: record.playedMs,
    title: romTitle,
    sizes: { state: state.length, sram: sram.length, thumb: thumb.length }
  });
  const metaBytes = new TextEncoder().encode(meta);
  const header = new Uint8Array(MAGIC.length + 1 + 4);
  header.set(new TextEncoder().encode(MAGIC), 0);
  header[MAGIC.length] = 1;
  new DataView(header.buffer).setUint32(MAGIC.length + 1, metaBytes.length, true);

  const blob = new Blob([header, metaBytes, state, sram, thumb], {
    type: 'application/octet-stream'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date(record.savedAt).toISOString().slice(0, 16).replace(/[:T]/g, '-');
  link.href = url;
  link.download = `${record.romId}-${record.slot}-${stamp}.vidiksave`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importSaveFile(file: File): Promise<SaveRecord> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const magic = new TextDecoder().decode(buffer.slice(0, MAGIC.length));
  if (magic !== MAGIC) throw new Error('Это не файл сохранёнки ВИДИКа');
  const metaLength = new DataView(buffer.buffer, buffer.byteOffset).getUint32(MAGIC.length + 1, true);
  const metaStart = MAGIC.length + 1 + 4;
  const meta = JSON.parse(new TextDecoder().decode(buffer.slice(metaStart, metaStart + metaLength))) as {
    romId: string;
    slot: SaveSlot;
    savedAt: number;
    playedMs: number;
    sizes: { state: number; sram: number; thumb: number };
  };

  let offset = metaStart + metaLength;
  const take = (length: number) => {
    const part = buffer.slice(offset, offset + length);
    offset += length;
    return part;
  };
  const state = new Blob([take(meta.sizes.state)]);
  const sramBytes = take(meta.sizes.sram);
  const thumbBytes = take(meta.sizes.thumb);

  const record: SaveRecord = {
    key: slotKey(meta.romId, meta.slot),
    romId: meta.romId,
    slot: meta.slot,
    state,
    sram: sramBytes.length ? new Blob([sramBytes]) : undefined,
    thumb: thumbBytes.length ? new Blob([thumbBytes], { type: 'image/png' }) : undefined,
    savedAt: meta.savedAt,
    playedMs: meta.playedMs
  };
  await putSlot(record);
  return record;
}
