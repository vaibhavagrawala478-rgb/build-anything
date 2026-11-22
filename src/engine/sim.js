import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { Emitter } from './emitter.js';

const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const TAU = Math.PI * 2;

/** Bounding box of an object's meshes in the object's own (unscaled) local space. */
function localBox(obj) {
  obj.updateWorldMatrix(true, true);
  const inv = obj.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.bp) return;
    for (let p = m; p && p !== obj; p = p.parent) if (!p.visible) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
  });
  return box;
}

/** Convex hull collider built from an object's meshes (used for ramps and other non-box shapes). */
function hullShape(obj, ws) {
  try {
    const inv = obj.matrixWorld.clone().invert();
    const seen = new Map();
    const pts = [];
    obj.traverse((m) => {
      if (!m.isMesh || m.userData.bp) return;
      const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
      const pa = m.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(mat).multiply(ws);
        const k = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
        if (!seen.has(k)) { seen.set(k, 1); pts.push(v); }
      }
    });
    const geo = new ConvexGeometry(pts);
    const pos = geo.attributes.position;
    const idx = new Map(), verts = [], faces = [];
    const vid = (i) => {
      const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      if (!idx.has(k)) { idx.set(k, verts.length); verts.push(new CANNON.Vec3(pos.getX(i), pos.getY(i), pos.getZ(i))); }
      return idx.get(k);
    };
    for (let i = 0; i < pos.count; i += 3) faces.push([vid(i), vid(i + 1), vid(i + 2)]);
    // three's ConvexGeometry already winds faces counter-clockwise seen from outside, which is what cannon expects
    return new CANNON.ConvexPolyhedron({ vertices: verts, faces });
  } catch (e) {
    console.warn('hull collider failed', e);
    return null;
  }
}

/**
 * Runs the interactive simulation: rigid-body physics (cannon-es), per-node
 * motion (spin / swing / slide) and the built-in animation of mechanical parts.
 */
export class Sim extends Emitter {
  constructor(doc, viewport) {
    super();
    this.doc = doc;
    this.vp = viewport;
    this.state = 'stopped';
    this.t = 0;
    this.bodies = [];
    this.snap = [];
    viewport.on('tick', (dt) => this.update(dt));
    viewport.on('poke', ({ ray, pick }) => this.poke(ray, pick));
  }

  get running() { return this.state === 'playing'; }

  play() {
    if (this.state === 'stopped') this._start();
    this.state = 'playing';
    this.vp.simulating = true;
    this.vp.syncGizmo();
    this.emit('state', this.state);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.emit('state', this.state);
  }

  toggle() { this.running ? this.pause() : this.play(); }

  stop() {
    if (this.state === 'stopped') return;
    this._restore();
    this.state = 'stopped';
    this.vp.simulating = false;
    this.world = null;
    this.bodies = [];
    this.vp.syncGizmo();
    this.emit('state', this.state);
    this.emit('restored');
  }

