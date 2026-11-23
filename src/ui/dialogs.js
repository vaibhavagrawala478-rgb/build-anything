import { app } from '../app.js';
import { Doc } from '../engine/doc.js';
import { CATEGORIES, LIST, searchLibrary } from '../engine/library.js';
import { ALL_TEMPLATES, BLANK, COMMUNITY, TEMPLATES } from '../engine/templates.js';
import { store } from '../engine/store.js';
import { listAssets, removeAsset } from '../engine/assets.js';
import * as sf from '../engine/sketchfab.js';
import { loadInto, renderObject } from '../engine/thumbs.js';
import { h, clear, debounce } from './dom.js';
import { icon } from './icons.js';
import { modal, toast, confirmDialog } from './ui.js';

const fmtCount = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(n));
const fmtMB = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

// ============================================================ library (built-in + My models + Sketchfab)
export function openLibrary(initial = 'All') {
  let cat = initial, q = '';
  const pane = h('div', { style: { minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } });
  const cats = h('div', { class: 'lib-cats' });
  const search = h('input', { type: 'search', placeholder: 'Search components…', style: { width: '260px' } });
  let io = null;
  let sfState = null; // Sketchfab session state, kept while the modal is open
  let m;

  const setCat = (c) => { cat = c; q = ''; search.value = ''; draw(); };
  const myCount = { n: 0 };

  function drawCats() {
    clear(cats);
    CATEGORIES.forEach((c) => {
      const count = searchLibrary(q, c.id).length;
      cats.append(h('button', { class: cat === c.id ? 'on' : '', onclick: () => setCat(c.id) }, icon(c.icon, 17), c.id, h('em', null, String(count))));
    });
    cats.append(h('div', { class: 'sep-label' }, 'Online & yours'),
      h('button', { class: cat === 'Sketchfab' ? 'on' : '', onclick: () => setCat('Sketchfab') }, icon('globe', 17), 'Sketchfab', h('em', null, 'free')),
      h('button', { class: cat === 'My models' ? 'on' : '', onclick: () => setCat('My models') }, icon('package', 17), 'My models', h('em', null, myCount.n ? String(myCount.n) : '')));
  }

  // ----- built-in components
  function drawBuiltin() {
    const grid = h('div', { class: 'lib-grid' });
    pane.append(grid);
    io?.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { const img = e.target; io.unobserve(img); loadInto(img, img.dataset.id, null, null, null, 200); }
    }), { root: grid, rootMargin: '200px' });
    const items = searchLibrary(q, cat);
    if (!items.length) grid.append(h('div', { class: 'lib-empty' }, `No components match “${q}”`));
    items.forEach((d) => {
      const img = h('img', { alt: d.name, dataset: { id: d.id }, draggable: false });
      grid.append(h('button', { class: 'lib-item', title: `Add ${d.name} (Shift-click to keep browsing)`,
        onclick: (e) => { app.add(d.id); toast(`Added ${d.name}`); if (!e.shiftKey) m.close(); } },
      h('div', { class: 'img' }, img), h('b', null, d.name), h('small', null, d.cat)));
      io.observe(img);
    });
  }

  // ----- My models (everything stored in this browser)
  async function drawMine() {
    const grid = h('div', { class: 'lib-grid' }, h('div', { class: 'lib-empty' }, 'Loading…'));
    pane.append(grid);
    const all = await listAssets();
    myCount.n = all.length;
    drawCats();
    const s = q.trim().toLowerCase();
    const items = all.filter((a) => !s || a.name.toLowerCase().includes(s));
    clear(grid);
    if (!items.length) {
      grid.append(h('div', { class: 'lib-empty' }, all.length ? `No models match “${q}”` : 'Models you import from Sketchfab, files or Blender are kept here so you can reuse them.'));
      return;
    }
    items.forEach((a) => {
      const pic = a.thumb ? h('img', { src: a.thumb, alt: a.name, style: { opacity: 1 }, referrerPolicy: 'no-referrer' }) : h('span', { style: { color: 'var(--dim)' } }, icon('package', 40));
      const rm = h('span', { class: 'rm', role: 'button', title: 'Delete from this browser', onclick: async (e) => {
        e.stopPropagation();
        if (await confirmDialog({ title: 'Delete model', message: `Remove “${a.name}” from your saved models? Scenes already using it will show a placeholder.`, confirmLabel: 'Delete', danger: true })) { await removeAsset(a.key); app.emit('assets'); drawMine(); }
      } }, icon('trash', 13));
      grid.append(h('button', { class: 'lib-item', title: `Add ${a.name}`, onclick: (e) => { app.addStoredModel(a); toast(`Added ${a.name}`); if (!e.shiftKey) m.close(); } },
        h('div', { class: 'img' }, pic), h('b', null, a.name), h('small', null, `${a.source === 'sketchfab' ? 'Sketchfab' : a.source === 'blender' ? 'Blender' : 'File'} · ${fmtMB(a.size || 0)}`), rm));
    });
  }

  // ----- Sketchfab
  function drawSketchfab() {
    sfState ||= { filters: { license: '', sort: '-likeCount', maxFaces: '', category: '', staffpicked: false }, q: '', results: [], next: null, loading: false, error: '', seq: 0 };
    const st = sfState;
    const wrap = h('div', { class: 'sf-main' });
    const tokenBox = h('div');
    const bar = h('div', { class: 'sf-bar' });
    const grid = h('div', { class: 'lib-grid' });
    wrap.append(tokenBox, bar, grid);
    pane.append(wrap);

    const drawToken = (forceOpen = false) => {
      clear(tokenBox);
      if (sf.getToken() && !forceOpen) {
        tokenBox.append(h('div', { class: 'sf-token' }, icon('check', 16), h('span', { class: 'muted' }, 'Sketchfab token saved — models import with one click.'), h('div', { class: 'grow' }),
          h('button', { class: 'btn sm', onclick: () => drawToken(true) }, 'Change'),
          h('button', { class: 'btn sm danger', onclick: () => { sf.setToken(''); drawToken(); } }, 'Remove')));
        return;
      }
      const input = h('input', { type: 'text', placeholder: 'Paste your Sketchfab API token', autocomplete: 'off', spellcheck: false, 'aria-label': 'Sketchfab API token' });
      const save = () => { if (input.value.trim().length < 10) return toast('That doesn’t look like an API token', 'err'); sf.setToken(input.value); toast('Token saved'); drawToken(); };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      tokenBox.append(h('div', { class: 'sf-token warn' },
        h('div', { style: { flexBasis: '100%', lineHeight: 1.5 } }, h('b', null, 'Browsing is free. To import, add your Sketchfab API token. '),
          h('span', { class: 'muted' }, 'Sketchfab requires a token to download any model. Copy yours from your Sketchfab account settings (Password & API). It stays in this browser and is only ever sent to sketchfab.com.')),
        input, h('button', { class: 'btn sm primary', onclick: save }, 'Save'),
        h('a', { class: 'btn sm ghost', href: 'https://sketchfab.com/settings/password', target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, icon('external', 13), 'Get my token')));
    };
    drawToken();

    const sel = (key, opts, label) => h('select', { 'aria-label': label, onchange: (e) => { st.filters[key] = e.target.value; load(true); } },
      ...opts.map(([v, l]) => h('option', { value: v, selected: st.filters[key] === v }, l)));
    bar.append(
      sel('category', sf.CATS, 'Category'),
      sel('license', sf.LICENSES.map((l) => [l.id, l.label]), 'License'),
      sel('maxFaces', sf.POLY.map((l) => [l.id, l.label]), 'Polygon limit'),
      sel('sort', sf.SORTS.map((l) => [l.id, l.label]), 'Sort'),
      h('label', { class: 'chip', style: { cursor: 'pointer' } }, h('input', { type: 'checkbox', checked: st.filters.staffpicked, onchange: (e) => { st.filters.staffpicked = e.target.checked; load(true); } }), 'Staff picks'),
      h('span', { class: 'dim', style: { fontSize: '11.5px', marginLeft: 'auto' } }, 'Only free, downloadable models are shown'));

    function card(r) {
      const prog = h('div', { class: 'prog' });
      const restricted = sf.restricted(r.license);
      const el = h('button', { class: 'sf-card', title: `Import “${r.name}” by ${r.author}`, onclick: () => doImport(r, el, prog) },
        h('div', { class: 'pic' }, h('img', { src: r.thumb, alt: r.name, loading: 'lazy', referrerPolicy: 'no-referrer' }),
          h('span', { class: 'badge-sm' }, `${fmtCount(r.faces)} tris${r.size ? ' · ' + fmtMB(r.size) : ''}`),
          h('span', { class: 'go' }, icon('download', 13), 'Import'), prog),
        h('div', { class: 'meta' }, h('b', null, r.name), h('small', null, `by ${r.author}`), h('span', { class: `lic ${restricted ? 'restricted' : ''}`, title: r.license }, r.license)));
      return el;
    }

    async function doImport(r, el, prog) {
      if (el.classList.contains('busy')) return;
      if (!sf.getToken()) { drawToken(true); toast('Add your Sketchfab token to import models'); tokenBox.querySelector('input')?.focus(); return; }
      if (r.faces > 400000 || r.size > 40 * 1048576) {
        const ok = await confirmDialog({ title: 'Large model', message: `“${r.name}” has ${fmtCount(r.faces)} polygons${r.size ? ` (${fmtMB(r.size)})` : ''}. It may be slow to download and to display. Import anyway?`, confirmLabel: 'Import anyway' });
        if (!ok) return;
      }
      el.classList.add('busy');
      prog.style.width = '6%';
      try {
        await app.importSketchfab(r, (f) => { prog.style.width = f == null ? '50%' : `${Math.max(6, f * 100)}%`; });
        prog.style.width = '100%';
        toast(sf.restricted(r.license) ? `Imported “${r.name}” — ${r.license}: check the license terms before commercial use` : `Imported “${r.name}” (credit saved)`);
        m.close();
      } catch (e) {
        prog.style.width = '0';
        if (e.message === 'NO_TOKEN' || e.code === 'AUTH') { drawToken(true); }
        toast(e.message === 'NO_TOKEN' ? 'Add your Sketchfab token to import models' : e.message, 'err');
      } finally { el.classList.remove('busy'); }
    }

    function render() {
      clear(grid);
      st.results.forEach((r) => grid.append(card(r)));
      if (!st.results.length && !st.loading) grid.append(h('div', { class: 'lib-empty' }, st.error || 'No free downloadable models found. Try different words or filters.'));
      if (st.loading) grid.append(h('div', { class: 'lib-empty', style: { padding: '24px 0' } }, 'Searching Sketchfab…'));
      if (st.next && !st.loading) grid.append(h('div', { class: 'sf-more' }, h('button', { class: 'btn', onclick: () => load(false) }, 'Load more')));
      if (st.error && st.results.length) grid.append(h('div', { class: 'lib-empty', style: { padding: '12px 0' } }, st.error));
    }

    async function load(reset) {
      const seq = ++st.seq;
      if (reset) { st.results = []; st.next = null; }
      st.loading = true; st.error = '';
      render();
      try {
        const r = await sf.search({ q: st.q, ...st.filters, next: reset ? null : st.next });
        if (seq !== st.seq) return;
        st.results = reset ? r.results : st.results.concat(r.results);
        st.next = r.next;
      } catch (e) {
        if (seq !== st.seq) return;
        st.error = e.message === 'Failed to fetch' ? 'Couldn’t reach Sketchfab. Check your internet connection.' : e.message;
      }
      st.loading = false;
      render();
    }
    st.q = q;
    if (!st.results.length) load(true); else render();
    st.reload = () => { st.q = q; load(true); };
  }

  function draw() {
    clear(pane);
    drawCats();
    search.placeholder = cat === 'Sketchfab' ? 'Search free Sketchfab models…' : cat === 'My models' ? 'Search your models…' : 'Search components…';
    if (cat === 'Sketchfab') drawSketchfab();
    else if (cat === 'My models') drawMine();
    else drawBuiltin();
  }

  // Sketchfab searches hit the network, so wait for a pause in typing; local filters update immediately
  const sfSearch = debounce(() => { q = search.value; sfState?.reload?.(); }, 450);
  search.addEventListener('input', () => { if (cat === 'Sketchfab') sfSearch(); else { q = search.value; draw(); } });

  m = modal('Component library', h('div', { class: 'lib-layout' }, cats, pane), {
    headRight: [search, h('span', { class: 'dim', style: { fontSize: '12px', padding: '0 6px' } }, `${LIST.length} built-in`)],
    onClose: () => io?.disconnect(),
  });
  listAssets().then((a) => { myCount.n = a.length; drawCats(); });
  draw();
  setTimeout(() => search.focus(), 50);
}

