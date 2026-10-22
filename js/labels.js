import * as THREE from "three";

const _projected = new THREE.Vector3();
const _toAnchor = new THREE.Vector3();
const _cameraDirection = new THREE.Vector3();
const _origin = new THREE.Vector3();

function projectAnchor(anchor, camera, width, height) {
  _projected.copy(anchor).project(camera);
  camera.getWorldDirection(_cameraDirection);
  _toAnchor.copy(anchor).sub(camera.position);
  const inFront = _toAnchor.dot(_cameraDirection) > 0.02;
  return {
    x: (_projected.x * 0.5 + 0.5) * width,
    y: (-_projected.y * 0.5 + 0.5) * height,
    inFront,
    ndcZ: _projected.z,
  };
}

function rayHitsSphere(origin, direction, distance, center, radius) {
  const ox = origin.x;
  const oy = origin.y;
  const oz = origin.z;
  const lx = center.x - ox;
  const ly = center.y - oy;
  const lz = center.z - oz;
  const tca = lx * direction.x + ly * direction.y + lz * direction.z;
  if (tca <= 0) return false;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const limit = radius * radius;
  if (d2 > limit) return false;
  const thc = Math.sqrt(Math.max(0, limit - d2));
  const hit = tca - thc;
  return hit > radius * 0.15 && hit < distance - radius * 0.2;
}

function occluded(structure, structures, camera) {
  _origin.copy(camera.position);
  _toAnchor.copy(structure.worldAnchor).sub(_origin);
  const distance = _toAnchor.length();
  if (distance < 1e-4) return false;
  _toAnchor.multiplyScalar(1 / distance);
  for (const other of structures) {
    if (other === structure || !other.object.visible) continue;
    const coreRadius = other.worldRadius * 0.42;
    if (rayHitsSphere(_origin, _toAnchor, distance, other.worldAnchor, coreRadius)) return true;
  }
  return false;
}

const GUIDE_GAP = 36;

