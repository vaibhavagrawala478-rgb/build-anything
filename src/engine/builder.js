import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Slot definition helper: colour + how the generator may recolour it. */
export const S = (c, role = 'fixed', r = 0.6, m = 0, extra = {}) => ({ c, role, r, m, ...extra });
/** Numeric parameter helper. */
export const P = (v, min, max, step = 0.1, label) => ({ v, min, max, step, label });

export const FINISHES = {
  default: null,
  matte: { r: 0.95, m: 0 },
  glossy: { r: 0.18, m: 0.05 },
  metal: { r: 0.28, m: 0.92 },
  clay: { r: 1, m: 0 },
  glass: { r: 0.05, m: 0, opacity: 0.38 },
  glow: { r: 0.5, m: 0, glow: true },
};

/**
 * Builder wraps the boilerplate of assembling a procedural component out of
 * rounded boxes, cylinders and so on. Every mesh gets a material from a named
 * "slot", so users can recolour parts of a component independently.
 */
export class Builder {
  constructor(def, colors = {}, finish = 'default') {
    this.def = def;
    this.colors = colors;
    this.finish = finish;
    this.group = new THREE.Group();
    this.group.name = '__content';
    this.mats = {};
    this.anims = [];
    this.group.userData.anims = this.anims;
  }

  mat(slot) {
    if (this.mats[slot]) return this.mats[slot];
    const d = this.def.slots?.[slot] || S('#cccccc');
    const color = this.colors[slot] ?? d.c;
    const fin = FINISHES[this.finish];
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: fin ? fin.r : d.r,
      metalness: fin ? fin.m : d.m,
    });
    if (d.opacity != null || fin?.opacity != null) {
      m.transparent = true;
      m.opacity = fin?.opacity ?? d.opacity;
    }
    if (fin?.glow || d.glow) {
      m.emissive = new THREE.Color(color);
      m.emissiveIntensity = fin?.glow ? 0.55 : d.glow;
    }
    m.userData.slot = slot;
    this.mats[slot] = m;
    return m;
  }

  _place(mesh, o = {}) {
    if (o.p) mesh.position.set(...o.p);
    if (o.r) mesh.rotation.set(...o.r);
    if (o.s) mesh.scale.set(...o.s);
    mesh.castShadow = o.shadow !== false;
    mesh.receiveShadow = true;
    (o.parent || this.group).add(mesh);
    return mesh;
  }

  mesh(geo, slot, o) {
    return this._place(new THREE.Mesh(geo, this.mat(slot)), o);
  }

  /** Rounded box, centred on `p`. Radius defaults to a soft toy-like bevel. */
  box(w, h, d, slot, o = {}) {
    const min = Math.min(w, h, d);
    const rad = o.rad ?? Math.min(0.07, min * 0.28);
    const geo = rad > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d);
    return this.mesh(geo, slot, o);
  }
  cyl(rt, rb, h, slot, o = {}, seg = 28) {
    return this.mesh(new THREE.CylinderGeometry(rt, rb, h, seg), slot, o);
  }
  sph(r, slot, o = {}, seg = 24) {
    return this.mesh(new THREE.SphereGeometry(r, seg, Math.max(12, seg * 0.7 | 0)), slot, o);
  }
  cone(r, h, slot, o = {}, seg = 28) {
    return this.mesh(new THREE.ConeGeometry(r, h, seg), slot, o);
  }
  tor(R, r, slot, o = {}, seg = 12, tubeSeg = 36) {
    return this.mesh(new THREE.TorusGeometry(R, r, seg, tubeSeg), slot, o);
  }
  cap(r, len, slot, o = {}) {
    return this.mesh(new THREE.CapsuleGeometry(r, len, 6, 16), slot, o);
  }
  lathe(points, slot, o = {}, seg = 28) {
    return this.mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg), slot, o);
  }
  /** Extrude a 2D polygon (in XY) along Z by `depth`, centred in Z. */
  ext(points, depth, slot, o = {}, bevel = 0.02) {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12,
    });
    geo.translate(0, 0, -depth / 2);
    return this.mesh(geo, slot, o);
  }
  /** Empty sub group (useful for animated parts). */
  grp(o = {}) {
    const g = new THREE.Group();
    if (o.p) g.position.set(...o.p);
    if (o.r) g.rotation.set(...o.r);
    (o.parent || this.group).add(g);
    return g;
  }

  /** Register a built-in animation that plays during Simulate. */
  spin(obj, axis, rpm, phase = 0) {
    this.anims.push({ kind: 'spin', obj, axis, rpm, phase });
  }
  osc(obj, axis, amp, hz, mode = 'pos', phase = 0) {
    this.anims.push({ kind: 'osc', obj, axis, amp, hz, mode, phase });
  }
  wrap(objs, axis, speed, span) {
    this.anims.push({ kind: 'wrap', objs, axis, speed, span });
  }
}

export const rad = (d) => (d * Math.PI) / 180;
export const R90 = Math.PI / 2;
