import * as THREE from 'three';
import { LIST, PREFABS, defaultParams } from './library.js';

/**
 * "AI Generate": turns a short text prompt into several variants of the best
 * matching procedural component. It's a local keyword/semantic matcher plus a
 * seeded variation engine (no network involved), so it is instant and offline.
 */

export const STYLES = [
  { id: 'toy', name: 'Toy', desc: 'Soft pastel candy colours', finish: 'default', primary: ['#f4789a', '#6bb0e8', '#ffc233', '#7fd6a4', '#b793f6', '#ff9b6b', '#ffffff', '#8fc8f4'], secondary: ['#ffffff', '#ffe9c7', '#d8ecff', '#ffe0ea', '#c89b6d'] },
  { id: 'realistic', name: 'Natural', desc: 'Muted, earthy real-world tones', finish: 'default', primary: ['#8a6a4f', '#5b7a99', '#7a8b6a', '#a05a4a', '#6d6d73', '#c2b59b', '#4a6670'], secondary: ['#d9d2c5', '#4b4b52', '#9b7653', '#ece6da'] },
  { id: 'neon', name: 'Neon', desc: 'Glowing arcade colours', finish: 'glow', primary: ['#ff2e93', '#2ee6ff', '#b6ff2e', '#ffb02e', '#9b5cff'], secondary: ['#1b1830', '#2a2250', '#102a43'] },
  { id: 'mono', name: 'Mono', desc: 'Clean greyscale', finish: 'matte', primary: ['#f2f2f2', '#cfcfcf', '#9a9a9a', '#5e5e5e', '#2a2a2a'], secondary: ['#ffffff', '#bdbdbd', '#3a3a3a'] },
  { id: 'metal', name: 'Metal', desc: 'Brushed industrial finish', finish: 'metal', primary: ['#cfd3da', '#9aa3b2', '#b87333', '#e8c872', '#6b7686'], secondary: ['#3a3f4a', '#8d95a3', '#d9dce2'] },
];

const COLORS = {
  red: '#e5484d', pink: '#f4789a', rose: '#f08aa6', orange: '#ff8a3d', yellow: '#ffc933', gold: '#e8b84a', green: '#4cb782', lime: '#a3d94a', teal: '#2fb5a9',
  blue: '#4f9be8', navy: '#2b4a8c', cyan: '#3fd0e6', purple: '#8e63e6', violet: '#8e63e6', lilac: '#b9a1f0', brown: '#8a5a3c', white: '#f7f5fb', black: '#26232e',
  grey: '#9a98a8', gray: '#9a98a8', silver: '#cfd3da', beige: '#e8d9bd', cream: '#fff1d6',
};
const SIZES = { big: 1.5, large: 1.5, huge: 2, giant: 2.2, tiny: 0.5, small: 0.7, little: 0.7, mini: 0.6, medium: 1 };
const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3, several: 4, pair: 2, dozen: 12 };

const singular = (w) => (w.length > 3 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && /(ches|shes|sses|xes)$/.test(w) ? w.slice(0, -2) : w.length > 2 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean).map(singular);

