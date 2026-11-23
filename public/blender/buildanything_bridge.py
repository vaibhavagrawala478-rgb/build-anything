"""
BuildAnything <-> Blender bridge
================================

Run this inside Blender (Scripting tab -> Open -> Run Script) or install it as an add-on.
It starts a tiny web server on 127.0.0.1 that the BuildAnything web app talks to, so you can
send your scene to Blender, edit it with the full Blender toolset, and bring it back.

    blender --python buildanything_bridge.py          # normal, with the Blender UI
    blender -b --python buildanything_bridge.py       # headless (no window), same features

Security: the server only listens on localhost and only answers web pages from the origins in
ALLOWED_ORIGINS (plus localhost dev servers). Nothing here runs arbitrary code sent by a page.

Endpoints
    GET  /status                      -> {"ok":true,"blender":"5.2.0","objects":N,"selected":M}
    POST /import?replace=0|1          -> body: GLB bytes. Imports it into the open scene.
    GET  /export?selected=0|1         -> GLB bytes of the whole scene or the selection.
"""

bl_info = {
    "name": "BuildAnything Bridge",
    "author": "BuildAnything",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "Starts automatically when enabled",
    "description": "Live link between Blender and the BuildAnything web app",
    "category": "Import-Export",
}

import json
import os
import queue
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer, HTTPServer
from urllib.parse import urlparse, parse_qs

import bpy

HOST = "127.0.0.1"
PORT = int(os.environ.get("BUILDANYTHING_PORT", "8765"))
ALLOWED_ORIGINS = {
    "https://vaibhavagrawala478-rgb.github.io",
}
ALLOWED_ORIGINS |= {o.strip() for o in os.environ.get("BUILDANYTHING_ORIGINS", "").split(",") if o.strip()}
LOCAL_PREFIXES = ("http://localhost", "http://127.0.0.1")
MAX_UPLOAD = 512 * 1024 * 1024

_jobs = queue.Queue()
_server = None


# ----------------------------------------------------------------------------- Blender work
def _status():
    objs = bpy.data.objects
    return {
        "ok": True,
        "blender": bpy.app.version_string,
        "file": os.path.basename(bpy.data.filepath) or "(unsaved)",
        "objects": len(objs),
        "selected": len([o for o in objs if o.select_get()]) if bpy.context.view_layer else 0,
        "background": bool(bpy.app.background),
    }


def _import_glb(data, replace):
    path = os.path.join(tempfile.gettempdir(), "buildanything_in.glb")
    with open(path, "wb") as f:
        f.write(data)
    before = set(bpy.data.objects.keys())
    if replace:
        for o in list(bpy.data.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        before = set()
    bpy.ops.import_scene.gltf(filepath=path)
    added = [o for o in bpy.data.objects if o.name not in before]
    # leave the freshly imported objects selected so "send selection back" just works
    for o in bpy.data.objects:
        try:
            o.select_set(o in added)
        except Exception:
            pass
    return {"ok": True, "imported": len(added), "names": [o.name for o in added][:50]}


def _export_glb(selected_only):
    path = os.path.join(tempfile.gettempdir(), "buildanything_out.glb")
    if os.path.exists(path):
        os.remove(path)
    if selected_only and not any(o.select_get() for o in bpy.data.objects):
        raise ValueError("Nothing is selected in Blender")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=bool(selected_only))
    with open(path, "rb") as f:
        return f.read()


def _run_on_main(fn):
    """Run fn on Blender's main thread (required for bpy.ops) and return its result."""
    if bpy.app.background:
        return fn()
    ev = threading.Event()
    box = {}
    _jobs.put((fn, ev, box))
    if not ev.wait(120):
        raise TimeoutError("Blender did not respond in time (is a modal dialog open?)")
    if "err" in box:
        raise box["err"]
    return box["res"]


def _pump():
    while True:
        try:
            fn, ev, box = _jobs.get_nowait()
        except queue.Empty:
            break
        try:
            box["res"] = fn()
        except Exception as e:  # noqa: BLE001 - reported back to the page
            box["err"] = e
        ev.set()
    return 0.05


# ----------------------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "BuildAnythingBridge/1.0"

    def log_message(self, fmt, *args):  # keep the Blender console quiet
        pass

    # --- helpers
    def _origin_ok(self):
        origin = self.headers.get("Origin")
        host = (self.headers.get("Host") or "").split(":")[0]
        if host not in ("127.0.0.1", "localhost"):  # DNS-rebinding guard
            return False
        if origin is None:  # curl / scripts
            return True
        return origin in ALLOWED_ORIGINS or origin.startswith(LOCAL_PREFIXES)

    def _cors(self):
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-BuildAnything")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")

    def _send(self, code, body=b"", ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _guard(self):
        if not self._origin_ok():
            self._send(403, {"ok": False, "error": "Origin not allowed"})
            return False
        return True

    # --- verbs
    def do_OPTIONS(self):
        if not self._guard():
            return
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if not self._guard():
            return
        url = urlparse(self.path)
        q = parse_qs(url.query)
        try:
            if url.path == "/status":
                self._send(200, _run_on_main(_status))
            elif url.path == "/export":
                data = _run_on_main(lambda: _export_glb(q.get("selected", ["0"])[0] == "1"))
                self._send(200, data, "model/gltf-binary")
            else:
                self._send(404, {"ok": False, "error": "Not found"})
        except Exception as e:  # noqa: BLE001
            self._send(500, {"ok": False, "error": str(e)})

    def do_POST(self):
        if not self._guard():
            return
        url = urlparse(self.path)
        q = parse_qs(url.query)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_UPLOAD:
                return self._send(400, {"ok": False, "error": "Bad upload size"})
            data = self.rfile.read(n)
            if url.path == "/import":
                if data[:4] != b"glTF":
                    return self._send(400, {"ok": False, "error": "Expected a binary glTF (.glb)"})
                replace = q.get("replace", ["0"])[0] == "1"
                self._send(200, _run_on_main(lambda: _import_glb(data, replace)))
            else:
                self._send(404, {"ok": False, "error": "Not found"})
        except Exception as e:  # noqa: BLE001
            self._send(500, {"ok": False, "error": str(e)})


# ----------------------------------------------------------------------------- lifecycle
def start():
    global _server
    if _server:
        print("[BuildAnything] bridge already running on port", PORT)
        return
    if bpy.app.background:
        _server = HTTPServer((HOST, PORT), Handler)  # single threaded: requests run on the main thread
        print(f"[BuildAnything] bridge listening on http://{HOST}:{PORT} (headless). Ctrl+C to stop.")
        try:
            _server.serve_forever()
        except KeyboardInterrupt:
            pass
        return
    _server = ThreadingHTTPServer((HOST, PORT), Handler)
    threading.Thread(target=_server.serve_forever, daemon=True).start()
    bpy.app.timers.register(_pump, persistent=True)
    print(f"[BuildAnything] bridge listening on http://{HOST}:{PORT} — open the BuildAnything Blender tab.")


def stop():
    global _server
    if _server:
        _server.shutdown()
        _server.server_close()
        _server = None
    try:
        bpy.app.timers.unregister(_pump)
    except Exception:
        pass


def register():
    start()


def unregister():
    stop()


if __name__ == "__main__":
    start()
