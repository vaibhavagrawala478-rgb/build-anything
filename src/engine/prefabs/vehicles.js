import { S, P, R90 } from '../builder.js';

const CAT = 'Vehicles';

/** Wheel assembly with tyre, rim and hub, lying on its side along X. Returns the group. */
const wheel = (b, r, w, parent, p = [0, 0, 0], spin = 0) => {
  const g = b.grp({ p, parent });
  const spinner = b.grp({ parent: g });
  b.cyl(r, r, w, 'tyre', { r: [0, 0, R90], parent: spinner }, 28);
  b.cyl(r * 0.62, r * 0.62, w + 0.02, 'rim', { r: [0, 0, R90], parent: spinner }, 20);
  b.cyl(r * 0.18, r * 0.18, w + 0.05, 'tyre', { r: [0, 0, R90], parent: spinner }, 10);
  for (let i = 0; i < 5; i++) b.box(w + 0.03, r * 1.1, 0.04, 'tyre', { parent: spinner, rad: 0.01 }).rotateX((i / 5) * Math.PI);
  if (spin) b.spin(spinner, 'x', spin);
  return g;
};

export default [
  {
    id: 'car', name: 'Car', cat: CAT, kw: ['car', 'sedan', 'automobile', 'hatchback', 'vehicle', 'taxi', 'coupe', 'auto'],
    slots: { body: S('#f4789a', 'primary', 0.35, 0.1), glass: S('#bfe6ff', 'fixed', 0.1, 0.1), tyre: S('#2a2733', 'fixed', 0.9), rim: S('#e9e7f3', 'fixed', 0.3, 0.8), light: S('#ffe27a', 'fixed', 0.3, 0, { glow: 0.7 }), tail: S('#ff4d5a', 'fixed', 0.3, 0, { glow: 0.5 }) },
    params: { length: P(3.6, 2.4, 5, 0.1, 'Length'), drive: P(0, 0, 120, 5, 'Wheel RPM') },
    build: (b, p) => {
      const L = p.length, W = 1.6, rw = 0.34;
      b.box(W, 0.5, L, 'body', { p: [0, rw + 0.32, 0], rad: 0.2 });
      b.box(W - 0.1, 0.5, L * 0.52, 'body', { p: [0, rw + 0.8, -L * 0.06], rad: 0.22 });
      b.box(W - 0.02, 0.38, L * 0.5, 'glass', { p: [0, rw + 0.82, -L * 0.06], rad: 0.16, shadow: false }).scale.set(1.0, 1, 1.0);
      b.box(W - 0.05, 0.08, L * 0.5, 'body', { p: [0, rw + 1.04, -L * 0.06], rad: 0.03 });
      for (const sx of [-1, 1]) {
        b.box(0.3, 0.12, 0.06, 'light', { p: [sx * 0.52, rw + 0.45, L / 2 + 0.005], rad: 0.03 });
        b.box(0.26, 0.1, 0.06, 'tail', { p: [sx * 0.55, rw + 0.45, -L / 2 - 0.005], rad: 0.03 });
        for (const z of [-1, 1]) wheel(b, rw, 0.26, null, [sx * (W / 2 - 0.02), rw, z * L * 0.31], p.drive);
      }
      b.box(W + 0.04, 0.1, 0.1, 'rim', { p: [0, rw + 0.14, L / 2], rad: 0.04 });
    },
  },
  {
    id: 'truck', name: 'Pickup Truck', cat: CAT, kw: ['truck', 'pickup', 'lorry', 'van', 'jeep', 'suv'],
    slots: { body: S('#6bb0e8', 'primary', 0.4, 0.1), glass: S('#bfe6ff', 'fixed', 0.1, 0.1), tyre: S('#2a2733', 'fixed', 0.9), rim: S('#e9e7f3', 'fixed', 0.3, 0.8), bed: S('#ffffff', 'tint', 0.6) },
    params: { drive: P(0, 0, 120, 5, 'Wheel RPM') },
    build: (b, p) => {
      const rw = 0.42;
      b.box(1.9, 0.5, 5, 'body', { p: [0, rw + 0.3, 0], rad: 0.15 });
      b.box(1.85, 0.8, 1.9, 'body', { p: [0, rw + 0.95, -1.05], rad: 0.22 });
      b.box(1.88, 0.5, 1.7, 'glass', { p: [0, rw + 1.02, -1.08], rad: 0.12, shadow: false });
      b.box(1.7, 0.4, 2, 'bed', { p: [0, rw + 0.72, 1.3], rad: 0.04 });
      for (const sx of [-1, 1]) for (const z of [-1.5, 1.5]) wheel(b, rw, 0.32, null, [sx * 0.95, rw, z], p.drive);
    },
  },
  {
    id: 'bus', name: 'Bus', cat: CAT, kw: ['bus', 'coach', 'minibus', 'transport', 'school bus'],
    slots: { body: S('#ffc233', 'primary', 0.4, 0.1), glass: S('#bfe6ff', 'fixed', 0.1, 0.1), tyre: S('#2a2733', 'fixed', 0.9), rim: S('#e9e7f3', 'fixed', 0.3, 0.8), stripe: S('#ffffff', 'secondary') },
    params: { drive: P(0, 0, 120, 5, 'Wheel RPM') },
    build: (b, p) => {
      const rw = 0.42;
      b.box(2.4, 2.1, 7, 'body', { p: [0, rw + 1.2, 0], rad: 0.25 });
      b.box(2.42, 0.18, 7.02, 'stripe', { p: [0, rw + 0.7, 0], rad: 0.05 });
      for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) b.box(0.04, 0.7, 0.9, 'glass', { p: [sx * 1.2, rw + 1.55, -2.4 + i * 1.2], rad: 0.1, shadow: false });
      b.box(2.2, 0.8, 0.04, 'glass', { p: [0, rw + 1.5, 3.5], rad: 0.1, shadow: false });
      for (const sx of [-1, 1]) for (const z of [-2.2, 2.2]) wheel(b, rw, 0.32, null, [sx * 1.15, rw, z], p.drive);
    },
  },
  {
    id: 'boat', name: 'Boat', cat: CAT, kw: ['boat', 'ship', 'sailboat', 'yacht', 'vessel', 'canoe', 'sail'],
    slots: { hull: S('#f4789a', 'primary', 0.5), deck: S('#f3e5cc', 'secondary'), sail: S('#ffffff', 'tint', 0.8), mast: S('#c89b6d', 'fixed') },
    params: { length: P(4, 2, 8, 0.25, 'Length') },
    build: (b, p) => {
      const L = p.length;
      const pts = [[0, 0], [0.55, 0.05], [0.95, 0.45], [1.0, 0.7], [0.88, 0.7], [0.0, 0.0]];
      const hull = b.lathe([[0, 0], [0.7, 0.12], [1, 0.6], [1, 0.75], [0.88, 0.75], [0.6, 0.22], [0, 0.12]], 'hull', { s: [0.9, 1, L / 2], p: [0, 0.1, 0] }, 32);
      b.cyl(0.85, 0.85, 0.05, 'deck', { p: [0, 0.78, 0], s: [0.95, 1, L / 2 - 0.1] }, 32);
      b.cyl(0.04, 0.05, L * 0.9, 'mast', { p: [0, 0.8 + L * 0.45, 0.1] }, 10);
      const sg = b.grp({ p: [0, 0, 0.1] });
      b.ext([[0, 1.1], [0, L * 0.82], [L * 0.38, 1.1]], 0.04, 'sail', { parent: sg, p: [0.04, 0, 0], r: [0, R90, 0] }, 0.01);
      b.osc(sg, 'y', 0.08, 0.3, 'rot');
    },
  },
  {
    id: 'airplane', name: 'Airplane', cat: CAT, kw: ['airplane', 'plane', 'aeroplane', 'jet', 'aircraft', 'propeller'],
    slots: { body: S('#ffffff', 'primary', 0.35, 0.1), wing: S('#f4789a', 'secondary', 0.4), prop: S('#2a2733', 'fixed') },
    params: { span: P(5, 2, 10, 0.5, 'Wingspan') },
    build: (b, p) => {
      b.cap(0.42, 2.4, 'body', { p: [0, 1.2, 0], r: [R90, 0, 0] });
      b.box(p.span, 0.08, 0.9, 'wing', { p: [0, 1.15, 0.2], rad: 0.04 });
      b.box(1.6, 0.07, 0.55, 'wing', { p: [0, 1.25, -1.85], rad: 0.03 });
      b.box(0.07, 0.8, 0.6, 'wing', { p: [0, 1.65, -1.9], rad: 0.03 });
      b.sph(0.12, 'prop', { p: [0, 1.2, 2.05] }, 12);
      const prop = b.grp({ p: [0, 1.2, 2.13] });
      b.box(0.1, 1.5, 0.04, 'prop', { parent: prop, rad: 0.015 });
      b.spin(prop, 'z', 600);
      b.box(0.3, 0.1, 0.3, 'prop', { p: [0, 1.65, 0.5], rad: 0.04 });
      b.cyl(0.03, 0.03, 0.4, 'prop', { p: [-0.35, 0.65, 0.6] });
      b.cyl(0.03, 0.03, 0.4, 'prop', { p: [0.35, 0.65, 0.6] });
      for (const sx of [-1, 1]) b.cyl(0.18, 0.18, 0.1, 'prop', { p: [sx * 0.35, 0.4, 0.6], r: [0, 0, R90] }, 16);
    },
  },
  {
    id: 'rocket', name: 'Rocket', cat: CAT, kw: ['rocket', 'spaceship', 'space', 'missile', 'shuttle', 'launch'],
    slots: { body: S('#ffffff', 'primary', 0.35, 0.1), nose: S('#f4789a', 'secondary', 0.4), fin: S('#f4789a', 'secondary', 0.4), window: S('#7fd6f4', 'fixed', 0.1, 0, { glow: 0.4 }), flame: S('#ffb02e', 'fixed', 0.5, 0, { glow: 1.2 }) },
    params: { height: P(3, 1.5, 8, 0.25, 'Height') },
    build: (b, p) => {
      const H = p.height, r = H * 0.14;
      b.cyl(r, r, H * 0.62, 'body', { p: [0, 0.4 + H * 0.31, 0] }, 32);
      b.cone(r, H * 0.3, 'nose', { p: [0, 0.4 + H * 0.62 + H * 0.15, 0] }, 32);
      b.cyl(r * 0.9, r * 1.05, 0.2, 'fin', { p: [0, 0.3, 0] }, 24);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const fg = b.grp({ p: [0, 0.35, 0], r: [0, -a, 0] });
        b.ext([[r * 0.9, 0], [r + 0.6, -0.1], [r * 0.9, 0.9]], 0.07, 'fin', { parent: fg }, 0.01);
      }
      b.cyl(r * 0.5, r * 0.5, 0.05, 'window', { p: [0, 0.4 + H * 0.46, r * 0.96], r: [R90, 0, 0] }, 20);
      b.cone(r * 0.6, 0.45, 'flame', { p: [0, 0.18, 0], r: [Math.PI, 0, 0] }, 16);
    },
  },
  {
    id: 'wheel', name: 'Wheel', cat: CAT, kw: ['wheel', 'tire', 'tyre', 'rim'], collider: 'cyl', colliderAxis: 'x',
    slots: { tyre: S('#2a2733', 'fixed', 0.9), rim: S('#e9e7f3', 'primary', 0.3, 0.8) },
    params: { r: P(0.4, 0.1, 1.5, 0.05, 'Radius'), rpm: P(0, 0, 200, 5, 'Spin RPM') },
    build: (b, p) => { wheel(b, p.r, p.r * 0.7, null, [0, p.r, 0], p.rpm); },
  },
];
