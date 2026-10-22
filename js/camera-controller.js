import * as THREE from "three";

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();
const _sphere = new THREE.Sphere();
const _direction = new THREE.Vector3();
const _endPosition = new THREE.Vector3();
const _endTarget = new THREE.Vector3();
const _startPosition = new THREE.Vector3();
const _startTarget = new THREE.Vector3();

function fitDistance(radius, camera) {
  const fovV = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(0.4, camera.aspect || 1);
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
  const distanceV = radius / Math.sin(fovV / 2);
  const distanceH = radius / Math.sin(fovH / 2);
  return Math.max(distanceV, distanceH);
}

export function createCameraController({ camera, controls, animator, getHome, setHome }) {
  function animateTo(position, target, duration = 900) {
    _startPosition.copy(camera.position);
    _startTarget.copy(controls.target);
    _endPosition.copy(position);
    _endTarget.copy(target);
    return new Promise((resolve) => {
      animator.to(
        "camera",
        0,
        1,
        duration,
        (value) => {
          camera.position.lerpVectors(_startPosition, _endPosition, value);
          controls.target.lerpVectors(_startTarget, _endTarget, value);
        },
        resolve,
      );
    });
  }

  function frameBox(box, { distanceFactor = 1, direction = null, lift = 0, duration = 900, storeHome = false } = {}) {
    if (!box || box.isEmpty()) return Promise.resolve();
    box.getCenter(_center);
    box.getSize(_size);
    box.getBoundingSphere(_sphere);
    const radius = Math.max(_sphere.radius, Math.max(_size.x, _size.y, _size.z) * 0.15, 0.03);
    let distance = fitDistance(radius, camera) * 1.28 * distanceFactor;
    distance = Math.max(distance, radius * 1.35);

    if (direction && direction.lengthSq() > 1e-6) {
      _direction.copy(direction).normalize();
    } else {
      _direction.copy(camera.position).sub(controls.target);
      if (_direction.lengthSq() < 1e-6) _direction.set(0.55, 0.32, 1);
      _direction.normalize();
    }

    _endTarget.copy(_center);
    if (lift) _endTarget.y -= radius * lift;
    _endPosition.copy(_endTarget).addScaledVector(_direction, distance);

    if (storeHome) setHome(_endPosition, _endTarget);
    return animateTo(_endPosition, _endTarget, duration);
  }

  return {
    frameObject(object, options) {
      _box.setFromObject(object);
      return frameBox(_box, options);
    },
    frameStructures(structures, options) {
      _box.makeEmpty();
      for (const structure of structures) {
        if (!structure.object.visible) continue;
        _box.expandByObject(structure.object);
      }
      return frameBox(_box, options);
    },
    focusStructure(structure, { distanceFactor = 1, lift = 0, duration = 850 } = {}) {
      _box.makeEmpty();
      for (const mesh of structure.meshes) {
        if (mesh.geometry) _box.expandByObject(mesh);
      }
      return frameBox(_box, { distanceFactor, lift, duration });
    },
    goHome(duration = 900) {
      const home = getHome();
      return animateTo(home.position, home.target, duration);
    },
    cancel() {
      animator.cancel("camera");
    },
  };
}
