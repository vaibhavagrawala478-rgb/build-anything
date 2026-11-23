/**
 * Sketchfab Data API v3 client.
 *  - Search is public (no key): we only ever ask for `downloadable=true`, which excludes
 *    Store models that must be purchased.
 *  - Downloading needs the user's own API token (sketchfab.com/settings/password).
 */
const API = 'https://api.sketchfab.com/v3';
const TOKEN_KEY = 'ba.sketchfab.token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t.trim()) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

export const LICENSES = [
  { id: '', label: 'Any free license' },
  { id: 'cc0', label: 'CC0 (public domain)' },
  { id: 'by', label: 'CC Attribution' },
  { id: 'by-sa', label: 'CC Attribution-ShareAlike' },
  { id: 'by-nd', label: 'CC Attribution-NoDerivs' },
  { id: 'by-nc', label: 'CC Attribution-NonCommercial' },
  { id: 'by-nc-sa', label: 'CC BY-NC-ShareAlike' },
  { id: 'by-nc-nd', label: 'CC BY-NC-NoDerivs' },
];

export const SORTS = [
  { id: '', label: 'Most relevant' },
  { id: '-likeCount', label: 'Most liked' },
  { id: '-viewCount', label: 'Most viewed' },
  { id: '-publishedAt', label: 'Newest' },
];

export const POLY = [
  { id: '', label: 'Any size' },
  { id: '10000', label: '≤ 10k polygons' },
  { id: '50000', label: '≤ 50k polygons' },
  { id: '200000', label: '≤ 200k polygons' },
];

export const CATS = [
  ['', 'All categories'], ['animals-pets', 'Animals & Pets'], ['architecture', 'Architecture'], ['art-abstract', 'Art & Abstract'],
  ['cars-vehicles', 'Cars & Vehicles'], ['characters-creatures', 'Characters'], ['cultural-heritage-history', 'Cultural Heritage'],
  ['electronics-gadgets', 'Electronics'], ['fashion-style', 'Fashion'], ['food-drink', 'Food & Drink'], ['furniture-home', 'Furniture & Home'],
  ['music', 'Music'], ['nature-plants', 'Nature & Plants'], ['news-politics', 'News & Politics'], ['people', 'People'],
  ['places-travel', 'Places & Travel'], ['science-technology', 'Science & Tech'], ['sports-fitness', 'Sports & Fitness'], ['weapons-military', 'Weapons & Military'],
];

const pickThumb = (m, min = 256) => {
  const imgs = (m.thumbnails?.images || []).slice().sort((a, b) => a.width - b.width);
  return (imgs.find((i) => i.width >= min) || imgs[imgs.length - 1])?.url || '';
};

const normalize = (m) => ({
  uid: m.uid,
  name: m.name,
  author: m.user?.displayName || m.user?.username || 'Unknown',
  authorUrl: m.user?.profileUrl || (m.user?.username ? `https://sketchfab.com/${m.user.username}` : ''),
  license: m.license?.label || 'Unknown license',
  licenseUid: m.license?.uid,
  url: m.viewerUrl || `https://sketchfab.com/3d-models/${m.uid}`,
  thumb: pickThumb(m, 256),
  faces: m.faceCount || 0,
  size: m.archives?.glb?.size || m.archives?.gltf?.size || 0,
  animated: (m.animationCount || 0) > 0,
  likes: m.likeCount || 0,
});

/** Licences that restrict commercial use or remixing, shown with a warning colour. */
export const restricted = (label = '') => /NonCommercial|NoDerivs/i.test(label);

/**
 * Search free, downloadable models. Pass `next` (from a previous page) to continue.
 * @returns {Promise<{results: object[], next: string|null}>}
 */
export async function search({ q = '', license = '', sort = '', maxFaces = '', category = '', staffpicked = false, next = null, count = 24, signal } = {}) {
  let url = next;
  if (!url) {
    const p = new URLSearchParams({ type: 'models', downloadable: 'true', count: String(count) });
    if (q.trim()) p.set('q', q.trim());
    if (license) p.set('license', license);
    if (sort) p.set('sort_by', sort);
    if (maxFaces) p.set('max_face_count', maxFaces);
    if (category) p.set('categories', category);
    if (staffpicked) p.set('staffpicked', 'true');
    url = `${API}/search?${p}`;
  }
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Sketchfab search failed (${r.status})`);
  const j = await r.json();
  return { results: (j.results || []).filter((m) => m.isDownloadable !== false).map(normalize), next: j.next || null };
}

/**
 * Download a model as GLB bytes. Needs the user's API token.
 * @param onProgress (fraction 0..1 | null) => void
 */
export async function downloadGLB(uid, token, onProgress) {
  if (!token) throw new Error('NO_TOKEN');
  const r = await fetch(`${API}/models/${uid}/download`, { headers: { Authorization: `Token ${token}` } });
  if (r.status === 401 || r.status === 403) {
    const e = new Error(r.status === 401 ? 'Sketchfab rejected your API token' : 'This model is not available for download with your account');
    e.code = 'AUTH';
    throw e;
  }
  if (r.status === 429) throw new Error('Sketchfab rate limit reached — wait a minute and try again');
  if (!r.ok) throw new Error(`Sketchfab download request failed (${r.status})`);
  const info = await r.json();
  const file = info.glb || info.gltf;
  if (!file?.url) throw new Error('This model has no downloadable GLB version');
  if (!info.glb && info.gltf) throw new Error('This model is only offered as a zipped glTF, which is not supported yet — try another model');
  let res;
  try { res = await fetch(file.url); } catch { throw new Error('Could not reach Sketchfab’s file server (the browser blocked the download)'); }
  if (!res.ok) throw new Error(`Model file download failed (${res.status})`);
  const total = +res.headers.get('content-length') || file.size || 0;
  if (!res.body || !total) { onProgress?.(null); return res.arrayBuffer(); }
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let o = 0;
  chunks.forEach((c) => { out.set(c, o); o += c.length; });
  return out.buffer;
}

export const creditOf = (m) => ({ title: m.name, author: m.author, authorUrl: m.authorUrl, license: m.license, url: m.url, source: 'Sketchfab' });