// ============================================================ projects / templates / community
const tplThumbs = new Map();
let thumbQueue = Promise.resolve();
function templateThumb(tpl, img) {
  if (tplThumbs.has(tpl.id)) { img.src = tplThumbs.get(tpl.id); return; }
  thumbQueue = thumbQueue.then(() => new Promise((res) => setTimeout(() => {
    try {
      const d = new Doc();
      tpl.build(d);
      const url = renderObject(d.root, 360, { ground: false });
      tplThumbs.set(tpl.id, url);
      img.src = url;
      d.clear();
    } catch (e) { console.warn('template thumb failed', e); }
    res();
  }, 0)));
}

/** Ask before deleting a project; handles the "it's the open one" case. Returns true if deleted. */
export async function confirmDeleteProject(id, name) {
  const current = id === app.doc.meta.id;
  const ok = await confirmDialog({
    title: 'Delete project',
    message: current
      ? `Delete “${name}”? It's the project you have open, so you'll be switched to your most recent other project (or a blank canvas). This can't be undone.`
      : `Delete “${name}”? This permanently removes it from this browser and can't be undone.`,
    confirmLabel: 'Delete project', danger: true,
  });
  if (!ok) return false;
  app.deleteProject(id);
  toast(`Deleted “${name}”`);
  return true;
}

