import primitives from './prefabs/primitives.js';
import furniture from './prefabs/furniture.js';
import architecture from './prefabs/architecture.js';
import vehicles from './prefabs/vehicles.js';
import city from './prefabs/city.js';
import nature from './prefabs/nature.js';
import machines from './prefabs/machines.js';
import physics from './prefabs/physics.js';

export const CATEGORIES = [
  { id: 'All', icon: 'layout-grid' },
  { id: 'Architecture', icon: 'building-2' },
  { id: 'Furniture', icon: 'armchair' },
  { id: 'Vehicles', icon: 'car' },
  { id: 'City', icon: 'building' },
  { id: 'Nature', icon: 'trees' },
  { id: 'Machines', icon: 'cog' },
  { id: 'Physics', icon: 'orbit' },
  { id: 'Primitives', icon: 'shapes' },
];

const all = [...architecture, ...furniture, ...vehicles, ...city, ...nature, ...machines, ...physics, ...primitives];

export const PREFABS = Object.fromEntries(all.map((d) => [d.id, d]));
export const LIST = all;

/** Group / imported pseudo-prefabs (no procedural builder). */
PREFABS.group = { id: 'group', name: 'Group', cat: 'Utility', slots: {}, params: {}, kw: [], build() {} };
PREFABS.imported = { id: 'imported', name: 'Imported model', cat: 'Utility', slots: {}, params: { fit: { v: 2.5, min: 0, max: 40, step: 0.1, label: 'Size (m, 0 = original)' } }, kw: [], build() {} };

export const defaultParams = (def) => Object.fromEntries(Object.entries(def.params || {}).map(([k, v]) => [k, v.v]));
export const defaultColors = (def) => Object.fromEntries(Object.entries(def.slots || {}).map(([k, v]) => [k, v.c]));

export function searchLibrary(q, cat = 'All') {
  const s = (q || '').trim().toLowerCase();
  return all.filter((d) => (cat === 'All' || d.cat === cat) && (!s || d.name.toLowerCase().includes(s) || d.id.includes(s) || d.kw.some((k) => k.includes(s)) || d.cat.toLowerCase().includes(s)));
}
