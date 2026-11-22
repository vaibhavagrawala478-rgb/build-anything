import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Emitter } from './emitter.js';
import { Builder } from './builder.js';
import { PREFABS, defaultParams } from './library.js';

let counter = 0;
export const newId = () => 'n' + Date.now().toString(36) + (++counter).toString(36) + Math.random().toString(36).slice(2, 5);

const r4 = (v) => Math.round(v * 10000) / 10000;
const glbCache = new Map();

function parseGLB(b64) {
  const key = b64.length + b64.slice(0, 64) + b64.slice(-64);
  if (!glbCache.has(key)) {
    glbCache.set(key, new Promise((res, rej) => {
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      new GLTFLoader().parse(buf.buffer, '', (g) => res(g.scene), rej);
    }));
  }
  return glbCache.get(key);
}

export const DEFAULT_MOTION = () => ({ type: 'none', axis: 'y', speed: 30, amp: 1 });

/**
 * The scene document. Every node is a THREE.Group whose `userData.n` holds its
 * serialisable data; its transform lives on the object itself.
 */
export class Doc extends Emitter {
  constructor() {
    super();
    this.root = new THREE.Group();
    this.root.name = 'root';
    this.nodes = new Map();
    this.selection = [];
    this.meta = { name: 'Untitled', bg: '#201D28', bgOpacity: 1, frame: 'responsive', id: newId() };
    this.comments = [];
    this.camera = null;
  }

  // ---------- creation ----------
  uniqueName(base) {
    const names = new Set([...this.nodes.values()].map((o) => o.userData.n.name));
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }

  create(prefab, o = {}) {
    const def = PREFABS[prefab];
    if (!def) throw new Error('Unknown component ' + prefab);
    const obj = new THREE.Group();
    const n = {
      id: o.id || newId(),
      name: o.name || this.uniqueName(def.name),
      prefab,
      params: { ...defaultParams(def), ...(o.params || {}) },
      colors: { ...(o.colors || {}) },
      finish: o.finish || 'default',
      motion: { ...DEFAULT_MOTION(), ...(o.motion || {}) },
      physics: o.physics ?? def.physics ?? 'none',
      mass: o.mass ?? 1,
      locked: !!o.locked,
      glb: o.glb,
    };
    obj.userData.n = n;
    obj.name = n.name;
    if (o.pos) obj.position.set(...o.pos);
    if (o.rot) obj.rotation.set(...o.rot);
    if (o.scale) obj.scale.set(...o.scale);
    obj.visible = o.visible !== false;
    this.build(obj);
    const parent = o.parent ? this.nodes.get(o.parent) : null;
    (parent || this.root).add(obj);
    this.nodes.set(n.id, obj);
    if (!o.silent) this.emit('tree');
    return obj;
  }

  build(obj) {
    const n = obj.userData.n;
    const def = PREFABS[n.prefab];
    if (obj.userData.content) {
      obj.remove(obj.userData.content);
      this.disposeObject(obj.userData.content);
    }
    const b = new Builder(def, n.colors, n.finish);
    if (n.prefab === 'imported') {
      if (n.glb) {
        parseGLB(n.glb).then((scene) => {
          const c = scene.clone(true);
          const box = new THREE.Box3().setFromObject(c);
          const size = box.getSize(new THREE.Vector3());
          const k = (n.params.fit || 2) / Math.max(size.x, size.y, size.z, 0.0001);
          c.scale.multiplyScalar(k);
          const b2 = new THREE.Box3().setFromObject(c);
          c.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
          c.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
          const holder = new THREE.Group();
          holder.name = '__content';
          holder.add(c);
          if (obj.userData.content) obj.remove(obj.userData.content);
          obj.add(holder);
          obj.userData.content = holder;
          this.emit('rebuilt', obj);
        }).catch(() => {});
      }
    } else if (n.prefab !== 'group') {
      def.build(b, n.params);
    }
    obj.add(b.group);
    obj.userData.content = b.group;
    obj.userData.mats = b.mats;
    obj.userData.def = def;
  }

