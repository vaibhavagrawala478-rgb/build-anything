/**
 * Client for the BuildAnything Blender bridge (public/blender/buildanything_bridge.py),
 * a small localhost server that runs inside the user's own Blender.
 */
const PORT_KEY = 'ba.blender.port';

export const getPort = () => { try { return +localStorage.getItem(PORT_KEY) || 8765; } catch { return 8765; } };
export const setPort = (p) => { try { localStorage.setItem(PORT_KEY, String(p)); } catch { /* ignore */ } };
const base = () => `http://127.0.0.1:${getPort()}`;

async function call(path, init = {}, ms = 120000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(base() + path, { ...init, signal: ctl.signal });
    if (!r.ok) {
      let msg = `Blender replied ${r.status}`;
      try { msg = (await r.json()).error || msg; } catch { /* not json */ }
      throw new Error(msg);
    }
    return r;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Blender took too long to answer');
    if (e instanceof TypeError) throw new Error('NOT_RUNNING');
    throw e;
  } finally { clearTimeout(t); }
}

/** Resolves with Blender's status, or throws Error('NOT_RUNNING') if the bridge isn't reachable. */
export const status = async () => (await call('/status', {}, 2500)).json();

export const sendGLB = async (buffer, { replace = false } = {}) =>
  (await call(`/import?replace=${replace ? 1 : 0}`, { method: 'POST', body: buffer, headers: { 'Content-Type': 'application/octet-stream' } })).json();

export const fetchGLB = async ({ selected = false } = {}) => (await call(`/export?selected=${selected ? 1 : 0}`)).arrayBuffer();

export const BRIDGE_URL = `${import.meta.env.BASE_URL}blender/buildanything_bridge.py`;
