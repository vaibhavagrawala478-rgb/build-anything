import * as THREE from 'three';
import { app } from '../app.js';
import { h, clear } from './dom.js';
import { popover, closeMenu } from './ui.js';
import { icon } from './icons.js';

const corners = (box) => {
  const { min: a, max: b } = box;
  const out = [];
  for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
};

export function mountOverlay(stage) {
  const { vp, doc, sim } = app;
  const root = h('div', { id: 'overlay' });
  const selbox = h('div', { class: 'selbox' }, h('i'), h('i'), h('i'), h('i'), h('div', { class: 'seltag' }));
  const hoverbox = h('div', { class: 'hoverbox' });
  const frame = h('div', { class: 'framemask' }, h('span'));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'draw-svg');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('fill', 'rgba(139,92,246,.22)');
  poly.setAttribute('stroke', '#8b5cf6');
  poly.setAttribute('stroke-width', '1.5');
  poly.style.display = 'none';
  svg.append(poly);
  const drawLabel = h('div', { class: 'dim-label', style: { display: 'none', background: '#8b5cf6', color: '#fff' } });
  const dims = h('div');
  const pins = h('div');
  root.append(frame, svg, hoverbox, selbox, dims, drawLabel, pins);
  stage.append(root);

  let preview = null;
  vp.on('drawPreview', (d) => { preview = d; });
  vp.on('hover', (id) => { stage.classList.toggle('hovering', !!id && !sim.running && vp.tool === 'select'); });

  const screenRect = (box) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const c of corners(box)) {
      const p = vp.project(c);
      if (p.behind) return null;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const place = (el, r, pad = 4) => {
    el.style.display = 'block';
    el.style.left = r.x - pad + 'px'; el.style.top = r.y - pad + 'px';
    el.style.width = r.w + pad * 2 + 'px'; el.style.height = r.h + pad * 2 + 'px';
  };

  const dimEls = [];
  const dimLabel = (i, x, y, text) => {
    let el = dimEls[i];
    if (!el) { el = h('div', { class: 'dim-label' }); dims.append(el); dimEls[i] = el; }
    el.style.display = 'block'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.textContent = text;
  };

  let pinKey = '';
  const pinEls = new Map();
  const buildPins = () => {
    clear(pins); pinEls.clear();
    doc.comments.forEach((c, i) => {
      const el = h('div', { class: 'pin', title: c.text || 'Empty comment', onclick: () => openComment(c.id) }, h('span', null, String(i + 1)));
      pins.append(el); pinEls.set(c.id, el);
    });
  };
  app.on('comments', buildPins);
  doc.on('loaded', buildPins);

  function openComment(id) {
    const c = doc.comments.find((x) => x.id === id);
    const el = pinEls.get(id);
    if (!c || !el) return;
    const ta = h('textarea', { placeholder: 'Write a comment…', style: { height: '90px', padding: '10px', resize: 'none', width: '100%' } });
    ta.value = c.text;
    const save = () => { c.text = ta.value; el.title = c.text || 'Empty comment'; app.commitSoon(); };
    ta.addEventListener('input', save);
    const pop = popover(el, [
      h('div', { class: 'row', style: { marginBottom: '8px' } }, icon('message', 15), h('b', null, 'Comment'), h('div', { class: 'grow' }),
        h('span', { class: 'dim', style: { fontSize: '11px' } }, new Date(c.t).toLocaleDateString())),
      ta,
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', { class: 'btn sm danger', onclick: () => { doc.comments = doc.comments.filter((x) => x !== c); closeMenu(); app.commit(); buildPins(); } }, icon('trash', 14), 'Delete'),
        h('div', { class: 'grow' }),
        h('button', { class: 'btn sm primary', onclick: closeMenu }, 'Done')),
    ], { above: false });
    setTimeout(() => ta.focus(), 30);
  }
  app.on('openComment', (id) => { buildPins(); requestAnimationFrame(() => openComment(id)); });

  vp.on('rendered', () => {
    // frame mask
    const fr = vp.frameRect();
    if (fr) {
      frame.style.display = 'block';
      Object.assign(frame.style, { left: fr.x + 'px', top: fr.y + 'px', width: fr.w + 'px', height: fr.h + 'px' });
      frame.firstChild.textContent = `${doc.meta.frame} · ${Math.round(fr.w)}×${Math.round(fr.h)}`;
    } else frame.style.display = 'none';

    // selection
    const tops = doc.selectedTop(doc.selection).filter((o) => o.visible);
    if (tops.length && !sim.running && sim.state === 'stopped') {
      const box = doc.bbox(tops);
      const r = box.isEmpty() ? null : screenRect(box);
      if (r) {
        place(selbox, r, 6);
        selbox.lastChild.textContent = tops.length === 1 ? tops[0].userData.n.name : `${tops.length} objects`;
        if (vp.blueprint) {
          const s = box.getSize(new THREE.Vector3());
          const c = box.getCenter(new THREE.Vector3());
          const pb = vp.project(new THREE.Vector3(c.x, box.min.y, box.max.z));
          const pr = vp.project(new THREE.Vector3(box.max.x, box.min.y, c.z));
          dimLabel(0, pb.x, pb.y + 16, `${s.x.toFixed(2)} m`);
          dimLabel(1, pr.x + 28, pr.y, `${s.z.toFixed(2)} m`);
          dimLabel(2, r.x + r.w / 2, r.y - 16, `H ${s.y.toFixed(2)} m`);
        } else dimEls.forEach((e) => { e.style.display = 'none'; });
      } else selbox.style.display = 'none';
    } else {
      selbox.style.display = 'none';
      dimEls.forEach((e) => { e.style.display = 'none'; });
    }

    // hover
    const hov = vp.hover && !doc.selection.includes(vp.hover) && !sim.running ? doc.get(vp.hover) : null;
    if (hov && hov.visible && vp.tool === 'select') {
      const r = screenRect(doc.bbox(hov));
      if (r) place(hoverbox, r, 3); else hoverbox.style.display = 'none';
    } else hoverbox.style.display = 'none';

    // draw preview
    if (preview?.b) {
      const { a, b } = preview;
      const pts = [[a.x, a.z], [b.x, a.z], [b.x, b.z], [a.x, b.z]].map(([x, z]) => vp.project(new THREE.Vector3(x, 0.02, z)));
      poly.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
      poly.style.display = 'block';
      const cx = pts.reduce((s, p) => s + p.x, 0) / 4, cy = pts.reduce((s, p) => s + p.y, 0) / 4;
      drawLabel.style.display = 'block';
      drawLabel.style.left = cx + 'px'; drawLabel.style.top = cy + 'px';
      drawLabel.textContent = `${Math.abs(b.x - a.x).toFixed(2)} × ${Math.abs(b.z - a.z).toFixed(2)} m`;
    } else { poly.style.display = 'none'; drawLabel.style.display = 'none'; }

    // comment pins
    doc.comments.forEach((c) => {
      const el = pinEls.get(c.id);
      if (!el) return;
      const p = vp.project(new THREE.Vector3(...c.p));
      el.style.display = p.behind ? 'none' : 'grid';
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    });
  });
}
