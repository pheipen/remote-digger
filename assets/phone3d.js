// Hero iPhone 17 Pro: GLB model ("iPhone 17 Pro" by Ranguel, CC BY, sketchfab.com) with the Remote Digger remote on its display.
// The page scrolls normally; while the phone passes through the window it turns three quarters around its vertical axis.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("phone3d");
const stage = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-2, 3, 4);
scene.add(key);

const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 100);
const pivot = new THREE.Group();
scene.add(pivot);

let model = null;
new GLTFLoader().load(new URL("3d/iphone-17-pro.glb", import.meta.url).href, (gltf) => {
  model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const fix = (m) => {
      if (m.name === "OLED") {   // the display is just the picture: no light, no reflection, no tone mapping, exact page colours
        const map = m.emissiveMap || m.map;
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return new THREE.MeshBasicMaterial({ map, toneMapped: false, side: m.side });
      }
      if (m.name === "Glass") { m.opacity = 0; m.depthWrite = false; }   // was 78 % black (and reflective) over the display
      if (m.name === "Anodized aluminum") m.color.setScalar(0.78);    // silver instead of dark grey
      return m;
    };
    o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
  });
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.scale.setScalar(1 / size.y);   // 1 unit tall
  resize();
});

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(0, 0, 0.62 / Math.tan((camera.fov * Math.PI) / 360));   // phone fills ~80 % of the height
  camera.updateProjectionMatrix();
  draw();
}

function draw() {
  if (model) {
    const r = stage.getBoundingClientRect();
    const centre = r.top + scrollY + r.height / 2 - innerHeight / 2;   // scrollY at which the phone is centred
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let deg;
    if (centre > innerHeight * 0.5) {   // phone: starts below the fold; back first, display when centred, then a little further
      deg = scrollY <= centre ? (180 * scrollY) / centre : Math.min(270, 180 + (90 * (scrollY - centre)) / innerHeight);
    } else {                             // desktop: in view on load; display first, then three quarters until the hero is gone
      deg = 180 + 270 * Math.min(1, scrollY / Math.max(1, r.bottom + scrollY));
    }
    if (reduce) deg = 180;
    pivot.rotation.y = (deg * Math.PI) / 180;   // 0° = back, 180° = display; three quarters of a turn in all
    const t = Math.min(1, deg / 450);
    pivot.rotation.x = 0.12 - 0.1 * t;
    pivot.rotation.z = 0.05 - 0.08 * t;
    const fixed = new URLSearchParams(location.search).get("angle");   // preview: ?angle=<degrees>
    if (fixed !== null) pivot.rotation.set(0.08, (+fixed * Math.PI) / 180, 0);
  }
  renderer.render(scene, camera);
}

let queued = false;
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(); }); } };
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", resize);
resize();