export function openHome(initialTab = 'templates') {
  let tab = initialTab;
  const body = h('div', { class: 'modal-body' });
  const tabs = h('div', { class: 'modal-tabs' });
  let m;

  const card = (pic, title, desc, tag, onclick, extra) => h('div', { class: 'card', role: 'button', tabIndex: 0, onclick, onkeydown: (e) => { if (e.key === 'Enter') onclick(); } },
    h('div', { class: 'pic' }, pic), h('div', { class: 'meta' }, h('b', null, title), h('p', null, desc), tag ? h('span', { class: 'tag' }, tag) : null), extra);

  const tplCard = (t) => {
    const img = h('img', { alt: t.name });
    templateThumb(t, img);
    return card(img, t.name, t.desc, t.tag, () => { app.newProject(t); m.close(); toast(`Opened “${t.name}”`); });
  };

  function draw() {
    clear(tabs); clear(body);
    [['templates', 'Templates', 'blocks'], ['community', 'Community', 'globe'], ['mine', 'My projects', 'folder-open']].forEach(([id, label, ic]) =>
      tabs.append(h('button', { class: `chip ${tab === id ? 'on' : ''}`, style: { height: '34px', padding: '0 16px' }, onclick: () => { tab = id; draw(); } }, icon(ic, 15), label)));

    if (tab === 'templates') {
      body.append(h('div', { class: 'section-h' }, 'Start from a template'), h('div', { class: 'cards' },
        card(h('div', { class: 'ph' }), 'Blank canvas', BLANK.desc, 'Empty', () => { app.newProject(BLANK); m.close(); }),
        ...TEMPLATES.map(tplCard)));
    } else if (tab === 'community') {
      const mine = store.published();
      body.append(
        h('div', { class: 'section-h' }, 'Featured designs'),
        h('p', { class: 'muted', style: { margin: '-4px 0 14px', lineHeight: 1.5 } }, 'Hand-built showcase scenes from the BuildAnything team. Open one to explore it, remix it and run its simulation.'),
        h('div', { class: 'cards' }, ...COMMUNITY.map(tplCard)),
        h('div', { class: 'section-h', style: { marginTop: '26px' } }, 'Published by you'),
        mine.length ? h('div', { class: 'cards' }, ...mine.map((p) => card(h('img', { src: p.thumb, alt: p.name }), p.name, 'Published ' + new Date(p.at).toLocaleDateString(), 'Yours', () => { app.loadJSON(JSON.parse(JSON.stringify(p.json)), { fresh: true }); app.emit('opened'); m.close(); },
          h('button', { class: 'del always', title: 'Remove from my shelf', 'aria-label': 'Remove from my shelf', onclick: (e) => { e.stopPropagation(); store.unpublish(p.id); draw(); } }, icon('trash', 14)))))
          : h('div', { class: 'drop-zone' }, 'Nothing here yet. Use Share → “Publish to my shelf” to add your current design.'));
    } else {
      const list = store.list();
      body.append(h('div', { class: 'row', style: { marginBottom: '12px' } },
        h('div', { class: 'section-h', style: { margin: 0, flex: 1 } }, `${list.length} saved project${list.length === 1 ? '' : 's'} · stored in this browser`),
        list.length > 1 ? h('button', { class: 'btn sm danger', onclick: async () => {
          if (!await confirmDialog({ title: 'Delete all projects', message: `Delete all ${list.length} saved projects? This permanently removes them from this browser and can't be undone.`, confirmLabel: 'Delete all', danger: true })) return;
          [...list].filter((p) => p.id !== app.doc.meta.id).forEach((p) => store.remove(p.id));
          app.deleteProject(app.doc.meta.id);
          toast('All projects deleted');
          m.close();
        } }, icon('trash', 13), 'Delete all') : null),
      list.length ? h('div', { class: 'cards' }, ...list.map((p) => card(p.thumb ? h('img', { src: p.thumb, alt: p.name }) : h('div', { class: 'ph' }), p.name, `${p.count} objects · ${new Date(p.updated).toLocaleString()}`, '',
        () => { if (p.id !== app.doc.meta.id) app.openProject(p.id); m.close(); },
        [p.id === app.doc.meta.id ? h('span', { class: 'tag opened' }, 'Open now') : null,
          h('button', { class: 'del always', title: 'Delete project', 'aria-label': `Delete ${p.name}`, onclick: async (e) => {
            e.stopPropagation();
            const wasCurrent = p.id === app.doc.meta.id;
            if (await confirmDeleteProject(p.id, p.name)) { if (wasCurrent) m.close(); else draw(); }
          } }, icon('trash', 14))])))
        : h('div', { class: 'drop-zone' }, 'No saved projects yet — your work saves automatically.'));
      const drop = h('div', { class: 'drop-zone', style: { marginTop: '18px' } }, 'Drop a .json scene or .glb model here, or ',
        h('button', { class: 'btn sm', style: { display: 'inline-flex', marginLeft: '6px' }, onclick: () => fi.click() }, icon('upload', 14), 'Browse'));
      const fi = h('input', { type: 'file', accept: '.glb,.gltf,.json', style: { display: 'none' }, onchange: (e) => { const f = e.target.files[0]; if (f) { app.importFile(f); m.close(); } } });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { app.importFile(f); m.close(); } });
      body.append(drop, fi);
    }
  }
  m = modal('BuildAnything', h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' } }, tabs, body));
  draw();
}

