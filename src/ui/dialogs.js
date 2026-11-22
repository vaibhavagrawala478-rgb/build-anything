import { app } from '../app.js';
import { Doc } from '../engine/doc.js';
import { CATEGORIES, LIST, PREFABS, searchLibrary } from '../engine/library.js';
import { ALL_TEMPLATES, BLANK, COMMUNITY, TEMPLATES } from '../engine/templates.js';
import { store } from '../engine/store.js';
import { loadInto, renderObject } from '../engine/thumbs.js';
import { h, clear } from './dom.js';
import { icon, iconForCat } from './icons.js';
import { modal, toast } from './ui.js';

// ============================================================ library
export function openLibrary() {
  let cat = 'All', q = '';
  const grid = h('div', { class: 'lib-grid' });
  const cats = h('div', { class: 'lib-cats' });
  const search = h('input', { type: 'search', placeholder: 'Search components…', style: { width: '260px' }, oninput: (e) => { q = e.target.value; draw(); } });
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { const img = e.target; io.unobserve(img); loadInto(img, img.dataset.id, null, null, null, 200); }
  }), { root: grid, rootMargin: '200px' });

  function draw() {
    clear(cats); clear(grid);
    CATEGORIES.forEach((c) => {
      const count = searchLibrary(q, c.id).length;
      cats.append(h('button', { class: cat === c.id ? 'on' : '', onclick: () => { cat = c.id; draw(); } }, icon(c.icon, 17), c.id, h('em', null, String(count))));
    });
    const items = searchLibrary(q, cat);
    if (!items.length) grid.append(h('div', { class: 'lib-empty' }, `No components match “${q}”`));
    items.forEach((d) => {
      const img = h('img', { alt: d.name, dataset: { id: d.id }, draggable: false });
      const it = h('button', { class: 'lib-item', title: `Add ${d.name} (Shift-click to keep browsing)`,
        onclick: (e) => { app.add(d.id); toast(`Added ${d.name}`); if (!e.shiftKey) m.close(); } },
      h('div', { class: 'img' }, img), h('b', null, d.name), h('small', null, d.cat));
      grid.append(it);
      io.observe(img);
    });
  }
  const m = modal('Component library', h('div', { class: 'lib-layout' }, cats, grid), {
    headRight: [search, h('span', { class: 'dim', style: { fontSize: '12px', padding: '0 6px' } }, `${LIST.length} components`)],
    onClose: () => io.disconnect(),
  });
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
          h('button', { class: 'del', title: 'Unpublish', onclick: (e) => { e.stopPropagation(); store.unpublish(p.id); draw(); } }, icon('trash', 14)))))
          : h('div', { class: 'drop-zone' }, 'Nothing here yet. Use Share → “Publish to my shelf” to add your current design.'));
    } else {
      const list = store.list();
      body.append(h('div', { class: 'section-h' }, `${list.length} saved project${list.length === 1 ? '' : 's'} · stored in this browser`),
        list.length ? h('div', { class: 'cards' }, ...list.map((p) => card(p.thumb ? h('img', { src: p.thumb, alt: p.name }) : h('div', { class: 'ph' }), p.name, `${p.count} objects · ${new Date(p.updated).toLocaleString()}`, p.id === app.doc.meta.id ? 'Open now' : '',
          () => { if (p.id !== app.doc.meta.id) app.openProject(p.id); m.close(); },
          h('button', { class: 'del', title: 'Delete project', onclick: (e) => {
            e.stopPropagation();
            if (p.id === app.doc.meta.id) return toast('Switch to another project before deleting this one', 'err');
            if (confirm(`Delete “${p.name}”? This can't be undone.`)) { store.remove(p.id); draw(); }
          } }, icon('trash', 14)))))
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
      h('li', null, 'Your work saves automatically in this browser. Export a scene file to back it up or move it to another machine.'),
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
  app.on('openLibrary', openLibrary);
  app.on('openHome', () => openHome());
  app.on('openHelp', openHelp);
  app.on('openShare', openShare);
}
