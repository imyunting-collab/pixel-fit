// 輕量 IndexedDB 封裝（不需額外套件）。
// 三個資料表：records（運動紀錄）、phases（訓練階段）、meta（設定、成就進度、備份時間）。
import type { Phase, WorkoutRecord } from './types';

const DB_NAME = 'pixel-fit';
const DB_VERSION = 1;

type StoreName = 'records' | 'phases' | 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('此瀏覽器不支援 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('records')) {
        const s = db.createObjectStore('records', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('phases')) db.createObjectStore('phases', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('無法開啟資料庫'));
    req.onblocked = () => reject(new Error('資料庫被其他分頁占用，請關閉其他 PIXEL FIT 分頁後再試'));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function reqP<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error ?? new Error('交易已中止'));
  });
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return reqP(db.transaction(store, 'readonly').objectStore(store).getAll()) as Promise<T[]>;
}

async function put<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await txDone(tx);
}

async function del(store: StoreName, key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

export const db = {
  allRecords: () => getAll<WorkoutRecord>('records'),
  allPhases: () => getAll<Phase>('phases'),
  putRecord: (r: WorkoutRecord) => put('records', r),
  deleteRecord: (id: string) => del('records', id),
  putPhase: (p: Phase) => put('phases', p),
  deletePhase: (id: string) => del('phases', id),

  async getMeta<T>(key: string): Promise<T | undefined> {
    const d = await openDB();
    const row = (await reqP(d.transaction('meta', 'readonly').objectStore('meta').get(key))) as
      | { key: string; value: T }
      | undefined;
    return row?.value;
  },
  setMeta<T>(key: string, value: T) {
    return put('meta', { key, value });
  },

  /** 匯入：在單一交易內寫入，失敗會整批回滾，不會只匯入一半 */
  async bulkWrite(records: WorkoutRecord[], phases: Phase[], meta: { key: string; value: unknown }[] = []) {
    const d = await openDB();
    const tx = d.transaction(['records', 'phases', 'meta'], 'readwrite');
    const rs = tx.objectStore('records');
    const ps = tx.objectStore('phases');
    const ms = tx.objectStore('meta');
    records.forEach((r) => rs.put(r));
    phases.forEach((p) => ps.put(p));
    meta.forEach((m) => ms.put(m));
    await txDone(tx);
  },

  async clearAll() {
    const d = await openDB();
    const tx = d.transaction(['records', 'phases', 'meta'], 'readwrite');
    tx.objectStore('records').clear();
    tx.objectStore('phases').clear();
    tx.objectStore('meta').clear();
    await txDone(tx);
  },
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