  rebuild(obj) {
    this.build(obj);
    this.emit('rebuilt', obj);
  }

  disposeObject(o) {
    o.traverse((c) => {
      c.geometry?.dispose?.();
      const ms = Array.isArray(c.material) ? c.material : c.material ? [c.material] : [];
      ms.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
  }

  // ---------- lookups ----------
  get(id) { return this.nodes.get(id); }
  data(obj) { return obj.userData.n; }
  nodeOf(o) {
    while (o && !o.userData.n) o = o.parent;
    return o && o !== this.root ? o : null;
  }
  topOf(o) {
    let cur = this.nodeOf(o), top = cur;
    while (cur && cur.parent && cur.parent !== this.root) {
      cur = this.nodeOf(cur.parent);
      if (cur) top = cur;
    }
    return top;
  }
  childNodes(obj) { return (obj || this.root).children.filter((c) => c.userData.n); }
  /** Walk all nodes depth first. */
  each(fn, from = this.root) {
    this.childNodes(from).forEach((c) => { fn(c); this.each(fn, c); });
  }
  selectedObjects() { return this.selection.map((id) => this.nodes.get(id)).filter(Boolean); }
  bbox(objs) {
    const box = new THREE.Box3();
    (Array.isArray(objs) ? objs : [objs]).forEach((o) => {
      o.updateWorldMatrix(true, true);
      box.union(new THREE.Box3().setFromObject(o));
    });
    return box;
  }
  isAncestor(a, b) { // is a an ancestor of b
    let p = b.parent;
    while (p) { if (p === a) return true; p = p.parent; }
    return false;
  }

  // ---------- selection ----------
  select(ids, { add = false, silent = false } = {}) {
    ids = ids.filter((id) => this.nodes.has(id));
    if (add) {
      const set = new Set(this.selection);
      ids.forEach((id) => (set.has(id) ? set.delete(id) : set.add(id)));
      ids = [...set];
    }
    this.selection = ids;
    if (!silent) this.emit('selection', ids);
  }
  clearSelection() { if (this.selection.length) this.select([]); }

  // ---------- mutation ----------
  remove(ids) {
    const objs = ids.map((id) => this.nodes.get(id)).filter(Boolean);
    objs.forEach((o) => {
      if (!o.parent) return;
      const drop = [];
      o.traverse((c) => { if (c.userData.n) drop.push(c.userData.n.id); });
      drop.forEach((id) => this.nodes.delete(id));
      o.parent.remove(o);
      this.disposeObject(o);
    });
    this.selection = this.selection.filter((id) => this.nodes.has(id));
    this.emit('tree');
    this.emit('selection', this.selection);
  }

  cloneTree(obj, parentId, offset) {
    const n = obj.userData.n;
    const c = this.create(n.prefab, {
      name: this.uniqueName(n.name.replace(/ \d+$/, '')),
      params: JSON.parse(JSON.stringify(n.params)), colors: { ...n.colors }, finish: n.finish,
      motion: { ...n.motion }, physics: n.physics, mass: n.mass, glb: n.glb,
      pos: obj.position.toArray(), rot: [obj.rotation.x, obj.rotation.y, obj.rotation.z], scale: obj.scale.toArray(),
      visible: obj.visible, parent: parentId, silent: true,
    });
    if (offset) c.position.add(offset);
    this.childNodes(obj).forEach((ch) => this.cloneTree(ch, c.userData.n.id));
    return c;
  }

  duplicate(ids, offset = new THREE.Vector3(0.6, 0, 0.6)) {
    const objs = this.selectedTop(ids);
    const out = objs.map((o) => this.cloneTree(o, o.parent === this.root ? null : o.parent.userData.n.id, offset).userData.n.id);
    this.emit('tree');
    this.select(out);
    return out;
  }

  /** Reduce a list of ids to those without a selected ancestor. */
  selectedTop(ids) {
    const objs = ids.map((id) => this.nodes.get(id)).filter(Boolean);
    return objs.filter((o) => !objs.some((p) => p !== o && this.isAncestor(p, o)));
  }

  group(ids) {
    const objs = this.selectedTop(ids);
    if (objs.length < 1) return null;
    const box = this.bbox(objs);
    const c = box.getCenter(new THREE.Vector3());
    const parent = objs[0].parent;
    const g = this.create('group', { pos: [0, 0, 0], silent: true, parent: parent === this.root ? null : parent.userData.n.id });
    parent.updateWorldMatrix(true, false);
    g.position.copy(parent.worldToLocal(new THREE.Vector3(c.x, box.min.y, c.z)));
    g.updateWorldMatrix(true, false);
    objs.forEach((o) => g.attach(o));
    this.emit('tree');
    this.select([g.userData.n.id]);
    return g;
  }

  ungroup(id) {
    const g = this.nodes.get(id);
    if (!g || g.userData.n.prefab !== 'group') return;
    const kids = this.childNodes(g);
    kids.forEach((k) => g.parent.attach(k));
    this.remove([id]);
    this.select(kids.map((k) => k.userData.n.id));
  }

  /** Move `obj` under `parent` (null = root), before `before` if given. World transform preserved. */
  reparent(obj, parent, before = null) {
    parent = parent || this.root;
    if (obj === parent || this.isAncestor(obj, parent)) return;
    parent.attach(obj);
    if (before && before.parent === parent) {
      parent.children.splice(parent.children.indexOf(obj), 1);
      parent.children.splice(parent.children.indexOf(before), 0, obj);
    }
    this.emit('tree');
  }

  rename(id, name) {
    const o = this.nodes.get(id);
    if (!o) return;
    o.userData.n.name = name || o.userData.n.name;
    o.name = o.userData.n.name;
    this.emit('tree');
  }

  setColor(obj, slot, hex) {
    const n = obj.userData.n;
    n.colors[slot] = hex;
    const m = obj.userData.mats?.[slot];
    if (n.prefab === 'label') return this.rebuild(obj);
    if (m) {
      m.color.set(hex);
      if (m.emissive && m.emissiveIntensity > 0) m.emissive.set(hex);
    }
  }

  setParam(obj, key, value) {
    obj.userData.n.params[key] = value;
    this.rebuild(obj);
  }

  // ---------- serialisation ----------
  serializeNode(obj, out, parentId) {
    const n = obj.userData.n;
    out.push({
      id: n.id, name: n.name, prefab: n.prefab, params: n.params, colors: n.colors, finish: n.finish,
      motion: n.motion, physics: n.physics, mass: n.mass, locked: n.locked, visible: obj.visible,
      pos: obj.position.toArray().map(r4), rot: [obj.rotation.x, obj.rotation.y, obj.rotation.z].map(r4),
      scale: obj.scale.toArray().map(r4), parent: parentId || undefined, glb: n.glb,
    });
    this.childNodes(obj).forEach((c) => this.serializeNode(c, out, n.id));
  }

  toJSON() {
    const nodes = [];
    this.childNodes(this.root).forEach((c) => this.serializeNode(c, nodes));
    return JSON.parse(JSON.stringify({ v: 1, meta: this.meta, camera: this.camera, comments: this.comments, nodes }));
  }

  clear() {
    [...this.root.children].forEach((c) => { this.root.remove(c); this.disposeObject(c); });
    this.nodes.clear();
    this.selection = [];
  }

  load(json, { keepMeta = false } = {}) {
    this.clear();
    if (!keepMeta) this.meta = { ...this.meta, ...json.meta };
    this.comments = json.comments || [];
    this.camera = json.camera || null;
    (json.nodes || []).forEach((nd) => {
      if (!PREFABS[nd.prefab]) return;
      this.create(nd.prefab, { ...nd, silent: true });
    });
    this.emit('tree');
    this.emit('selection', []);
    this.emit('loaded');
  }
}
