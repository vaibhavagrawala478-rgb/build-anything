import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Builder } from './builder.js';
import { PREFABS, defaultParams } from './library.js';

let R, scene, cam, holder, shadow;
const cache = new Map();
let queue = Promise.resolve();

function init() {
  if (R) return;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7fb0', 0.65));
  const sun = new THREE.DirectionalLight('#fff4e6', 2.1);
  sun.position.set(6, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);
  shadow = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.22 }));
  shadow.receiveShadow = true;
  scene.add(shadow);
  holder = new THREE.Group();
  scene.add(holder);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
}

/** Render any object to a PNG data URL, framed in the isometric view. */
export function renderObject(object, size = 176, { ground = true } = {}) {
  init();
  holder.clear();
  holder.add(object);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) { holder.clear(); return ''; }
  const c = box.getCenter(new THREE.Vector3());
  const rad = Math.max(0.3, box.getSize(new THREE.Vector3()).length() / 2);
  const half = rad * 0.98;
  cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
  cam.position.set(1, 0.9, 1).normalize().multiplyScalar(50).add(c);
  cam.lookAt(c);
  cam.updateProjectionMatrix();
  shadow.visible = ground;
  shadow.position.y = box.min.y - 0.001;
  R.setSize(size, size, false);
  R.setClearColor(0x000000, 0);
  R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  holder.clear();
  return url;
}

export function buildPrefabObject(prefab, params, colors, finish) {
  const def = PREFABS[prefab];
  const b = new Builder(def, colors || {}, finish || 'default');
  def.build(b, { ...defaultParams(def), ...(params || {}) });
  return b.group;
}

const keyOf = (prefab, params, colors, finish, size) => `${prefab}|${JSON.stringify(params || {})}|${JSON.stringify(colors || {})}|${finish || ''}|${size}`;

/** Thumbnail for a prefab (+ overrides). Rendering is queued so the UI never stalls. */
export function thumb(prefab, params, colors, finish, size = 176) {
  const k = keyOf(prefab, params, colors, finish, size);
  if (cache.has(k)) return Promise.resolve(cache.get(k));
  const p = queue.then(() => new Promise((res) => setTimeout(() => {
    if (cache.has(k)) return res(cache.get(k));
    let url = '';
    try {
      const obj = buildPrefabObject(prefab, params, colors, finish);
      url = renderObject(obj, size);
      cache.set(k, url);
    } catch (e) { console.warn('thumb failed', prefab, e); }
    res(url);
  }, 0)));
  queue = p.catch(() => {});
  return p;
}

export const cachedThumb = (prefab, params, colors, finish, size = 176) => cache.get(keyOf(prefab, params, colors, finish, size));

/** Fill an <img> with a thumbnail when ready. */
export function loadInto(img, prefab, params, colors, finish, size = 176) {
  const hit = cachedThumb(prefab, params, colors, finish, size);
  if (hit) { img.src = hit; img.classList.add('ready'); return; }
  thumb(prefab, params, colors, finish, size).then((u) => { if (u) { img.src = u; img.classList.add('ready'); } });
}

/** Render a whole scene document (offscreen) to a data URL. */
export function sceneThumb(root, size = 320) {
  const clone = root.clone(true);
  return renderObject(clone, size, { ground: false });
}
