import { Emitter } from './emitter.js';

const IDX = 'ba.index.v1', PROJ = 'ba.proj.v1.', LAST = 'ba.last.v1', PUB = 'ba.published.v1';

const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

/** Saved projects live in localStorage; each project is the scene JSON + a thumbnail. */
export const store = {
  list() { return read(IDX, []).sort((a, b) => b.updated - a.updated); },
  load(id) { return read(PROJ + id, null); },
  save(json, thumb) {
    const id = json.meta.id;
    if (!write(PROJ + id, json)) return false;
    const idx = read(IDX, []).filter((p) => p.id !== id);
    const prev = read(IDX, []).find((p) => p.id === id);
    idx.push({ id, name: json.meta.name, updated: Date.now(), thumb: thumb || prev?.thumb || '', count: json.nodes.length });
    write(IDX, idx);
    try { localStorage.setItem(LAST, id); } catch { /* ignore */ }
    return true;
  },
  remove(id) {
    try { localStorage.removeItem(PROJ + id); } catch { /* ignore */ }
    write(IDX, read(IDX, []).filter((p) => p.id !== id));
  },
  last() { try { return localStorage.getItem(LAST); } catch { return null; } },
  setLast(id) { try { localStorage.setItem(LAST, id); } catch { /* ignore */ } },
  // designs the user has "published" to their local community shelf
  published() { return read(PUB, []); },
  publish(json, thumb, note) {
    const list = read(PUB, []).filter((p) => p.id !== json.meta.id);
    list.unshift({ id: json.meta.id, name: json.meta.name, thumb, note, json, at: Date.now() });
    return write(PUB, list.slice(0, 24));
  },
  unpublish(id) { write(PUB, read(PUB, []).filter((p) => p.id !== id)); },
};

/** Snapshot-based undo / redo. */
export class History extends Emitter {
  constructor(doc, getExtra) {
    super();
    this.doc = doc;
    this.stack = [];
    this.i = -1;
    this.timer = null;
  }

  reset() {
    this.stack = [JSON.stringify(this.doc.toJSON())];
    this.i = 0;
    this.emit('change');
  }

  commit() {
    clearTimeout(this.timer);
    this.timer = null;
    const s = JSON.stringify(this.doc.toJSON());
    if (s === this.stack[this.i]) return;
    this.stack = this.stack.slice(0, this.i + 1);
    this.stack.push(s);
    if (this.stack.length > 80) this.stack.shift();
    this.i = this.stack.length - 1;
    this.emit('change');
  }

  commitSoon(ms = 350) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.commit(), ms);
  }

  flush() { if (this.timer) this.commit(); }

  get canUndo() { return this.i > 0; }
  get canRedo() { return this.i < this.stack.length - 1; }

  _apply() {
    const sel = [...this.doc.selection];
    const cam = this.doc.camera;
    this.doc.load(JSON.parse(this.stack[this.i]));
    this.doc.camera = cam;
    this.doc.select(sel);
    this.emit('change');
    this.emit('restored');
  }

  undo() { this.flush(); if (!this.canUndo) return false; this.i--; this._apply(); return true; }
  redo() { this.flush(); if (!this.canRedo) return false; this.i++; this._apply(); return true; }
}

// ---------- share links ----------
const b64u = {
  enc: (buf) => {
    const u = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
};

async function pipe(bytes, stream) {
  return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
}

export async function encodeShare(json) {
  const slim = { ...json, nodes: json.nodes.filter((n) => !n.glb) }; // keep links short: imported meshes aren't shared
  const bytes = new TextEncoder().encode(JSON.stringify(slim));
  const z = await pipe(bytes, new CompressionStream('deflate-raw'));
  return b64u.enc(z);
}

export async function decodeShare(s) {
  const z = await pipe(b64u.dec(s), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(z));
}
