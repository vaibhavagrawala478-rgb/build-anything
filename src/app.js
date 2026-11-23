import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { Doc, newId } from './engine/doc.js';
import { Viewport } from './engine/viewport.js';
import { Sim } from './engine/sim.js';
import { Emitter } from './engine/emitter.js';
import { History, store, encodeShare, decodeShare } from './engine/store.js';
import { PREFABS } from './engine/library.js';
import { ALL_TEMPLATES, BLANK } from './engine/templates.js';
import { sceneThumb } from './engine/thumbs.js';
import { putAsset } from './engine/assets.js';
import { downloadGLB, getToken, creditOf } from './engine/sketchfab.js';
import * as blender from './engine/blender.js';
import { toast } from './ui/ui.js';

export const app = new Emitter();

const download = (blob, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
const slug = (s) => (s || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';

export function createApp(stage) {
  const doc = new Doc();
  const vp = new Viewport(stage, doc);
  const sim = new Sim(doc, vp);
  const history = new History(doc);
  Object.assign(app, { doc, vp, sim, history, aiStyle: 'toy', clipboard: null, drawMode: 'block', _saveT: null, saved: true });

  // ---------- persistence ----------
  app.saveSoon = () => { app.saved = false; app.emit('saved'); clearTimeout(app._saveT); app._saveT = setTimeout(app.saveNow, 900); };
  app.saveNow = () => {
    clearTimeout(app._saveT);
    if (sim.state !== 'stopped') return;
    doc.camera = vp.getCameraState();
    const json = doc.toJSON();
    let thumb = '';
    try { if (!vp.blueprint) thumb = sceneThumb(doc.root, 260); } catch { /* thumbnails are best effort */ }
    const ok = store.save(json, thumb);
    app.saved = ok;
    if (!ok) toast('Browser storage is full – export your design to keep it', 'err');
    app.emit('saved');
  };
  app.commit = () => { history.commit(); app.saveSoon(); app.emit('props'); };
  app.commitSoon = () => { history.commitSoon(); app.saveSoon(); };
  history.on('change', () => app.emit('history'));
  history.on('restored', () => { app.emit('props'); app.saveSoon(); });
  doc.on('tree', () => app.emit('tree'));
  vp.on('transformEnd', () => app.commit());
  window.addEventListener('beforeunload', () => { try { if (!app.saved) app.saveNow(); } catch { /* ignore */ } });

  // ---------- placement ----------
  /** A free spot near the middle of the view so new objects don't pile up. */
  app.freePoint = () => {
    const t = vp.controls.target;
    const boxes = [];
    doc.each((o) => {
      const n = o.userData.n;
      if (['floor', 'road', 'rug', 'rug_round', 'group'].includes(n.prefab)) return;
      const b = doc.bbox(o);
      if (b.getSize(new THREE.Vector3()).y > 0.5) boxes.push(b);
    });
    const free = (x, z) => !boxes.some((b) => x > b.min.x - 0.6 && x < b.max.x + 0.6 && z > b.min.z - 0.6 && z < b.max.z + 0.6);
    const step = 1.5;
    for (let ring = 0; ring < 14; ring++) {
      for (let i = -ring; i <= ring; i++) for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const x = Math.round((t.x + i * step) / 0.25) * 0.25, z = Math.round((t.z + j * step) / 0.25) * 0.25;
        if (free(x, z)) return new THREE.Vector3(x, vp.surfaceBelow(x, 80, z), z);
      }
    }
    return new THREE.Vector3(Math.round(t.x), 0, Math.round(t.z));
  };

  app.editable = () => {
    if (sim.state !== 'stopped') { toast('Stop the simulation to edit the scene'); return false; }
    return true;
  };

  /** Add a component (or several) to the scene. */
  app.add = (prefab, o = {}) => {
    if (!app.editable()) return null;
    const pt = o.point ? o.point.clone() : app.freePoint();
    const count = Math.max(1, o.count || 1);
    const objs = [];
    let x = pt.x;
    for (let i = 0; i < count; i++) {
      const s = o.scale && o.scale !== 1 ? [o.scale, o.scale, o.scale] : undefined;
      const obj = doc.create(prefab, {
        pos: [x, pt.y, pt.z], params: o.params, colors: o.colors, finish: o.finish, name: o.name, scale: s,
        rot: o.rot, physics: o.physics, motion: o.motion, glb: o.glb, asset: o.asset, credit: o.credit, silent: true,
      });
      objs.push(obj);
      const w = doc.bbox(obj).getSize(new THREE.Vector3()).x;
      x += Math.max(0.6, w) + 0.35;
    }
    let result = objs[0];
    doc.emit('tree');
    if (objs.length > 1) result = doc.group(objs.map((ob) => ob.userData.n.id));
    else doc.select([result.userData.n.id]);
    if (objs.length > 1) {
      result.userData.n.name = doc.uniqueName(`${PREFABS[prefab].name} set`);
      result.name = result.userData.n.name;
      doc.emit('tree');
    }
    app.commit();
    return result;
  };

  app.addVariant = (v, point) => app.add(v.prefab, { point, params: v.params, colors: v.colors, finish: v.finish, scale: v.scale, count: v.count });

  vp.on('drop', (payload, pt) => {
    if (payload.type === 'prefab') app.add(payload.id, { point: pt });
    else if (payload.type === 'variant') app.addVariant(payload.v, pt);
  });

  // ---------- editing actions ----------
  app.selectedTop = () => doc.selectedTop(doc.selection);
  app.delete = () => {
    if (!app.editable() || !doc.selection.length) return;
    doc.remove(app.selectedTop().map((o) => o.userData.n.id));
    app.commit();
  };
  app.duplicate = () => {
    if (!app.editable() || !doc.selection.length) return;
    doc.duplicate(doc.selection);
    app.commit();
  };
  app.group = () => {
    if (!app.editable() || !doc.selection.length) return;
    doc.group(doc.selection);
    app.commit();
  };
  app.ungroup = () => {
    if (!app.editable()) return;
    const g = doc.selectedObjects().filter((o) => o.userData.n.prefab === 'group');
    if (!g.length) return toast('Select a group to ungroup');
    g.forEach((o) => doc.ungroup(o.userData.n.id));
    app.commit();
  };
  app.copy = () => {
    const tops = app.selectedTop();
    if (!tops.length) return;
    const list = [];
    tops.forEach((o) => doc.serializeNode(o, list, null));
    app.clipboard = JSON.parse(JSON.stringify(list));
    toast(`Copied ${tops.length} object${tops.length > 1 ? 's' : ''}`);
  };
  app.paste = () => {
    if (!app.editable() || !app.clipboard?.length) return;
    const map = new Map();
    const ids = [];
    app.clipboard.forEach((nd) => {
      const o = doc.create(nd.prefab, { ...nd, id: undefined, name: doc.uniqueName(nd.name.replace(/ \d+$/, '')), parent: nd.parent ? map.get(nd.parent) : undefined, silent: true });
      map.set(nd.id, o.userData.n.id);
      if (!nd.parent) { o.position.x += 0.6; o.position.z += 0.6; ids.push(o.userData.n.id); }
    });
    doc.emit('tree');
    doc.select(ids);
    app.commit();
  };
  app.selectAll = () => doc.select(doc.childNodes(doc.root).map((o) => o.userData.n.id));
  app.toggleVisible = (ids = doc.selection) => {
    const objs = ids.map((i) => doc.get(i)).filter(Boolean);
    const to = !objs.every((o) => !o.visible);
    objs.forEach((o) => { o.visible = !to; });
    doc.emit('tree');
    vp.syncGizmo();
    app.commit();
  };
  app.toggleLock = (ids = doc.selection) => {
    const objs = ids.map((i) => doc.get(i)).filter(Boolean);
    const to = !objs.every((o) => o.userData.n.locked);
    objs.forEach((o) => { o.userData.n.locked = to; });
    doc.emit('tree');
    vp.syncGizmo();
    app.commit();
  };
  app.dropToFloor = () => {
    if (!app.editable()) return;
    const tops = app.selectedTop();
    tops.forEach((o) => {
      const b = doc.bbox(o);
      const c = b.getCenter(new THREE.Vector3());
      const y = vp.surfaceBelow(c.x, b.min.y + 0.02, c.z, [o]);
      o.position.y += y - b.min.y;
    });
    vp.syncGizmo();
    app.commit();
  };
  app.nudge = (dx, dz) => {
    if (!app.editable()) return;
    const objs = app.selectedTop().filter((o) => !o.userData.n.locked);
    objs.forEach((o) => { o.position.x += dx; o.position.z += dz; });
    vp.syncGizmo();
    app.emit('props');
    app.commitSoon();
  };
  app.align = (axis, how) => {
    if (!app.editable()) return;
    const objs = app.selectedTop();
    if (objs.length < 2) return;
    const boxes = objs.map((o) => doc.bbox(o));
    const all = doc.bbox(objs);
    objs.forEach((o, i) => {
      const b = boxes[i];
      const target = how === 'min' ? all.min[axis] : how === 'max' ? all.max[axis] : (all.min[axis] + all.max[axis]) / 2;
      const cur = how === 'min' ? b.min[axis] : how === 'max' ? b.max[axis] : (b.min[axis] + b.max[axis]) / 2;
      o.position[axis] += target - cur;
    });
    vp.syncGizmo();
    app.commit();
  };
  app.undo = () => { if (sim.state === 'stopped' && history.undo()) app.emit('props'); };
  app.redo = () => { if (sim.state === 'stopped' && history.redo()) app.emit('props'); };

  // ---------- drawing, text and comments ----------
  vp.on('draw', ({ a, b, click, mode }) => {
    if (!app.editable()) return;
    let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
    if (click || x1 - x0 < 0.25 || z1 - z0 < 0.25) { x0 = a.x - 1; x1 = a.x + 1; z0 = a.z - 1; z1 = a.z + 1; }
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (mode === 'block') {
      const o = doc.create('cube', { pos: [cx, 0, cz], params: { w, d, h: 1 }, silent: true });
      doc.emit('tree'); doc.select([o.userData.n.id]);
    } else if (mode === 'slab') {
      const o = doc.create('floor', { pos: [cx, 0, cz], params: { width: w, depth: d, thick: 0.2 }, silent: true });
      doc.emit('tree'); doc.select([o.userData.n.id]);
    } else {
      const T = 0.2, H = 2.8, ids = [];
      ids.push(doc.create('floor', { pos: [cx, 0, cz], params: { width: w, depth: d, thick: 0.2 }, name: 'Room floor', silent: true }));
      ids.push(doc.create('wall', { pos: [cx, 0.2, z0], params: { length: w + T, height: H, thick: T }, name: 'Wall N', silent: true }));
      ids.push(doc.create(w > 2.5 ? 'wall_door' : 'wall', { pos: [cx, 0.2, z1], params: { length: w + T, height: H, thick: T }, name: 'Wall S', silent: true }));
      ids.push(doc.create('wall', { pos: [x0, 0.2, cz], rot: [0, Math.PI / 2, 0], params: { length: d - T, height: H, thick: T }, name: 'Wall W', silent: true }));
      ids.push(doc.create(d > 2.5 ? 'wall_window' : 'wall', { pos: [x1, 0.2, cz], rot: [0, Math.PI / 2, 0], params: { length: d - T, height: H, thick: T }, name: 'Wall E', silent: true }));
      doc.emit('tree');
      const g = doc.group(ids.map((o) => o.userData.n.id));
      g.userData.n.name = doc.uniqueName('Room'); g.name = g.userData.n.name;
      doc.emit('tree');
    }
    app.commit();
    toast(`Created ${mode === 'room' ? 'room' : mode} ${w.toFixed(1)} × ${d.toFixed(1)} m`);
  });

  vp.on('placeText', (pt) => {
    if (!app.editable()) return;
    const o = doc.create('label', { pos: [pt.x, pt.y, pt.z], params: { text: 'Label', size: 0.5 }, silent: true });
    doc.emit('tree'); doc.select([o.userData.n.id]);
    app.commit();
    vp.setTool('select');
    setTimeout(() => app.emit('focusParam', 'text'), 50);
  });
  vp.on('dblclick', (node) => { if (node.userData.n.prefab === 'label') setTimeout(() => app.emit('focusParam', 'text'), 30); });

  vp.on('placeComment', (pt) => {
    const c = { id: newId(), p: pt.toArray().map((v) => Math.round(v * 1000) / 1000), text: '', t: Date.now() };
    doc.comments.push(c);
    app.commit();
    app.emit('comments');
    app.emit('openComment', c.id);
  });

  // ---------- tools / views ----------
  app.setTool = (t) => { vp.setTool(t); };
  app.mode = 'editor'; // 'editor' | 'blender'
  app.setMode = (m) => {
    if (m === app.mode) return;
    if (m === 'blender' && sim.state !== 'stopped') sim.stop();
    app.mode = m;
    app.emit('mode', m);
    if (m === 'editor') requestAnimationFrame(() => vp.resize());
  };
  app.setBlueprint = (on) => {
    if (on) {
      app._preBp = vp.getCameraState();
      vp.setBlueprint(true);
      vp.setProjection('orthographic');
      vp.setView('top');
    } else {
      vp.setBlueprint(false);
      if (app._preBp) vp.setCameraState(app._preBp, true);
    }
    vp.syncGizmo();
  };
  app.togglePlay = () => sim.toggle();

  // ---------- projects ----------
  const setSceneChrome = () => { vp.applyBackground(); vp.applyLight(doc.meta.light); app.emit('meta'); app.emit('comments'); vp.emit('camera'); };
  app.loadJSON = (json, { fresh = false } = {}) => {
    sim.stop();
    if (vp.blueprint) vp.setBlueprint(false);
    doc.load(json);
    if (fresh) doc.meta.id = newId();
    doc.meta = { name: 'Untitled', bg: '#201D28', bgOpacity: 1, frame: 'responsive', ...doc.meta };
    if (doc.camera) vp.setCameraState(doc.camera);
    else vp.fit(null, { animate: false });
    history.reset();
    setSceneChrome();
    app.saveNow();
  };
  app.newProject = (tpl = BLANK) => {
    sim.stop();
    if (vp.blueprint) vp.setBlueprint(false);
    doc.clear();
    doc.comments = [];
    doc.meta = { name: tpl.id === 'blank' ? 'Untitled design' : tpl.name, id: newId(), bg: '#201D28', bgOpacity: 1, frame: 'responsive', ...(tpl.meta || {}) };
    tpl.build(doc);
    doc.emit('tree');
    doc.emit('selection', []);
    if (tpl.camera) vp.setCameraState(tpl.camera);
    else vp.resetView();
    history.reset();
    setSceneChrome();
    app.saveNow();
    app.emit('opened');
  };
  app.openProject = (id) => {
    const j = store.load(id);
    if (!j) return toast('Could not open that project', 'err');
    app.loadJSON(j);
    app.emit('opened');
  };
  app.rename = (name) => { doc.meta.name = name.trim() || 'Untitled'; app.commit(); app.emit('meta'); };
  app.setMeta = (patch, commit = true) => {
    Object.assign(doc.meta, patch);
    vp.applyBackground();
    app.emit('meta');
    commit ? app.commit() : app.commitSoon();
  };

  // ---------- export / import ----------
  /** Lightweight copy of a node tree for exporting: shares geometry, skips helpers, gives parts readable names. */
  const exportCopy = (o, nodeName) => {
    if (!o.visible || o.userData.bp || o.isSprite) return null;
    const n = o.userData.n;
    const name = n ? n.name : nodeName;
    let c;
    if (o.isMesh) {
      c = new THREE.Mesh(o.geometry, o.material);
      const slot = o.material?.userData?.slot;
      if (slot && !o.material.name) o.material.name = `${nodeName}_${slot}`;
      c.name = slot ? `${nodeName}_${slot}` : o.name || nodeName;
    } else {
      c = new THREE.Group();
      c.name = n ? n.name : o.name === '__content' ? `${nodeName}_parts` : o.name || '';
    }
    c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale);
    o.children.forEach((ch) => { const cc = exportCopy(ch, name); if (cc) c.add(cc); });
    return c;
  };
  /** Export root for all visible nodes, or for `objs`. With `world`, objects keep their world placement. */
  const exportRoot = (objs) => {
    const root = new THREE.Group();
    (objs || doc.childNodes(doc.root)).forEach((o) => {
      const c = exportCopy(o, o.userData.n?.name || 'Part');
      if (!c) return;
      if (objs) { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); }
      root.add(c);
    });
    root.updateMatrixWorld(true);
    return root;
  };
  /** Binary glTF of the scene (or just the selection). */
  app.buildGLB = (selectionOnly = false) => {
    const objs = selectionOnly ? app.selectedTop() : null;
    if (selectionOnly && !objs.length) throw new Error('Select something first');
    return new GLTFExporter().parseAsync(exportRoot(objs), { binary: true, onlyVisible: true });
  };
  const stripBlueprint = (root) => {
    const kill = [];
    root.traverse((o) => { if (o.userData.bp) kill.push(o); });
    kill.forEach((o) => o.parent.remove(o));
  };
  app.export = async (kind) => {
    const name = slug(doc.meta.name);
    try {
      if (kind === 'png') {
        const blob = await vp.capture({ useFrame: true });
        download(blob, `${name}.png`);
      } else if (kind === 'blueprint') {
        const wasBp = vp.blueprint;
        const prev = vp.getCameraState();
        if (!wasBp) { vp.setBlueprint(true); vp.setProjection('orthographic'); vp.setView('top'); }
        vp.fit(null, { animate: false });
        vp.setView('top');
        vp._tween && (vp._tween.t = 1);
        await new Promise((r) => setTimeout(r, 450));
        const blob = await vp.capture({ useFrame: false, grid: true });
        download(blob, `${name}-blueprint.png`);
        if (!wasBp) { vp.setBlueprint(false); vp.setCameraState(prev); }
      } else if (kind === 'glb' || kind === 'gltf') {
        const root = exportRoot();
        stripBlueprint(root);
        const res = await new GLTFExporter().parseAsync(root, { binary: kind === 'glb', onlyVisible: true });
        if (kind === 'glb') download(new Blob([res], { type: 'model/gltf-binary' }), `${name}.glb`);
        else download(new Blob([JSON.stringify(res)], { type: 'model/gltf+json' }), `${name}.gltf`);
      } else if (kind === 'obj') {
        const root = exportRoot(); stripBlueprint(root);
        download(new Blob([new OBJExporter().parse(root)], { type: 'text/plain' }), `${name}.obj`);
      } else if (kind === 'stl') {
        const root = exportRoot(); stripBlueprint(root);
        root.updateMatrixWorld(true);
        const dv = new STLExporter().parse(root, { binary: true });
        download(new Blob([dv], { type: 'model/stl' }), `${name}.stl`);
      } else if (kind === 'json') {
        doc.camera = vp.getCameraState();
        download(new Blob([JSON.stringify(doc.toJSON(), null, 1)], { type: 'application/json' }), `${name}.buildanything.json`);
      }
      toast('Export ready');
    } catch (e) {
      console.error(e);
      toast('Export failed: ' + (e.message || e), 'err');
    }
  };

  app.importFile = async (file) => {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.json')) {
        const json = JSON.parse(await file.text());
        if (!json.nodes) throw new Error('Not a BuildAnything scene file');
        app.loadJSON(json, { fresh: true });
        app.emit('opened');
        toast(`Opened “${json.meta?.name || file.name}”`);
      } else if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        await app.importModel(await file.arrayBuffer(), { name: file.name.replace(/\.[^.]+$/, ''), source: 'file' });
        toast('Model imported');
      } else throw new Error('Use a .glb, .gltf or BuildAnything .json file');
    } catch (e) {
      toast(e.message || 'Import failed', 'err');
    }
  };

  /** Store model bytes and add them to the scene as an imported model. */
  app.importModel = async (buffer, { name, source = 'file', credit, thumb, uid, fit = 2.5, point } = {}) => {
    const key = await putAsset({ name, source, credit, thumb, uid }, buffer);
    const obj = app.add('imported', { asset: key, name, credit, point, params: { fit } });
    app.emit('assets');
    return obj;
  };

  /** Re-add a model that is already in the browser's model store. */
  app.addStoredModel = (m, point) => app.add('imported', { asset: m.key, name: m.name, credit: m.credit, point, params: { fit: m.fit ?? 2.5 } });

  /** Download a free Sketchfab model with the user's API token and add it, keeping its credit. */
  app.importSketchfab = async (model, onProgress) => {
    const buf = await downloadGLB(model.uid, getToken(), onProgress);
    const obj = await app.importModel(buf, { name: model.name, source: 'sketchfab', uid: model.uid, thumb: model.thumb, credit: creditOf(model) });
    return obj;
  };

  /** Everything in the scene that needs attribution. */
  app.credits = () => {
    const out = new Map();
    doc.nodes.forEach((o) => { const c = o.userData.n.credit; if (c) out.set(c.url || c.title, c); });
    return [...out.values()];
  };

  // ---------- Blender bridge ----------
  app.blender = { lastSent: [], lastSentAll: false };
  app.sendToBlender = async ({ selectionOnly = false, replace = true } = {}) => {
    const glb = await app.buildGLB(selectionOnly);
    const res = await blender.sendGLB(glb, { replace });
    app.blender.lastSent = selectionOnly ? app.selectedTop().map((o) => o.userData.n.id) : [];
    app.blender.lastSentAll = !selectionOnly;
    return { ...res, bytes: glb.byteLength };
  };
  app.bringFromBlender = async ({ selectedOnly = false, replaceSent = false } = {}) => {
    if (!app.editable()) return null;
    const buf = await blender.fetchGLB({ selected: selectedOnly });
    const name = selectedOnly ? 'Blender selection' : 'Blender scene';
    if (replaceSent) {
      const ids = app.blender.lastSentAll ? doc.childNodes(doc.root).map((o) => o.userData.n.id) : app.blender.lastSent;
      const alive = ids.filter((id) => doc.nodes.has(id));
      if (alive.length) doc.remove(alive);
    }
    // fit 0 keeps Blender's own size and placement, so edits land exactly where the originals were
    const obj = await app.importModel(buf, { name, source: 'blender', fit: 0, point: new THREE.Vector3(0, 0, 0) });
    if (obj) { obj.position.set(0, 0, 0); app.commit(); }
    return { bytes: buf.byteLength };
  };

  // ---------- projects ----------
  /** Delete a saved project. Deleting the open one switches to the most recent other project (or a blank canvas). */
  app.deleteProject = (id) => {
    const wasCurrent = id === doc.meta.id;
    if (wasCurrent) clearTimeout(app._saveT); // don't let a pending autosave resurrect it
    store.remove(id);
    if (wasCurrent) {
      const next = store.list()[0];
      if (next) app.openProject(next.id);
      else app.newProject(BLANK);
    }
    app.emit('projects');
  };
  app.duplicateProject = () => {
    doc.camera = vp.getCameraState();
    const json = doc.toJSON();
    json.meta = { ...json.meta, id: newId(), name: `${doc.meta.name} copy` };
    store.save(json, '');
    app.openProject(json.meta.id);
    toast('Project duplicated');
  };

  app.shareLink = async () => {
    doc.camera = vp.getCameraState();
    const code = await encodeShare(doc.toJSON());
    return `${location.origin}${location.pathname}#s=${code}`;
  };

  app.publish = async () => {
    doc.camera = vp.getCameraState();
    let thumb = '';
    try { thumb = sceneThumb(doc.root, 300); } catch { /* ignore */ }
    const ok = store.publish(doc.toJSON(), thumb);
    toast(ok ? 'Published to your community shelf' : 'Storage full – could not publish', ok ? 'ok' : 'err');
  };

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
    if (document.querySelector('.scrim') || app.mode !== 'editor') return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const simOn = sim.state !== 'stopped';
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? app.redo() : app.undo(); }
    else if (mod && k === 'y') { e.preventDefault(); app.redo(); }
    else if (mod && k === 'd') { e.preventDefault(); app.duplicate(); }
    else if (mod && k === 'g') { e.preventDefault(); e.shiftKey ? app.ungroup() : app.group(); }
    else if (mod && k === 'a') { e.preventDefault(); app.selectAll(); }
    else if (mod && k === 'c') app.copy();
    else if (mod && k === 'v') app.paste();
    else if (mod && k === 's') { e.preventDefault(); app.saveNow(); toast('Saved'); }
    else if (mod) return;
    else if (k === ' ') { e.preventDefault(); app.togglePlay(); }
    else if (k === 'escape') { if (simOn) sim.stop(); else if (vp.tool !== 'select') app.setTool('select'); else doc.clearSelection(); }
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); app.delete(); }
    else if (k === 'v') app.setTool('select');
    else if (k === 'd') app.setTool('draw');
    else if (k === 't') app.setTool('text');
    else if (k === 'c') app.setTool('comment');
    else if (k === 'w') vp.setMode('translate');
    else if (k === 'e') vp.setMode('rotate');
    else if (k === 'r') vp.setMode('scale');
    else if (k === 'f') vp.fit(doc.selection.length ? app.selectedTop() : null);
    else if (k === 'g') vp.setSnap(!vp.snap);
    else if (k === 'b') app.setBlueprint(!vp.blueprint);
    else if (k === 'h') app.toggleVisible();
    else if (k === 'l') app.emit('openLibrary');
    else if (k === 'p') vp.setProjection(vp.isOrtho ? 'perspective' : 'orthographic');
    else if (k === '1') vp.resetView();
    else if (k === '2') vp.setView('front');
    else if (k === '3') vp.setView('right');
    else if (k === '4') vp.setView('top');
    else if (k === '?') app.emit('openHelp');
    else if (k.startsWith('arrow') && doc.selection.length) {
      e.preventDefault();
      const s = (e.shiftKey ? 4 : 1) * vp.snapSize;
      app.nudge(k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0, k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0);
    }
  });

  // ---------- boot ----------
  app.boot = async () => {
    const m = location.hash.match(/^#s=(.+)$/);
    if (m) {
      try {
        const json = await decodeShare(m[1]);
        json.meta = { ...json.meta, id: newId(), name: (json.meta?.name || 'Shared design') };
        history.reset();
        app.loadJSON(json);
        window.history.replaceState(null, '', location.pathname);
        toast('Opened shared design');
        return;
      } catch { toast('That share link is damaged', 'err'); }
    }
    const last = store.last();
    const j = last && store.load(last);
    if (j) app.loadJSON(j);
    else app.newProject(ALL_TEMPLATES[0]);
    history.reset();
  };
  return app;
}
