import { h, clear } from './dom.js';
import { icon } from './icons.js';

let activeMenu = null;

export function closeMenu() {
  if (activeMenu) { activeMenu.el.remove(); document.removeEventListener('pointerdown', activeMenu.off, true); activeMenu = null; }
}

/**
 * Pop a menu next to `anchor`. items: [{label, icon, kbd, onClick, checked, disabled}] | 'sep' | {section:'Label'}
 */
export function menu(anchor, items, { align = 'left', above = false, width } = {}) {
  closeMenu();
  const el = h('div', { class: 'menu', style: width ? { minWidth: width + 'px' } : {} });
  items.forEach((it) => {
    if (it === 'sep') return el.append(h('hr'));
    if (it.section) return el.append(h('div', { class: 'label' }, it.section));
    el.append(h('button', {
      disabled: it.disabled,
      onclick: () => { closeMenu(); it.onClick?.(); },
    }, it.icon ? icon(it.icon, 16) : h('span', { style: { width: '16px' } }), it.label, it.checked ? icon('check', 14) : null, it.kbd ? h('span', { class: 'kbd' }, it.kbd) : null));
  });
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const mw = el.offsetWidth, mh = el.offsetHeight;
  let x = align === 'right' ? r.right - mw : r.left;
  let y = above ? r.top - mh - 8 : r.bottom + 8;
  x = Math.max(8, Math.min(x, window.innerWidth - mw - 8));
  if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 8);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  const off = (e) => { if (!el.contains(e.target)) closeMenu(); };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  activeMenu = { el, off };
  return el;
}

/** Floating custom popover anchored to an element (arbitrary content). */
export function popover(anchor, content, { align = 'left', above = false } = {}) {
  closeMenu();
  const el = h('div', { class: 'menu', style: { padding: '12px', minWidth: '240px' } }, content);
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const mw = el.offsetWidth, mh = el.offsetHeight;
  let x = align === 'right' ? r.right - mw : r.left;
  let y = above ? r.top - mh - 8 : r.bottom + 8;
  x = Math.max(8, Math.min(x, window.innerWidth - mw - 8));
  if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 8);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  const off = (e) => { if (!el.contains(e.target)) closeMenu(); };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  activeMenu = { el, off };
  return el;
}

export function modal(title, body, { small = false, headRight, onClose, className = '' } = {}) {
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey, true); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const scrim = h('div', { class: 'scrim', onpointerdown: (e) => { if (e.target === scrim) close(); } },
    h('div', { class: `modal ${small ? 'sm' : ''} ${className}`, role: 'dialog', 'aria-label': title },
      h('div', { class: 'modal-head' }, h('h2', null, title), h('div', { class: 'grow' }), headRight, h('button', { class: 'icon-btn', title: 'Close', onclick: close }, icon('x', 18))),
      body));
  document.body.append(scrim);
  document.addEventListener('keydown', onKey, true);
  return { close, el: scrim };
}

export function toast(msg, kind = 'ok') {
  const root = document.getElementById('toasts');
  const t = h('div', { class: `toast ${kind === 'err' ? 'err' : ''}` }, icon(kind === 'err' ? 'alert' : 'check', 16), msg);
  root.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(() => t.remove(), 320); }, 2600);
}

export { clear };