function overlaps(a, b, gap = 6) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function resolveOverlaps(items) {
  for (let pass = 0; pass < 12; pass += 1) {
    let moved = false;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        if (!overlaps(items[i], items[j])) continue;
        const lower = items[i].score >= items[j].score ? items[j] : items[i];
        const upper = lower === items[i] ? items[j] : items[i];
        const nextY = upper.y + upper.h + 6;
        if (lower.y < nextY) {
          lower.y = nextY;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function placeNear(point, viewWidth, viewHeight, labelW, labelH, insets) {
  const dx = point.x - viewWidth / 2;
  const dy = point.y - viewHeight / 2;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const push = 18 + Math.min(labelW, 140) * 0.2;
  let x = point.x + ux * push - (ux > 0 ? 0 : labelW);
  let y = point.y + uy * (push * 0.35) - labelH / 2;
  x = Math.min(Math.max(x, insets.left), viewWidth - insets.right - labelW);
  y = Math.min(Math.max(y, insets.top), viewHeight - insets.bottom - labelH);
  return { x, y };
}

function distanceToRect(px, py, box) {
  const x = Math.max(box.x, Math.min(px, box.x + box.w));
  const y = Math.max(box.y, Math.min(py, box.y + box.h));
  return Math.hypot(px - x, py - y);
}

function edgeToward(box, target) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = Math.min((box.w / 2) / Math.abs(dx || 0.0001), (box.h / 2) / Math.abs(dy || 0.0001));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function createLabels({ layer, svg, camera, canvas, anatomy, getContent, onSelect, getInsets, isCompact }) {
  const buttons = new Map();
  const lines = new Map();
  const sizes = new Map();
  const positions = new Map();
  let visible = true;
  let snapshot = [];
  const namespace = "http://www.w3.org/2000/svg";

  function ensure(structure) {
    let button = buttons.get(structure.id);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "structure-label";
      button.dataset.id = structure.id;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(structure.id, "label");
      });
      layer.appendChild(button);
      buttons.set(structure.id, button);

      const line = document.createElementNS(namespace, "line");
      line.setAttribute("class", "leader");
      svg.appendChild(line);
      lines.set(structure.id, line);
    }
    return button;
  }

  function hideAll() {
    for (const button of buttons.values()) button.hidden = true;
    for (const line of lines.values()) line.setAttribute("visibility", "hidden");
  }

  return {
    setVisible(next) {
      visible = next;
      if (!visible) {
        hideAll();
        positions.clear();
      }
    },
    isVisible() {
      return visible;
    },
    isShown(id) {
      const button = buttons.get(id);
      return Boolean(button && !button.hidden);
    },
    visibleEntries() {
      return snapshot.map((entry) => ({ ...entry }));
    },
    refreshText() {
      for (const structure of anatomy.structures) {
        const button = buttons.get(structure.id);
        if (!button) continue;
        const content = getContent(structure);
        button.textContent = content.name;
        button.classList.toggle("is-pending", content.pending);
      }
    },
    update(selectedId, hoveredId = null, anchored = false) {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));

      if (!anchored) {
        hideAll();
        snapshot = [];
        return;
      }

      const insets = getInsets();
      const compact = isCompact();
      const scored = [];

      for (const structure of anatomy.structures) {
        const content = getContent(structure);
        const button = ensure(structure);
        if (button.textContent !== content.name) button.textContent = content.name;
        button.classList.toggle("is-pending", content.pending);
        const showable = structure.object.visible && content.labelEnabled;
        if (!showable) {
          button.hidden = true;
          lines.get(structure.id).setAttribute("visibility", "hidden");
          continue;
        }
        const point = projectAnchor(structure.worldAnchor, camera, width, height);
        if (!point.inFront) {
          button.hidden = true;
          lines.get(structure.id).setAttribute("visibility", "hidden");
          continue;
        }
        const hiddenBehind = structure.id !== hoveredId && occluded(structure, anatomy.structures, camera);
        const distance = camera.position.distanceTo(structure.worldAnchor);
        const offsetLength = Math.hypot(structure.restOffset.x, structure.restOffset.y, structure.restOffset.z);
        _toAnchor.copy(camera.position).sub(structure.worldAnchor);
        const facing = offsetLength > 1e-6
          ? _toAnchor.dot(structure.restOffset) / (offsetLength * Math.max(distance, 1e-4))
          : 0;
        const score = (structure.id === selectedId ? 120 : 0) + (structure.id === hoveredId ? 80 : 0) + facing * 4 - distance * 0.15;
        scored.push({ structure, point, score, hiddenBehind, content });
      }

      scored.sort((a, b) => b.score - a.score);
      const chosen = [];
      for (const item of scored) {
        const offscreen = item.point.x < 0 || item.point.x > width || item.point.y < 0 || item.point.y > height;
        if (item.hiddenBehind || offscreen) continue;
        chosen.push(item);
      }

      const chosenIds = new Set(chosen.map((item) => item.structure.id));
      for (const structure of anatomy.structures) {
        if (chosenIds.has(structure.id)) continue;
        const button = buttons.get(structure.id);
        const line = lines.get(structure.id);
        if (button) button.hidden = true;
        if (line) line.setAttribute("visibility", "hidden");
      }

      const placed = [];
      for (const item of chosen) {
        const button = buttons.get(item.structure.id);
        button.hidden = false;
        button.classList.toggle("is-selected", item.structure.id === selectedId);
        button.style.width = "max-content";
        const known = sizes.get(item.structure.id);
        let labelW;
        let labelH;
        if (known && known.text === button.textContent && known.w > 0) {
          labelW = known.w;
          labelH = known.h;
        } else {
          labelW = Math.max(button.offsetWidth, button.scrollWidth, 48);
          labelH = Math.max(button.offsetHeight, 28);
          sizes.set(item.structure.id, { w: labelW, h: labelH, text: button.textContent });
        }
        const spot = placeNear(item.point, width, height, labelW, labelH, insets);
        const maxY = height - insets.bottom - labelH;
        const x = Math.min(Math.max(spot.x, insets.left), Math.max(insets.left, width - insets.right - labelW));
        const y = Math.min(Math.max(spot.y, insets.top), Math.max(insets.top, maxY));
        const gap = distanceToRect(item.point.x, item.point.y, { x, y, w: labelW, h: labelH });
        placed.push({
          ...item,
          x,
          y,
          w: labelW,
          h: labelH,
          gap,
        });
      }
      const kept = [];
      const ordered = [...placed].sort((a, b) => a.gap - b.gap || b.score - a.score);
      for (const entry of ordered) {
        if (kept.some((other) => overlaps(entry, other))) continue;
        kept.push(entry);
      }
      for (const structure of chosen) {
        if (kept.some((entry) => entry.structure.id === structure.structure.id)) continue;
        const button = buttons.get(structure.structure.id);
        const line = lines.get(structure.structure.id);
        if (button) button.hidden = true;
        if (line) line.setAttribute("visibility", "hidden");
      }

      for (const entry of kept) {
        const previous = positions.get(entry.structure.id);
        if (previous && Math.hypot(previous.x - entry.x, previous.y - entry.y) < 48) {
          entry.x = previous.x + (entry.x - previous.x) * 0.35;
          entry.y = previous.y + (entry.y - previous.y) * 0.35;
        }
        positions.set(entry.structure.id, { x: entry.x, y: entry.y });
        const button = buttons.get(entry.structure.id);
        const line = lines.get(entry.structure.id);
        const selected = entry.structure.id === selectedId;
        const hovered = entry.structure.id === hoveredId;
        button.classList.toggle("is-selected", selected);
        button.classList.toggle("is-hovered", hovered && !selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.style.transform = "none";
        button.style.width = "max-content";
        button.style.left = `${entry.x}px`;
        button.style.top = `${entry.y}px`;
        const box = { x: entry.x, y: entry.y, w: entry.w, h: entry.h };
        const gap = distanceToRect(entry.point.x, entry.point.y, box);
        if (gap > GUIDE_GAP) {
          const edge = edgeToward(box, entry.point);
          line.setAttribute("visibility", "visible");
          line.setAttribute("x1", edge.x.toFixed(1));
          line.setAttribute("y1", edge.y.toFixed(1));
          line.setAttribute("x2", entry.point.x.toFixed(1));
          line.setAttribute("y2", entry.point.y.toFixed(1));
          line.classList.toggle("is-selected", selected || hovered);
        } else {
          line.setAttribute("visibility", "hidden");
          line.classList.remove("is-selected");
        }
      }
      snapshot = kept.map((entry) => ({
        text: getContent(entry.structure).name,
        x: entry.x,
        y: entry.y,
        w: entry.w,
        h: entry.h,
        selected: entry.structure.id === selectedId,
      }));
    },
    destroy() {
      for (const button of buttons.values()) button.remove();
      for (const line of lines.values()) line.remove();
      buttons.clear();
      lines.clear();
    },
  };
}