function lev(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Score each prefab against the prompt tokens. */
function match(tokens) {
  const text = ' ' + tokens.join(' ') + ' ';
  const scored = [];
  for (const d of LIST) {
    let best = 0;
    for (const kw of [d.name.toLowerCase(), ...d.kw]) {
      const k = ' ' + norm(kw).join(' ') + ' ';
      if (text.includes(k)) best = Math.max(best, 10 + k.length);
    }
    if (!best) {
      // fuzzy: single token within edit distance 1-2 of a single-word keyword
      for (const t of tokens) for (const kw of [d.id, ...d.kw]) {
        if (kw.includes(' ') || t.length < 4) continue;
        const dist = lev(t, singular(kw));
        if (dist <= (t.length > 6 ? 2 : 1)) best = Math.max(best, 6 - dist);
      }
    }
    if (best) scored.push({ d, score: best });
  }
  return scored.sort((a, b) => b.score - a.score);
}

const lighten = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
const jitter = (hex, rng, amt = 0.08) => {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL((hsl.h + (rng() - 0.5) * amt * 0.5 + 1) % 1, THREE.MathUtils.clamp(hsl.s + (rng() - 0.5) * amt, 0, 1), THREE.MathUtils.clamp(hsl.l + (rng() - 0.5) * amt, 0.05, 0.95));
  return '#' + c.getHexString();
};
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
const VARY_RE = /width|height|depth|length|size|radius|floors|steps|teeth|span|reach|pot|thick/i;

export function varyPrefab(def, rng, style, forcedColor) {
  const params = {};
  const defaults = defaultParams(def);
  for (const [k, spec] of Object.entries(def.params || {})) {
    if (spec.options || spec.text || spec.min == null) continue;
    if (!VARY_RE.test(spec.label || k)) continue;
    const f = 0.7 + rng() * 0.75;
    let v = defaults[k] * f;
    v = Math.round(v / spec.step) * spec.step;
    params[k] = +THREE.MathUtils.clamp(v, spec.min, spec.max).toFixed(3);
  }
  const colors = {};
  const prim = forcedColor || pick(style.primary, rng);
  const sec = pick(style.secondary, rng);
  for (const [slot, s] of Object.entries(def.slots || {})) {
    if (s.role === 'primary') colors[slot] = forcedColor ? jitter(prim, rng, 0.1) : prim;
    else if (s.role === 'tint') colors[slot] = lighten(prim, 0.28);
    else if (s.role === 'secondary') colors[slot] = sec;
  }
  const extra = def.vary?.(rng, style);
  if (extra) { Object.assign(params, extra.params || {}); Object.assign(colors, extra.colors || {}); }
  return { params, colors, finish: style.finish };
}

export function parsePrompt(prompt) {
  const raw = prompt.toLowerCase();
  const tokens = norm(raw);
  let count = 1, scale = 1, color = null, tall = false, wide = false;
  const words = raw.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (/^\d+$/.test(w) && +w >= 1 && +w <= 24) count = +w;
    else if (NUMBERS[w]) count = NUMBERS[w];
    else if (SIZES[w]) scale = SIZES[w];
    else if (COLORS[w]) color = COLORS[w];
    else if (w === 'tall' || w === 'high') tall = true;
    else if (w === 'wide' || w === 'long') wide = true;
  }
  return { tokens, count, scale, color, tall, wide };
}

/**
 * Returns { variants, matched, note }.
 * Each variant: { prefab, name, params, colors, finish, scale, count }
 */
export function generate(prompt, styleId = 'toy', n = 6, seed = (Math.random() * 1e9) | 0) {
  const style = STYLES.find((s) => s.id === styleId) || STYLES[0];
  const rng = rngFrom(seed);
  const p = parsePrompt(prompt);
  const hits = match(p.tokens);
  let pool, note = '';
  if (hits.length) {
    const top = hits[0].score;
    pool = hits.filter((h) => h.score >= top - 3).slice(0, 3).map((h) => h.d);
    if (pool.length === 1 && hits.length > 1) pool = [pool[0]];
  } else {
    pool = [...LIST].sort(() => rng() - 0.5).slice(0, 6);
    note = `No exact match for “${prompt.trim()}” – here are some ideas to start from.`;
  }
  const variants = [];
  for (let i = 0; i < n; i++) {
    const def = hits.length ? pool[i % pool.length] : pool[i % pool.length];
    const v = varyPrefab(def, rng, style, p.color);
    if (p.tall && def.params?.height) v.params.height = Math.min(def.params.height.max, (v.params.height ?? def.params.height.v) * 1.4);
    if (p.wide && def.params?.width) v.params.width = Math.min(def.params.width.max, (v.params.width ?? def.params.width.v) * 1.4);
    variants.push({ prefab: def.id, name: def.name, ...v, scale: p.scale, count: p.count });
  }
  return { variants, matched: hits.length > 0, note, parsed: p };
}

export const suggestions = ['Plants in pots', 'Cozy sofa', 'Red sports car', 'Three pine trees', 'Spinning gears', 'Tall skyscraper', 'Wooden table', 'Windmill'];

/** Build a lookup of every component name for the "did you mean" UX. */
export const allNames = () => LIST.map((d) => d.name);
export { PREFABS };
