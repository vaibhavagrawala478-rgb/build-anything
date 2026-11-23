import * as THREE from 'three';
import { app } from '../app.js';
import { PREFABS } from '../engine/library.js';
import { FINISHES } from '../engine/builder.js';
import { FRAMES } from '../engine/viewport.js';
import { generate, STYLES, suggestions } from '../engine/generator.js';
import { loadInto } from '../engine/thumbs.js';
import { h, clear } from './dom.js';
import { icon, iconForPrefab } from './icons.js';
import { popover, closeMenu } from './ui.js';

const fmt = (v, d = 2) => (Math.abs(v) < 5e-5 ? '0' : String(+v.toFixed(d)));
const deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad;
const raf = (fn) => { let q = false, last; return (...a) => { last = a; if (!q) { q = true; requestAnimationFrame(() => { q = false; fn(...last); }); } }; };

export function mountInspector(el) {
  const { doc, vp, sim } = app;
  let bindings = [];
  let scaleLock = true;

  // ===================================================== top bar
  const shareBtn = h('button', { class: 'share', onclick: () => app.emit('openShare') }, icon('share', 15), 'Share');
  const top = h('div', { class: 'rp-top' },
    h('div', { class: 'avatars' },
      h('div', { class: 'avatar', title: 'You' }, icon('users', 16)),
      h('button', { class: 'avatar add', title: 'Invite someone', onclick: () => app.emit('openShare') }, icon('plus', 15))),
    shareBtn);
  const inspector = h('div', { class: 'inspector' });
  const ai = h('div', { class: 'ai' });
  el.append(top, inspector, ai);

  // ===================================================== field helpers
  const prop = (label, ...content) => h('div', { class: 'prop' }, h('label', { title: label }, label), h('div', { class: 'val' }, ...content));

  function numField(axis, get, set, { step = 0.1, min, max, digits = 2 } = {}) {
    const input = h('input', { type: 'number', step, value: fmt(get(), digits), 'aria-label': axis });
    if (min != null) input.min = min;
    if (max != null) input.max = max;
    input.addEventListener('input', () => { const v = parseFloat(input.value); if (!isNaN(v)) set(v); });
    input.addEventListener('change', () => { input.value = fmt(get(), digits); });
    const lab = h('b', { class: axis, style: { pointerEvents: 'auto', cursor: 'ew-resize', padding: '6px 6px 6px 0' } }, axis.toUpperCase());
    lab.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      lab.setPointerCapture(e.pointerId);
      let x0 = e.clientX, v0 = get();
      const move = (ev) => { const v = v0 + (ev.clientX - x0) * step * (ev.shiftKey ? 0.1 : 0.5); set(+v.toFixed(3)); input.value = fmt(get(), digits); };
      const up = () => { lab.removeEventListener('pointermove', move); lab.removeEventListener('pointerup', up); };
      lab.addEventListener('pointermove', move); lab.addEventListener('pointerup', up);
    });
    const w = h('div', { class: 'num' }, lab, input);
    bindings.push(() => { if (document.activeElement !== input) input.value = fmt(get(), digits); });
    return w;
  }

  const section = (title) => h('div', { class: 'sec-label' }, title);

  // ===================================================== inspectors
  function frameInspector() {
    const m = doc.meta;
    const hex = h('input', { class: 'hex', type: 'text', value: m.bg.replace('#', '').toUpperCase(), maxLength: 7, 'aria-label': 'Background hex',
      onchange: (e) => { const v = '#' + e.target.value.replace('#', ''); if (/^#[0-9a-f]{6}$/i.test(v)) app.setMeta({ bg: v }); else e.target.value = m.bg.slice(1).toUpperCase(); } });
    const sw = h('input', { type: 'color', value: m.bg, oninput: (e) => { app.setMeta({ bg: e.target.value }, false); hex.value = e.target.value.slice(1).toUpperCase(); } });
    const op = h('input', { class: 'hex', style: { width: '48px' }, type: 'text', value: Math.round(m.bgOpacity * 100) + '%', 'aria-label': 'Background opacity',
      onchange: (e) => { const v = Math.max(0, Math.min(100, parseFloat(e.target.value))); if (!isNaN(v)) app.setMeta({ bgOpacity: v / 100 }); e.target.value = Math.round(doc.meta.bgOpacity * 100) + '%'; } });
    const size = h('select', { 'aria-label': 'Frame size', onchange: (e) => app.setMeta({ frame: e.target.value }) },
      ...Object.keys(FRAMES).map((k) => h('option', { value: k, selected: m.frame === k }, k === 'responsive' ? 'Responsive' : k)));
    const edit = h('button', { class: 'btn block', style: { marginTop: '6px' }, onclick: (e) => editFrame(e.currentTarget) }, 'Edit Frame');
    return [
      h('div', { class: 'sec-title' }, 'Frame'),
      prop('BG Color', sw, hex, op),
      prop('Size', size),
      edit,
      h('div', { class: 'sec-label' }, 'Lighting & grid'),
      lightControls(),
    ];
  }

  function lightControls() {
    const L = () => (doc.meta.light ||= { az: 38, el: 52, int: 2.1 });
    const upd = raf(() => { vp.applyLight(L()); app.commitSoon(); });
    const sl = (key, min, max, step, label) => prop(label, h('div', { class: 'sl' },
      h('input', { type: 'range', min, max, step, value: L()[key], oninput: (e) => { L()[key] = +e.target.value; upd(); } }),
      h('span', { class: 'muted', style: { textAlign: 'right' } }, '')));
    return [
      sl('az', 0, 360, 1, 'Sun angle'), sl('el', 10, 85, 1, 'Sun height'), sl('int', 0.4, 4, 0.1, 'Sun power'),
      prop('Grid', h('div', { class: 'seg', style: { flex: 1 } },
        h('button', { class: vp.grid.visible ? 'on' : '', onclick: (e) => { vp.grid.visible = true; render(); } }, 'Show'),
        h('button', { class: !vp.grid.visible ? 'on' : '', onclick: () => { vp.grid.visible = false; render(); } }, 'Hide'))),
      prop('Shadows', h('div', { class: 'seg', style: { flex: 1 } },
        h('button', { class: vp.shadowGround.visible ? 'on' : '', onclick: () => { vp.shadowGround.visible = true; vp.sun.castShadow = true; render(); } }, 'On'),
        h('button', { class: !vp.shadowGround.visible ? 'on' : '', onclick: () => { vp.shadowGround.visible = false; vp.sun.castShadow = false; render(); } }, 'Off'))),
    ];
  }

  function editFrame(anchor) {
    const swap = { '16:9': '9:16', '9:16': '16:9', '4:3': '3:4', '3:4': '4:3', '3:2': '2:3', '2:3': '3:2' };
    const chips = h('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '10px' } });
    const draw = () => {
      clear(chips);
      Object.keys(FRAMES).filter((k) => !['3:4', '2:3'].includes(k) || doc.meta.frame === k).forEach((k) => chips.append(h('button', { class: `chip ${doc.meta.frame === k ? 'on' : ''}`, onclick: () => { app.setMeta({ frame: k }); draw(); render(); } }, k === 'responsive' ? 'Responsive' : k)));
    };
    draw();
    popover(anchor, [
      h('div', { class: 'sec-title' }, icon('frame', 16), 'Frame'),
      chips,
      h('div', { class: 'row' },
        h('button', { class: 'btn sm grow', disabled: !swap[doc.meta.frame], onclick: () => { app.setMeta({ frame: swap[doc.meta.frame] }); closeMenu(); render(); } }, icon('refresh', 14), 'Rotate'),
        h('button', { class: 'btn sm primary grow', onclick: () => { closeMenu(); app.export('png'); } }, icon('image', 14), 'Export PNG')),
      h('div', { class: 'field-hint' }, 'The frame crops exports. Set background opacity to 0% for a transparent PNG.'),
    ]);
  }

  function cameraInspector() {
    const proj = h('div', { class: 'seg' },
      h('button', { class: vp.isOrtho ? 'on' : '', onclick: () => { vp.setProjection('orthographic'); render(); } }, 'Ortho'),
      h('button', { class: !vp.isOrtho ? 'on' : '', onclick: () => { vp.setProjection('perspective'); render(); } }, 'Perspective'));
    const fov = h('input', { type: 'range', min: 15, max: 90, step: 1, value: vp.persp.fov, oninput: (e) => vp.setFov(+e.target.value) });
    const views = [['iso', 'Isometric'], ['front', 'Front'], ['right', 'Right'], ['back', 'Back'], ['left', 'Left'], ['top', 'Top']];
    return [
      h('div', { class: 'sec-title' }, icon('camera', 16), 'Camera'),
      prop('Projection', proj),
      prop('Field of view', fov),
      h('div', { class: 'sec-label' }, 'Views'),
      h('div', { class: 'cam-views' }, ...views.map(([k, l]) => h('button', { class: 'btn sm', onclick: () => (k === 'iso' ? vp.resetView() : vp.setView(k)) }, l))),
      h('div', { class: 'act-row', style: { marginTop: '10px' } },
        h('button', { class: 'btn sm grow', onclick: () => vp.fit(null) }, icon('fit', 14), 'Fit all'),
        h('button', { class: `btn sm grow ${vp.blueprint ? 'primary' : ''}`, onclick: () => { app.setBlueprint(!vp.blueprint); render(); } }, icon('blueprint', 14), 'Blueprint')),
      h('div', { class: 'field-hint' }, 'Left-drag to orbit · right-drag or middle-drag to pan · scroll to zoom.'),
    ];
  }

  function multiInspector(objs) {
    const alignBtn = (axis, how, label, ic) => h('button', { class: 'btn sm', title: label, onclick: () => app.align(axis, how) }, label);
    return [
      h('div', { class: 'sec-title' }, icon('layers', 16), h('span', { class: 'grow' }, `${objs.length} objects`)),
      h('div', { class: 'sec-label' }, 'Align'),
      h('div', { class: 'cam-views' }, alignBtn('x', 'min', 'Left'), alignBtn('x', 'center', 'Center X'), alignBtn('x', 'max', 'Right'),
        alignBtn('z', 'min', 'Back'), alignBtn('z', 'center', 'Center Z'), alignBtn('z', 'max', 'Front')),
      h('div', { class: 'sec-label' }, 'Actions'),
      actions(),
    ];
  }

  function actions() {
    return h('div', { class: 'act-row' },
      h('button', { class: 'btn sm', title: 'Ctrl+D', onclick: () => app.duplicate() }, icon('copy', 14), 'Duplicate'),
      h('button', { class: 'btn sm', title: 'Ctrl+G', onclick: () => app.group() }, icon('group', 14), 'Group'),
      h('button', { class: 'btn sm', onclick: () => app.dropToFloor() }, icon('floor', 14), 'Drop'),
      h('button', { class: 'btn sm danger', title: 'Delete', onclick: () => app.delete() }, icon('trash', 14), 'Delete'));
  }

  function objectInspector(obj) {
    const n = obj.userData.n;
    const def = PREFABS[n.prefab];
    const out = [];
    out.push(h('div', { class: 'sec-title' }, icon(iconForPrefab(def), 16), h('span', { class: 'grow', title: n.name }, n.name), h('span', { class: 'tag' }, def.name)));

    if (n.credit) {
      const c = n.credit;
      out.push(h('div', { class: 'credit-box' }, h('b', null, c.title), ' by ', c.authorUrl ? h('a', { href: c.authorUrl, target: '_blank', rel: 'noopener' }, c.author) : c.author,
        h('br'), c.license, ' · ', h('a', { href: c.url, target: '_blank', rel: 'noopener' }, `View on ${c.source || 'Sketchfab'}`)));
    }
    if (n.missing) out.push(h('div', { class: 'credit-box', style: { color: '#ffd98a' } }, 'This model’s file isn’t stored in this browser (it was imported on another device). Import it again to restore it.'));

    // gizmo mode
    const modes = h('div', { class: 'mode-row' },
      ...[['translate', 'Move', 'move'], ['rotate', 'Rotate', 'rotate'], ['scale', 'Scale', 'scale']].map(([m, l, ic]) => h('button', { class: `btn sm ${vp.mode === m ? 'primary' : ''}`, onclick: () => { vp.setMode(m); render(); } }, icon(ic, 14), l)),
      h('button', { class: `icon-btn ${vp.snap ? 'soft-active' : ''}`, style: { width: '28px', height: '28px' }, title: 'Snap (G)', onclick: () => { vp.setSnap(!vp.snap); render(); } }, icon('magnet', 15)));
    out.push(modes);

    // transform
    out.push(section('Transform'));
    const pos = h('div', { class: 'xyz' }, ...['x', 'y', 'z'].map((a) => numField(a, () => obj.position[a], (v) => { obj.position[a] = v; app.commitSoon(); vp.syncGizmoSoft?.(); }, { step: 0.1 })));
    const rot = h('div', { class: 'xyz' }, ...['x', 'y', 'z'].map((a) => numField(a, () => deg(obj.rotation[a]), (v) => { obj.rotation[a] = rad(v); app.commitSoon(); }, { step: 5, digits: 1 })));
    const scl = h('div', { class: 'xyz' }, ...['x', 'y', 'z'].map((a) => numField(a, () => obj.scale[a], (v) => {
      if (v <= 0.001) return;
      if (scaleLock) { const k = v / obj.scale[a]; obj.scale.multiplyScalar(k); } else obj.scale[a] = v;
      app.commitSoon();
      bindings.forEach((b) => b());
    }, { step: 0.1 })));
    const lockBtn = h('button', { class: `icon-btn ${scaleLock ? 'soft-active' : ''}`, style: { width: '28px', height: '28px' }, title: 'Lock proportions', onclick: () => { scaleLock = !scaleLock; render(); } }, icon('link', 14));
    out.push(prop('Position', pos), prop('Rotation', rot), prop('Scale', h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', width: '100%' } }, h('div', { style: { flex: 1 } }, scl), lockBtn)));

    // parameters
    const params = Object.entries(def.params || {});
    if (params.length) {
      out.push(section('Parameters'));
      const apply = raf((k, v) => { doc.setParam(obj, k, v); app.commitSoon(); });
      params.forEach(([k, spec]) => {
        const label = spec.label || k;
        if (spec.options) {
          out.push(prop(label, h('select', { onchange: (e) => { doc.setParam(obj, k, +e.target.value); app.commit(); } },
            ...spec.options.map((o, i) => h('option', { value: i, selected: +n.params[k] === i }, o)))));
        } else if (spec.text) {
          const inp = h('input', { type: 'text', value: n.params[k], dataset: { param: k }, oninput: (e) => apply(k, e.target.value) });
          out.push(prop(label, inp));
        } else {
          const num = h('input', { type: 'number', step: spec.step, value: fmt(n.params[k], 2) });
          const rng = h('input', { type: 'range', min: spec.min, max: spec.max, step: spec.step, value: n.params[k] });
          rng.addEventListener('input', () => { num.value = fmt(+rng.value, 2); apply(k, +rng.value); });
          num.addEventListener('change', () => { const v = Math.min(spec.max * 3, Math.max(spec.min, parseFloat(num.value) || spec.min)); rng.value = v; apply(k, v); });
          out.push(prop(label, h('div', { class: 'sl' }, rng, num)));
        }
      });
    }

    // materials
    const slots = Object.entries(def.slots || {});
    if (slots.length) {
      out.push(section('Materials'));
      const grid = h('div', { class: 'slots' });
      slots.forEach(([slot, s]) => {
        const cur = n.colors[slot] ?? s.c;
        const input = h('input', { type: 'color', value: cur, 'aria-label': slot, oninput: raf((e) => { doc.setColor(obj, slot, e.target.value); app.commitSoon(); }) });
        grid.append(h('label', { class: 'slot', title: slot }, input, h('span', null, slot.replace(/\d+$/, (m) => ' ' + m))));
      });
      out.push(grid);
      out.push(h('div', { style: { height: '8px' } }));
      out.push(prop('Finish', h('select', { onchange: (e) => { n.finish = e.target.value; doc.rebuild(obj); app.commit(); } },
        ...Object.keys(FINISHES).map((f) => h('option', { value: f, selected: n.finish === f }, f[0].toUpperCase() + f.slice(1))))));
    }

    // motion
    out.push(section('Motion'));
    const mo = n.motion;
    const motionBody = h('div');
    const drawMotion = () => {
      clear(motionBody);
      if (mo.type === 'none') return;
      motionBody.append(
        prop('Axis', h('div', { class: 'seg', style: { flex: 1 } }, ...['x', 'y', 'z'].map((a) => h('button', { class: mo.axis === a ? 'on' : '', onclick: () => { mo.axis = a; app.commit(); drawMotion(); } }, a.toUpperCase())))),
        prop(mo.type === 'spin' ? 'Speed (rpm)' : 'Cycles / min', h('div', { class: 'sl' },
          h('input', { type: 'range', min: -120, max: 120, step: 1, value: mo.speed, oninput: (e) => { mo.speed = +e.target.value; e.target.nextSibling.value = mo.speed; app.commitSoon(); } }),
          h('input', { type: 'number', value: mo.speed, onchange: (e) => { mo.speed = +e.target.value; e.target.previousSibling.value = mo.speed; app.commitSoon(); } }))));
      if (mo.type !== 'spin') motionBody.append(prop(mo.type === 'swing' ? 'Angle (°)' : 'Distance (m)', h('div', { class: 'sl' },
        h('input', { type: 'range', min: 0, max: mo.type === 'swing' ? 180 : 10, step: mo.type === 'swing' ? 1 : 0.1, value: mo.amp, oninput: (e) => { mo.amp = +e.target.value; e.target.nextSibling.value = mo.amp; app.commitSoon(); } }),
        h('input', { type: 'number', value: mo.amp, onchange: (e) => { mo.amp = +e.target.value; e.target.previousSibling.value = mo.amp; app.commitSoon(); } }))));
      motionBody.append(h('div', { class: 'field-hint' }, 'Plays while the simulation is running.'));
    };
    drawMotion();
    out.push(prop('Type', h('select', { onchange: (e) => { mo.type = e.target.value; app.commit(); drawMotion(); } },
      ...[['none', 'None'], ['spin', 'Spin'], ['swing', 'Swing'], ['slide', 'Slide']].map(([v, l]) => h('option', { value: v, selected: mo.type === v }, l)))), motionBody);

    // physics
    out.push(section('Physics'));
    const massRow = h('div');
    const drawMass = () => {
      clear(massRow);
      if (n.physics === 'dynamic') massRow.append(prop('Mass (kg)', h('div', { class: 'sl' },
        h('input', { type: 'range', min: 0.1, max: 100, step: 0.1, value: n.mass, oninput: (e) => { n.mass = +e.target.value; e.target.nextSibling.value = n.mass; app.commitSoon(); } }),
        h('input', { type: 'number', value: n.mass, onchange: (e) => { n.mass = Math.max(0.05, +e.target.value); e.target.previousSibling.value = n.mass; app.commitSoon(); } }))));
    };
    drawMass();
    out.push(h('div', { class: 'seg' }, ...[['none', 'Off'], ['static', 'Static'], ['dynamic', 'Dynamic']].map(([v, l]) => h('button', { class: n.physics === v ? 'on' : '', onclick: (e) => {
      n.physics = v; app.commit();
      [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget));
      drawMass();
    } }, l))), massRow, h('div', { class: 'field-hint' }, 'Static objects collide; dynamic ones fall, tumble and can be shoved while simulating.'));

    out.push(section('Actions'));
    const g = n.prefab === 'group';
    out.push(h('div', { class: 'act-row' },
      h('button', { class: 'btn sm', title: 'Ctrl+D', onclick: () => app.duplicate() }, icon('copy', 14), 'Duplicate'),
      g ? h('button', { class: 'btn sm', onclick: () => app.ungroup() }, icon('ungroup', 14), 'Ungroup') : h('button', { class: 'btn sm', onclick: () => app.group() }, icon('group', 14), 'Group'),
      h('button', { class: 'btn sm', title: 'Place on the surface below', onclick: () => app.dropToFloor() }, icon('floor', 14), 'Drop'),
      h('button', { class: 'btn sm', onclick: () => app.toggleLock() }, icon(n.locked ? 'lock' : 'unlock', 14), n.locked ? 'Unlock' : 'Lock'),
      h('button', { class: 'btn sm', onclick: () => app.toggleVisible() }, icon(obj.visible ? 'eye' : 'eye-off', 14), obj.visible ? 'Hide' : 'Show'),
      h('button', { class: 'btn sm danger', onclick: () => app.delete() }, icon('trash', 14), 'Delete')));
    return out;
  }

  // ===================================================== render
  function render() {
    bindings = [];
    const keepScroll = inspector.scrollTop;
    clear(inspector);
    const objs = doc.selectedObjects();
    let content;
    if (app.inspectCamera) content = cameraInspector();
    else if (objs.length === 0) content = frameInspector();
    else if (objs.length === 1) content = objectInspector(objs[0]);
    else content = multiInspector(objs);
    inspector.append(...content.flat(Infinity));
    inspector.scrollTop = keepScroll;
  }
  const busy = () => inspector.contains(document.activeElement) && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && document.activeElement.type !== 'checkbox';
  doc.on('selection', render);
  app.on('inspect', render);
  app.on('tree', () => { if (!busy()) render(); });
  app.on('meta', () => { if (!busy()) render(); });
  app.on('opened', render);
  doc.on('loaded', render);
  app.on('props', () => bindings.forEach((b) => b()));
  vp.on('transform', () => bindings.forEach((b) => b()));
  app.on('focusParam', (key) => { inspector.querySelector(`[data-param="${key}"]`)?.focus(); inspector.querySelector(`[data-param="${key}"]`)?.select?.(); });
  render();

  // ===================================================== AI generate
  let prompt = 'Plants in pots';
  let tab = 'variant';
  let variants = [];
  let note = '';
  let busyGen = false;
  let seed = 7;

  const input = h('input', { type: 'text', value: prompt, placeholder: 'Describe something to build…', 'aria-label': 'AI prompt', oninput: (e) => { prompt = e.target.value; },
    onkeydown: (e) => { if (e.key === 'Enter') run(); e.stopPropagation(); } });
  const genBtn = h('button', { class: 'gen', onclick: () => run() }, icon('sparkles', 16), 'Generate');
  const tabs = h('div', { class: 'tabs' },
    h('button', { class: 'on', dataset: { t: 'variant' }, onclick: () => setTab('variant') }, 'Variant'),
    h('button', { dataset: { t: 'style' }, onclick: () => setTab('style') }, 'Style'));
  const body = h('div', { class: 'variants' });
  ai.append(
    h('h3', null, 'AI Generate'),
    h('div', { class: 'ai-hint' }, icon('wand', 16), 'Generate 3D object just in second!'),
    h('div', { class: 'ai-input' }, input),
    genBtn, tabs, body);

  function setTab(t) { tab = t; [...tabs.children].forEach((b) => b.classList.toggle('on', b.dataset.t === t)); draw(); }

  function draw() {
    clear(body);
    if (tab === 'style') {
      body.append(h('div', { class: 'styles' }, ...STYLES.map((s) => h('button', { class: `style-card ${app.aiStyle === s.id ? 'on' : ''}`, onclick: () => { app.aiStyle = s.id; draw(); run(true); } },
        h('span', { class: 'sw' }, ...s.primary.slice(0, 4).map((c) => h('i', { style: { background: c } }))), h('span', null, h('b', null, s.name), h('small', null, s.desc))))));
      return;
    }
    if (note) body.append(h('div', { class: 'ai-note' }, note));
    if (busyGen) { body.append(h('div', { class: 'vgrid' }, ...Array.from({ length: 6 }, () => h('div', { class: 'tile skeleton' })))); return; }
    if (!variants.length) {
      body.append(h('div', { class: 'ai-note' }, 'Describe what you want and hit Generate. Try:'), h('div', { class: 'sugg' }, ...suggestions.slice(0, 6).map((s) => h('button', { class: 'chip', onclick: () => { prompt = input.value = s; run(); } }, s))));
      return;
    }
    const grid = h('div', { class: 'vgrid' });
    variants.forEach((v) => {
      const img = h('img', { alt: v.name, draggable: false });
      loadInto(img, v.prefab, v.params, v.colors, v.finish, 220);
      const t = h('div', { class: 'tile', draggable: true, title: `Add ${v.name}${v.count > 1 ? ' ×' + v.count : ''}`, onclick: () => app.addVariant(v) },
        img, h('span', { class: 'nm' }, v.name + (v.count > 1 ? ` ×${v.count}` : '')), h('span', { class: 'plus' }, icon('plus', 14)));
      t.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-ba', JSON.stringify({ type: 'variant', v }));
        e.dataTransfer.effectAllowed = 'copy';
        if (img.complete && img.naturalWidth) e.dataTransfer.setDragImage(img, 40, 40);
      });
      grid.append(t);
    });
    body.append(grid, h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
      h('button', { class: 'chip', onclick: () => run(true) }, icon('shuffle', 13), 'Shuffle variants')));
  }

  function run(again = false) {
    if (busyGen) return;
    if (!prompt.trim()) { input.focus(); return; }
    busyGen = true;
    genBtn.classList.add('busy');
    clear(genBtn); genBtn.append(h('span', { class: 'spin' }, icon('refresh', 16)), 'Generating…');
    if (tab !== 'variant') setTab('variant'); else draw();
    setTimeout(() => {
      const res = generate(prompt, app.aiStyle, 6, (seed += 1) * 7919 + Date.now() % 1000);
      variants = res.variants; note = res.note;
      busyGen = false;
      genBtn.classList.remove('busy');
      clear(genBtn); genBtn.append(icon('sparkles', 16), 'Generate');
      draw();
    }, 420);
  }
  app.on('focusAI', () => { el.parentElement?.classList.add('show-right'); input.focus(); input.select(); });
  draw();
  run();
}
