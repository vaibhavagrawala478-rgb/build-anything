import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Emitter } from './emitter.js';

export const PPU = 40; // pixels per world unit at 100 % zoom
export const FRAMES = {
  responsive: null,
  '1:1': 1, '16:9': 16 / 9, '4:3': 4 / 3, '3:2': 3 / 2, '9:16': 9 / 16, '3:4': 3 / 4, '2:3': 2 / 3, A4: 210 / 297,
};

const VIEW_DIRS = {
  iso: [1, 1, 1], front: [0, 0.06, 1], back: [0, 0.06, -1], left: [-1, 0.06, 0], right: [1, 0.06, 0], top: [0, 1, 0.0001],
};

const hexToColor = (h) => new THREE.Color(h);

function makeGrid() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color('#9d96bd') }, uStrength: { value: 1 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW; uniform vec3 uColor; uniform float uStrength;
      float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q); return 1.0-min(min(g.x,g.y),1.0); }
      void main(){
        float d=length(vW.xz); float fade=1.0-smoothstep(12.0,42.0,d);
        float a=(grid(vW.xz,1.0)*0.09+grid(vW.xz,5.0)*0.2)*fade*uStrength;
        if(a<0.002) discard; gl_FragColor=vec4(uColor,a); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), mat);
  m.position.y = -0.004;
  m.userData.noPick = true;
  return m;
}

