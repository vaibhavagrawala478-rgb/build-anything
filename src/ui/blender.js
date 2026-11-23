import { app } from '../app.js';
import * as blender from '../engine/blender.js';
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { toast } from './ui.js';

const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); } catch {
    const t = h('textarea', { value: text, style: { position: 'fixed', opacity: 0 } });
    document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
  }
  toast('Copied');
};

/** Top bar with the Editor / Blender workspace tabs. */
export function mountTopbar(el) {
  const appEl = document.getElementById('app');
  const dot = h('span', { class: 'blend-dot' });
  const tabEditor = h('button', { class: 'wtab', role: 'tab', onclick: () => app.setMode('editor') }, icon('cuboid', 16), 'Editor');
  const tabBlender = h('button', { class: 'wtab', role: 'tab', title: 'Use Blender with your scene', onclick: () => app.setMode('blender') }, icon('component', 16), 'Blender', dot);
  el.append(
    h('div', { class: 'brand' }, h('img', { src: `${import.meta.env.BASE_URL}icon.svg`, alt: '' }), h('span', null, 'BuildAnything')),
    tabEditor, tabBlender, h('div', { class: 'spacer' }),
    h('button', { class: 'top-link', title: 'Browse free Sketchfab models', onclick: () => app.emit('openLibrary', 'Sketchfab') }, icon('globe', 15), h('span', null, 'Sketchfab models')),
    h('button', { class: 'top-link', onclick: () => app.emit('openLibrary') }, icon('library', 15), h('span', null, 'Library')),
    h('button', { class: 'top-link', title: 'Help & shortcuts', onclick: () => app.emit('openHelp') }, icon('help', 15), h('span', null, 'Help')),
  );
  const sync = () => {
    const b = app.mode === 'blender';
    appEl.classList.toggle('mode-blender', b);
    tabEditor.setAttribute('aria-selected', String(!b));
    tabBlender.setAttribute('aria-selected', String(b));
  };
  app.on('mode', sync);
  app.on('blenderStatus', (on) => dot.classList.toggle('on', !!on));
  sync();
}

