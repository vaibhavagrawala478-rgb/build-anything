import { S, P, R90 } from '../builder.js';

const CAT = 'Physics';

export default [
  {
    id: 'crate', name: 'Crate', cat: CAT, kw: ['crate', 'box', 'package', 'parcel', 'chest', 'cargo'], physics: 'dynamic',
    slots: { wood: S('#d9a56b', 'primary', 0.85), strap: S('#a8693d', 'secondary', 0.9) },
    params: { size: P(0.8, 0.2, 2.5, 0.05, 'Size') },
    build: (b, p) => {
      const s = p.size;
      b.box(s, s, s, 'wood', { p: [0, s / 2, 0], rad: 0.03 });
      for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        b.box(x ? 0.03 : s * 1.01, s * 1.01, z ? 0.03 : s * 1.01, 'strap', { p: [x * s * 0.5, s / 2, z * s * 0.5], rad: 0.01, shadow: false });
      }
      b.box(s * 1.02, 0.1 * s, s * 0.14, 'strap', { p: [0, s / 2, 0], rad: 0.01, shadow: false });
    },
  },
  {
    id: 'barrel', name: 'Barrel', cat: CAT, kw: ['barrel', 'drum', 'keg', 'tun', 'oil'], physics: 'dynamic', collider: 'cyl',
    slots: { body: S('#e5604f', 'primary', 0.5, 0.2), band: S('#cfcbe0', 'fixed', 0.3, 0.8) },
    params: { r: P(0.35, 0.1, 1, 0.05, 'Radius'), h: P(0.9, 0.3, 2, 0.05, 'Height') },
    build: (b, p) => {
      b.lathe([[0, 0], [p.r * 0.9, 0], [p.r, p.h * 0.2], [p.r * 1.06, p.h * 0.5], [p.r, p.h * 0.8], [p.r * 0.9, p.h], [0, p.h]], 'body', {}, 32);
      for (const y of [0.18, 0.5, 0.82]) b.tor(p.r * (y === 0.5 ? 1.07 : 1.01), 0.02, 'band', { p: [0, p.h * y, 0], r: [R90, 0, 0] }, 6, 32);
    },
  },
  {
    id: 'domino', name: 'Domino', cat: CAT, kw: ['domino', 'dominoes', 'tile', 'chain reaction'], physics: 'dynamic',
    slots: { body: S('#ffffff', 'primary', 0.4), dot: S('#2f2c3b', 'fixed', 0.5) },
    params: { h: P(1, 0.3, 2, 0.05, 'Height') },
    build: (b, p) => {
      b.box(0.12, p.h, 0.5, 'body', { p: [0, p.h / 2, 0], rad: 0.015 });
      for (const [y, z] of [[0.75, -0.12], [0.75, 0.12], [0.5, 0], [0.25, -0.12], [0.25, 0.12]]) b.cyl(0.04, 0.04, 0.01, 'dot', { p: [0.062, p.h * y, z], r: [0, 0, R90] }, 12);
    },
  },
  {
    id: 'ball', name: 'Bouncy Ball', cat: CAT, kw: ['ball', 'basketball', 'football', 'soccer', 'marble', 'bowling'], physics: 'dynamic', collider: 'sphere',
    slots: { main: S('#ff9b6b', 'primary', 0.45), stripe: S('#2f2c3b', 'fixed', 0.6) },
    params: { r: P(0.3, 0.08, 1.5, 0.02, 'Radius'), bounce: P(0.6, 0, 1, 0.05, 'Bounciness') },
    build: (b, p) => {
      b.sph(p.r, 'main', { p: [0, p.r, 0] }, 32);
      b.tor(p.r * 1.002, p.r * 0.03, 'stripe', { p: [0, p.r, 0], r: [R90, 0, 0] }, 6, 40);
      b.tor(p.r * 1.002, p.r * 0.03, 'stripe', { p: [0, p.r, 0] }, 6, 40);
    },
  },
  {
    id: 'plank', name: 'Plank', cat: CAT, kw: ['plank', 'beam', 'board', 'bridge', 'log', 'timber'], physics: 'dynamic',
    slots: { wood: S('#d9a56b', 'primary', 0.85) },
    params: { l: P(3, 0.5, 10, 0.1, 'Length'), w: P(0.4, 0.1, 2, 0.05, 'Width'), t: P(0.08, 0.03, 0.5, 0.01, 'Thickness') },
    build: (b, p) => b.box(p.l, p.t, p.w, 'wood', { p: [0, p.t / 2, 0], rad: 0.015 }),
  },
];
