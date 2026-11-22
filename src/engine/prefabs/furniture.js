import { S, P, R90, rad } from '../builder.js';

const CAT = 'Furniture';

const sofaLike = (b, p, w, d) => {
  const legH = 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.05, 0.04, legH, 'legs', { p: [sx * (w / 2 - 0.14), legH / 2, sz * (d / 2 - 0.14)] }, 10);
  b.box(w, 0.28, d, 'body', { p: [0, legH + 0.14, 0], rad: 0.1 });
  b.box(w, 0.56, 0.24, 'body', { p: [0, legH + 0.28 + 0.2, -d / 2 + 0.12], rad: 0.1 });
  for (const sx of [-1, 1]) b.box(0.24, 0.46, d, 'body', { p: [sx * (w / 2 - 0.12), legH + 0.28 + 0.09, 0], rad: 0.11 });
  const n = Math.max(1, Math.round((w - 0.5) / 0.8));
  const cw = (w - 0.5) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.25 + cw * (i + 0.5);
    b.box(cw - 0.03, 0.17, d - 0.34, 'cushion', { p: [x, legH + 0.28 + 0.085, 0.1], rad: 0.07 });
    b.box(cw - 0.03, 0.42, 0.16, 'cushion', { p: [x, legH + 0.28 + 0.34, -d / 2 + 0.34], r: [-0.18, 0, 0], rad: 0.07 });
  }
};