/** The Blender workspace: connect to a running Blender, send the scene, bring edits back. */
export function mountBlender(root) {
  let info = null, polling = null, busy = false;
  let sendSel = false, replaceBlender = true, bringSel = false, replaceSent = false;
  const logEntries = [];
  const logBox = h('div', { class: 'log' });
  const pill = h('div', { class: 'status-pill' }, h('i'), h('span', null, 'Checking…'));
  const setup = h('div'), actions = h('div');
  let portInput;

  const addLog = (msg, err = false) => {
    logEntries.unshift({ t: new Date(), msg, err });
    if (logEntries.length > 30) logEntries.pop();
    drawLog();
  };
  const drawLog = () => {
    clear(logBox);
    if (!logEntries.length) logBox.append(h('div', null, h('span', { class: 'dim' }, 'Transfers will show up here.')));
    logEntries.forEach((e) => logBox.append(h('div', { class: e.err ? 'err' : '' }, h('time', null, e.t.toLocaleTimeString()), h('span', null, e.msg))));
  };

  async function check() {
    try { info = await blender.status(); } catch { info = null; }
    app.emit('blenderStatus', !!info);
    draw();
  }
  const startPolling = () => { stopPolling(); check(); polling = setInterval(check, 2500); };
  const stopPolling = () => { clearInterval(polling); polling = null; };
  app.on('mode', (m) => (m === 'blender' ? startPolling() : stopPolling()));
  app.doc.on('selection', () => { if (app.mode === 'blender') draw(); });

  async function run(label, fn) {
    if (busy) return;
    busy = true; draw();
    try {
      const res = await fn();
      addLog(`${label} ✓ ${res?.note || ''}`.trim());
      return res;
    } catch (e) {
      const msg = e.message === 'NOT_RUNNING' ? 'Blender is not reachable — is the bridge script running?' : e.message;
      addLog(`${label} failed: ${msg}`, true);
      toast(msg, 'err');
      if (e.message === 'NOT_RUNNING') check();
    } finally { busy = false; draw(); }
  }

  const doSend = () => run(sendSel ? 'Sent selection to Blender' : 'Sent scene to Blender', async () => {
    const r = await app.sendToBlender({ selectionOnly: sendSel, replace: replaceBlender });
    toast('Sent to Blender');
    return { note: `${r.imported} objects · ${(r.bytes / 1024).toFixed(0)} KB` };
  });
  const doBring = () => run('Brought edits back from Blender', async () => {
    const r = await app.bringFromBlender({ selectedOnly: bringSel, replaceSent });
    if (r) { toast('Blender model added to your scene'); app.setMode('editor'); }
    return { note: r ? `${(r.bytes / 1024).toFixed(0)} KB` : '' };
  });

  const opt = (checked, label, onchange) => h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked, onchange: (e) => onchange(e.target.checked) }), label);
  const radio = (name, value, current, label, onchange, disabled = false) => h('label', { class: 'opt', style: disabled ? { opacity: .4 } : {} },
    h('input', { type: 'radio', name, checked: current === value, disabled, onchange: () => onchange(value) }), label);

  function draw() {
    pill.className = `status-pill ${info ? 'on' : ''}`;
    clear(pill);
    pill.append(h('i'), h('span', null, info ? `Connected · Blender ${info.blender}` : 'Not connected'));

    // ----- setup (not connected)
    clear(setup);
    if (!info) {
      const cmd = 'blender --python buildanything_bridge.py';
      portInput = h('input', { type: 'text', value: String(blender.getPort()), style: { width: '90px' }, 'aria-label': 'Port',
        onchange: (e) => { const p = +e.target.value; if (p > 0 && p < 65536) { blender.setPort(p); check(); } else e.target.value = blender.getPort(); } });
      setup.append(h('div', { class: 'bl-card' },
        h('h3', null, icon('link', 18), 'Connect Blender'),
        h('p', null, 'Blender can’t run inside a web page, so BuildAnything talks to the Blender on your computer through a small bridge script. It only listens on your own machine.'),
        h('div', { class: 'bl-step' }, h('span', { class: 'n' }, '1'), h('div', null, h('b', null, 'Get the bridge script'),
          h('a', { class: 'btn', href: blender.BRIDGE_URL, download: 'buildanything_bridge.py', style: { display: 'inline-flex', textDecoration: 'none' } }, icon('download', 15), 'Download buildanything_bridge.py'))),
        h('div', { class: 'bl-step' }, h('span', { class: 'n' }, '2'), h('div', { style: { minWidth: 0 } }, h('b', null, 'Run it in Blender'),
          h('span', { class: 'muted' }, 'In Blender open the '), h('b', { style: { display: 'inline' } }, 'Scripting'), h('span', { class: 'muted' }, ' tab → Open → pick the file → Run Script. Or start Blender from a terminal:'),
          h('div', { class: 'codebox' }, h('code', null, cmd), h('button', { class: 'btn sm', onclick: () => copyText(cmd) }, icon('copy', 13), 'Copy')),
          h('div', { class: 'note', style: { marginTop: '6px' } }, 'No window needed? Add ', h('code', null, '-b'), ' to run it headless.'))),
        h('div', { class: 'bl-step' }, h('span', { class: 'n' }, '3'), h('div', null, h('b', null, 'Come back here'), h('span', { class: 'muted' }, 'This page connects automatically — the status above turns green.'))),
        h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Port'), portInput, h('button', { class: 'btn sm', onclick: check }, icon('refresh', 13), 'Check now'), h('div', { class: 'grow' }),
          h('a', { class: 'btn sm ghost', href: 'https://www.blender.org/download/', target: '_blank', rel: 'noopener', style: { textDecoration: 'none' } }, 'Get Blender (free)')),
        h('div', { class: 'note' }, 'Works in Chrome and Edge, and in Firefox. Safari blocks web pages from reaching local programs.')));
    }

    // ----- actions (connected)
    clear(actions);
    const sel = app.doc.selection.length;
    const dis = !info || busy;
    actions.append(h('div', { class: `bl-grid` },
      h('div', { class: `bl-card ${dis ? 'disabled' : ''}` },
        h('h3', null, icon('upload', 18), 'Send to Blender'),
        h('p', null, 'Exports your scene (or just your selection) and opens it in Blender with named parts and materials.'),
        radio('send', false, sendSel, 'Whole scene', (v) => { sendSel = v; draw(); }),
        radio('send', true, sendSel, `Selected objects (${sel})`, (v) => { sendSel = v; draw(); }, sel === 0),
        opt(replaceBlender, 'Replace what’s currently in Blender', (v) => { replaceBlender = v; }),
        h('button', { class: 'btn primary', onclick: doSend }, busy ? 'Working…' : [icon('upload', 15), 'Send to Blender'])),
      h('div', { class: `bl-card ${dis ? 'disabled' : ''}` },
        h('h3', null, icon('download', 18), 'Bring back from Blender'),
        h('p', null, 'Pulls your Blender work into the scene as a model, at the same size and position you sent it.'),
        radio('bring', false, bringSel, 'Everything in Blender', (v) => { bringSel = v; draw(); }),
        radio('bring', true, bringSel, `Only what’s selected in Blender${info ? ` (${info.selected})` : ''}`, (v) => { bringSel = v; draw(); }),
        opt(replaceSent, 'Replace the objects I sent', (v) => { replaceSent = v; }),
        h('button', { class: 'btn primary', onclick: doBring }, busy ? 'Working…' : [icon('download', 15), 'Bring into scene']))));
    if (info) actions.append(h('div', { class: 'note', style: { marginTop: '10px' } }, `Blender file: ${info.file} · ${info.objects} objects${info.background ? ' · running headless' : ''}`));
  }

  // ----- static layout
  const fileInput = h('input', { type: 'file', accept: '.glb,.gltf', style: { display: 'none' }, onchange: (e) => { const f = e.target.files[0]; if (f) { app.importFile(f); app.setMode('editor'); } e.target.value = ''; } });
  root.append(h('div', { class: 'bl-wrap' },
    h('div', { class: 'bl-hero' },
      h('div', { class: 'bl-logo' }, icon('component', 30)),
      h('div', null, h('h1', null, 'Blender'), h('p', null, 'Sculpt, rig, texture and render with the full Blender toolset, then drop the result straight back into your scene.')),
      pill),
    setup, actions,
    h('div', { class: 'bl-card' },
      h('h3', null, icon('file', 18), 'Prefer to do it by hand?'),
      h('p', null, 'Download your scene as a .glb, open it in Blender with File → Import → glTF 2.0, then export from Blender and import the file back here.'),
      h('div', { class: 'row', style: { flexWrap: 'wrap' } },
        h('button', { class: 'btn', onclick: () => app.export('glb') }, icon('download', 15), 'Download scene (.glb)'),
        h('button', { class: 'btn', onclick: () => fileInput.click() }, icon('upload', 15), 'Import a .glb from Blender'), fileInput)),
    h('div', null, h('div', { class: 'section-h' }, 'Activity'), logBox)));
  drawLog();
  draw();
}
