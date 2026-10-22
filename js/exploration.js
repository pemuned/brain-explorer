import * as THREE from "three";
import { isRightName } from "./anatomy-manager.js";

const EXPLORE_VIEW = new THREE.Vector3(-0.86, 0.34, 0.46);

export function createExploration({ anatomy, content, camera, animator, onSeparation, onPaint }) {
  let active = false;
  let transition = null;

  function shouldSuppress(structure) {
    const info = content.resolve(structure);
    return isRightName(structure.nodeName) || isRightName(structure.id) || info.visibleInExplore === false;
  }

  function visibleStructures() {
    return anatomy.structures.filter((structure) => structure.object.visible);
  }

  function animateExplosion(target) {
    return new Promise((resolve) => {
      animator.to(
        "explosion",
        anatomy.explosion,
        target,
        800,
        (value) => {
          anatomy.setExplosion(value);
          onSeparation(Math.round(value * 100));
        },
        () => resolve(),
      );
    });
  }

  async function enter() {
    if (active) return true;
    if (transition) return transition;
    transition = enterNow().finally(() => {
      transition = null;
    });
    return transition;
  }

  async function enterNow() {
    const keep = anatomy.structures.filter((structure) => structure.originalVisible !== false && !shouldSuppress(structure));
    if (!keep.length) {
      console.warn("[brain-explorer] El filtro de exploración ocultaría todas las estructuras.");
      return false;
    }
    const hidden = anatomy.structures.filter(shouldSuppress);
    if (!hidden.length) {
      console.info("[brain-explorer] El modelo no tiene estructuras cuyo nombre contenga «right».");
    }
    active = true;
    anatomy.setColorsApplied(true);
    anatomy.setExplore(true, shouldSuppress);
    onPaint();
    await Promise.all([
      animateExplosion(1),
      camera.frameStructures(keep, {
        direction: EXPLORE_VIEW,
        distanceFactor: 1.38,
        duration: 950,
      }),
    ]);
    return true;
  }

  async function exit() {
    if (transition) await transition;
    active = false;
    await animateExplosion(0);
    anatomy.setExplore(false, shouldSuppress);
    anatomy.setColorsApplied(false);
    onPaint();
  }

  return {
    isActive: () => active,
    shouldSuppress,
    viewDirection: EXPLORE_VIEW,
    visibleStructures,
    enter,
    exit,
    setSeparation(percent) {
      animator.cancel("explosion");
      anatomy.setExplosion(percent / 100);
    },
  };
}
