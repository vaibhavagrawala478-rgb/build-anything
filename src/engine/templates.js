import { gearRadius } from './prefabs/machines.js';

const d2r = (d) => (d * Math.PI) / 180;
const rotY = (deg) => [0, d2r(deg), 0];

/** Tiny DSL for placing prefabs while building a template. */
function put(doc) {
  return (prefab, x, y, z, o = {}) => doc.create(prefab, {
    pos: [x, y, z], rot: o.rot || (o.ry != null ? rotY(o.ry) : undefined), scale: o.scale, params: o.p, colors: o.c,
    name: o.name, physics: o.phys, motion: o.motion, mass: o.mass, finish: o.finish, silent: true,
  });
}

const toothPhase = (teeth, angleDeg, gap) => angleDeg - (gap ? 0.91 : 0.41) * (360 / teeth);

export const TEMPLATES = [
  {
    id: 'workspace', name: 'Workspace Concept', desc: 'A cosy pink studio with a desk, sofa and plants.', tag: 'Interior',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1.2, 0], zoom: 1.35, fov: 35 },
    meta: { bg: '#201D28' },
    build(doc) {
      const a = put(doc), Y = 0.35;
      a('floor', 0, 0, 0, { p: { width: 9, depth: 9, thick: Y }, c: { top: '#f4abbf', side: '#e57b99' }, phys: 'static', name: 'Floor' });
      a('wall', 0, Y, -4.35, { p: { length: 9, height: 3.4, thick: 0.3 }, c: { wall: '#f08aa6' }, name: 'Back wall', phys: 'static' });
      a('wall', -4.35, Y, 0, { ry: 90, p: { length: 9, height: 3.4, thick: 0.3 }, c: { wall: '#f08aa6' }, name: 'Left wall', phys: 'static' });
      a('rug_round', 0.2, Y, 0.4, { p: { radius: 1.55 }, c: { main: '#fbe36b', edge: '#fff0a8' } });
      // left wall: desk workstation
      a('desk', -3.55, Y, -0.6, { ry: 90, p: { width: 2.2, depth: 0.85 }, name: 'Desk', phys: 'static' });
      a('computer', -3.75, Y + 0.76, -0.9, { ry: 90, p: { size: 1.15 }, name: 'Monitor' });
      a('books', -3.45, Y + 0.76, 0.15, { ry: 70, p: { count: 4 } });
      a('office_chair', -2.55, Y, -0.55, { ry: -80, name: 'Work chair', c: { seat: '#ffffff', base: '#8a86b3' } });
      a('picture', -4.17, Y + 1.5, 1.7, { ry: 90, p: { width: 1, height: 0.75 }, c: { art: '#8fc8f4' } });
      a('cloud', -4.1, Y + 2.2, -2.2, { ry: 90, p: { size: 0.9 }, name: 'Cloud sticker' });
      a('picture', -4.17, Y + 1.5, -2.6, { ry: 90, p: { width: 0.6, height: 0.8 }, c: { art: '#ffc233' } });
      // back wall: window, clock, shelf
      a('window', 1.9, Y + 0.95, -4.17, { p: { width: 1.5, height: 1.8, blind: 0.3 }, name: 'Window' });
      a('wall_clock', 0.1, Y + 1.8, -4.2, { p: { radius: 0.32 } });
      a('shelf', 3.55, Y + 1.5, -4.2, { p: { width: 1.1 } });
      a('books', 3.4, Y + 1.55, -4.05, { p: { count: 3 }, scale: [0.8, 0.8, 0.8] });
      // furniture
      a('chart_board', -1.4, Y, -3.2, { ry: 8, p: { width: 1.4 }, name: 'Chart board' });
      a('sofa', 2.3, Y, -3.45, { p: { width: 2.6 }, c: { body: '#6bb0e8', cushion: '#92c9f3', legs: '#c89b6d' }, name: 'Sofa' });
      a('table', 1.2, Y, 0.5, { p: { width: 1.1, depth: 0.6, height: 0.42 }, c: { top: '#ffffff' }, name: 'Coffee table' });
      a('armchair', 3.1, Y, 1.1, { ry: -125, c: { body: '#f4789a', cushion: '#f9a1bb' } });
      a('plant', 3.85, Y, -3.9, { p: { type: 0, height: 0.8, pot: 0.22 }, name: 'Plant' });
      a('plant', -3.85, Y, 3.6, { p: { type: 1, height: 0.7, pot: 0.2 }, name: 'Plant' });
      a('plant', -3.75, Y + 0.76, 0.75, { p: { type: 4, height: 0.5, pot: 0.1 }, name: 'Desk plant' });
      a('floor_lamp', -3.8, Y, 2.5, { p: { height: 1.7 }, c: { shade: '#ffe27a' } });
    },
  },
  {
    id: 'tiny-house', name: 'Tiny House', desc: 'A cottage with a garden, fence and a parked car.', tag: 'Architecture',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1, 0], zoom: 1.5, fov: 35 },
    meta: { bg: '#1d2a2c' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 14, depth: 12, thick: 0.3 }, c: { top: '#8ed87a', side: '#6a4a36' }, name: 'Lawn', phys: 'static' });
      a('house', -2, 0.3, -1.5, { p: { width: 5.5, depth: 4.5, height: 2.6, pitch: 1.7 }, name: 'House', phys: 'static' });
      a('road', 4.6, 0.3, 0, { p: { length: 12, width: 2.2 }, name: 'Road' });
      a('car', 4.6, 0.38, 1.5, { ry: 0, c: { body: '#f4789a' }, name: 'Car' });
      a('tree', -5.2, 0.3, 2, { p: { height: 3.2 } });
      a('pine', 1.2, 0.3, -4.5, { p: { height: 3.4 } });
      a('pine', 2.4, 0.3, -4, { p: { height: 2.4 } });
      a('bush', -4.6, 0.3, -2.4, { p: { size: 0.9 } });
      a('bush', 0.7, 0.3, -0.4, { p: { size: 0.7 } });
      a('flower', -1.2, 0.3, 1.4, {}); a('flower', -0.8, 0.3, 1.7, { c: { petal: '#ffc233' } }); a('flower', -1.5, 0.3, 1.8, { c: { petal: '#ffffff' } });
      for (let i = 0; i < 4; i++) a('fence', -5.5 + i * 3, 0.3, 4.9, { p: { length: 3 }, name: 'Fence' });
      a('bench', -3, 0.3, 2.4, { ry: 180 });
      a('streetlamp', 3.2, 0.3, -1.6, { p: { height: 3 } });
    },
  },
  {
    id: 'city-block', name: 'City Block', desc: 'A grid of streets, towers, traffic and trees.', tag: 'City',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1.5, 0], zoom: 0.95, fov: 35 },
    meta: { bg: '#1c2030' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 22, depth: 22, thick: 0.3 }, c: { top: '#cfd8e8', side: '#8a96b0' }, name: 'Ground', phys: 'static' });
      a('road', 0, 0.3, 0, { p: { length: 22, width: 2.6 }, name: 'Avenue' });
      a('road', 0, 0.3, 0, { ry: 90, p: { length: 22, width: 2.6 }, name: 'Street' });
      const cols = ['#8fc8f4', '#b793f6', '#f4789a', '#ffc233', '#7fd6a4', '#ff9b6b'];
      let k = 0;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const bx = sx * 6.2, bz = sz * 6.2;
        a('skyscraper', bx, 0.3, bz, { p: { width: 2.6, floors: 12 + ((k * 5) % 12) }, c: { wall: cols[k % 6] }, name: 'Tower' });
        a('building', bx + sx * 3, 0.3, bz - sz * 3, { p: { width: 2.4, depth: 2.4, floors: 3 + (k % 4) }, c: { wall: cols[(k + 2) % 6] } });
        a('building', bx - sx * 3, 0.3, bz + sz * 3, { p: { width: 2.4, depth: 2.4, floors: 2 + ((k + 1) % 3) }, c: { wall: cols[(k + 4) % 6] } });
        a('tree', bx + sx * 1.8, 0.3, bz + sz * 2.6, { p: { height: 2 } });
        k++;
      }
      a('car', 0.6, 0.38, 5, { ry: 0, c: { body: '#ffc233' }, p: { length: 3 } });
      a('car', -0.6, 0.38, -6, { ry: 180, c: { body: '#f4789a' }, p: { length: 3 } });
      a('bus', 6, 0.38, 0.6, { ry: 90, c: { body: '#ffc233' } });
      a('traffic_light', 1.7, 0.3, 1.7, { name: 'Traffic light' });
      a('streetlamp', -1.9, 0.3, 3.6, {}); a('streetlamp', -1.9, 0.3, -3.6, { ry: 180 });
      a('fountain', 0, 0.3, 0, { p: { radius: 0.9 }, name: 'Fountain' }).position.set(0, 0.3, 0);
    },
  },
  {
    id: 'gear-machine', name: 'Gear Machine', desc: 'Meshing gears, a piston engine, motor and robot arm. Press Play.', tag: 'Mechanical',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [3, 1.6, 0], zoom: 1.05, fov: 35 },
    meta: { bg: '#1d2230' },
    build(doc) {
      const a = put(doc), H = 2.6;
      a('floor', 2, 0, 0, { p: { width: 16, depth: 8, thick: 0.25 }, c: { top: '#9aa3b2', side: '#6b7686' }, name: 'Workbench', phys: 'static' });
      const tA = 16, tB = 33, tC = 8, rA = gearRadius(tA), rB = gearRadius(tB), rC = gearRadius(tC);
      const y = (r) => H - r - 0.1 + 0.25;
      const w = 20;
      const xA = -3, xB = xA + rA + rB, xC = xB + rB + rC;
      a('gear', xA, y(rA), 0, { p: { teeth: tA, rpm: w, phase: toothPhase(tA, 0, false), thick: 0.3 }, c: { teeth: '#ffc233' }, name: 'Drive gear' });
      a('gear', xB, y(rB), 0, { p: { teeth: tB, rpm: (-w * tA) / tB, phase: toothPhase(tB, 180, true), thick: 0.3 }, c: { teeth: '#f4789a' }, name: 'Big gear' });
      a('gear', xC, y(rC), 0, { p: { teeth: tC, rpm: (w * tA) / tC, phase: toothPhase(tC, 180, true), thick: 0.3 }, c: { teeth: '#6bb0e8' }, name: 'Small gear' });
      a('motor', xA - 2.2, 0.25, 0, { ry: 0, p: { rpm: w }, name: 'Motor' });
      a('piston', 8.2, 0.25, -0.5, { p: { rpm: 40 }, name: 'Piston engine' });
      a('conveyor', 2, 0.25, 3, { p: { length: 6, speed: 0.8 }, name: 'Conveyor' });
      a('robot_arm', 6.5, 0.25, 2.6, { ry: -90, name: 'Robot arm' });
      a('fan', -4.2, 0.25, 3, { p: { rpm: 160 }, name: 'Fan' });
      a('pendulum', 10.4, 0.25, 2.2, { name: 'Pendulum' });
      a('spring', -0.8, 0.25, -2.4, { name: 'Spring' });
    },
  },
  {
    id: 'physics-playground', name: 'Physics Playground', desc: 'Dominoes, ramps, crates and balls. Press Play, then click things.', tag: 'Simulation',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1, 0], zoom: 1.2, fov: 35 },
    meta: { bg: '#232033' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 16, depth: 12, thick: 0.4 }, c: { top: '#b9e7c6', side: '#6fa584' }, phys: 'static', name: 'Ground' });
      a('ramp', -5.5, 0.4, -2, { ry: 0, p: { w: 2.2, l: 4, h: 2 }, c: { main: '#8fc8f4' }, phys: 'static', name: 'Ramp' });
      a('ball', -6.3, 2.2, -2, { p: { r: 0.4 }, c: { main: '#f4789a' }, phys: 'dynamic', name: 'Ball' });
      a('ball', -5.5, 3.2, -2, { p: { r: 0.3 }, c: { main: '#ffc233' }, phys: 'dynamic', name: 'Ball' });
      for (let i = 0; i < 9; i++) a('domino', -2.4 + i * 0.75, 0.4, -2, { ry: 90, p: { h: 1.1 }, phys: 'dynamic', c: { body: i % 2 ? '#ffffff' : '#ffe9c7' }, name: 'Domino' });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4 - r; c++) a('crate', 3 + c * 0.9 + r * 0.45, 0.4 + r * 0.8, 2.2, { p: { size: 0.8 }, phys: 'dynamic', name: 'Crate' });
      a('barrel', 5.5, 0.4, -2.5, { phys: 'dynamic', name: 'Barrel' });
      a('barrel', 6.3, 0.4, -2.2, { phys: 'dynamic', c: { body: '#6bb0e8' }, name: 'Barrel' });
      a('plank', 3.2, 0.4, -2.5, { p: { l: 3.4, w: 0.8, t: 0.12 }, ry: 0, rot: [0, 0, 0.0], phys: 'static', name: 'Bench plank' });
      a('cube', 1.2, 0.4, 3.6, { p: { w: 3.2, h: 0.5, d: 0.5 }, c: { main: '#b793f6' }, phys: 'static', motion: { type: 'spin', axis: 'y', speed: 30 }, name: 'Spinner' });
      a('sphere', 1.2, 4.2, 3.6, { p: { r: 0.35 }, phys: 'dynamic', name: 'Drop ball' });
    },
  },
];

