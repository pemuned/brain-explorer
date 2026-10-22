import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function isCompactDevice() {
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

export function createScene(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e7eef3");

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camera.position.set(2.4, 1.2, 3.2);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isCompactDevice(),
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompactDevice() ? 1.5 : 2));
  host.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight("#f5f8fb", "#c5d0d8", 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight("#fff6ee", 1.85);
  key.position.set(3.2, 5.4, 4.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight("#d5e4f2", 0.62);
  fill.position.set(-4.5, 1.6, 2.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight("#f3efe6", 0.4);
  rim.position.set(0.4, 2.2, -5);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.7;
  controls.target.set(0, 0, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.65;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.screenSpacePanning = true;

  const home = {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };

  let autoRotate = false;
  let pausedUntil = 0;
  let frameId = 0;
  let onFrame = () => {};
  let onPresent = () => {};
  let contextLost = false;
  let pendingCapture = null;

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompactDevice() ? 1.5 : 2));
    renderer.setSize(width, height, false);
  }

  function composeCapture(source, caption, labels = []) {
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const footer = caption ? Math.round(56 * ratio) : 0;
    const output = document.createElement("canvas");
    output.width = source.width;
    output.height = source.height + footer;
    const context = output.getContext("2d");
    context.drawImage(source, 0, 0);
    const cssWidth = renderer.domElement.clientWidth || source.width;
    const cssHeight = renderer.domElement.clientHeight || source.height;
    const scaleX = source.width / cssWidth;
    const scaleY = source.height / cssHeight;
    for (const label of labels) {
      const x = label.x * scaleX;
      const y = label.y * scaleY;
      const w = Math.max(label.w * scaleX, 8);
      const h = Math.max(label.h * scaleY, 8);
      const radius = h / 2;
      context.beginPath();
      if (typeof context.roundRect === "function") context.roundRect(x, y, w, h, radius);
      else context.rect(x, y, w, h);
      context.fillStyle = label.selected ? "#0e5f6b" : "rgba(255,255,255,0.94)";
      context.fill();
      context.lineWidth = 2 * scaleY;
      context.strokeStyle = label.selected ? "#ffffff" : "rgba(27,40,50,0.18)";
      context.stroke();
      context.fillStyle = label.selected ? "#ffffff" : "#1b2832";
      context.font = `600 ${Math.round((label.selected ? 15 : 13) * scaleY)}px "Google Sans Flex", sans-serif`;
      context.textBaseline = "middle";
      context.fillText(label.text, x + 10 * scaleX, y + h / 2);
    }
    if (caption) {
      context.fillStyle = "#102027";
      context.fillRect(0, source.height, output.width, footer);
      context.fillStyle = "#ffffff";
      context.font = `600 ${Math.round(18 * ratio)}px "Google Sans Flex", sans-serif`;
      context.textBaseline = "middle";
      context.fillText(caption, Math.round(16 * ratio), source.height + footer / 2);
    }
    return output.toDataURL("image/png");
  }

  function loop() {
    frameId = requestAnimationFrame(loop);
    onFrame();
    const allowSpin = autoRotate && !contextLost && performance.now() > pausedUntil;
    controls.autoRotate = allowSpin;
    controls.update();
    onPresent();
    if (contextLost) return;
    renderer.render(scene, camera);
    if (!pendingCapture) return;
    const request = pendingCapture;
    pendingCapture = null;
    request.resolve(composeCapture(renderer.domElement, request.caption, request.labels));
  }

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    host.dispatchEvent(new CustomEvent("contextlost"));
  });

  renderer.domElement.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    resize();
    host.dispatchEvent(new CustomEvent("contextrestored"));
  });

  controls.addEventListener("start", () => {
    pausedUntil = Number.POSITIVE_INFINITY;
    host.dispatchEvent(new CustomEvent("controlstart"));
  });

  controls.addEventListener("end", () => {
    pausedUntil = performance.now() + 3500;
    host.dispatchEvent(new CustomEvent("controlend"));
  });

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(host);
  resize();

  return {
    scene,
    camera,
    renderer,
    controls,
    home,
    resize,
    start(callback, present = () => {}) {
      onFrame = callback;
      onPresent = present;
      loop();
    },
    setAutoRotate(enabled) {
      autoRotate = enabled;
      if (enabled) pausedUntil = performance.now() + 400;
    },
    isAutoRotateEnabled() {
      return autoRotate;
    },
    pauseAutoRotate() {
      pausedUntil = Number.POSITIVE_INFINITY;
    },
    setHome(position, target) {
      home.position.copy(position);
      home.target.copy(target);
    },
    setDistanceLimits(min, max) {
      controls.minDistance = min;
      controls.maxDistance = max;
    },
    setBackground(color) {
      scene.background.set(color);
    },
    capture(caption = "", labels = []) {
      return new Promise((resolve) => {
        pendingCapture = { caption, labels, resolve };
      });
    },
    isContextLost() {
      return contextLost;
    },
    dispose() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