// ============================================================ credits
export function openCredits() {
  const list = app.credits();
  const text = list.map((c) => `“${c.title}” by ${c.author} (${c.license}) — ${c.url} — via ${c.source || 'Sketchfab'}`).join('\n');
  modal('Credits & licenses', h('div', { class: 'modal-body' },
    list.length
      ? [h('p', { class: 'muted', style: { marginTop: 0, lineHeight: 1.6 } }, 'These imported models need attribution under their licenses. Keep this list with anything you publish.'),
        h('div', { class: 'credit-list' }, ...list.map((c) => h('div', { class: 'credit-item' },
          h('b', null, c.title), ' by ', c.authorUrl ? h('a', { href: c.authorUrl, target: '_blank', rel: 'noopener' }, c.author) : c.author, h('br'),
          h('span', { class: sf.restricted(c.license) ? '' : 'muted' }, c.license), ' · ', h('a', { href: c.url, target: '_blank', rel: 'noopener' }, 'View on ' + (c.source || 'Sketchfab'))))),
        h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn primary', onclick: async () => { try { await navigator.clipboard.writeText(text); toast('Credits copied'); } catch { toast('Could not copy', 'err'); } } }, icon('copy', 15), 'Copy as text'))]
      : h('div', { class: 'drop-zone' }, 'No models in this scene need credits. Models imported from Sketchfab will be listed here automatically.')), { small: true });
}

// ============================================================ help
export function openHelp() {
  const keys = [
    ['Select / Move / Rotate / Scale', 'V · W · E · R'], ['Draw block, slab or room', 'D'], ['Text label', 'T'], ['Comment pin', 'C'],
    ['Component library', 'L'], ['Duplicate', 'Ctrl D'], ['Group / Ungroup', 'Ctrl G · Ctrl ⇧ G'], ['Copy / Paste', 'Ctrl C · Ctrl V'],
    ['Undo / Redo', 'Ctrl Z · Ctrl ⇧ Z'], ['Delete', 'Del'], ['Select all', 'Ctrl A'], ['Nudge selection', 'Arrow keys'],
    ['Hide selection', 'H'], ['Snap to grid', 'G'], ['Blueprint view', 'B'], ['Orthographic / Perspective', 'P'],
    ['Fit view to selection', 'F'], ['Iso · Front · Right · Top views', '1 · 2 · 3 · 4'], ['Play / pause simulation', 'Space'], ['Stop simulation / deselect', 'Esc'],
  ];
  modal('Help & shortcuts', h('div', { class: 'modal-body' },
    h('div', { class: 'section-h' }, 'Getting around'),
    h('p', { class: 'muted', style: { lineHeight: 1.6, marginTop: 0 } },
      'Left-drag to orbit, right-drag or middle-drag to pan, scroll to zoom. Click an object to select it, drag it across the floor, or use the gizmo to move, rotate and scale in 3D. ',
      'Drag components from the library or AI variants straight into the scene. Press ', h('span', { class: 'kbd' }, 'Space'), ' to run the simulation: objects set to Dynamic fall and collide, motion and mechanical parts animate, and you can click things to shove them.'),
    h('div', { class: 'section-h', style: { marginTop: '18px' } }, 'Shortcuts'),
    h('div', { class: 'help-grid' }, ...keys.map(([a, b]) => h('div', null, h('span', null, a), h('span', { class: 'kbd' }, b)))),
    h('div', { class: 'section-h', style: { marginTop: '22px' } }, 'Good to know'),
    h('ul', { class: 'muted', style: { lineHeight: 1.7, paddingLeft: '18px', margin: 0 } },
      h('li', null, 'Your work saves automatically in this browser. Export a scene file to back it up or move it to another machine. Delete projects from ', h('b', null, 'Projects → My projects'), ' (the back arrow, top left) or the ⋯ menu next to the project name.'),
      h('li', null, 'The library’s ', h('b', null, 'Sketchfab'), ' section searches free, downloadable models only (never paid Store models). Importing needs your own Sketchfab API token, and each model’s author and license are saved so you can list credits from Export → Credits.'),
      h('li', null, 'The ', h('b', null, 'Blender'), ' tab connects to Blender running on your computer through a small bridge script, so you can send your scene over, edit it in Blender and bring it back.'),
      h('li', null, 'AI Generate runs locally: it matches your words to the component library and creates colour/size variants, so it works offline and instantly.'),
      h('li', null, 'Share creates a link that contains the whole scene — no account or server needed. Imported meshes are left out of links to keep them short.'),
      h('li', null, 'Blueprint mode (B) switches to a top-down technical drawing with live dimensions; export it from the Export menu.'))));
}

// ============================================================ share
export async function openShare() {
  const link = h('input', { type: 'text', readOnly: true, value: 'Preparing link…', onfocus: (e) => e.target.select() });
  const info = h('div', { class: 'field-hint' });
  const copy = h('button', { class: 'btn primary', disabled: true, onclick: async () => {
    try { await navigator.clipboard.writeText(link.value); toast('Link copied'); } catch { link.select(); document.execCommand('copy'); toast('Link copied'); }
  } }, icon('copy', 15), 'Copy');
  modal('Share design', h('div', { class: 'modal-body' },
    h('p', { class: 'muted', style: { marginTop: 0, lineHeight: 1.6 } }, 'Anyone with this link can open a copy of the design in their browser. The scene travels inside the link itself, so nothing is uploaded.'),
    h('div', { class: 'row' }, link, copy), info,
    h('div', { class: 'sep' }),
    h('div', { class: 'act-row' },
      h('button', { class: 'btn', onclick: () => app.publish() }, icon('globe', 15), 'Publish to my shelf'),
      h('button', { class: 'btn', onclick: () => app.export('json') }, icon('file', 15), 'Download scene file'),
      h('button', { class: 'btn', onclick: () => app.export('png') }, icon('image', 15), 'Save image'))), { small: true });
  try {
    const url = await app.shareLink();
    link.value = url;
    copy.disabled = false;
    if (url.length > 8000) info.textContent = `This link is long (${Math.round(url.length / 1000)}k characters). Some apps truncate very long links — use “Download scene file” for large designs.`;
  } catch (e) { link.value = 'Could not create a link for this design'; }
}

export function mountDialogs() {
  app.on('openLibrary', (c) => openLibrary(typeof c === 'string' ? c : 'All'));
  app.on('openHome', () => openHome());
  app.on('openHelp', openHelp);
  app.on('openShare', openShare);
  app.on('openCredits', openCredits);
}
