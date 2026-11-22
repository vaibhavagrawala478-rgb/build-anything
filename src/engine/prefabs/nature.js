import { S, P, R90 } from '../builder.js';

const CAT = 'Nature';

export default [
  {
    id: 'tree', name: 'Round Tree', cat: CAT, kw: ['tree', 'oak', 'forest', 'woods', 'garden', 'maple', 'park'],
    slots: { leaf: S('#6cc27f', 'fixed', 0.8), trunk: S('#a8693d', 'fixed', 0.9) },
    params: { height: P(2.6, 1, 8, 0.2, 'Height') },
    vary: (rng) => ({ params: { height: 1.6 + rng() * 2.4 }, colors: { leaf: ['#6cc27f', '#8ed87a', '#4fb36a', '#f4a45f', '#f2849d'][(rng() * 5) | 0] } }),
    build: (b, p) => {
      const H = p.height, th = H * 0.42;
      b.cyl(0.09, 0.14, th, 'trunk', { p: [0, th / 2, 0] }, 10);
      b.sph(H * 0.3, 'leaf', { p: [0, th + H * 0.22, 0] }, 20);
      b.sph(H * 0.22, 'leaf', { p: [H * 0.16, th + H * 0.12, H * 0.07] }, 16);
      b.sph(H * 0.2, 'leaf', { p: [-H * 0.15, th + H * 0.1, -H * 0.06] }, 16);
    },
  },
  {
    id: 'pine', name: 'Pine Tree', cat: CAT, kw: ['pine', 'fir', 'spruce', 'conifer', 'christmas', 'evergreen', 'xmas'],
    slots: { leaf: S('#4fb36a', 'fixed', 0.8), trunk: S('#a8693d', 'fixed', 0.9) },
    params: { height: P(3, 1, 9, 0.2, 'Height') },
    build: (b, p) => {
      const H = p.height;
      b.cyl(0.08, 0.12, H * 0.2, 'trunk', { p: [0, H * 0.1, 0] }, 8);
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        b.cone(H * (0.32 - t * 0.2), H * 0.34, 'leaf', { p: [0, H * (0.22 + t * 0.2) + H * 0.15, 0] }, 20);
      }
    },
  },
  {
    id: 'bush', name: 'Bush', cat: CAT, kw: ['bush', 'shrub', 'hedge', 'grass'],
    slots: { leaf: S('#7fd6a4', 'fixed', 0.85) },
    params: { size: P(0.7, 0.2, 2, 0.1, 'Size') },
    build: (b, p) => {
      const s = p.size;
      b.sph(s * 0.5, 'leaf', { p: [0, s * 0.42, 0], s: [1, 0.85, 1] }, 16);
      b.sph(s * 0.38, 'leaf', { p: [s * 0.4, s * 0.3, s * 0.1] }, 14);
      b.sph(s * 0.34, 'leaf', { p: [-s * 0.38, s * 0.28, -s * 0.05] }, 14);
    },
  },
  {
    id: 'rock', name: 'Rock', cat: CAT, kw: ['rock', 'stone', 'boulder', 'pebble', 'mountain'],
    slots: { stone: S('#bdb8d1', 'secondary', 0.9) },
    params: { size: P(0.8, 0.2, 4, 0.1, 'Size'), seed: P(1, 0, 20, 1, 'Shape') },
    build: (b, p) => {
      const s = p.size;
      const m = b.sph(s * 0.5, 'stone', { p: [0, s * 0.3, 0] }, 7);
      const pos = m.geometry.attributes.position;
      // noise is a pure function of position so shared vertices stay welded
      const hash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + p.seed * 4.1) * 43758.5453; return s - Math.floor(s); };
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const k = 0.8 + hash(Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(z * 100) / 100) * 0.4;
        pos.setXYZ(i, x * k, y * k * 0.7, z * k);
      }
      m.geometry.computeVertexNormals();
    },
  },
  {
    id: 'flower', name: 'Flower', cat: CAT, kw: ['flower', 'tulip', 'rose', 'daisy', 'blossom', 'bloom', 'sunflower'],
    slots: { petal: S('#f4789a', 'primary', 0.7), center: S('#ffd25e', 'fixed'), stem: S('#4fb36a', 'fixed') },
    params: { height: P(0.5, 0.2, 1.4, 0.05, 'Height') },
    build: (b, p) => {
      b.cyl(0.015, 0.02, p.height, 'stem', { p: [0, p.height / 2, 0] }, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; b.sph(0.06, 'petal', { p: [Math.cos(a) * 0.08, p.height, Math.sin(a) * 0.08], s: [1, 0.5, 1] }, 10); }
      b.sph(0.05, 'center', { p: [0, p.height + 0.015, 0] }, 10);
      b.sph(0.05, 'stem', { p: [0.05, p.height * 0.4, 0], s: [1.6, 0.3, 0.8] }, 8);
    },
  },
];
