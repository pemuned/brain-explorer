import * as THREE from "three";

export function createInteractions({ dom, camera, anatomy, chip, getContent, namesEnabled, labelShown, onSelect, onHover }) {
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickMeshes = [];
  let enabled = true;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let hoverFrame = 0;
  let lastMove = null;

  function pick(event) {
    const rect = dom.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    pickMeshes.length = 0;
    for (const structure of anatomy.structures) {
      if (!structure.object.visible) continue;
      pickMeshes.push(...structure.meshes);
    }
    const hits = raycaster.intersectObjects(pickMeshes, false);
    if (!hits.length) return null;
    return anatomy.structureFromMesh(hits[0].object);
  }

  function hideChip() {
    if (chip) chip.hidden = true;
  }

  function showChip(event, text, id) {
    if (!chip || !namesEnabled() || labelShown?.(id)) {
      hideChip();
      return;
    }
    chip.textContent = text;
    chip.hidden = false;
    const rect = dom.getBoundingClientRect();
    const width = chip.offsetWidth || 120;
    const height = chip.offsetHeight || 32;
    let x = event.clientX - rect.left + 16;
    let y = event.clientY - rect.top + 18;
    if (x + width > rect.width - 8) x = event.clientX - rect.left - width - 14;
    if (y + height > rect.height - 8) y = event.clientY - rect.top - height - 12;
    chip.style.left = `${Math.max(8, x)}px`;
    chip.style.top = `${Math.max(8, y)}px`;
  }

  function hoverAt(event) {
    if (!enabled || !event || event.pointerType === "touch") {
      hideChip();
      onHover(null);
      return;
    }
    const dragging = tracking && Math.hypot(event.clientX - startX, event.clientY - startY) > 7;
    if (dragging) {
      hideChip();
      onHover(null);
      return;
    }
    const structure = pick(event);
    onHover(structure?.id ?? null);
    if (!structure) {
      hideChip();
      return;
    }
    showChip(event, getContent(structure).name, structure.id);
  }

  function onPointerDown(event) {
    if (!enabled || event.button > 0) return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  }

  function onPointerUp(event) {
    if (!enabled || !tracking) return;
    tracking = false;
    const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (moved > 7) return;
    const structure = pick(event);
    if (structure) onSelect(structure.id, "model");
  }

  function onPointerMove(event) {
    lastMove = event;
    if (hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      hoverAt(lastMove);
    });
  }

  function onPointerLeave() {
    lastMove = null;
    hideChip();
    onHover(null);
  }

  function onPointerCancel() {
    tracking = false;
    onPointerLeave();
  }

  dom.addEventListener("pointerdown", onPointerDown);
  dom.addEventListener("pointerup", onPointerUp);
  dom.addEventListener("pointermove", onPointerMove);
  dom.addEventListener("pointerleave", onPointerLeave);
  dom.addEventListener("pointercancel", onPointerCancel);

  return {
    setEnabled(value) {
      enabled = value;
      if (!value) onPointerLeave();
    },
    hideChip,
    dispose() {
      cancelAnimationFrame(hoverFrame);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerleave", onPointerLeave);
      dom.removeEventListener("pointercancel", onPointerCancel);
    },
  };
}
