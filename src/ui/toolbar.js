import { app } from '../app.js';
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { menu } from './ui.js';

export function mountToolbar(stage) {
  const { vp, sim } = app;
  const btn = (name, title, onclick, cls = '') => h('button', { class: `icon-btn ${cls}`, title, 'aria-label': title, onclick }, icon(name, 18));

  // ----- top toolbar -----
  const undo = btn('undo', 'Undo (Ctrl+Z)', () => app.undo());
  const redo = btn('redo', 'Redo (Ctrl+Shift+Z)', () => app.redo());
  const zoom = h('button', { class: 'zoom', title: 'Zoom', onclick: (e) => menu(e.currentTarget, [
    { label: 'Zoom in', icon: 'zoom-in', onClick: () => vp.setZoomPercent(vp.zoomPercent * 1.25) },
    { label: 'Zoom out', icon: 'zoom-out', onClick: () => vp.setZoomPercent(vp.zoomPercent / 1.25) },
    { label: 'Zoom to 100%', onClick: () => vp.setZoomPercent(100) },
    { label: 'Zoom to 200%', onClick: () => vp.setZoomPercent(200) },
    'sep',
    { label: 'Fit everything', icon: 'fit', kbd: 'F', onClick: () => vp.fit(null) },
    { label: 'Reset view', icon: 'home', kbd: '1', onClick: () => vp.resetView() },
  ]) }, '150%');
  const tText = btn('type', 'Text label (T)', () => app.setTool(vp.tool === 'text' ? 'select' : 'text'), 'hide-sm');
  const tDraw = btn('square', 'Draw blocks, slabs and rooms (D)', () => app.setTool(vp.tool === 'draw' ? 'select' : 'draw'));
  const tLib = btn('cuboid', 'Component library (L)', () => app.emit('openLibrary'));
  const tAi = btn('wand', 'AI Generate', () => app.emit('focusAI'));
  const tSel = btn('pointer', 'Select (V)', () => app.setTool('select'));
  const tCom = btn('message', 'Comment (C)', () => app.setTool(vp.tool === 'comment' ? 'select' : 'comment'));
  const tFit = btn('fit', 'Fit view (F)', () => vp.fit(app.doc.selection.length ? app.selectedTop() : null));
  const exportBtn = h('button', { class: 'export', onclick: (e) => menu(e.currentTarget, [
    { section: 'Image' },
    { label: 'PNG image', icon: 'image', onClick: () => app.export('png') },
    { label: 'Blueprint (top view)', icon: 'blueprint', onClick: () => app.export('blueprint') },
    { section: '3D model' },
    { label: 'GLB (web / AR)', icon: 'box', onClick: () => app.export('glb') },
    { label: 'glTF', icon: 'box', onClick: () => app.export('gltf') },
    { label: 'OBJ', icon: 'box', onClick: () => app.export('obj') },
    { label: 'STL (3D printing)', icon: 'cog', onClick: () => app.export('stl') },
    { section: 'Project' },
    { label: 'Scene file (.json)', icon: 'file', onClick: () => app.export('json') },
    { label: 'Credits & licenses', icon: 'credits', onClick: () => app.emit('openCredits') },
  ], { align: 'right' }) }, 'Export');
  const toolbar = h('div', { class: 'toolbar' }, undo, redo, h('span', { class: 'vsep' }), zoom, h('span', { class: 'vsep hide-sm' }), tText, tDraw, tLib, tAi, tSel, tCom, h('span', { class: 'vsep' }), tFit, exportBtn);

  // ----- context hint (tool-specific help) -----
  const hint = h('div', { class: 'hint', style: { display: 'none' } });
  const drawSeg = h('div', { class: 'seg', style: { display: 'inline-flex', marginRight: '10px', pointerEvents: 'auto' } },
    ...[['block', 'Block'], ['slab', 'Slab'], ['room', 'Room']].map(([id, label]) => h('button', { dataset: { m: id }, onclick: () => { vp.drawMode = id; refreshHint(); } }, label)));
  hint.style.pointerEvents = 'auto';
  function refreshHint() {
    const t = vp.tool;
    clear(hint);
    if (sim.state !== 'stopped') {
      hint.style.display = 'block';
      hint.append('Click dynamic objects to give them a shove · Space to pause · Esc to stop');
      return;
    }
    if (t === 'draw') {
      hint.style.display = 'flex'; hint.style.alignItems = 'center';
      [...drawSeg.children].forEach((b) => b.classList.toggle('on', b.dataset.m === vp.drawMode));
      hint.append(drawSeg, 'Drag on the ground to draw');
    } else if (t === 'text') { hint.style.display = 'block'; hint.append('Click in the scene to place a text label'); }
    else if (t === 'comment') { hint.style.display = 'block'; hint.append('Click anywhere to drop a comment pin'); }
    else hint.style.display = 'none';
  }

  // ----- bottom centre: projection -----
  const bOrtho = h('button', { onclick: () => vp.setProjection('orthographic') }, 'Orthographic');
  const bPersp = h('button', { onclick: () => vp.setProjection('perspective') }, 'Perspective');
  const projPill = h('div', { class: 'pill' }, bOrtho, bPersp);
  const bottom = h('div', { class: 'bottom-bar' }, projPill);

  // ----- bottom left: simulate -----
  const playBtn = h('button', { class: 'play', title: 'Simulate physics & motion (Space)', onclick: () => app.togglePlay() });
  const resetBtn = h('button', { title: 'Stop and restore the scene (Esc)', onclick: () => sim.stop() }, icon('reset', 16), 'Reset');
  const live = h('span', { class: 'badge live', style: { display: 'none' } });
  const simPill = h('div', { class: 'pill' }, playBtn, resetBtn);
  const bl = h('div', { class: 'corner-bl' }, simPill, live);

  // ----- bottom right: gizmo modes / snap / blueprint -----
  const modeBtns = { translate: btn('move', 'Move (W)', () => vp.setMode('translate')), rotate: btn('rotate', 'Rotate (E)', () => vp.setMode('rotate')), scale: btn('scale', 'Scale (R)', () => vp.setMode('scale')) };
  const snapBtn = btn('magnet', 'Snap to grid (G)', () => vp.setSnap(!vp.snap));
  const bpBtn = btn('blueprint', 'Blueprint view (B)', () => app.setBlueprint(!vp.blueprint));
  const gridInfo = h('span', { class: 'dim', style: { fontSize: '11px', padding: '0 8px 0 4px', fontWeight: 600 } });
  const br = h('div', { class: 'corner-br' }, h('div', { class: 'pill', style: { padding: '3px', alignItems: 'center' } }, ...Object.values(modeBtns), h('span', { class: 'vsep' }), snapBtn, bpBtn, gridInfo));

  // ----- mobile panel toggles -----
  const tl = h('div', { class: 'corner-tl mobile-only' },
    btn('panel-left', 'Scene', () => { appEl().classList.toggle('show-left'); appEl().classList.remove('show-right'); }, 'badge'),
    btn('panel-right', 'Inspector', () => { appEl().classList.toggle('show-right'); appEl().classList.remove('show-left'); }, 'badge'));
  const appEl = () => document.getElementById('app');

  stage.append(toolbar, hint, bottom, bl, br, tl);
  // on small screens the side panels are drawers; tapping the scene closes them
  stage.addEventListener('pointerdown', () => appEl().classList.remove('show-left', 'show-right'), true);

  // ----- state sync -----
  const sync = () => {
    zoom.textContent = Math.round(vp.zoomPercent) + '%';
    tSel.classList.toggle('active', vp.tool === 'select');
    tDraw.classList.toggle('active', vp.tool === 'draw');
    tText.classList.toggle('active', vp.tool === 'text');
    tCom.classList.toggle('active', vp.tool === 'comment');
    bOrtho.classList.toggle('on', vp.isOrtho);
    bPersp.classList.toggle('on', !vp.isOrtho);
    Object.entries(modeBtns).forEach(([k, b]) => b.classList.toggle('soft-active', vp.mode === k));
    snapBtn.classList.toggle('soft-active', vp.snap);
    bpBtn.classList.toggle('soft-active', vp.blueprint);
    gridInfo.textContent = vp.snap ? `${vp.snapSize} m` : '';
    const running = sim.running, stopped = sim.state === 'stopped';
    clear(playBtn);
    playBtn.append(icon(running ? 'pause' : 'play', 16), stopped ? 'Simulate' : running ? 'Pause' : 'Resume');
    playBtn.classList.toggle('on', running);
    resetBtn.style.display = stopped ? 'none' : '';

    undo.disabled = !app.history.canUndo || !stopped;
    redo.disabled = !app.history.canRedo || !stopped;
    stage.classList.toggle('sim', !stopped);
    refreshHint();
  };
  ['tool', 'mode', 'snap', 'projection', 'blueprint'].forEach((e) => vp.on(e, sync));
  sim.on('state', sync);
  app.on('history', sync);
  let lastZoom = 0;
  vp.on('camera', () => {
    const z = Math.round(vp.zoomPercent);
    if (z !== lastZoom) { lastZoom = z; zoom.textContent = z + '%'; }
  });
  sync();
  app.on('focusAI', () => {});
}
