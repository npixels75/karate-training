// Programmes utilisateur dans IndexedDB (repli localStorage si indisponible).

const DB_NAME = 'karate-training';
const STORE = 'programs';
const LS_KEY = 'karate-training.programs';
export const MAX_PROGRAMS = 5;

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponible'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((e) => {
      console.warn('Stockage : repli localStorage', e);
      return null;
    });
  }
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

const lsRead = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
};
const lsWrite = (list) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* stockage plein ou bloqué */ }
};

export async function listPrograms() {
  const db = await openDb();
  const list = db ? await tx(db, 'readonly', (s) => s.getAll()) : lsRead();
  return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function saveProgram(program) {
  const p = { ...program, id: program.id || crypto.randomUUID?.() || String(Date.now()), createdAt: program.createdAt || Date.now() };
  const db = await openDb();
  if (db) {
    await tx(db, 'readwrite', (s) => s.put(p));
  } else {
    const list = lsRead().filter((x) => x.id !== p.id);
    list.push(p);
    lsWrite(list);
  }
  return p;
}

export async function deleteProgram(id) {
  const db = await openDb();
  if (db) await tx(db, 'readwrite', (s) => s.delete(id));
  else lsWrite(lsRead().filter((x) => x.id !== id));
}
