import { S, P, R90 } from '../builder.js';

export default [
  {
    id: 'house', name: 'House', cat: 'City', kw: ['house', 'home', 'cabin', 'cottage', 'villa', 'bungalow', 'hut', 'residence', 'shed'],
    slots: { wall: S('#fff1d6', 'primary', 0.85), roof: S('#e5604f', 'secondary', 0.7), door: S('#c89b6d', 'fixed'), glass: S('#a8dcff', 'fixed', 0.1, 0, { opacity: 0.8 }), trim: S('#ffffff', 'tint') },
    params: { width: P(5, 3, 12, 0.5, 'Width'), depth: P(4.5, 3, 12, 0.5, 'Depth'), height: P(2.6, 2, 5, 0.1, 'Wall height'), pitch: P(1.6, 0.5, 3, 0.1, 'Roof pitch') },
    build: (b, p) => {
      const { width: w, depth: d, height: h } = p;
      b.box(w, h, d, 'wall', { p: [0, h / 2, 0], rad: 0.05 });
      b.box(w + 0.1, 0.16, d + 0.1, 'trim', { p: [0, 0.08, 0], rad: 0.03 });
      b.ext([[-w / 2 - 0.4, 0], [w / 2 + 0.4, 0], [0, p.pitch]], d + 0.5, 'roof', { p: [0, h, 0] }, 0.05);
      b.box(0.9, 1.9, 0.08, 'door', { p: [-w * 0.2, 0.95, d / 2 + 0.01], rad: 0.03 });
      b.sph(0.045, 'trim', { p: [-w * 0.2 + 0.28, 0.95, d / 2 + 0.07] }, 10);
      for (const x of [w * 0.2, w * 0.38]) {
        b.box(0.7, 0.8, 0.06, 'glass', { p: [x, 1.4, d / 2 + 0.01], rad: 0.02 });
        b.box(0.86, 0.07, 0.1, 'trim', { p: [x, 1.0, d / 2 + 0.05], rad: 0.015 });
      }
      b.box(0.5, 1.1, 0.5, 'trim', { p: [w * 0.3, h + p.pitch * 0.55, -d * 0.2], rad: 0.03 });
    },
  },
  {
    id: 'building', name: 'Building', cat: 'City', kw: ['building', 'apartment', 'office', 'block', 'tower block', 'flat', 'condo', 'shop', 'store'],
    slots: { wall: S('#8fc8f4', 'primary', 0.5), glass: S('#e8f6ff', 'tint', 0.15, 0.2), top: S('#ffffff', 'secondary') },
    params: { width: P(3, 1.5, 10, 0.5, 'Width'), depth: P(3, 1.5, 10, 0.5, 'Depth'), floors: P(5, 1, 20, 1, 'Floors') },
    build: (b, p) => {
      const fh = 0.8, H = p.floors * fh;
      b.box(p.width, H, p.depth, 'wall', { p: [0, H / 2, 0], rad: 0.06 });
      b.box(p.width + 0.12, 0.12, p.depth + 0.12, 'top', { p: [0, H + 0.06, 0], rad: 0.03 });
      const cols = Math.max(1, Math.floor(p.width / 0.8)), colsD = Math.max(1, Math.floor(p.depth / 0.8));
      for (let f = 0; f < p.floors; f++) {
        for (let i = 0; i < cols; i++) b.box(0.4, 0.42, 0.04, 'glass', { p: [-p.width / 2 + (p.width / cols) * (i + 0.5), f * fh + 0.5, p.depth / 2 + 0.005], rad: 0.01, shadow: false });
        for (let i = 0; i < colsD; i++) b.box(0.04, 0.42, 0.4, 'glass', { p: [p.width / 2 + 0.005, f * fh + 0.5, -p.depth / 2 + (p.depth / colsD) * (i + 0.5)], rad: 0.01, shadow: false });
      }
    },
  },
  {
    id: 'skyscraper', name: 'Skyscraper', cat: 'City', kw: ['skyscraper', 'tower', 'highrise', 'high-rise', 'downtown', 'city', 'office tower', 'metropolis'],
    slots: { wall: S('#b793f6', 'primary', 0.3, 0.2), glass: S('#e0ecff', 'tint', 0.15, 0.3), top: S('#ffffff', 'secondary') },
    params: { width: P(2.4, 1.5, 6, 0.1, 'Width'), floors: P(14, 6, 40, 1, 'Floors') },
    build: (b, p) => {
      const fh = 0.7, H = p.floors * fh, w = p.width;
      b.box(w, H * 0.78, w, 'wall', { p: [0, (H * 0.78) / 2, 0], rad: 0.06 });
      b.box(w * 0.72, H * 0.22, w * 0.72, 'wall', { p: [0, H * 0.78 + (H * 0.22) / 2, 0], rad: 0.05 });
      b.cyl(0.04, 0.05, H * 0.3, 'top', { p: [0, H + H * 0.15, 0] }, 8);
      for (let f = 0; f < p.floors - 1; f++) {
        const ww = f * fh > H * 0.78 ? w * 0.72 : w;
        b.box(ww - 0.2, 0.1, 0.03, 'glass', { p: [0, f * fh + 0.55, ww / 2 + 0.003], rad: 0.01, shadow: false });
        b.box(ww - 0.2, 0.1, 0.03, 'glass', { p: [0, f * fh + 0.55, -ww / 2 - 0.003], rad: 0.01, shadow: false });
        b.box(0.03, 0.1, ww - 0.2, 'glass', { p: [ww / 2 + 0.003, f * fh + 0.55, 0], rad: 0.01, shadow: false });
        b.box(0.03, 0.1, ww - 0.2, 'glass', { p: [-ww / 2 - 0.003, f * fh + 0.55, 0], rad: 0.01, shadow: false });
      }
    },
  },
  {
    id: 'road', name: 'Road', cat: 'City', kw: ['road', 'street', 'highway', 'avenue', 'path', 'lane', 'asphalt'],
    slots: { asphalt: S('#3b3848', 'fixed', 0.95), line: S('#ffe27a', 'fixed', 0.8), curb: S('#cfcbe0', 'fixed', 0.9) },
    params: { length: P(8, 1, 40, 1, 'Length'), width: P(2.4, 1.2, 8, 0.2, 'Width') },
    build: (b, p) => {
      b.box(p.width, 0.08, p.length, 'asphalt', { p: [0, 0.04, 0], rad: 0.02, shadow: false });
      for (const s of [-1, 1]) b.box(0.14, 0.12, p.length, 'curb', { p: [s * (p.width / 2 + 0.05), 0.06, 0], rad: 0.03, shadow: false });
      const n = Math.floor(p.length / 0.9);
      for (let i = 0; i < n; i++) b.box(0.08, 0.01, 0.4, 'line', { p: [0, 0.085, -p.length / 2 + 0.5 + i * ((p.length - 0.8) / Math.max(1, n - 1))], rad: 0, shadow: false });
    },
  },
  {
    id: 'streetlamp', name: 'Street Lamp', cat: 'City', kw: ['streetlamp', 'street lamp', 'streetlight', 'lamp post', 'lamppost', 'light post'],
    slots: { pole: S('#2f2c3b', 'fixed', 0.5, 0.5), bulb: S('#ffe27a', 'fixed', 0.3, 0, { glow: 1 }) },
    params: { height: P(3.2, 1.5, 6, 0.1, 'Height') },
    build: (b, p) => {
      b.cyl(0.12, 0.14, 0.15, 'pole', { p: [0, 0.075, 0] }, 12);
      b.cyl(0.04, 0.05, p.height, 'pole', { p: [0, p.height / 2, 0] }, 10);
      b.box(0.7, 0.05, 0.08, 'pole', { p: [0.3, p.height, 0], rad: 0.02 });
      b.box(0.28, 0.07, 0.14, 'bulb', { p: [0.55, p.height - 0.06, 0], rad: 0.03 });
    },
  },
  {
    id: 'traffic_light', name: 'Traffic Light', cat: 'City', kw: ['traffic', 'traffic light', 'stoplight', 'signal'],
    slots: { pole: S('#2f2c3b', 'fixed', 0.5, 0.5), red: S('#ff4d5a', 'fixed', 0.4, 0, { glow: 0.9 }), amber: S('#ffb02e', 'fixed', 0.4, 0, { glow: 0.2 }), green: S('#4cd98a', 'fixed', 0.4, 0, { glow: 0.2 }) },
    params: {},
    build: (b) => {
      b.cyl(0.05, 0.05, 2.4, 'pole', { p: [0, 1.2, 0] }, 10);
      b.box(0.34, 0.95, 0.3, 'pole', { p: [0, 2.5, 0], rad: 0.06 });
      b.sph(0.1, 'red', { p: [0, 2.8, 0.14] }, 14); b.sph(0.1, 'amber', { p: [0, 2.5, 0.14] }, 14); b.sph(0.1, 'green', { p: [0, 2.2, 0.14] }, 14);
    },
  },
  {
    id: 'bench', name: 'Bench', cat: 'City', kw: ['bench', 'park bench', 'seat', 'pew'],
    slots: { wood: S('#c89b6d', 'primary', 0.8), metal: S('#2f2c3b', 'fixed', 0.4, 0.5) },
    params: { length: P(1.6, 0.8, 4, 0.1, 'Length') },
    build: (b, p) => {
      for (let i = 0; i < 3; i++) b.box(p.length, 0.05, 0.12, 'wood', { p: [0, 0.45, -0.14 + i * 0.14], rad: 0.015 });
      for (let i = 0; i < 3; i++) b.box(p.length, 0.1, 0.04, 'wood', { p: [0, 0.65 + i * 0.13, -0.26], r: [-0.12, 0, 0], rad: 0.012 });
      for (const s of [-1, 1]) { b.box(0.05, 0.45, 0.5, 'metal', { p: [s * (p.length / 2 - 0.08), 0.22, -0.05], rad: 0.015 }); }
    },
  },
  {
    id: 'water_tower', name: 'Water Tower', cat: 'City', kw: ['water tower', 'silo', 'reservoir'],
    slots: { tank: S('#8fc8f4', 'primary', 0.5), leg: S('#8a86b3', 'secondary', 0.4, 0.4), roof: S('#e5604f', 'fixed') },
    params: { height: P(3.5, 2, 8, 0.25, 'Height') },
    build: (b, p) => {
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.78; b.cyl(0.05, 0.05, p.height, 'leg', { p: [Math.cos(a) * 0.6, p.height / 2, Math.sin(a) * 0.6], r: [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1] }, 8); }
      b.cyl(0.9, 0.9, 1.4, 'tank', { p: [0, p.height + 0.7, 0] }, 32);
      b.cone(1, 0.6, 'roof', { p: [0, p.height + 1.7, 0] }, 32);
    },
  },
  {
    id: 'windmill', name: 'Windmill', cat: 'City', kw: ['windmill', 'wind turbine', 'turbine', 'wind', 'mill', 'farm'],
    slots: { tower: S('#fff1d6', 'primary', 0.8), roof: S('#e5604f', 'secondary'), blade: S('#ffffff', 'tint'), hub: S('#c89b6d', 'fixed') },
    params: { height: P(3.2, 2, 8, 0.2, 'Height'), rpm: P(14, 0, 90, 1, 'Blade RPM') },
    build: (b, p) => {
      const H = p.height;
      b.cyl(0.55, 0.9, H, 'tower', { p: [0, H / 2, 0] }, 24);
      b.cone(0.7, 0.9, 'roof', { p: [0, H + 0.45, 0] }, 24);
      b.box(0.4, 0.6, 0.06, 'hub', { p: [0, 0.4, 0.88], rad: 0.02 });
      const rotor = b.grp({ p: [0, H * 0.82, 0.78] });
      b.sph(0.12, 'hub', { parent: rotor }, 12);
      for (let i = 0; i < 4; i++) {
        const bl = b.grp({ parent: rotor, r: [0, 0, (i * Math.PI) / 2] });
        b.box(0.34, H * 0.6, 0.03, 'blade', { p: [0.2, H * 0.32, 0.04], parent: bl, rad: 0.01 });
        b.box(0.06, H * 0.64, 0.05, 'hub', { p: [0.02, H * 0.32, 0.02], parent: bl, rad: 0.01 });
      }
      b.spin(rotor, 'z', -p.rpm);
    },
  },
  {
    id: 'fountain', name: 'Fountain', cat: 'City', kw: ['fountain', 'pond', 'pool', 'water'],
    slots: { stone: S('#e6e1f0', 'primary', 0.8), water: S('#7fd6f4', 'fixed', 0.1, 0, { opacity: 0.8 }) },
    params: { radius: P(1.2, 0.6, 3, 0.1, 'Radius') },
    build: (b, p) => {
      const r = p.radius;
      b.cyl(r, r * 1.05, 0.4, 'stone', { p: [0, 0.2, 0] }, 40);
      b.cyl(r * 0.88, r * 0.88, 0.05, 'water', { p: [0, 0.38, 0], shadow: false }, 40);
      b.cyl(0.12, 0.18, 0.9, 'stone', { p: [0, 0.8, 0] }, 16);
      b.cyl(0.45, 0.2, 0.15, 'stone', { p: [0, 1.2, 0] }, 24);
      b.sph(0.1, 'water', { p: [0, 1.4, 0] }, 12);
    },
  },
];