export default [
  {
    id: 'sofa', name: 'Sofa', cat: CAT, kw: ['sofa', 'couch', 'loveseat', 'settee'],
    slots: { body: S('#6bb0e8', 'primary'), cushion: S('#8fc8f4', 'tint'), legs: S('#c89b6d', 'secondary') },
    params: { width: P(2.2, 1.2, 4, 0.1, 'Width') },
    build: (b, p) => sofaLike(b, p, p.width, 0.95),
  },
  {
    id: 'armchair', name: 'Armchair', cat: CAT, kw: ['armchair', 'chair', 'seat', 'recliner'],
    slots: { body: S('#f4789a', 'primary'), cushion: S('#f9a1bb', 'tint'), legs: S('#c89b6d', 'secondary') },
    params: { width: P(0.95, 0.7, 1.4, 0.05, 'Width') },
    build: (b, p) => sofaLike(b, p, p.width, 0.9),
  },
  {
    id: 'chair', name: 'Dining Chair', cat: CAT, kw: ['dining chair', 'chair', 'stool', 'seat'],
    slots: { seat: S('#ffd25e', 'primary'), legs: S('#c89b6d', 'secondary') },
    params: { height: P(0.9, 0.6, 1.2, 0.05, 'Height') },
    build: (b, p) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.025, 0.02, 0.45, 'legs', { p: [sx * 0.18, 0.225, sz * 0.18] }, 8);
      b.box(0.46, 0.07, 0.46, 'seat', { p: [0, 0.48, 0], rad: 0.03 });
      b.box(0.44, p.height - 0.52, 0.05, 'seat', { p: [0, 0.52 + (p.height - 0.52) / 2, -0.2], rad: 0.025 });
    },
  },
  {
    id: 'office_chair', name: 'Work Chair', cat: CAT, kw: ['work chair', 'office chair', 'desk chair', 'swivel'],
    slots: { seat: S('#ffffff', 'primary'), base: S('#8a86b3', 'secondary', 0.4, 0.4) },
    params: { height: P(0.52, 0.4, 0.7, 0.02, 'Seat height') },
    build: (b, p) => {
      const sw = b.grp();
      b.cyl(0.04, 0.04, p.height - 0.12, 'base', { p: [0, 0.1 + (p.height - 0.12) / 2, 0] }, 12);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.box(0.34, 0.04, 0.05, 'base', { p: [Math.cos(a) * 0.17, 0.06, Math.sin(a) * 0.17], r: [0, -a, 0], rad: 0.015 });
        b.sph(0.04, 'base', { p: [Math.cos(a) * 0.33, 0.04, Math.sin(a) * 0.33] }, 10);
      }
      b.box(0.5, 0.1, 0.5, 'seat', { p: [0, p.height, 0], rad: 0.045, parent: sw });
      b.box(0.46, 0.5, 0.08, 'seat', { p: [0, p.height + 0.32, -0.23], r: [-0.12, 0, 0], rad: 0.04, parent: sw });
    },
  },
  {
    id: 'table', name: 'Dining Table', cat: CAT, kw: ['table', 'dining table', 'coffee table', 'side table'],
    slots: { top: S('#f3e5cc', 'secondary'), legs: S('#c89b6d', 'secondary') },
    params: { width: P(1.8, 0.6, 4, 0.1, 'Width'), depth: P(0.95, 0.4, 2, 0.05, 'Depth'), height: P(0.76, 0.3, 1.1, 0.02, 'Height') },
    build: (b, p) => {
      b.box(p.width, 0.07, p.depth, 'top', { p: [0, p.height - 0.035, 0], rad: 0.03 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.045, 0.035, p.height - 0.07, 'legs', { p: [sx * (p.width / 2 - 0.1), (p.height - 0.07) / 2, sz * (p.depth / 2 - 0.1)] }, 10);
    },
  },
  {
    id: 'desk', name: 'Desk', cat: CAT, kw: ['desk', 'workstation', 'workspace', 'study'],
    slots: { top: S('#ffffff', 'secondary'), legs: S('#8a86b3', 'primary', 0.5, 0.2), drawer: S('#f2eef7', 'tint') },
    params: { width: P(1.8, 1, 3, 0.1, 'Width'), depth: P(0.8, 0.5, 1.2, 0.05, 'Depth') },
    build: (b, p) => {
      const h = 0.76;
      b.box(p.width, 0.07, p.depth, 'top', { p: [0, h - 0.035, 0], rad: 0.03 });
      b.box(0.06, h - 0.07, p.depth - 0.1, 'legs', { p: [-p.width / 2 + 0.06, (h - 0.07) / 2, 0], rad: 0.02 });
      b.box(0.5, h - 0.14, p.depth - 0.1, 'drawer', { p: [p.width / 2 - 0.3, (h - 0.14) / 2 + 0.02, 0], rad: 0.03 });
      b.box(0.4, 0.02, 0.02, 'legs', { p: [p.width / 2 - 0.3, h - 0.3, p.depth / 2 - 0.045], rad: 0.008 });
      b.box(0.4, 0.02, 0.02, 'legs', { p: [p.width / 2 - 0.3, h - 0.58, p.depth / 2 - 0.045], rad: 0.008 });
    },
  },
  {
    id: 'bed', name: 'Bed', cat: CAT, kw: ['bed', 'bedroom', 'mattress', 'sleep'],
    slots: { frame: S('#c89b6d', 'secondary'), sheet: S('#f4789a', 'primary'), pillow: S('#ffffff', 'tint') },
    params: { width: P(1.6, 0.9, 2.2, 0.1, 'Width') },
    build: (b, p) => {
      const w = p.width, L = 2.1;
      b.box(w + 0.1, 0.3, L + 0.1, 'frame', { p: [0, 0.2, 0], rad: 0.05 });
      b.box(w + 0.1, 0.9, 0.1, 'frame', { p: [0, 0.55, -L / 2 - 0.02], rad: 0.04 });
      b.box(w, 0.22, L, 'pillow', { p: [0, 0.46, 0], rad: 0.09 });
      b.box(w + 0.02, 0.12, L * 0.62, 'sheet', { p: [0, 0.6, L * 0.17], rad: 0.05 });
      for (const sx of [-1, 1]) b.box(w * 0.4, 0.12, 0.38, 'pillow', { p: [sx * w * 0.24, 0.62, -L / 2 + 0.3], r: [-0.12, 0, 0], rad: 0.06 });
    },
  },
  {
    id: 'bookshelf', name: 'Bookshelf', cat: CAT, kw: ['bookshelf', 'bookcase', 'shelf', 'library', 'books'],
    slots: { frame: S('#c89b6d', 'secondary'), b1: S('#f4789a', 'primary'), b2: S('#6bb0e8', 'tint'), b3: S('#ffd25e', 'fixed') },
    params: { width: P(1.2, 0.6, 2.4, 0.1, 'Width'), height: P(1.9, 0.8, 3, 0.1, 'Height') },
    build: (b, p) => {
      const w = p.width, h = p.height, rows = Math.max(2, Math.round(h / 0.4));
      b.box(0.05, h, 0.35, 'frame', { p: [-w / 2 + 0.025, h / 2, 0], rad: 0.01 });
      b.box(0.05, h, 0.35, 'frame', { p: [w / 2 - 0.025, h / 2, 0], rad: 0.01 });
      b.box(w, h, 0.03, 'frame', { p: [0, h / 2, -0.16], rad: 0.005 });
      const gap = h / rows;
      for (let r = 0; r <= rows; r++) b.box(w, 0.04, 0.35, 'frame', { p: [0, 0.02 + r * (gap - 0.04 / rows), 0], rad: 0.01 });
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let r = 0; r < rows; r++) {
        let x = -w / 2 + 0.08;
        while (x < w / 2 - 0.15) {
          const bw = 0.04 + rnd() * 0.05, bh = 0.2 + rnd() * 0.12;
          if (rnd() > 0.82) { x += 0.12; continue; }
          b.box(bw, bh, 0.24, ['b1', 'b2', 'b3'][(rnd() * 3) | 0], { p: [x + bw / 2, 0.04 + r * gap + bh / 2 + 0.01, 0.02], rad: 0.008 });
          x += bw + 0.005;
        }
      }
    },
  },
  {
    id: 'wardrobe', name: 'Wardrobe', cat: CAT, kw: ['wardrobe', 'closet', 'cabinet', 'cupboard', 'dresser'],
    slots: { body: S('#f2eef7', 'primary'), handle: S('#8a86b3', 'secondary', 0.3, 0.6) },
    params: { width: P(1.4, 0.8, 2.4, 0.1, 'Width'), height: P(2, 1, 2.6, 0.1, 'Height') },
    build: (b, p) => {
      b.box(p.width, p.height, 0.6, 'body', { p: [0, p.height / 2, 0], rad: 0.04 });
      b.box(0.012, p.height - 0.1, 0.02, 'handle', { p: [0, p.height / 2, 0.3], rad: 0.004 });
      for (const sx of [-1, 1]) b.box(0.03, 0.3, 0.04, 'handle', { p: [sx * 0.08, p.height / 2, 0.315], rad: 0.012 });
    },
  },
  {
    id: 'floor_lamp', name: 'Floor Lamp', cat: CAT, kw: ['lamp', 'floor lamp', 'light', 'lantern'],
    slots: { shade: S('#ffd25e', 'primary', 0.8, 0, { glow: 0.25 }), pole: S('#8a86b3', 'secondary', 0.3, 0.7) },
    params: { height: P(1.6, 0.6, 2.4, 0.1, 'Height') },
    build: (b, p) => {
      b.cyl(0.18, 0.2, 0.04, 'pole', { p: [0, 0.02, 0] });
      b.cyl(0.015, 0.015, p.height, 'pole', { p: [0, p.height / 2, 0] }, 8);
      b.cyl(0.14, 0.24, 0.3, 'shade', { p: [0, p.height + 0.05, 0] });
    },
  },
  {
    id: 'rug', name: 'Rug', cat: CAT, kw: ['rug', 'carpet', 'mat'],
    slots: { main: S('#ffe27a', 'primary', 1), edge: S('#fff3c2', 'tint', 1) },
    params: { width: P(2.4, 0.6, 6, 0.1, 'Width'), depth: P(1.6, 0.6, 6, 0.1, 'Depth') },
    build: (b, p) => {
      b.box(p.width, 0.025, p.depth, 'edge', { p: [0, 0.0125, 0], rad: 0.01, shadow: false });
      b.box(p.width - 0.2, 0.03, p.depth - 0.2, 'main', { p: [0, 0.015, 0], rad: 0.01, shadow: false });
    },
  },
  {
    id: 'rug_round', name: 'Round Rug', cat: CAT, kw: ['round rug', 'circle rug', 'rug'],
    slots: { main: S('#ffe27a', 'primary', 1), edge: S('#fff3c2', 'tint', 1) },
    params: { radius: P(1.2, 0.4, 3, 0.1, 'Radius') },
    build: (b, p) => {
      b.cyl(p.radius, p.radius, 0.03, 'edge', { p: [0, 0.015, 0], shadow: false }, 48);
      b.cyl(p.radius * 0.82, p.radius * 0.82, 0.04, 'main', { p: [0, 0.02, 0], shadow: false }, 48);
    },
  },
  {
    id: 'tv', name: 'Television', cat: CAT, kw: ['tv', 'television', 'screen', 'display'],
    slots: { frame: S('#2a2733', 'secondary', 0.4, 0.2), screen: S('#7fd6f4', 'primary', 0.15, 0, { glow: 0.35 }), stand: S('#8a86b3', 'fixed', 0.3, 0.5) },
    params: { width: P(1.3, 0.6, 2.4, 0.1, 'Width') },
    build: (b, p) => {
      const h = p.width * 0.56;
      b.box(p.width, h, 0.05, 'frame', { p: [0, 0.35 + h / 2, 0], rad: 0.02 });
      b.box(p.width - 0.06, h - 0.06, 0.01, 'screen', { p: [0, 0.35 + h / 2, 0.028], rad: 0.004 });
      b.box(0.4, 0.03, 0.22, 'stand', { p: [0, 0.015, 0] });
      b.box(0.05, 0.35, 0.04, 'stand', { p: [0, 0.2, -0.02] });
    },
  },
  {
    id: 'computer', name: 'Computer', cat: CAT, kw: ['computer', 'monitor', 'pc', 'laptop', 'imac', 'workstation'],
    slots: { shell: S('#c9c6dd', 'primary', 0.4, 0.2), screen: S('#7fd6f4', 'tint', 0.15, 0, { glow: 0.3 }), keys: S('#ffffff', 'secondary') },
    params: { size: P(1, 0.6, 1.6, 0.1, 'Scale') },
    build: (b, p) => {
      const k = p.size;
      b.box(0.6 * k, 0.4 * k, 0.04 * k, 'shell', { p: [0, 0.36 * k, 0], rad: 0.015 });
      b.box(0.54 * k, 0.33 * k, 0.01 * k, 'screen', { p: [0, 0.37 * k, 0.025 * k], rad: 0.004 });
      b.box(0.05 * k, 0.16 * k, 0.04 * k, 'shell', { p: [0, 0.08 * k, -0.02 * k] });
      b.box(0.24 * k, 0.02 * k, 0.16 * k, 'shell', { p: [0, 0.01 * k, 0] });
      b.box(0.46 * k, 0.02 * k, 0.15 * k, 'keys', { p: [0, 0.01 * k, 0.28 * k], rad: 0.008 });
      b.box(0.07 * k, 0.025 * k, 0.11 * k, 'keys', { p: [0.32 * k, 0.012 * k, 0.28 * k], rad: 0.01 });
    },
  },
  {
    id: 'plant', name: 'Potted Plant', cat: CAT, kw: ['plant', 'plants', 'pot', 'pots', 'potted', 'houseplant', 'leaf', 'leaves', 'fern', 'palm', 'monstera', 'greenery'],
    slots: { leaf: S('#5fbf72', 'fixed', 0.55), pot: S('#ffffff', 'primary', 0.7), band: S('#e9a07c', 'secondary', 0.7), soil: S('#6a4a36', 'fixed', 1) },
    params: {
      type: { v: 0, options: ['Blade', 'Round', 'Fan', 'Spiky', 'Tulip', 'Bush'], label: 'Foliage' },
      height: P(0.55, 0.2, 1.4, 0.05, 'Height'),
      pot: P(0.16, 0.08, 0.4, 0.01, 'Pot size'),
    },
    vary: (rng, style) => ({ params: { type: (rng() * 6) | 0, height: 0.35 + rng() * 0.6, pot: 0.12 + rng() * 0.12 } }),
    build: (b, p) => {
      const r = p.pot, ph = r * 1.5;
      b.cyl(r, r * 0.72, ph, 'pot', { p: [0, ph / 2, 0] }, 24);
      b.cyl(r * 1.04, r * 1.04, ph * 0.18, 'band', { p: [0, ph * 0.72, 0] }, 24);
      b.cyl(r * 0.92, r * 0.92, 0.02, 'soil', { p: [0, ph + 0.005, 0] }, 20);
      const top = ph, H = p.height;
      const leafBlade = (a, tilt, len, wid) => {
        const g = b.grp({ p: [Math.cos(a) * r * 0.2, top, Math.sin(a) * r * 0.2], r: [0, -a, 0] });
        const m = b.cap(wid, len, 'leaf', { p: [0, len / 2, 0], s: [0.35, 1, 1], parent: g });
        g.rotation.z = -tilt;
      };
      const t = p.type;
      if (t === 0) for (let i = 0; i < 7; i++) leafBlade((i / 7) * 6.28 + i, 0.1 + (i % 3) * 0.14, H * (0.7 + (i % 3) * 0.15), 0.05);
      else if (t === 1) {
        b.cyl(0.012, 0.016, H * 0.55, 'leaf', { p: [0, top + H * 0.27, 0] }, 6);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28; b.sph(H * 0.22, 'leaf', { p: [Math.cos(a) * H * 0.18, top + H * (0.5 + (i % 2) * 0.12), Math.sin(a) * H * 0.18], s: [1, 0.75, 1] }, 14); }
      } else if (t === 2) for (let i = 0; i < 9; i++) leafBlade((i / 9) * 6.28, 0.55 + (i % 2) * 0.2, H * 0.8, 0.07);
      else if (t === 3) for (let i = 0; i < 12; i++) leafBlade((i / 12) * 6.28 * 2.4, 0.05 + (i % 4) * 0.12, H * (0.45 + (i % 4) * 0.2), 0.025);
      else if (t === 4) {
        for (let i = 0; i < 3; i++) {
          const a = i * 2.1, hh = H * (0.6 + i * 0.15);
          const g = b.grp({ p: [Math.cos(a) * 0.05, top, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2] });
          b.cyl(0.01, 0.012, hh, 'leaf', { p: [0, hh / 2, 0], parent: g }, 6);
          b.sph(0.06, 'band', { p: [0, hh, 0], s: [1, 1.3, 1], parent: g }, 12);
        }
      } else {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; b.sph(H * 0.26, 'leaf', { p: [Math.cos(a) * H * 0.16, top + H * 0.36 + (i % 2) * 0.05, Math.sin(a) * H * 0.16] }, 14); }
        b.sph(H * 0.3, 'leaf', { p: [0, top + H * 0.5, 0] }, 14);
      }
    },
  },
  {
    id: 'cactus', name: 'Cactus', cat: CAT, kw: ['cactus', 'succulent', 'desert'],
    slots: { body: S('#6cc27f', 'fixed', 0.7), pot: S('#e9a07c', 'primary', 0.8), flower: S('#f4789a', 'secondary') },
    params: { height: P(0.5, 0.2, 1.2, 0.05, 'Height') },
    build: (b, p) => {
      b.cyl(0.14, 0.1, 0.2, 'pot', { p: [0, 0.1, 0] }, 20);
      b.cap(0.08, p.height - 0.16, 'body', { p: [0, 0.2 + p.height / 2, 0] });
      b.cap(0.04, 0.12, 'body', { p: [0.1, 0.2 + p.height * 0.55, 0], r: [0, 0, 0] });
      b.cap(0.04, 0.12, 'body', { p: [-0.1, 0.2 + p.height * 0.4, 0] });
      b.sph(0.03, 'flower', { p: [0, 0.2 + p.height + 0.07, 0] }, 10);
    },
  },
  {
    id: 'wall_clock', name: 'Wall Clock', cat: CAT, kw: ['clock', 'watch', 'time'],
    slots: { rim: S('#ffc233', 'primary', 0.4, 0.2), face: S('#fff6dc', 'tint'), hand: S('#2a2733', 'fixed') },
    params: { radius: P(0.3, 0.15, 0.6, 0.01, 'Radius') },
    build: (b, p) => {
      const r = p.radius;
      b.cyl(r, r, 0.07, 'rim', { p: [0, r, 0], r: [R90, 0, 0] }, 40);
      b.cyl(r * 0.86, r * 0.86, 0.08, 'face', { p: [0, r, 0], r: [R90, 0, 0] }, 40);
      const h1 = b.grp({ p: [0, r, 0.05] }), h2 = b.grp({ p: [0, r, 0.055] });
      b.box(0.025, r * 0.5, 0.01, 'hand', { p: [0, r * 0.22, 0], parent: h1, rad: 0.004 });
      b.box(0.018, r * 0.7, 0.01, 'hand', { p: [0, r * 0.32, 0], parent: h2, rad: 0.004 });
      h1.rotation.z = -0.6; h2.rotation.z = -3.4;
      b.spin(h2, 'z', -6); b.spin(h1, 'z', -0.5, -0.6);
    },
  },
  {
    id: 'picture', name: 'Picture Frame', cat: CAT, kw: ['picture', 'frame', 'painting', 'art', 'poster', 'photo'],
    slots: { frame: S('#c89b6d', 'secondary'), art: S('#6bb0e8', 'primary'), sun: S('#ffd25e', 'fixed') },
    params: { width: P(0.8, 0.3, 2, 0.1, 'Width'), height: P(0.6, 0.3, 2, 0.1, 'Height') },
    build: (b, p) => {
      b.box(p.width, p.height, 0.05, 'frame', { p: [0, p.height / 2, 0], rad: 0.015 });
      b.box(p.width - 0.1, p.height - 0.1, 0.02, 'art', { p: [0, p.height / 2, 0.025], rad: 0.004 });
      b.cyl(p.height * 0.13, p.height * 0.13, 0.02, 'sun', { p: [p.width * 0.15, p.height * 0.62, 0.038], r: [R90, 0, 0] }, 24);
    },
  },
  {
    id: 'chart_board', name: 'Chart Board', cat: CAT, kw: ['chart', 'whiteboard', 'board', 'presentation', 'graph', 'stats', 'analytics'],
    slots: { board: S('#ffffff', 'primary'), frame: S('#e9a07c', 'secondary'), bar1: S('#f4789a', 'fixed'), bar2: S('#ffc233', 'fixed'), bar3: S('#6bb0e8', 'fixed'), plus: S('#6cc27f', 'fixed') },
    params: { width: P(1.2, 0.7, 2.2, 0.1, 'Width') },
    build: (b, p) => {
      const w = p.width, h = w * 0.85;
      for (const sx of [-1, 1]) b.box(0.04, 0.9, 0.04, 'frame', { p: [sx * w * 0.35, 0.45, -0.1], r: [0.15, 0, sx * 0.08] });
      b.box(w, h, 0.05, 'board', { p: [0, 0.55 + h / 2, 0], r: [-0.04, 0, 0], rad: 0.03 });
      b.box(w * 1.04, 0.05, 0.12, 'frame', { p: [0, 0.54, 0.04], rad: 0.02 });
      [['bar1', 0.35], ['bar2', 0.55], ['bar3', 0.42]].forEach(([s, f], i) => b.box(0.14, h * f * 0.6, 0.04, s, { p: [-w * 0.2 + i * 0.2, 0.62 + h * f * 0.3, 0.04], rad: 0.01 }));
      b.cyl(0.11, 0.11, 0.05, 'plus', { p: [w * 0.25, 0.55 + h * 0.8, 0.04], r: [R90, 0, 0] }, 20);
    },
  },
  {
    id: 'books', name: 'Book Stack', cat: CAT, kw: ['book', 'books', 'stack', 'novel', 'reading'],
    slots: { b1: S('#f4789a', 'primary'), b2: S('#6bb0e8', 'tint'), b3: S('#ffd25e', 'fixed'), pages: S('#fff6e6', 'fixed') },
    params: { count: P(4, 1, 9, 1, 'Books') },
    build: (b, p) => {
      let y = 0;
      for (let i = 0; i < p.count; i++) {
        const t = 0.05 + (i % 3) * 0.018, w = 0.3 - (i % 2) * 0.04, s = ['b1', 'b2', 'b3'][i % 3];
        const g = b.grp({ p: [Math.sin(i * 2) * 0.02, y + t / 2, 0], r: [0, Math.sin(i * 1.7) * 0.25, 0] });
        b.box(w, t, 0.22, s, { parent: g, rad: 0.008 });
        b.box(w - 0.02, t - 0.016, 0.215, 'pages', { p: [0.014, 0, 0.004], parent: g, rad: 0.004, shadow: false });
        y += t;
      }
    },
  },
  {
    id: 'shelf', name: 'Wall Shelf', cat: CAT, kw: ['shelf', 'wall shelf', 'ledge', 'rack'],
    slots: { board: S('#ffffff', 'primary'), bracket: S('#8a86b3', 'secondary') },
    params: { width: P(0.9, 0.4, 2.4, 0.1, 'Width') },
    build: (b, p) => {
      b.box(p.width, 0.05, 0.28, 'board', { p: [0, 0.025, 0.14], rad: 0.02 });
      for (const sx of [-1, 1]) b.box(0.03, 0.14, 0.2, 'bracket', { p: [sx * (p.width / 2 - 0.1), -0.05, 0.1], rad: 0.01 });
    },
  },
  {
    id: 'cloud', name: 'Cloud', cat: 'Nature', kw: ['cloud', 'sky', 'weather', 'cumulus', 'fluffy'],
    slots: { body: S('#ffffff', 'primary', 0.9) },
    params: { size: P(1, 0.3, 3, 0.1, 'Size') },
    build: (b, p) => {
      const k = p.size;
      [[0, 0.3, 0, 0.3], [-0.32, 0.22, 0.02, 0.22], [0.34, 0.22, -0.02, 0.24], [0.08, 0.42, 0.04, 0.22]].forEach(([x, y, z, r]) => b.sph(r * k, 'body', { p: [x * k, y * k, z * k] }, 18));
      b.box(0.9 * k, 0.2 * k, 0.36 * k, 'body', { p: [0, 0.14 * k, 0], rad: 0.1 * k });
    },
  },
];