export class Viewport extends Emitter {
  constructor(container, doc) {
    super();
    this.doc = doc;
    this.container = container;
    this.tool = 'select';
    this.snap = true;
    this.snapSize = 0.25;
    this.simulating = false;
    this.blueprint = false;
    this.drawMode = 'block';
    this.hover = null;
    this._tween = null;
    this._needsPick = false;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    r.domElement.className = 'gl';

    const scene = (this.scene = new THREE.Scene());
    scene.add(doc.root);

    // Lighting: soft toy-like look
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    this.hemi = new THREE.HemisphereLight('#ffffff', '#8a7fb0', 0.65);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff4e6', 2.1));
    sun.position.set(9, 16, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 5;
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#cfd8ff', 0.5);
    fill.position.set(-8, 6, -6);
    scene.add(fill);

    // Ground (shadow catcher) + grid
    this.shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.3 }));
    this.shadowGround.receiveShadow = true;
    this.shadowGround.userData.noPick = true;
    scene.add(this.shadowGround);
    this.grid = makeGrid();
    scene.add(this.grid);

    // Cameras
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -300, 600);
    this.persp = new THREE.PerspectiveCamera(35, 1, 0.1, 800);
    this.camera = this.ortho;
    this.ortho.zoom = 1.5;
    this.target = new THREE.Vector3(0, 0.8, 0);
    this.ortho.position.set(1, 1, 1).multiplyScalar(60).add(this.target);
    this.persp.position.set(1, 0.85, 1).multiplyScalar(22).add(this.target);

    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.target.copy(this.target);
    c.enableDamping = true;
    c.dampingFactor = 0.14;
    c.zoomToCursor = true;
    c.minZoom = 0.12; c.maxZoom = 10;
    c.minDistance = 0.5; c.maxDistance = 300;
    c.maxPolarAngle = Math.PI / 2 - 0.015;
    c.rotateSpeed = 0.8;
    c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.addEventListener('change', () => this.emit('camera'));
    c.update();

    // Gizmo
    const tc = (this.tc = new TransformControls(this.camera, r.domElement));
    tc.setSize(0.85);
    this.tcHelper = tc.getHelper();
    scene.add(this.tcHelper);
    this.pivot = new THREE.Object3D();
    scene.add(this.pivot);
    tc.addEventListener('dragging-changed', (e) => {
      c.enabled = !e.value;
      if (e.value) this._beginMulti();
      else this.emit('transformEnd');
    });
    tc.addEventListener('objectChange', () => { this._applyMulti(); this.emit('transform'); });
    this.setMode('translate');

    // Hover / selection highlight is drawn by the HTML overlay.
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._bindEvents();

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(container);
    this.resize();
    this.applyBackground();
    doc.on('selection', () => this.syncGizmo());
    doc.on('tree', () => { this.syncGizmo(); if (this.blueprint) this.applyBlueprint(); });
    doc.on('rebuilt', () => { this.syncGizmo(); if (this.blueprint) this.applyBlueprint(); });

    this._last = performance.now();
    const loop = (t) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this._last) / 1000);
      this._last = t;
      this._tick(dt, t);
    };
    requestAnimationFrame(loop);
  }

  // ---------- sizing & camera ----------
  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.size = { w, h };
    this.applyCameraSize(w, h);
    this.emit('resize');
  }

  applyCameraSize(w, h) {
    const o = this.ortho;
    o.left = -w / 2 / PPU; o.right = w / 2 / PPU; o.top = h / 2 / PPU; o.bottom = -h / 2 / PPU;
    o.updateProjectionMatrix();
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
  }

  get isOrtho() { return this.camera === this.ortho; }

  /** Zoom as a percentage, comparable between projections. */
  get zoomPercent() {
    if (this.isOrtho) return this.ortho.zoom * 100;
    const d = this.persp.position.distanceTo(this.controls.target);
    const ppu = this.size.h / (2 * d * Math.tan((this.persp.fov * Math.PI) / 360));
    return (ppu / PPU) * 100;
  }

  setZoomPercent(pct) {
    const z = pct / 100;
    if (this.isOrtho) this.ortho.zoom = THREE.MathUtils.clamp(z, 0.12, 10);
    else {
      const d = this.size.h / (2 * PPU * z * Math.tan((this.persp.fov * Math.PI) / 360));
      const dir = this.persp.position.clone().sub(this.controls.target).normalize();
      this.persp.position.copy(this.controls.target).addScaledVector(dir, d);
    }
    this.ortho.updateProjectionMatrix();
    this.controls.update();
    this.emit('camera');
  }

  setProjection(kind) {
    const toOrtho = kind === 'orthographic';
    if (toOrtho === this.isOrtho) return;
    const from = this.camera, to = toOrtho ? this.ortho : this.persp;
    const t = this.controls.target;
    const dir = from.position.clone().sub(t).normalize();
    if (toOrtho) {
      const pct = this.zoomPercent;
      to.position.copy(t).addScaledVector(dir, 60);
      this.ortho.zoom = THREE.MathUtils.clamp(pct / 100, 0.12, 10);
    } else {
      const d = this.size.h / (2 * PPU * this.ortho.zoom * Math.tan((this.persp.fov * Math.PI) / 360));
      to.position.copy(t).addScaledVector(dir, d);
    }
    to.quaternion.copy(from.quaternion);
    this.camera = to;
    this.controls.object = to;
    this.tc.camera = to;
    this.ortho.updateProjectionMatrix();
    this.persp.updateProjectionMatrix();
    this.controls.update();
    this.emit('camera');
    this.emit('projection');
  }

  setFov(fov) {
    const pct = this.zoomPercent;
    this.persp.fov = fov;
    this.persp.updateProjectionMatrix();
    if (!this.isOrtho) this.setZoomPercent(pct);
    this.emit('camera');
  }

  getCameraState() {
    return {
      ortho: this.isOrtho,
      pos: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
      zoom: this.ortho.zoom,
      fov: this.persp.fov,
    };
  }

  setCameraState(s, animate = false) {
    if (!s) return;
    if (s.ortho !== this.isOrtho) this.setProjection(s.ortho ? 'orthographic' : 'perspective');
    if (s.fov) { this.persp.fov = s.fov; this.persp.updateProjectionMatrix(); }
    const to = { pos: new THREE.Vector3(...s.pos), target: new THREE.Vector3(...s.target), zoom: s.zoom };
    if (!animate) {
      this.camera.position.copy(to.pos);
      this.controls.target.copy(to.target);
      this.ortho.zoom = s.zoom;
      this.ortho.updateProjectionMatrix();
      this.controls.update();
      this.emit('camera');
      return;
    }
    this._tween = {
      t: 0, dur: 0.55,
      from: { pos: this.camera.position.clone(), target: this.controls.target.clone(), zoom: this.ortho.zoom },
      to,
    };
  }

  setView(name) {
    const d = new THREE.Vector3(...VIEW_DIRS[name]).normalize();
    const t = this.controls.target.clone();
    const dist = this.isOrtho ? 60 : this.camera.position.distanceTo(t);
    this.setCameraState({
      ortho: this.isOrtho, pos: t.clone().addScaledVector(d, dist).toArray(), target: t.toArray(), zoom: this.ortho.zoom, fov: this.persp.fov,
    }, true);
  }

  resetView() {
    this.setCameraState({ ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 0.8, 0], zoom: 1.5, fov: 35 }, true);
  }

  fit(objs, { animate = true, pad = 1.25 } = {}) {
    let box = this.doc.bbox(objs && objs.length ? objs : this.doc.childNodes(this.doc.root));
    if (box.isEmpty()) box = new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(4, 2, 4));
    const c = box.getCenter(new THREE.Vector3());
    const rad = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2) * pad;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const minSide = Math.min(this.size.w, this.size.h);
    const zoom = THREE.MathUtils.clamp((minSide * 0.5) / (rad * PPU), 0.12, 10);
    let pos, z = zoom;
    if (this.isOrtho) pos = c.clone().addScaledVector(dir, 60);
    else {
      const d = rad / Math.sin((this.persp.fov * Math.PI) / 360);
      pos = c.clone().addScaledVector(dir, d);
      z = this.ortho.zoom;
    }
    this.setCameraState({ ortho: this.isOrtho, pos: pos.toArray(), target: c.toArray(), zoom: z, fov: this.persp.fov }, animate);
  }

  // ---------- appearance ----------
  applyBackground() {
    const m = this.doc.meta;
    const col = this.blueprint ? '#15428f' : m.bg;
    this.renderer.setClearColor(hexToColor(col), this.blueprint ? 1 : m.bgOpacity);
    this.container.style.setProperty('--vp-bg', col);
  }

  /** Sun direction / strength: { az (deg), el (deg), int } */
  applyLight(l) {
    const { az = 38, el = 52, int = 2.1 } = l || {};
    const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
    this.sun.position.set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).multiplyScalar(22);
    this.sun.intensity = int;
  }

  setBlueprint(on) {
    this.blueprint = on;
    this.applyBackground();
    this.shadowGround.visible = !on;
    this.sun.castShadow = !on;
    this.grid.material.uniforms.uColor.value.set(on ? '#cfe0ff' : '#9d96bd');
    this.grid.material.uniforms.uStrength.value = on ? 2.4 : 1;
    this.scene.environment = on ? null : this.scene.environment;
    if (on) this.applyBlueprint();
    else this.clearBlueprint();
    this.emit('blueprint', on);
  }

  applyBlueprint() {
    if (!this._bpFill) {
      this._bpFill = new THREE.MeshBasicMaterial({ color: '#1c4fa3', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      this._bpLine = new THREE.LineBasicMaterial({ color: '#e6f0ff' });
    }
    this.doc.root.traverse((o) => {
      if (!o.isMesh || o.userData.bp || o.userData.bpDone) return;
      if (o.material?.transparent && o.material.opacity < 0.5) return;
      o.userData.bpDone = true;
      o.userData.origMat = o.material;
      o.material = this._bpFill;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 22), this._bpLine);
      e.userData.bp = true;
      o.add(e);
    });
    this.doc.root.traverse((o) => { if (o.isSprite) o.material.color.set('#ffffff'); });
  }

  clearBlueprint() {
    const kill = [];
    this.doc.root.traverse((o) => {
      if (o.userData.bp) kill.push(o);
      if (o.userData.bpDone) { o.material = o.userData.origMat; delete o.userData.bpDone; delete o.userData.origMat; }
    });
    kill.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
  }

  // ---------- gizmo ----------
  setMode(m) {
    this.mode = m;
    this.tc.setMode(m);
    this.tc.setSpace(m === 'scale' ? 'local' : 'world');
    this.updateSnap();
    this.emit('mode', m);
  }

  updateSnap() {
    this.tc.setTranslationSnap(this.snap ? this.snapSize : null);
    this.tc.setRotationSnap(this.snap ? THREE.MathUtils.degToRad(15) : null);
    this.tc.setScaleSnap(this.snap ? 0.1 : null);
  }

  setSnap(on) { this.snap = on; this.updateSnap(); this.emit('snap', on); }

  syncGizmo() {
    const objs = this.doc.selectedObjects().filter((o) => !o.userData.n.locked);
    const show = objs.length > 0 && !this.simulating && this.tool === 'select' && !this.blueprint;
    if (!show) { this.tc.detach(); return; }
    if (objs.length === 1) { this.tc.attach(objs[0]); this.multi = null; return; }
    const box = this.doc.bbox(objs);
    box.getCenter(this.pivot.position);
    this.pivot.position.y = box.min.y;
    this.pivot.quaternion.identity();
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);
    this.tc.attach(this.pivot);
    this.multi = { objs };
  }

  _beginMulti() {
    if (!this.multi) return;
    this.pivot.updateMatrixWorld(true);
    this.multi.pivotInv = this.pivot.matrixWorld.clone().invert();
    this.multi.init = this.multi.objs.map((o) => { o.updateWorldMatrix(true, false); return o.matrixWorld.clone(); });
  }

  _applyMulti() {
    const m = this.multi;
    if (!m || !m.init) return;
    this.pivot.updateMatrixWorld(true);
    const delta = new THREE.Matrix4().multiplyMatrices(this.pivot.matrixWorld, m.pivotInv);
    m.objs.forEach((o, i) => {
      const w = new THREE.Matrix4().multiplyMatrices(delta, m.init[i]);
      const parentInv = new THREE.Matrix4().copy(o.parent.matrixWorld).invert();
      new THREE.Matrix4().multiplyMatrices(parentInv, w).decompose(o.position, o.quaternion, o.scale);
    });
  }

  // ---------- picking ----------
  _setRay(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray;
  }

  _visibleDeep(o) {
    for (let p = o; p && p !== this.scene; p = p.parent) if (!p.visible || p.userData.noPick) return false;
    return true;
  }

  pick(e) {
    this._setRay(e);
    const hits = this.ray.intersectObjects(this.doc.root.children, true);
    for (const h of hits) {
      if (h.object.userData.bp || !this._visibleDeep(h.object)) continue;
      if (h.object.isSprite && h.object.material.opacity === 0) continue;
      const node = this.doc.nodeOf(h.object);
      if (node) return { node, top: this.doc.topOf(node), point: h.point, hit: h };
    }
    return null;
  }

  groundPoint(e, y = 0) {
    this._setRay(e);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(plane, p) ? p : null;
  }

  /** Y of the highest surface below (x, y, z), ignoring the given node objects. */
  surfaceBelow(x, y, z, ignore = []) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y, z), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObjects(this.doc.root.children, true);
    for (const h of hits) {
      if (h.object.userData.bp || h.object.isSprite || !this._visibleDeep(h.object)) continue;
      const node = this.doc.nodeOf(h.object);
      if (ignore.some((o) => o === node || this.doc.isAncestor(o, node))) continue;
      if (h.object.material?.transparent && h.object.material.opacity < 0.5) continue;
      return h.point.y;
    }
    return 0;
  }

  /** Where a dragged-in component should land: the surface under the pointer, snapped on the grid. */
  dropPoint(e) {
    const p = this.pick(e);
    let pt;
    if (p) {
      pt = p.point.clone();
      pt.y = this.surfaceBelow(pt.x, pt.y + 0.05, pt.z);
    } else pt = this.groundPoint(e) || this.controls.target.clone();
    const y = pt.y;
    this.snapV(pt);
    pt.y = y;
    return pt;
  }

  snapV(v) {
    if (!this.snap) return v;
    const s = this.snapSize;
    v.x = Math.round(v.x / s) * s; v.z = Math.round(v.z / s) * s;
    return v;
  }

  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.size.w, y: (-p.y * 0.5 + 0.5) * this.size.h, behind: p.z > 1 };
  }

  // ---------- tools ----------
  setTool(t) {
    this.tool = t;
    this.container.dataset.tool = t;
    this.syncGizmo();
    this.emit('tool', t);
  }

  _bindEvents() {
    const el = this.renderer.domElement;
    const box = this.container;
    box.addEventListener('pointerdown', (e) => this._down(e), { capture: true });
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));
    el.addEventListener('dblclick', (e) => {
      if (this.simulating) return;
      const p = this.pick(e);
      if (p) { this.doc.select([p.node.userData.n.id]); this.emit('dblclick', p.node); }
    });
    el.addEventListener('pointerleave', () => { this.hover = null; this.emit('hover', null); });
    el.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('application/x-ba')); } catch { return; }
      this.emit('drop', payload, this.dropPoint(e));
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Shift') this.shift = true; });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.shift = false; });
  }

  _down(e) {
    if (e.button !== 0 || e.target !== this.renderer.domElement) return;
    if (this.tc.axis) return; // gizmo handle under the cursor
    const pick = this.pick(e);
    this.dn = { x: e.clientX, y: e.clientY, pick, moved: false, id: e.pointerId };

    if (this.simulating) {
      this.emit('poke', { ray: this._setRay(e).ray.clone(), pick });
      this.dn.sim = true;
      return;
    }
    if (this.tool === 'select') {
      if (pick) {
        const id = pick.top.userData.n.id;
        const sel = this.doc.selection;
        if (e.shiftKey) this.doc.select([id], { add: true });
        else if (!sel.includes(id)) this.doc.select([id]);
        const movable = this.doc.selectedObjects().filter((o) => !o.userData.n.locked);
        const gp = this.groundPoint(e, pick.point.y);
        if (gp && movable.length && !e.shiftKey) {
          this.dn.drag = { objs: movable, start: gp, y: pick.point.y, init: movable.map((o) => o.position.clone()), began: false };
          this.controls.enabled = false;
        }
      }
    } else if (this.tool === 'draw') {
      const gp = this.groundPoint(e);
      if (gp) {
        this.dn.draw = { a: this.snapV(gp.clone()), b: null };
        this.controls.enabled = false;
      }
    }
  }

  _move(e) {
    if (!this.dn || e.pointerId !== this.dn.id) {
      if (e.target === this.renderer.domElement && !this.simulating && !this.tc.dragging) {
        this._hoverEvent = e;
        this._needsPick = true;
      }
      return;
    }
    const d = this.dn;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
    if (d.drag && d.moved) {
      const gp = this.groundPoint(e, d.drag.y);
      if (!gp) return;
      if (!d.drag.began) { d.drag.began = true; this.emit('dragStart'); }
      const delta = gp.clone().sub(d.drag.start);
      d.drag.objs.forEach((o, i) => {
        const wp = new THREE.Vector3();
        o.parent.updateWorldMatrix(true, false);
        const startWorld = d.drag.init[i].clone().applyMatrix4(o.parent.matrixWorld);
        wp.copy(startWorld).add(delta);
        if (this.snap) { const s = this.snapSize; wp.x = Math.round(wp.x / s) * s; wp.z = Math.round(wp.z / s) * s; }
        wp.y = startWorld.y;
        o.position.copy(o.parent.worldToLocal(wp));
      });
      this.emit('transform');
    }
    if (d.draw) {
      const gp = this.groundPoint(e);
      if (gp) { d.draw.b = this.snapV(gp.clone()); this.emit('drawPreview', d.draw); }
    }
  }

  _up(e) {
    const d = this.dn;
    if (!d || e.pointerId !== d.id) return;
    this.dn = null;
    this.controls.enabled = true;
    if (d.sim) return;
    if (d.drag?.began) { this.emit('transformEnd'); return; }
    if (d.draw) {
      const a = d.draw.a, b = d.draw.b || a;
      this.emit('drawPreview', null);
      this.emit('draw', { a, b, click: !d.moved, mode: this.drawMode });
      return;
    }
    if (d.moved) return; // orbit/pan gesture
    if (this.tool === 'select') {
      if (!d.pick && !e.shiftKey) this.doc.clearSelection();
      // a plain click on a member of a multi-selection collapses to it
      else if (d.pick && !e.shiftKey && this.doc.selection.length > 1) this.doc.select([d.pick.top.userData.n.id]);
    } else if (this.tool === 'text' || this.tool === 'comment') {
      const pt = d.pick ? d.pick.point.clone() : this.groundPoint(e);
      if (pt) this.emit(this.tool === 'text' ? 'placeText' : 'placeComment', pt, d.pick?.top.userData.n.id);
    }
  }

  // ---------- frame / capture ----------
  frameRect() {
    const ratio = FRAMES[this.doc.meta.frame];
    if (!ratio) return null;
    const { w, h } = this.size;
    const mx = 36, my = 36;
    let fw = w - mx * 2, fh = fw / ratio;
    if (fh > h - my * 2) { fh = h - my * 2; fw = fh * ratio; }
    return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh };
  }

  async capture({ maxSide = 2400, useFrame = true, grid = false } = {}) {
    const r = this.renderer;
    const { w: vw, h: vh } = this.size;
    const rect = useFrame ? this.frameRect() : null;
    const fw = rect ? rect.w : vw, fh = rect ? rect.h : vh;
    const k = maxSide / Math.max(fw, fh);
    const W = Math.round(fw * k), H = Math.round(fh * k);
    const oldPR = r.getPixelRatio();
    const oldFov = this.persp.fov;
    const gridVis = this.grid.visible, tcVis = this.tcHelper.visible;
    this.grid.visible = grid; this.tcHelper.visible = false;
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    this.applyCameraSize(fw, fh);
    if (!this.isOrtho) {
      this.persp.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan((oldFov * Math.PI) / 360) * (fh / vh)));
      this.persp.updateProjectionMatrix();
    }
    r.render(this.scene, this.camera);
    const blob = await new Promise((res) => r.domElement.toBlob(res, 'image/png'));
    this.persp.fov = oldFov;
    r.setPixelRatio(oldPR);
    r.setSize(vw, vh, false);
    this.applyCameraSize(vw, vh);
    this.grid.visible = gridVis; this.tcHelper.visible = tcVis;
    return blob;
  }

  // ---------- main tick ----------
  _tick(dt, t) {
    if (this._tween) {
      const tw = this._tween;
      tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.from.pos, tw.to.pos, k);
      this.controls.target.lerpVectors(tw.from.target, tw.to.target, k);
      this.ortho.zoom = THREE.MathUtils.lerp(tw.from.zoom, tw.to.zoom, k);
      this.ortho.updateProjectionMatrix();
      if (tw.t >= 1) this._tween = null;
    }
    this.controls.update();
    if (this._needsPick) {
      this._needsPick = false;
      const p = this.pick(this._hoverEvent);
      const id = p?.top.userData.n.id || null;
      if (id !== this.hover) { this.hover = id; this.emit('hover', id); }
    }
    this.emit('tick', dt, t);
    this.renderer.render(this.scene, this.camera);
    this.emit('rendered');
  }
}
