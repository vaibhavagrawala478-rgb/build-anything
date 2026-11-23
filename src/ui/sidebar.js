import { app } from '../app.js';
import { PREFABS } from '../engine/library.js';
import { h, clear } from './dom.js';
import { icon, iconForPrefab } from './icons.js';
import { menu } from './ui.js';
import { confirmDeleteProject } from './dialogs.js';

export function mountSidebar(el) {
  const { doc, vp } = app;
  const collapsed = new Set();
  let query = '';
  let renaming = null;

  // ----- header -----
  const nameInput = h('input', { type: 'text', value: doc.meta.name, 'aria-label': 'Project name',
    onchange: (e) => app.rename(e.target.value), onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); } });
  const saveDot = h('span', { class: 'dim', style: { fontSize: '11px', paddingRight: '4px', whiteSpace: 'nowrap' } });
  const moreBtn = h('button', { class: 'icon-btn', title: 'Project options', 'aria-label': 'Project options', style: { width: '30px', height: '30px' },
    onclick: (e) => menu(e.currentTarget, [
      { label: 'Projects & templates', icon: 'folder-open', onClick: () => app.emit('openHome') },
      { label: 'Rename', icon: 'pencil', onClick: () => { nameInput.focus(); nameInput.select(); } },
      { label: 'Duplicate project', icon: 'copy', onClick: () => app.duplicateProject() },
      { label: 'Credits & licenses', icon: 'credits', onClick: () => app.emit('openCredits') },
      'sep',
      { label: 'Delete project…', icon: 'trash', onClick: () => confirmDeleteProject(doc.meta.id, doc.meta.name) },
    ], { align: 'right' }) }, icon('more', 18));
  const head = h('div', { class: 'proj-head' },
    h('button', { class: 'icon-btn', title: 'Projects & templates', onclick: () => app.emit('openHome') }, icon('arrow-left', 18)),
    nameInput, saveDot, moreBtn);

  const searchInput = h('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search scene', oninput: (e) => { query = e.target.value.trim().toLowerCase(); render(); } });
  const search = h('div', { class: 'search' }, icon('search', 15), searchInput);

  const tree = h('div', { class: 'tree' });

  const fileInput = h('input', { type: 'file', accept: '.glb,.gltf,.json', style: { display: 'none' }, onchange: (e) => { const f = e.target.files[0]; if (f) app.importFile(f); e.target.value = ''; } });
  const foot = h('div', { class: 'side-foot' },
    h('button', { onclick: () => app.emit('openLibrary') }, icon('library', 18), 'Library'),
    h('button', { onclick: () => fileInput.click() }, icon('download', 18), 'Import'),
    h('button', { onclick: () => app.emit('openHelp') }, icon('help', 18), 'Help & Feedback'),
    fileInput);

  el.append(head, search, tree, foot);

  // ----- rows -----
  function row(obj, depth, flat) {
    const n = obj.userData.n;
    const def = PREFABS[n.prefab];
    const kids = doc.childNodes(obj);
    const isGroup = n.prefab === 'group';
    const sel = doc.selection.includes(n.id);
    const open = !collapsed.has(n.id);
    const r = h('div', {
      class: `trow ${sel ? 'sel' : ''} ${obj.visible ? '' : 'hidden'}`, draggable: !flat, dataset: { id: n.id },
      style: { paddingLeft: 6 + (flat ? 0 : depth * 16) + 'px' },
      onclick: (e) => {
        app.inspectCamera = false;
        if (e.shiftKey || e.ctrlKey || e.metaKey) doc.select([n.id], { add: true });
        else doc.select([n.id]);
      },
      ondblclick: (e) => { e.stopPropagation(); renaming = n.id; render(); },
      oncontextmenu: (e) => { e.preventDefault(); if (!doc.selection.includes(n.id)) doc.select([n.id]); ctxMenu(e); },
      onmouseenter: () => { vp.hover = n.id; },
      onmouseleave: () => { if (vp.hover === n.id) vp.hover = null; },
    });
    r.append(
      !flat && kids.length ? h('button', { class: 'caret', onclick: (e) => { e.stopPropagation(); open ? collapsed.add(n.id) : collapsed.delete(n.id); render(); } }, icon(open ? 'chevron-down' : 'chevron-right', 13))
        : h('span', { class: 'caret' }),
      h('span', { class: 'ico' }, icon(iconForPrefab(def), 16)),
    );
    if (renaming === n.id) {
      const inp = h('input', { class: 'rename', type: 'text', value: n.name });
      const done = (save) => { if (renaming !== n.id) return; renaming = null; if (save) doc.rename(n.id, inp.value.trim()); render(); if (save) app.commit(); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); e.stopPropagation(); });
      inp.addEventListener('blur', () => done(true));
      inp.addEventListener('click', (e) => e.stopPropagation());
      r.append(inp);
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else r.append(h('span', { class: 'name', title: n.name }, n.name));
    r.append(h('span', { class: `acts ${n.locked || !obj.visible ? 'pinned' : ''}` },
      h('button', { class: n.locked ? 'on' : '', title: n.locked ? 'Unlock' : 'Lock', onclick: (e) => { e.stopPropagation(); app.toggleLock([n.id]); } }, icon(n.locked ? 'lock' : 'unlock', 14)),
      h('button', { class: obj.visible ? '' : 'on', title: obj.visible ? 'Hide' : 'Show', onclick: (e) => { e.stopPropagation(); app.toggleVisible([n.id]); } }, icon(obj.visible ? 'eye' : 'eye-off', 14))));

    // drag & drop reordering / grouping
    r.addEventListener('dragstart', (e) => { e.dataTransfer.setData('application/x-ba-node', n.id); e.dataTransfer.effectAllowed = 'move'; });
    r.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('application/x-ba-node')) return;
      e.preventDefault();
      const rect = r.getBoundingClientRect();
      const y = (e.clientY - rect.top) / rect.height;
      r.classList.remove('drop-before', 'drop-after', 'drop-in');
      r.classList.add(isGroup && y > 0.25 && y < 0.75 ? 'drop-in' : y < 0.5 ? 'drop-before' : 'drop-after');
    });
    r.addEventListener('dragleave', () => r.classList.remove('drop-before', 'drop-after', 'drop-in'));
    r.addEventListener('drop', (e) => {
      e.preventDefault();
      const zone = ['drop-in', 'drop-before', 'drop-after'].find((c) => r.classList.contains(c));
      r.classList.remove('drop-before', 'drop-after', 'drop-in');
      const src = doc.get(e.dataTransfer.getData('application/x-ba-node'));
      if (!src || src === obj || !app.editable()) return;
      if (zone === 'drop-in') doc.reparent(src, obj);
      else {
        const parent = obj.parent === doc.root ? null : obj.parent;
        const siblings = doc.childNodes(obj.parent);
        const before = zone === 'drop-before' ? obj : siblings[siblings.indexOf(obj) + 1] || null;
        doc.reparent(src, parent, before);
      }
      app.commit();
    });
    return r;
  }

  function walk(parent, depth, out) {
    doc.childNodes(parent).forEach((o) => {
      out.push(row(o, depth, false));
      if (!collapsed.has(o.userData.n.id)) walk(o, depth + 1, out);
    });
  }

  function render() {
    const keepScroll = tree.scrollTop;
    clear(tree);
    // camera row
    tree.append(h('div', {
      class: `trow ${app.inspectCamera ? 'sel' : ''}`, style: { paddingLeft: '6px' },
      onclick: () => { app.inspectCamera = true; doc.select([]); app.emit('inspect'); render(); },
    }, h('span', { class: 'caret' }), h('span', { class: 'ico' }, icon('camera', 16)), h('span', { class: 'name' }, 'Camera')));
    if (!doc.nodes.size) {
      tree.append(h('div', { class: 'tree-empty' }, 'Your scene is empty.', h('br'), 'Open the library or generate something with AI.'));
    } else if (query) {
      const matches = [...doc.nodes.values()].filter((o) => o.userData.n.name.toLowerCase().includes(query) || o.userData.n.prefab.includes(query));
      matches.forEach((o) => tree.append(row(o, 0, true)));
      if (!matches.length) tree.append(h('div', { class: 'tree-empty' }, `Nothing matches “${query}”`));
    } else {
      const rows = [];
      walk(doc.root, 0, rows);
      tree.append(...rows);
    }
    tree.scrollTop = keepScroll;
  }

  function ctxMenu(e) {
    const anchor = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }) };
    const sel = doc.selectedObjects();
    menu(anchor, [
      { label: 'Duplicate', icon: 'copy', kbd: 'Ctrl D', onClick: () => app.duplicate() },
      { label: 'Group', icon: 'group', kbd: 'Ctrl G', onClick: () => app.group() },
      { label: 'Ungroup', icon: 'ungroup', disabled: !sel.some((o) => o.userData.n.prefab === 'group'), onClick: () => app.ungroup() },
      { label: 'Rename', icon: 'pencil', disabled: sel.length !== 1, onClick: () => { renaming = sel[0].userData.n.id; render(); } },
      'sep',
      { label: 'Hide / show', icon: 'eye', kbd: 'H', onClick: () => app.toggleVisible() },
      { label: 'Lock / unlock', icon: 'lock', onClick: () => app.toggleLock() },
      { label: 'Drop to floor', icon: 'floor', onClick: () => app.dropToFloor() },
      'sep',
      { label: 'Delete', icon: 'trash', kbd: 'Del', onClick: () => app.delete() },
    ]);
  }

  // ----- wiring -----
  app.inspectCamera = false;
  app.on('tree', render);
  doc.on('selection', () => {
    if (doc.selection.length) app.inspectCamera = false;
    render();
    const first = tree.querySelector('.trow.sel');
    first?.scrollIntoView({ block: 'nearest' });
  });
  vp.on('hover', (id) => {
    tree.querySelectorAll('.trow.hover').forEach((r) => r.classList.remove('hover'));
    if (id) tree.querySelector(`.trow[data-id="${id}"]`)?.classList.add('hover');
  });
  app.on('meta', () => { nameInput.value = doc.meta.name; });
  app.on('saved', () => { saveDot.textContent = app.saved ? 'Saved' : 'Saving…'; });
  render();
}
