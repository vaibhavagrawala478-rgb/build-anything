/**
 * Binary model store (IndexedDB). Imported meshes (Sketchfab, files, Blender) can be many MB,
 * so scenes only keep a small key; the bytes live here.
 */
const DB = 'buildanything-assets';
const STORE = 'models';
const mem = new Map(); // key -> ArrayBuffer (hot cache)
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'key' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
};

const newKey = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Save a model. meta: { name, source: 'sketchfab'|'file'|'blender', credit?, thumb?, uid? } */
export async function putAsset(meta, buffer, key = newKey()) {
  mem.set(key, buffer);
  try {
    await tx('readwrite', (s) => s.put({ key, meta: { ...meta, size: buffer.byteLength, added: Date.now() }, buffer }));
  } catch (e) {
    console.warn('Could not persist model (kept in memory for this session):', e);
  }
  return key;
}

export async function getAsset(key) {
  if (mem.has(key)) return mem.get(key);
  try {
    const rec = await tx('readonly', (s) => s.get(key));
    if (rec?.buffer) { mem.set(key, rec.buffer); return rec.buffer; }
  } catch { /* fall through */ }
  return null;
}

/** All stored models (metadata only), newest first. */
export async function listAssets() {
  try {
    const all = await tx('readonly', (s) => s.getAll());
    return (all || []).map((r) => ({ key: r.key, ...r.meta })).sort((a, b) => (b.added || 0) - (a.added || 0));
  } catch { return []; }
}

export async function removeAsset(key) {
  mem.delete(key);
  try { await tx('readwrite', (s) => s.delete(key)); } catch { /* ignore */ }
}

export const bufferToB64 = (buf) => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
};