export const COMMUNITY = [
  {
    id: 'cozy-bedroom', name: 'Cozy Bedroom', desc: 'Bed, wardrobe, rug and a reading nook.', tag: 'Interior',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1.2, 0], zoom: 1.5, fov: 35 },
    meta: { bg: '#241f2e' },
    build(doc) {
      const a = put(doc), Y = 0.3;
      a('floor', 0, 0, 0, { p: { width: 7, depth: 7, thick: Y }, c: { top: '#e8d6f2', side: '#b79ad0' }, name: 'Floor' });
      a('wall', 0, Y, -3.35, { p: { length: 7, height: 3, thick: 0.3 }, c: { wall: '#b9a1f0' } });
      a('wall', -3.35, Y, 0, { ry: 90, p: { length: 7, height: 3, thick: 0.3 }, c: { wall: '#b9a1f0' } });
      a('bed', -1.3, Y, -2.2, { p: { width: 1.7 }, c: { sheet: '#f4789a' }, name: 'Bed' });
      a('wardrobe', 2.5, Y, -3, { p: { width: 1.6, height: 2.2 } });
      a('rug', 0.8, Y, 0.8, { ry: 20, p: { width: 3, depth: 2 }, c: { main: '#8fc8f4', edge: '#cfe8fb' } });
      a('bookshelf', -3.05, Y, 1.4, { ry: 90, p: { width: 1.5, height: 2.2 } });
      a('armchair', 1.2, Y, 1.5, { ry: -150, c: { body: '#ffc233', cushion: '#ffd978' } });
      a('floor_lamp', 2.6, Y, 1.9, { c: { shade: '#fff1b3' } });
      a('window', 1, Y + 0.95, -3.17, { p: { width: 1.4, height: 1.6 } });
      a('plant', -2.8, Y, 3, { p: { type: 2, height: 0.9, pot: 0.22 } });
      a('picture', -3.17, Y + 1.5, -1, { ry: 90, c: { art: '#f4789a' } });
    },
  },
  {
    id: 'windmill-farm', name: 'Windmill Farm', desc: 'Rolling windmills, trees and a little farmhouse.', tag: 'Landscape',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 1.5, 0], zoom: 1.1, fov: 35 },
    meta: { bg: '#1f2c34' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 16, depth: 14, thick: 0.35 }, c: { top: '#a5e07a', side: '#7a5a3f' }, name: 'Field' });
      a('windmill', -3.5, 0.35, -2.5, { p: { height: 4, rpm: 12 }, name: 'Windmill' });
      a('windmill', 2.5, 0.35, -4, { p: { height: 3, rpm: 20 }, c: { roof: '#6bb0e8' }, name: 'Windmill' });
      a('house', 3.5, 0.35, 1.5, { p: { width: 4, depth: 3.5 }, c: { roof: '#6bb0e8' }, name: 'Farmhouse' });
      a('tree', -5.5, 0.35, 2.5, {}); a('tree', -6.2, 0.35, 0.5, { p: { height: 3.2 } }); a('tree', 6.4, 0.35, -2, {});
      a('bush', -2, 0.35, 3, {}); a('bush', 0.5, 0.35, 4.3, { p: { size: 1 } });
      for (let i = 0; i < 5; i++) a('fence', -6 + i * 3, 0.35, 6.4, { p: { length: 3 } });
      a('cloud', -2, 5.2, -3, { p: { size: 2 } }); a('cloud', 4, 6, 0, { p: { size: 1.4 } });
    },
  },
  {
    id: 'rocket-pad', name: 'Rocket Launch Pad', desc: 'Rockets, towers and a control room.', tag: 'Space',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 2, 0], zoom: 1.2, fov: 35 },
    meta: { bg: '#0f1228' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 12, depth: 10, thick: 0.3 }, c: { top: '#cfd3da', side: '#6b7686' }, name: 'Pad' });
      a('rocket', 0, 0.3, 0, { p: { height: 4.2 }, name: 'Rocket' });
      a('rocket', -3.5, 0.3, 1.5, { p: { height: 2.2 }, c: { nose: '#6bb0e8', fin: '#6bb0e8' } });
      a('column', 1.6, 0.3, 0, { p: { height: 4.5, radius: 0.18 }, c: { shaft: '#ffc233' }, name: 'Gantry' });
      a('building', 4, 0.3, -2, { p: { width: 2.6, depth: 2.2, floors: 3 }, c: { wall: '#b793f6' }, name: 'Control room' });
      a('streetlamp', 3, 0.3, 2.5, {}); a('streetlamp', -2.5, 0.3, -3, {});
      a('truck', 3.5, 0.3, 3, { ry: 90, c: { body: '#ffc233' } });
      a('fan', -4.8, 0.3, -2.5, { p: { rpm: 90 } });
    },
  },
  {
    id: 'domino-run', name: 'Domino Run', desc: 'A winding domino chain, ready for a push.', tag: 'Simulation',
    camera: { ortho: true, pos: [60.8, 60.8, 60.8], target: [0, 0.6, 0], zoom: 1.3, fov: 35 },
    meta: { bg: '#232033' },
    build(doc) {
      const a = put(doc);
      a('floor', 0, 0, 0, { p: { width: 14, depth: 10, thick: 0.4 }, c: { top: '#ffe9c7', side: '#c89b6d' }, phys: 'static', name: 'Table' });
      for (let i = 0; i < 12; i++) a('domino', -5 + i * 0.7, 0.4, 0, { ry: 90, p: { h: 1 }, phys: 'dynamic', c: { body: ['#f4789a', '#ffc233', '#6bb0e8', '#7fd6a4'][i % 4] }, name: 'Domino' });
      for (let i = 0; i < 8; i++) { const ang = i * 0.22; a('domino', 3.6 + Math.sin(ang * 1.6) * 1.2, 0.4, 0.8 + i * 0.7, { ry: 90 - (Math.cos(ang * 1.6) * 30), p: { h: 1 }, phys: 'dynamic', c: { body: ['#b793f6', '#ff9b6b'][i % 2] }, name: 'Domino' }); }
      a('ball', -6, 3, 0, { p: { r: 0.3 }, c: { main: '#e5484d' }, phys: 'dynamic', name: 'Wrecking ball' });
    },
  },
];

export const ALL_TEMPLATES = [...TEMPLATES, ...COMMUNITY];
export const BLANK = { id: 'blank', name: 'Blank canvas', desc: 'Start from an empty grid.', tag: 'Empty', camera: null, meta: { bg: '#201D28' }, build() {} };
