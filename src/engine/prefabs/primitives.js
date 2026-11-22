import * as THREE from 'three';
import { S, P, R90 } from '../builder.js';

export default [
  {
    id: 'cube', name: 'Cube', cat: 'Primitives', kw: ['cube', 'box', 'block', 'brick', 'square'],
    slots: { main: S('#f4789a', 'primary') },
    params: { w: P(1, 0.1, 20, 0.1, 'Width'), h: P(1, 0.1, 20, 0.1, 'Height'), d: P(1, 0.1, 20, 0.1, 'Depth'), round: P(0.08, 0, 0.5, 0.01, 'Roundness') },
    build: (b, p) => b.box(p.w, p.h, p.d, 'main', { p: [0, p.h / 2, 0], rad: p.round }),
  },
  {
    id: 'sphere', name: 'Sphere', cat: 'Primitives', kw: ['sphere', 'ball', 'orb', 'globe', 'planet', 'circle'], collider: 'sphere',
    slots: { main: S('#6bb0e8', 'primary', 0.35) },
    params: { r: P(0.5, 0.05, 10, 0.05, 'Radius') },
    build: (b, p) => b.sph(p.r, 'main', { p: [0, p.r, 0] }, 40),
  },
  {
    id: 'cylinder', name: 'Cylinder', cat: 'Primitives', kw: ['cylinder', 'tube', 'tank', 'can', 'drum'], collider: 'cyl',
    slots: { main: S('#ffc233', 'primary') },
    params: { r: P(0.5, 0.05, 10, 0.05, 'Radius'), h: P(1, 0.1, 20, 0.1, 'Height') },
    build: (b, p) => b.cyl(p.r, p.r, p.h, 'main', { p: [0, p.h / 2, 0] }, 40),
  },
  {
    id: 'cone', name: 'Cone', cat: 'Primitives', kw: ['cone', 'spike', 'tip', 'party hat'],
    slots: { main: S('#7fd6a4', 'primary') },
    params: { r: P(0.5, 0.05, 10, 0.05, 'Radius'), h: P(1, 0.1, 20, 0.1, 'Height') },
    build: (b, p) => b.cone(p.r, p.h, 'main', { p: [0, p.h / 2, 0] }, 40),
  },
  {
    id: 'pyramid', name: 'Pyramid', cat: 'Primitives', kw: ['pyramid', 'tetra'],
    slots: { main: S('#ffd25e', 'primary') },
    params: { w: P(1.2, 0.1, 20, 0.1, 'Base'), h: P(1, 0.1, 20, 0.1, 'Height') },
    build: (b, p) => b.cone(p.w / Math.SQRT2, p.h, 'main', { p: [0, p.h / 2, 0], r: [0, Math.PI / 4, 0] }, 4),
  },
  {
    id: 'torus', name: 'Torus', cat: 'Primitives', kw: ['torus', 'ring', 'donut', 'doughnut', 'hoop', 'loop'],
    slots: { main: S('#b793f6', 'primary', 0.4) },
    params: { R: P(0.5, 0.1, 5, 0.05, 'Radius'), r: P(0.16, 0.02, 1, 0.01, 'Tube') },
    build: (b, p) => b.tor(p.R, p.r, 'main', { p: [0, p.r, 0], r: [R90, 0, 0] }, 16, 48),
  },
  {
    id: 'capsule', name: 'Capsule', cat: 'Primitives', kw: ['capsule', 'pill', 'bean'],
    slots: { main: S('#ff9b6b', 'primary') },
    params: { r: P(0.3, 0.05, 3, 0.05, 'Radius'), len: P(0.8, 0.1, 6, 0.1, 'Length') },
    build: (b, p) => b.cap(p.r, p.len, 'main', { p: [0, p.r + p.len / 2, 0] }),
  },
  {
    id: 'ramp', name: 'Ramp', cat: 'Primitives', kw: ['ramp', 'wedge', 'slope', 'slide', 'incline'], collider: 'hull',
    slots: { main: S('#8fc8f4', 'primary') },
    params: { w: P(1.5, 0.2, 10, 0.1, 'Width'), l: P(2.5, 0.2, 12, 0.1, 'Length'), h: P(1, 0.1, 6, 0.1, 'Height') },
    build: (b, p) => b.ext([[-p.l / 2, 0], [p.l / 2, 0], [p.l / 2, p.h]], p.w, 'main', { r: [0, R90, 0] }, 0.025),
  },
  {
    id: 'label', name: 'Text Label', cat: 'Primitives', kw: ['text', 'label', 'title', 'sign'], noCollider: true,
    slots: { text: S('#ffffff', 'fixed') },
    params: { text: { v: 'Label', text: true, label: 'Text' }, size: P(0.5, 0.15, 3, 0.05, 'Size'), bg: { v: 1, options: ['None', 'Pill'], label: 'Backdrop' } },
    build: (b, p, ctx) => {
      const c = document.createElement('canvas');
      const g = c.getContext('2d');
      const fs = 96, txt = String(p.text || ' ');
      g.font = `700 ${fs}px Inter Variable, Inter, system-ui, sans-serif`;
      const tw = Math.ceil(g.measureText(txt).width) + 80;
      c.width = tw; c.height = fs + 70;
      g.font = `700 ${fs}px Inter Variable, Inter, system-ui, sans-serif`;
      if (p.bg === 1) {
        g.fillStyle = 'rgba(37,34,47,0.92)';
        const r = c.height / 2;
        g.beginPath(); g.roundRect(0, 0, c.width, c.height, r); g.fill();
      }
      g.fillStyle = b.colors.text ?? '#ffffff';
      g.textBaseline = 'middle'; g.textAlign = 'center';
      if (p.bg !== 1) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; }
      g.fillText(txt, c.width / 2, c.height / 2 + 4);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      const h = p.size, w = (h * c.width) / c.height;
      sp.scale.set(w, h, 1);
      sp.position.y = h / 2 + 0.2;
      sp.userData.isLabel = true;
      b.group.add(sp);
    },
  },
];
