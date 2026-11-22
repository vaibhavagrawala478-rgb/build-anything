import * as THREE from 'three';
import { S, P, R90 } from '../builder.js';

const CAT = 'Machines';
export const GEAR_MODULE = 0.1; // pitch diameter = teeth * module  → any two gears mesh at (t1+t2)*module/2

export const gearRadius = (teeth) => (teeth * GEAR_MODULE) / 2;

function gearShape(teeth, hole) {
  const rp = gearRadius(teeth), add = GEAR_MODULE * 0.95, ded = GEAR_MODULE * 1.1;
  const ro = rp + add, rr = rp - ded, da = (Math.PI * 2) / teeth;
  const sh = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a = i * da;
    const pts = [[rr, a], [rr, a + da * 0.08], [ro, a + da * 0.3], [ro, a + da * 0.52], [rr, a + da * 0.74]];
    pts.forEach(([r, ang], j) => (i === 0 && j === 0 ? sh.moveTo(Math.cos(ang) * r, Math.sin(ang) * r) : sh.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)));
  }
  sh.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  sh.holes.push(h);
  return sh;
}

class HelixCurve extends THREE.Curve {
  constructor(r, h, turns) { super(); this.r = r; this.h = h; this.turns = turns; }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r);
  }
}

export default [
  {
    id: 'gear', name: 'Gear', cat: CAT, kw: ['gear', 'cog', 'cogwheel', 'sprocket', 'mechanism', 'gearbox', 'clockwork'],
    slots: { teeth: S('#ffc233', 'primary', 0.35, 0.7), hub: S('#8a86b3', 'secondary', 0.3, 0.8) },
    params: {
      teeth: { v: 16, min: 6, max: 60, step: 1, label: 'Teeth' },
      thick: P(0.25, 0.08, 1, 0.01, 'Thickness'),
      rpm: P(12, -120, 120, 1, 'Speed (RPM)'),
      phase: P(0, 0, 360, 1, 'Phase °'),
      orient: { v: 0, options: ['Upright', 'Flat'], label: 'Orientation' },
    },
    build: (b, p) => {
      const rp = gearRadius(p.teeth);
      const root = b.grp({ p: [0, p.orient ? p.thick / 2 : rp + GEAR_MODULE, 0], r: p.orient ? [-R90, 0, 0] : [0, 0, 0] });
      const spinner = b.grp({ parent: root });
      const geo = new THREE.ExtrudeGeometry(gearShape(p.teeth, Math.max(0.05, rp * 0.18)), { depth: p.thick, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 6 });
      geo.translate(0, 0, -p.thick / 2);
      b.mesh(geo, 'teeth', { parent: spinner });
      b.cyl(rp * 0.3, rp * 0.3, p.thick + 0.06, 'hub', { r: [R90, 0, 0], parent: spinner }, 20);
      b.cyl(Math.max(0.03, rp * 0.1), Math.max(0.03, rp * 0.1), p.thick + 0.14, 'hub', { r: [R90, 0, 0], parent: spinner }, 12);
      spinner.rotation.z = (p.phase * Math.PI) / 180;
      b.spin(spinner, 'z', p.rpm, (p.phase * Math.PI) / 180);
    },
  },
  {
    id: 'piston', name: 'Piston & Crank', cat: CAT, kw: ['piston', 'engine', 'crank', 'crankshaft', 'cylinder engine', 'motor engine'],
    slots: { block: S('#8a86b3', 'primary', 0.35, 0.6), rod: S('#cfcbe0', 'fixed', 0.3, 0.9), head: S('#ffc233', 'secondary', 0.3, 0.7), crank: S('#f4789a', 'fixed', 0.4, 0.5) },
    params: { rpm: P(30, 0, 200, 1, 'Speed (RPM)'), stroke: P(0.35, 0.15, 0.6, 0.01, 'Crank radius') },
    build: (b, p) => {
      const r = p.stroke, l = r * 3.2, base = 0.9;
      b.box(0.9, 0.5, 0.7, 'block', { p: [0, 0.25, 0], rad: 0.05 });
      b.box(0.62, 1.7, 0.5, 'block', { p: [0, base + 1.2, 0], rad: 0.04 });
      b.box(0.3, 1.4, 0.04, 'rod', { p: [0, base + 1.2, 0.27], rad: 0.01 });
      const crank = b.grp({ p: [0, base, 0.45] });
      b.cyl(r * 1.3, r * 1.3, 0.1, 'crank', { r: [R90, 0, 0], parent: crank }, 28);
      b.cyl(0.06, 0.06, 0.2, 'rod', { p: [0, r, 0.06], r: [R90, 0, 0], parent: crank }, 12);
      const rod = b.grp({ p: [0, base + r, 0.52] });
      b.box(0.09, l, 0.05, 'rod', { p: [0, l / 2, 0], parent: rod, rad: 0.02 });
      const head = b.grp({ p: [0, base + l + r, 0.5] });
      b.box(0.5, 0.36, 0.34, 'head', { p: [0, 0.18, 0], parent: head, rad: 0.05 });
      b.anims.push({ kind: 'crank', crank, rod, head, r, l, base, rpm: p.rpm });
    },
  },
  {
    id: 'motor', name: 'Motor', cat: CAT, kw: ['motor', 'generator', 'dynamo', 'actuator'],
    slots: { shell: S('#6bb0e8', 'primary', 0.35, 0.4), cap: S('#2f2c3b', 'fixed', 0.5, 0.5), shaft: S('#e9e7f3', 'fixed', 0.2, 0.95) },
    params: { rpm: P(60, 0, 300, 5, 'Speed (RPM)') },
    build: (b, p) => {
      b.cyl(0.4, 0.4, 0.9, 'shell', { p: [0, 0.4, 0], r: [0, 0, R90] }, 32);
      for (const s of [-1, 1]) b.cyl(0.41, 0.41, 0.12, 'cap', { p: [s * 0.46, 0.4, 0], r: [0, 0, R90] }, 32);
      b.box(1.1, 0.1, 0.6, 'cap', { p: [0, 0.05, 0], rad: 0.03 });
      const shaft = b.grp({ p: [0.7, 0.4, 0] });
      b.cyl(0.07, 0.07, 0.5, 'shaft', { r: [0, 0, R90], parent: shaft }, 12);
      b.box(0.04, 0.2, 0.04, 'cap', { p: [0.2, 0, 0], parent: shaft });
      b.spin(shaft, 'x', p.rpm);
    },
  },
  {
    id: 'conveyor', name: 'Conveyor Belt', cat: CAT, kw: ['conveyor', 'belt', 'factory', 'assembly line', 'production'],
    slots: { frame: S('#8a86b3', 'primary', 0.4, 0.4), belt: S('#3b3848', 'fixed', 0.9), slat: S('#ffc233', 'secondary', 0.6), roller: S('#cfcbe0', 'fixed', 0.3, 0.8) },
    params: { length: P(4, 1.5, 12, 0.5, 'Length'), speed: P(0.6, 0, 3, 0.1, 'Belt speed (m/s)') },
    build: (b, p) => {
      const L = p.length, W = 1, h = 0.55;
      b.box(L, 0.18, 0.1, 'frame', { p: [0, h - 0.12, W / 2 + 0.05], rad: 0.03 });
      b.box(L, 0.18, 0.1, 'frame', { p: [0, h - 0.12, -W / 2 - 0.05], rad: 0.03 });
      b.box(L - 0.2, 0.06, W, 'belt', { p: [0, h - 0.07, 0], rad: 0.02 });
      for (const s of [-1, 1]) b.cyl(0.16, 0.16, W + 0.04, 'roller', { p: [s * (L / 2 - 0.1), h - 0.07, 0], r: [R90, 0, 0] }, 20);
      for (const s of [-1, 1]) for (const z of [-1, 1]) b.box(0.08, h - 0.2, 0.08, 'frame', { p: [s * (L / 2 - 0.3), (h - 0.2) / 2, z * (W / 2 + 0.05)], rad: 0.02 });
      const n = Math.floor((L - 0.4) / 0.5), span = n * 0.5, slats = [];
      for (let i = 0; i < n; i++) slats.push(b.box(0.12, 0.02, W - 0.1, 'slat', { p: [-span / 2 + 0.25 + i * 0.5, h - 0.035, 0], rad: 0.008, shadow: false }));
      b.wrap(slats, 'x', p.speed, span);
    },
  },
  {
    id: 'fan', name: 'Fan', cat: CAT, kw: ['fan', 'propeller', 'blower', 'ventilator', 'rotor', 'blades'],
    slots: { blade: S('#8fc8f4', 'primary', 0.4), hub: S('#2f2c3b', 'fixed', 0.4, 0.4), stand: S('#cfcbe0', 'secondary', 0.4, 0.5) },
    params: { rpm: P(120, 0, 600, 5, 'Speed (RPM)'), blades: P(4, 2, 8, 1, 'Blades') },
    build: (b, p) => {
      b.cyl(0.35, 0.4, 0.06, 'stand', { p: [0, 0.03, 0] }, 24);
      b.cyl(0.04, 0.04, 1, 'stand', { p: [0, 0.55, 0] }, 10);
      const head = b.grp({ p: [0, 1.1, 0] });
      b.cyl(0.13, 0.13, 0.3, 'hub', { r: [R90, 0, 0], parent: head }, 18);
      const rotor = b.grp({ p: [0, 0, 0.2], parent: head });
      b.sph(0.07, 'hub', { parent: rotor }, 12);
      for (let i = 0; i < p.blades; i++) {
        const g = b.grp({ parent: rotor, r: [0, 0, (i / p.blades) * Math.PI * 2] });
        b.box(0.16, 0.46, 0.02, 'blade', { p: [0, 0.3, 0], r: [0, 0.35, 0], parent: g, rad: 0.015 });
      }
      b.spin(rotor, 'z', p.rpm);
      b.osc(head, 'y', 0.5, 0.15, 'rot');
    },
  },
  {
    id: 'spring', name: 'Spring', cat: CAT, kw: ['spring', 'coil', 'bounce', 'suspension', 'shock'],
    slots: { coil: S('#cfcbe0', 'primary', 0.25, 0.9), plate: S('#8a86b3', 'secondary', 0.4, 0.5) },
    params: { height: P(1, 0.3, 3, 0.1, 'Height'), turns: P(7, 3, 16, 1, 'Coils'), radius: P(0.22, 0.08, 0.6, 0.01, 'Radius'), bounce: P(0.35, 0, 0.8, 0.05, 'Bounce') },
    build: (b, p) => {
      const geo = new THREE.TubeGeometry(new HelixCurve(p.radius, p.height - 0.1, p.turns), p.turns * 24, 0.035, 8, false);
      const coil = b.grp({ p: [0, 0.05, 0] });
      b.mesh(geo, 'coil', { parent: coil });
      const top = b.grp({ p: [0, p.height, 0] });
      b.cyl(p.radius + 0.1, p.radius + 0.1, 0.06, 'plate', { p: [0, -0.03, 0], parent: top }, 28);
      b.cyl(p.radius + 0.1, p.radius + 0.1, 0.06, 'plate', { p: [0, 0.03, 0] }, 28);
      b.anims.push({ kind: 'spring', coil, top, h: p.height, amp: p.bounce });
    },
  },
  {
    id: 'robot_arm', name: 'Robot Arm', cat: CAT, kw: ['robot', 'arm', 'robotic', 'manipulator', 'crane', 'grabber', 'android'],
    slots: { shell: S('#ffffff', 'primary', 0.4, 0.1), joint: S('#f4789a', 'secondary', 0.4, 0.3), claw: S('#2f2c3b', 'fixed', 0.4, 0.5) },
    params: { reach: P(1.3, 0.8, 2.4, 0.1, 'Segment length') },
    build: (b, p) => {
      const L = p.reach;
      b.cyl(0.55, 0.62, 0.22, 'claw', { p: [0, 0.11, 0] }, 32);
      const turret = b.grp({ p: [0, 0.22, 0] });
      b.cyl(0.38, 0.4, 0.28, 'shell', { p: [0, 0.14, 0], parent: turret }, 28);
      const shoulder = b.grp({ p: [0, 0.4, 0], parent: turret });
      b.cyl(0.2, 0.2, 0.6, 'joint', { r: [R90, 0, 0], parent: shoulder }, 24);
      b.box(0.28, L, 0.34, 'shell', { p: [0, L / 2, 0], parent: shoulder, rad: 0.1 });
      const elbow = b.grp({ p: [0, L, 0], parent: shoulder });
      b.cyl(0.17, 0.17, 0.5, 'joint', { r: [R90, 0, 0], parent: elbow }, 24);
      b.box(0.22, L * 0.9, 0.28, 'shell', { p: [0, (L * 0.9) / 2, 0], parent: elbow, rad: 0.08 });
      const wrist = b.grp({ p: [0, L * 0.9, 0], parent: elbow });
      b.sph(0.14, 'joint', { parent: wrist }, 16);
      for (const s of [-1, 1]) b.box(0.05, 0.3, 0.1, 'claw', { p: [s * 0.1, 0.2, 0], parent: wrist, rad: 0.015 });
      shoulder.rotation.z = -0.5; elbow.rotation.z = 1.0;
      b.osc(turret, 'y', 1.1, 0.12, 'rot');
      b.osc(shoulder, 'z', 0.5, 0.2, 'rot', 0);
      b.osc(elbow, 'z', 0.5, 0.23, 'rot', 1.3);
      shoulder.userData.baseRotZ = -0.5; elbow.userData.baseRotZ = 1.0;
    },
  },
  {
    id: 'pendulum', name: 'Pendulum', cat: CAT, kw: ['pendulum', 'swing', 'newton', 'cradle', 'bob'],
    slots: { frame: S('#8a86b3', 'secondary', 0.4, 0.5), string: S('#cfcbe0', 'fixed', 0.3, 0.9), bob: S('#f4789a', 'primary', 0.25, 0.4) },
    params: { length: P(1.6, 0.5, 4, 0.1, 'Length'), swing: P(0.7, 0, 1.4, 0.05, 'Amplitude (rad)'), hz: P(0.4, 0.05, 1.5, 0.05, 'Frequency (Hz)') },
    build: (b, p) => {
      const H = p.length + 0.5;
      for (const s of [-1, 1]) b.box(0.08, H, 0.08, 'frame', { p: [s * 0.55, H / 2, 0], rad: 0.02 });
      b.box(1.3, 0.1, 0.12, 'frame', { p: [0, H, 0], rad: 0.03 });
      const pivot = b.grp({ p: [0, H, 0] });
      b.cyl(0.012, 0.012, p.length, 'string', { p: [0, -p.length / 2, 0], parent: pivot }, 6);
      b.sph(0.17, 'bob', { p: [0, -p.length - 0.1, 0], parent: pivot }, 20);
      pivot.rotation.z = p.swing;
      b.osc(pivot, 'z', p.swing, p.hz, 'rot', Math.PI / 2);
    },
  },
  {
    id: 'elevator', name: 'Lift Platform', cat: CAT, kw: ['elevator', 'lift', 'platform lift', 'hoist', 'scissor'],
    slots: { deck: S('#ffc233', 'primary', 0.5, 0.2), rail: S('#8a86b3', 'secondary', 0.4, 0.5) },
    params: { rise: P(1.6, 0.5, 5, 0.1, 'Travel'), hz: P(0.2, 0.05, 1, 0.05, 'Cycles / s') },
    build: (b, p) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, p.rise + 0.6, 0.08, 'rail', { p: [sx * 0.85, (p.rise + 0.6) / 2, sz * 0.85], rad: 0.02 });
      b.box(2, 0.1, 0.1, 'rail', { p: [0, p.rise + 0.6, 0.85], rad: 0.02 });
      b.box(2, 0.1, 0.1, 'rail', { p: [0, p.rise + 0.6, -0.85], rad: 0.02 });
      const deck = b.grp({ p: [0, 0.2, 0] });
      b.box(1.7, 0.1, 1.7, 'deck', { p: [0, 0, 0], parent: deck, rad: 0.04 });
      b.anims.push({ kind: 'osc', obj: deck, axis: 'y', amp: p.rise / 2, hz: p.hz, mode: 'pos', phase: -Math.PI / 2, offset: p.rise / 2 });
    },
  },
];