  _start() {
    this.t = 0;
    this.snap = [];
    this.anims = [];
    this.doc.selection.length && this.doc.clearSelection();
    const world = (this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) }));
    world.allowSleep = true;
    world.solver.iterations = 14;
    world.defaultContactMaterial.friction = 0.45;
    world.defaultContactMaterial.restitution = 0.12;
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: world.defaultMaterial });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(ground);

    this.bodies = [];
    const withPhysics = new Set();
    this.doc.each((o) => {
      const n = o.userData.n;
      this.snap.push({ o, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone() });
      // built-in part animations
      o.userData.content?.userData.anims?.forEach((a) => this._prepAnim(a));
      if (n.physics === 'none' || !o.visible) return;
      for (let p = o.parent; p; p = p.parent) if (withPhysics.has(p)) return; // ancestor already a body
      withPhysics.add(o);
      this._addBody(o, world);
    });
  }

  _prepAnim(a) {
    const rec = (o) => ({ o, pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() });
    if (a.kind === 'wrap') a.base = a.objs.map(rec);
    else if (a.kind === 'crank') a.base = [rec(a.crank), rec(a.rod), rec(a.head)];
    else if (a.kind === 'spring') a.base = [rec(a.coil), rec(a.top)];
    else a.base = [rec(a.obj)];
    this.anims.push(a);
  }

  _addBody(o, world) {
    const n = o.userData.n;
    const def = o.userData.def;
    o.updateWorldMatrix(true, true);
    const box = localBox(o);
    if (box.isEmpty()) return;
    const ws = o.getWorldScale(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).multiply(ws);
    const center = box.getCenter(new THREE.Vector3()).multiply(ws);
    const kinematic = n.physics === 'static' && (n.motion.type !== 'none');
    const mass = n.physics === 'dynamic' ? Math.max(0.05, n.mass) : 0;
    const hint = def?.collider || 'box';
    let shape;
    if (hint === 'sphere') shape = new CANNON.Sphere(Math.max(size.x, size.y, size.z) / 2);
    else if (hint === 'cyl') shape = new CANNON.Cylinder(Math.max(size.x, size.z) / 2, Math.max(size.x, size.z) / 2, size.y, 16);
    else if (hint === 'hull') shape = hullShape(o, ws) || new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    else shape = new CANNON.Box(new CANNON.Vec3(Math.max(size.x, 0.02) / 2, Math.max(size.y, 0.02) / 2, Math.max(size.z, 0.02) / 2));
    const mat = new CANNON.Material();
    const bounce = n.params.bounce ?? (hint === 'sphere' ? 0.5 : 0.12);
    const round = hint === 'sphere' || hint === 'cyl';
    // only special bodies (round / bouncy) get their own material; everything else shares the world default
    if (round || n.params.bounce != null) {
      world.addContactMaterial(new CANNON.ContactMaterial(mat, world.defaultMaterial, { friction: round ? 0.02 : 0.45, restitution: bounce }));
      shape.material = mat;
    } else shape.material = world.defaultMaterial;
    const body = new CANNON.Body({
      mass, type: kinematic ? CANNON.Body.KINEMATIC : mass > 0 ? CANNON.Body.DYNAMIC : CANNON.Body.STATIC,
      allowSleep: !round, sleepSpeedLimit: 0.1, sleepTimeLimit: 0.8, linearDamping: round ? 0.08 : 0.02, angularDamping: round ? 0.03 : 0.12,
    });
    const off = hint === 'hull' && shape instanceof CANNON.ConvexPolyhedron ? new CANNON.Vec3() : new CANNON.Vec3(center.x, center.y, center.z);
    body.addShape(shape, off);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    o.matrixWorld.decompose(wp, wq, new THREE.Vector3());
    body.position.set(wp.x, wp.y, wp.z);
    body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
    world.addBody(body);
    this.bodies.push({ o, body, kinematic, ws, last: wp.clone() });
  }

  _restore() {
    this.snap.forEach(({ o, pos, quat, scale }) => { o.position.copy(pos); o.quaternion.copy(quat); o.scale.copy(scale); });
    this.anims?.forEach((a) => a.base.forEach(({ o, pos, rot, scale }) => { o.position.copy(pos); o.rotation.copy(rot); o.scale.copy(scale); }));
    this.anims = [];
  }

  update(dt) {
    if (this.state !== 'playing') return;
    this.t += dt;
    const t = this.t;

    // node-level motion
    this.snap.forEach(({ o, pos, quat }) => {
      const m = o.userData.n.motion;
      if (m.type === 'none' || (o.userData.n.physics === 'dynamic')) return;
      const ax = AX[m.axis] || AX.y;
      if (m.type === 'spin') {
        o.quaternion.copy(quat).multiply(new THREE.Quaternion().setFromAxisAngle(ax, (m.speed * TAU * t) / 60));
      } else if (m.type === 'swing') {
        o.quaternion.copy(quat).multiply(new THREE.Quaternion().setFromAxisAngle(ax, THREE.MathUtils.degToRad(m.amp) * Math.sin((TAU * m.speed * t) / 60)));
      } else if (m.type === 'slide') {
        o.position.copy(pos).addScaledVector(ax.clone().applyQuaternion(quat), m.amp * Math.sin((TAU * m.speed * t) / 60));
      }
    });

    // part animations
    this.anims.forEach((a) => this._runAnim(a, t));

    // physics
    if (this.world) {
      this.bodies.forEach((b) => {
        if (!b.kinematic) return;
        const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
        b.o.updateWorldMatrix(true, false);
        b.o.matrixWorld.decompose(wp, wq, new THREE.Vector3());
        b.body.velocity.set((wp.x - b.last.x) / Math.max(dt, 1e-4), (wp.y - b.last.y) / Math.max(dt, 1e-4), (wp.z - b.last.z) / Math.max(dt, 1e-4));
        b.body.position.set(wp.x, wp.y, wp.z);
        b.body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
        b.last.copy(wp);
      });
      this.world.step(1 / 60, dt, 4);
      this.bodies.forEach((b) => {
        if (b.kinematic || b.body.type !== CANNON.Body.DYNAMIC) return;
        const { position: p, quaternion: q } = b.body;
        const world = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion(q.x, q.y, q.z, q.w), b.ws);
        b.o.parent.updateWorldMatrix(true, false);
        const local = new THREE.Matrix4().multiplyMatrices(b.o.parent.matrixWorld.clone().invert(), world);
        local.decompose(b.o.position, b.o.quaternion, b.o.scale);
      });
    }
  }

  _runAnim(a, t) {
    switch (a.kind) {
      case 'spin': {
        const [{ o, rot }] = a.base;
        o.rotation[a.axis] = rot[a.axis] + (a.rpm * TAU * t) / 60;
        break;
      }
      case 'osc': {
        const [{ o, pos, rot }] = a.base;
        const v = a.amp * Math.sin(TAU * a.hz * t + (a.phase || 0));
        if (a.mode === 'rot') o.rotation[a.axis] = rot[a.axis] + v;
        else o.position[a.axis] = pos[a.axis] + (a.offset || 0) + v;
        break;
      }
      case 'wrap': {
        const s = a.speed * t;
        a.base.forEach(({ o, pos }) => {
          o.position[a.axis] = ((((pos[a.axis] + s + a.span / 2) % a.span) + a.span) % a.span) - a.span / 2;
        });
        break;
      }
      case 'crank': {
        const th = (a.rpm * TAU * t) / 60;
        const { r, l, base } = a;
        const s = Math.sqrt(Math.max(0, l * l - r * r * Math.sin(th) ** 2));
        a.crank.rotation.z = -th;
        a.rod.position.set(a.base[1].pos.x + r * Math.sin(th), base + r * Math.cos(th), a.rod.position.z);
        a.rod.rotation.z = Math.asin((r * Math.sin(th)) / l) * 1;
        a.head.position.y = base + r * Math.cos(th) + s;
        break;
      }
      case 'spring': {
        const f = 1 - a.amp * (0.5 + 0.5 * Math.sin(TAU * 0.9 * t));
        a.coil.scale.y = f;
        a.top.position.y = 0.1 + (a.h - 0.1) * f;
        break;
      }
    }
  }

  poke(ray, pick) {
    if (!this.world || !pick) return;
    let o = pick.top;
    const rec = this.bodies.find((b) => b.o === o || this.doc.isAncestor(b.o, o) || b.o === pick.node);
    if (!rec || rec.body.type !== CANNON.Body.DYNAMIC) return;
    const dir = ray.direction.clone();
    dir.y = 0;
    dir.normalize().multiplyScalar(5).setY(3.2);
    const k = Math.max(0.5, rec.body.mass);
    const rel = new CANNON.Vec3(pick.point.x - rec.body.position.x, pick.point.y - rec.body.position.y, pick.point.z - rec.body.position.z);
    rec.body.wakeUp();
    rec.body.applyImpulse(new CANNON.Vec3(dir.x * k, dir.y * k, dir.z * k), rel);
  }
}
