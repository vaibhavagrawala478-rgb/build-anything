import { S, P, R90, rad } from '../builder.js';

const CAT = 'Architecture';

export default [
  {
    id: 'wall', name: 'Wall', cat: CAT, kw: ['wall', 'partition', 'barrier'],
    slots: { wall: S('#f08aa6', 'primary', 0.9), trim: S('#ffffff', 'tint', 0.7) },
    params: { length: P(4, 0.5, 20, 0.25, 'Length'), height: P(3, 0.5, 8, 0.25, 'Height'), thick: P(0.25, 0.1, 0.6, 0.05, 'Thickness') },
    build: (b, p) => {
      b.box(p.length, p.height, p.thick, 'wall', { p: [0, p.height / 2, 0], rad: 0.04 });
      b.box(p.length + 0.02, 0.18, p.thick + 0.06, 'trim', { p: [0, 0.09, 0], rad: 0.03 });
    },
  },
  {
    id: 'wall_door', name: 'Wall with Door', cat: CAT, kw: ['doorway', 'wall door', 'entrance', 'entry'],
    slots: { wall: S('#f08aa6', 'primary', 0.9), trim: S('#ffffff', 'tint', 0.7), door: S('#c89b6d', 'secondary') },
    params: { length: P(4, 1.6, 12, 0.25, 'Length'), height: P(3, 2.2, 6, 0.25, 'Height'), thick: P(0.25, 0.1, 0.6, 0.05, 'Thickness') },
    build: (b, p) => {
      const dw = 1, dh = 2.1, L = p.length, T = p.thick, H = p.height;
      const side = (L - dw) / 2;
      for (const s of [-1, 1]) b.box(side, H, T, 'wall', { p: [s * (dw / 2 + side / 2), H / 2, 0], rad: 0.03 });
      b.box(dw, H - dh, T, 'wall', { p: [0, dh + (H - dh) / 2, 0], rad: 0.03 });
      b.box(L + 0.02, 0.18, T + 0.06, 'trim', { p: [0, 0.09, 0], rad: 0.03, shadow: false });
      const hinge = b.grp({ p: [-dw / 2 + 0.03, 0, T / 2 - 0.04], r: [0, -0.9, 0] });
      b.box(dw - 0.06, dh - 0.04, 0.06, 'door', { p: [(dw - 0.06) / 2, (dh - 0.04) / 2, 0], parent: hinge, rad: 0.02 });
      b.sph(0.035, 'trim', { p: [dw - 0.2, 1, 0.05], parent: hinge }, 10);
    },
  },
  {
    id: 'wall_window', name: 'Wall with Window', cat: CAT, kw: ['window wall', 'windowed wall'],
    slots: { wall: S('#f08aa6', 'primary', 0.9), frame: S('#ffffff', 'tint', 0.6), glass: S('#a8dcff', 'fixed', 0.1, 0, { opacity: 0.45 }) },
    params: { length: P(4, 2, 12, 0.25, 'Length'), height: P(3, 2, 6, 0.25, 'Height'), thick: P(0.25, 0.1, 0.6, 0.05, 'Thickness') },
    build: (b, p) => {
      const L = p.length, H = p.height, T = p.thick, ww = Math.min(1.6, L - 1), wh = 1.3, sill = 0.9;
      const side = (L - ww) / 2;
      for (const s of [-1, 1]) b.box(side, H, T, 'wall', { p: [s * (ww / 2 + side / 2), H / 2, 0], rad: 0.03 });
      b.box(ww, sill, T, 'wall', { p: [0, sill / 2, 0], rad: 0.03 });
      b.box(ww, H - sill - wh, T, 'wall', { p: [0, sill + wh + (H - sill - wh) / 2, 0], rad: 0.03 });
      b.box(ww, wh, 0.04, 'glass', { p: [0, sill + wh / 2, 0], rad: 0, shadow: false });
      for (const [x, y, w, h] of [[0, sill, ww + 0.1, 0.07], [0, sill + wh, ww + 0.1, 0.07], [-ww / 2, sill + wh / 2, 0.07, wh], [ww / 2, sill + wh / 2, 0.07, wh], [0, sill + wh / 2, 0.04, wh]]) b.box(w, h, T + 0.04, 'frame', { p: [x, y, 0], rad: 0.012 });
    },
  },
  {
    id: 'floor', name: 'Floor Slab', cat: CAT, kw: ['floor', 'slab', 'platform', 'base', 'ground', 'foundation', 'pad'],
    slots: { top: S('#f2a6ba', 'primary', 0.85), side: S('#e57b99', 'secondary', 0.9) },
    params: { width: P(8, 1, 40, 0.5, 'Width'), depth: P(8, 1, 40, 0.5, 'Depth'), thick: P(0.3, 0.05, 1, 0.05, 'Thickness') },
    build: (b, p) => {
      b.box(p.width, p.thick, p.depth, 'side', { p: [0, p.thick / 2 - 0.0, 0], rad: 0.06 });
      b.box(p.width - 0.04, 0.02, p.depth - 0.04, 'top', { p: [0, p.thick + 0.001, 0], rad: 0.01, shadow: false });
    },
  },
  {
    id: 'stairs', name: 'Stairs', cat: CAT, kw: ['stairs', 'staircase', 'steps', 'stairway'],
    slots: { step: S('#f3e5cc', 'primary', 0.8), rail: S('#8a86b3', 'secondary', 0.4, 0.4) },
    params: { steps: P(8, 2, 20, 1, 'Steps'), width: P(1.2, 0.6, 3, 0.1, 'Width'), rise: P(0.2, 0.1, 0.3, 0.01, 'Rise') },
    build: (b, p) => {
      const run = 0.28;
      for (let i = 0; i < p.steps; i++) b.box(p.width, p.rise * (i + 1), run, 'step', { p: [0, (p.rise * (i + 1)) / 2, -i * run + (p.steps * run) / 2 - run / 2], rad: 0.02 });
      const L = Math.hypot(p.steps * run, p.steps * p.rise);
      const th = Math.atan2(-p.steps * run, p.steps * p.rise);
      for (const s of [-1, 1]) b.cyl(0.02, 0.02, L, 'rail', { p: [s * (p.width / 2 + 0.05), p.steps * p.rise * 0.5 + 0.5, 0], r: [th, 0, 0] }, 8);
    },
  },
  {
    id: 'column', name: 'Column', cat: CAT, kw: ['column', 'pillar', 'post', 'pole', 'support'],
    slots: { shaft: S('#f3e5cc', 'primary', 0.8) },
    params: { height: P(3, 0.5, 10, 0.25, 'Height'), radius: P(0.25, 0.1, 0.8, 0.05, 'Radius') },
    build: (b, p) => {
      const r = p.radius;
      b.box(r * 2.8, 0.18, r * 2.8, 'shaft', { p: [0, 0.09, 0], rad: 0.04 });
      b.cyl(r, r * 1.08, p.height - 0.4, 'shaft', { p: [0, p.height / 2, 0] }, 28);
      b.box(r * 2.8, 0.18, r * 2.8, 'shaft', { p: [0, p.height - 0.09, 0], rad: 0.04 });
    },
  },
  {
    id: 'roof', name: 'Gable Roof', cat: CAT, kw: ['roof', 'gable', 'rooftop', 'cover'],
    slots: { tile: S('#e5604f', 'primary', 0.8), edge: S('#ffffff', 'tint') },
    params: { width: P(5, 1, 20, 0.5, 'Width'), depth: P(5, 1, 20, 0.5, 'Depth'), pitch: P(1.6, 0.4, 5, 0.1, 'Pitch') },
    build: (b, p) => {
      const w = p.width + 0.4, h = p.pitch;
      b.ext([[-w / 2, 0], [w / 2, 0], [0, h]], p.depth + 0.3, 'tile', {}, 0.04);
      b.box(w + 0.1, 0.06, p.depth + 0.4, 'edge', { p: [0, 0.03, 0], rad: 0.02, shadow: false });
    },
  },
  {
    id: 'fence', name: 'Fence', cat: CAT, kw: ['fence', 'railing', 'gate', 'picket'],
    slots: { board: S('#ffffff', 'primary', 0.8), rail: S('#c89b6d', 'secondary') },
    params: { length: P(3, 0.5, 12, 0.25, 'Length'), height: P(0.9, 0.4, 2, 0.1, 'Height') },
    build: (b, p) => {
      const n = Math.max(2, Math.round(p.length / 0.22));
      for (let i = 0; i < n; i++) b.box(0.13, p.height, 0.04, 'board', { p: [-p.length / 2 + 0.11 + (i * (p.length - 0.22)) / (n - 1), p.height / 2, 0], rad: 0.018 });
      for (const y of [0.25, p.height - 0.2]) b.box(p.length, 0.06, 0.05, 'rail', { p: [0, y, -0.045], rad: 0.015 });
    },
  },
  {
    id: 'door', name: 'Door', cat: CAT, kw: ['door'],
    slots: { door: S('#c89b6d', 'primary'), frame: S('#ffffff', 'tint') },
    params: { height: P(2.1, 1.6, 3, 0.1, 'Height') },
    build: (b, p) => {
      const hinge = b.grp({ p: [-0.45, 0, 0] });
      b.box(0.9, p.height, 0.06, 'door', { p: [0.45, p.height / 2, 0], parent: hinge, rad: 0.02 });
      b.sph(0.035, 'frame', { p: [0.78, p.height / 2 - 0.1, 0.05], parent: hinge }, 10);
      b.box(0.08, p.height + 0.04, 0.12, 'frame', { p: [-0.5, p.height / 2, 0], rad: 0.01 });
      b.box(0.08, p.height + 0.04, 0.12, 'frame', { p: [0.5, p.height / 2, 0], rad: 0.01 });
      b.box(1.08, 0.08, 0.12, 'frame', { p: [0, p.height + 0.02, 0], rad: 0.01 });
      b.osc(hinge, 'y', 1.1, 0.12, 'rot');
    },
  },
  {
    id: 'window', name: 'Window with Blinds', cat: CAT, kw: ['window', 'glass', 'blinds', 'pane'],
    slots: { frame: S('#ffffff', 'primary', 0.6), glass: S('#a8dcff', 'fixed', 0.1, 0, { opacity: 0.45 }), blind: S('#fff6e6', 'tint', 0.7), cornice: S('#f3d9a8', 'secondary') },
    params: { width: P(1.5, 0.6, 3, 0.1, 'Width'), height: P(1.7, 0.6, 3, 0.1, 'Height'), blind: P(0.28, 0, 1, 0.02, 'Blind drop') },
    build: (b, p) => {
      const { width: w, height: h } = p;
      for (const [x, y, ww, hh] of [[0, 0, w, 0.09], [0, h, w, 0.09], [-w / 2, h / 2, 0.09, h], [w / 2, h / 2, 0.09, h], [0, h / 2, 0.05, h]]) b.box(ww, hh, 0.1, 'frame', { p: [x, y, 0], rad: 0.02 });
      b.box(w, h, 0.03, 'glass', { p: [0, h / 2, 0], rad: 0, shadow: false });
      b.box(w + 0.18, 0.1, 0.18, 'cornice', { p: [0, h + 0.14, 0.02], rad: 0.03 });
      const slats = Math.round(p.blind * h / 0.06);
      for (let i = 0; i < slats; i++) b.box(w - 0.08, 0.045, 0.05, 'blind', { p: [0, h - 0.07 - i * 0.06, 0.03], rad: 0.012 });
    },
  },
];
