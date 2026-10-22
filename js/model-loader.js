import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const TARGET_SIZE = 2.15;

function restoreOriginalNodeNames(gltf) {
  const nodes = gltf.parser?.json?.nodes ?? [];
  const originals = new Map();
  for (const node of nodes) {
    if (!node.name) continue;
    const sanitized = THREE.PropertyBinding.sanitizeNodeName(node.name);
    if (!originals.has(sanitized)) originals.set(sanitized, node.name);
    else if (originals.get(sanitized) !== node.name) originals.set(sanitized, null);
  }
  gltf.scene.traverse((object) => {
    const original = originals.get(object.name);
    if (original) {
      object.userData.sourceName = original;
      object.name = original;
    }
  });
}

export function loadBrainModel(url, onProgress) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        restoreOriginalNodeNames(gltf);
        const wrapper = new THREE.Group();
        wrapper.name = "brain-root";
        const model = gltf.scene;
        wrapper.add(model);

        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        if (box.isEmpty()) {
          reject(new Error("El modelo no contiene geometría visible."));
          return;
        }
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        wrapper.scale.setScalar(TARGET_SIZE / maxDim);
        wrapper.updateMatrixWorld(true);

        resolve({ wrapper, animations: gltf.animations ?? [] });
      },
      (event) => {
        if (!onProgress) return;
        if (event.total) onProgress(Math.min(1, event.loaded / event.total));
        else onProgress(null);
      },
      (error) => {
        reject(error instanceof Error ? error : new Error("No se pudo leer el archivo GLB."));
      },
    );
  });
}
