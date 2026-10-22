import * as THREE from "three";
import { isGenericName } from "./content-manager.js";

const EXPLOSION_SPREAD = 1.05;
const DEEP_SEPARATION = 2.6;
const BRAIN_TONES = {
  cortex: ["#d7a08c", "#c9927e", "#e0b09a", "#cc9a86"],
  white: ["#ddc0ab", "#d4b49d", "#e4c8b6"],
  ventricle: ["#efd4c8", "#e8c8bb", "#f2ddd4"],
  cerebellum: ["#c99686", "#d0a090", "#c08978"],
  brainstem: ["#c9a08e", "#be9482", "#d0aa98"],
  limbic: ["#c98980", "#d1968a", "#bc7d74"],
  diencephalon: ["#c58b7c", "#ba8172", "#ce9788"],
  gland: ["#c9a07a", "#d0ab86"],
};

function hashName(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function tissueTone(name) {
  const label = String(name || "")
    .toLowerCase()
    .replace(/_/g, " ");
  let family = BRAIN_TONES.cortex;
  if (label.includes("ventricle") || label.includes("aqueduct"))
    family = BRAIN_TONES.ventricle;
  else if (label.includes("capsule")) family = BRAIN_TONES.white;
  else if (label.includes("cerebellum")) family = BRAIN_TONES.cerebellum;
  else if (
    label.includes("pons") ||
    label.includes("medulla") ||
    label.includes("midbrain")
  )
    family = BRAIN_TONES.brainstem;
  else if (label.includes("hippocampus") || label.includes("insula"))
    family = BRAIN_TONES.limbic;
  else if (
    label.includes("thalamus") ||
    label.includes("hypothalamus") ||
    label.includes("diencephalon")
  )
    family = BRAIN_TONES.diencephalon;
  else if (label.includes("pineal") || label.includes("habenula"))
    family = BRAIN_TONES.gland;
  return family[hashName(name) % family.length];
}

function randomFrom(seed) {
  let value = seed % 2147483647 || 1;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function drawSoftSpot(context, rand, size, light = false) {
  const x = rand() * size;
  const y = rand() * size;
  const radius = 18 + rand() * 58;
  const alpha = (light ? 0.035 : 0.055) + rand() * (light ? 0.045 : 0.095);
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(
    0,
    light
      ? `rgba(255, 226, 210, ${alpha})`
      : `rgba(132, 34, 38, ${alpha})`,
  );
  gradient.addColorStop(
    0.55,
    light
      ? `rgba(246, 198, 184, ${alpha * 0.45})`
      : `rgba(151, 42, 43, ${alpha * 0.5})`,
  );
  gradient.addColorStop(1, "rgba(120, 28, 32, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawVeinBranch(context, rand, x, y, angle, length, width, depth = 0) {
  const points = [{ x, y }];
  const steps = Math.max(4, Math.round(length / 11));
  let direction = angle;
  let currentX = x;
  let currentY = y;
  for (let step = 0; step < steps; step += 1) {
    direction += (rand() - 0.5) * 0.42;
    const stride = length / steps;
    currentX += Math.cos(direction) * stride;
    currentY += Math.sin(direction) * stride;
    points.push({ x: currentX, y: currentY });
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.strokeStyle = `rgba(112, 24, 30, ${0.16 + rand() * 0.13})`;
  context.lineWidth = width;
  context.stroke();

  if (depth >= 2 || points.length < 5) return;
  const branches = depth === 0 ? 2 : 1;
  for (let branch = 0; branch < branches; branch += 1) {
    const point = points[2 + Math.floor(rand() * (points.length - 3))];
    const side = rand() > 0.5 ? 1 : -1;
    drawVeinBranch(
      context,
      rand,
      point.x,
      point.y,
      direction + side * (0.48 + rand() * 0.48),
      length * (0.36 + rand() * 0.18),
      Math.max(0.32, width * 0.55),
      depth + 1,
    );
  }
}

function createTissueTexture(seed) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const rand = randomFrom(seed);
  context.fillStyle = "#e8b9aa";
  context.fillRect(0, 0, size, size);
  const image = context.getImageData(0, 0, size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const grain = (rand() - 0.5) * 19;
    const warmth = (rand() - 0.5) * 10;
    image.data[index] = Math.max(
      0,
      Math.min(255, image.data[index] + grain + warmth * 1.35),
    );
    image.data[index + 1] = Math.max(
      0,
      Math.min(255, image.data[index + 1] + grain * 0.68 - Math.abs(warmth) * 0.2),
    );
    image.data[index + 2] = Math.max(
      0,
      Math.min(255, image.data[index + 2] + grain * 0.48 - warmth * 0.15),
    );
  }
  context.putImageData(image, 0, 0);

  context.globalCompositeOperation = "multiply";
  for (let spot = 0; spot < 74; spot += 1) {
    drawSoftSpot(context, rand, size, false);
  }
  context.globalCompositeOperation = "screen";
  for (let spot = 0; spot < 28; spot += 1) {
    drawSoftSpot(context, rand, size, true);
  }
  context.globalCompositeOperation = "source-over";
  context.lineCap = "round";
  context.lineJoin = "round";
  for (let vein = 0; vein < 18; vein += 1) {
    drawVeinBranch(
      context,
      rand,
      rand() * size,
      rand() * size,
      rand() * Math.PI * 2,
      58 + rand() * 100,
      0.7 + rand() * 1.15,
    );
  }
  for (let capillary = 0; capillary < 34; capillary += 1) {
    drawVeinBranch(
      context,
      rand,
      rand() * size,
      rand() * size,
      rand() * Math.PI * 2,
      18 + rand() * 42,
      0.28 + rand() * 0.38,
      2,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ensureUv(geometry) {
  if (geometry.getAttribute("uv")) return;
  const position = geometry.getAttribute("position");
  if (!position) return;
  geometry.computeBoundingBox();
  const min = geometry.boundingBox.min;
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const uv = new Float32Array(position.count * 2);
  for (let index = 0; index < position.count; index += 1) {
    uv[index * 2] = size.x ? (position.getX(index) - min.x) / size.x : 0;
    uv[index * 2 + 1] = size.y ? (position.getY(index) - min.y) / size.y : 0;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function explosionScaleFor(name) {
  const label = String(name || "")
    .toLowerCase()
    .replace(/_/g, " ");
  if (
    label.includes("hypothalamus") ||
    label.includes("third ventricle") ||
    label.includes("cerebral aqueduct")
  ) {
    return DEEP_SEPARATION;
  }
  return 1;
}

function posteriorBiasFor(name) {
  const label = String(name || "")
    .toLowerCase()
    .replace(/_/g, " ");
  return label.includes("cerebral aqueduct") ? 0.34 : 0;
}

function subtreeHasMesh(object) {
  let found = false;
  object.traverse((child) => {
    if (child.isMesh) found = true;
  });
  return found;
}

function hasNamedAnatomicalDescendant(object) {
  let found = false;
  object.traverse((child) => {
    if (child === object || found) return;
    if (!isGenericName(child.name) && subtreeHasMesh(child)) found = true;
  });
  return found;
}

function nodePath(object, root) {
  const parts = [];
  let current = object;
  while (current && current !== root) {
    parts.unshift(current.name?.trim() || "node");
    current = current.parent;
  }
  return parts.join("/");
}

export function isRightName(name) {
  return typeof name === "string" && name.toLowerCase().includes("right");
}

function paletteColor(index) {
  const hue = (index * 137.508) % 360;
  const saturation = 46 + (index % 3) * 7;
  const lightness = 62 - (index % 2) * 6;
  const color = new THREE.Color();
  color.setHSL(hue / 360, saturation / 100, lightness / 100);
  return `#${color.getHexString()}`;
}

function collectMeshes(object) {
  const meshes = [];
  object.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes;
}

export function createAnatomyManager(root) {
  const candidates = [];
  root.traverse((object) => {
    if (object === root) return;
    if (isGenericName(object.name)) return;
    if (!subtreeHasMesh(object)) return;
    if (hasNamedAnatomicalDescendant(object)) return;
    candidates.push(object);
  });

  const unnamedMeshes = [];
  root.traverse((object) => {
    if (!object.isMesh) return;
    const covered = candidates.some(
      (candidate) => candidate === object || candidate.getObjectById(object.id),
    );
    if (!covered) unnamedMeshes.push(object);
  });

  const nameCounts = new Map();
  for (const object of candidates) {
    nameCounts.set(object.name, (nameCounts.get(object.name) || 0) + 1);
  }

  const structures = [];
  const byId = new Map();
  const meshToStructure = new Map();
  const sharedVeinTexture = createTissueTexture(hashName("brain-tissue"));

  function register(object, nodeName, fallbackId) {
    const path = nodePath(object, root);
    const unique = Boolean(nodeName) && nameCounts.get(nodeName) === 1;
    const id = unique
      ? nodeName
      : fallbackId || path || `structure-${structures.length + 1}`;
    if (nodeName && !unique) {
      console.warn(
        `[brain-explorer] Nombre duplicado "${nodeName}". Identificador interno: ${id}`,
      );
    }
    const meshes = collectMeshes(object);
    if (!meshes.length) return;

    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    const worldCenter = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const localCenter = object.worldToLocal(worldCenter.clone());
    const worldScale = object.getWorldScale(new THREE.Vector3());
    const maxScale = Math.max(worldScale.x, worldScale.y, worldScale.z) || 1;

    const tissue = tissueTone(nodeName || id);
    for (const mesh of meshes) {
      const source = mesh.material;
      mesh.userData.originalMaterial = source;
      mesh.userData.structureId = id;
      if (source) {
        const runtime = new THREE.MeshPhysicalMaterial({
          color: source.color?.clone?.() ?? new THREE.Color(tissue),
          map: source.map ?? null,
          roughness: 0.28,
          metalness: 0.02,
          clearcoat: 0.58,
          clearcoatRoughness: 0.22,
          sheen: 0.18,
          sheenColor: new THREE.Color("#e8b8aa"),
          side: source.side ?? THREE.FrontSide,
        });
        mesh.userData.runtimeMaterial = runtime;
        mesh.material = runtime;
      }
      if (mesh.geometry) ensureUv(mesh.geometry);
      const outline = new THREE.Mesh(
        mesh.geometry,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.BackSide,
          depthWrite: false,
          transparent: true,
          opacity: 0.95,
        }),
      );
      outline.name = "selection-outline";
      outline.scale.setScalar(1.018);
      outline.visible = false;
      outline.renderOrder = 2;
      mesh.add(outline);
      mesh.userData.outline = outline;
      const veins = sharedVeinTexture.clone();
      const shift = (hashName(`${id}-${mesh.uuid}`) % 100) / 80;
      veins.offset.set(shift * 0.4, 1 - shift * 0.35);
      veins.repeat.set(1.2 + (shift % 0.4), 1.2 + ((1 - shift) % 0.4));
      mesh.userData.veinTexture = veins;
    }

    const structure = {
      id,
      nodeName: nodeName || "",
      path,
      nameUnique: unique,
      object,
      meshes,
      localCenter,
      localRadius: sphere.radius / maxScale,
      restLocalPosition: object.position.clone(),
      restWorldPosition: object.getWorldPosition(new THREE.Vector3()),
      restCenter: localCenter.clone().applyMatrix4(object.matrixWorld),
      restOffset: new THREE.Vector3(),
      explosionScale: explosionScaleFor(nodeName || id),
      posteriorBias: posteriorBiasFor(nodeName || id),
      tissueColor: new THREE.Color(tissue),
      worldAnchor: new THREE.Vector3(),
      worldRadius: sphere.radius,
      originalVisible: object.visible,
      forceVisible: false,
      suppressed: false,
      sessionColor: null,
      paletteIndex: structures.length,
      baseColor: new THREE.Color(),
    };
    structures.push(structure);
    byId.set(id, structure);
    for (const mesh of meshes) meshToStructure.set(mesh.uuid, structure);
  }

  candidates.forEach((object) => register(object, object.name.trim(), ""));
  unnamedMeshes.forEach((mesh, index) => {
    console.warn(
      "[brain-explorer] Malla sin unidad anatómica con nombre.",
      mesh.name || mesh.uuid,
    );
    register(mesh, "", `unnamed-${index + 1}`);
  });

  const centroid = new THREE.Vector3();
  if (structures.length) {
    for (const structure of structures) centroid.add(structure.restCenter);
    centroid.multiplyScalar(1 / structures.length);
    for (const structure of structures) {
      structure.restOffset.copy(structure.restCenter).sub(centroid);
    }
  }

  const ordered = [...structures].sort((a, b) => {
    const angleA = Math.atan2(a.restOffset.z, a.restOffset.x);
    const angleB = Math.atan2(b.restOffset.z, b.restOffset.x);
    return angleA - angleB;
  });
  ordered.forEach((structure, index) => {
    structure.paletteIndex = index;
  });

  let explosion = 0;
  let explore = false;
  let colorsApplied = false;
  let highlightedId = null;
  let hoveredId = null;
  let isolatedId = null;
  let ghost = 1;
  let strongContrast = false;
  let suppressTest = () => false;
  const modelRadius =
    new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere())
      .radius || 1;
  const tempWorld = new THREE.Vector3();
  const tempScale = new THREE.Vector3();
  const tempColor = new THREE.Color();

  function runtimeMaterial(mesh) {
    if (mesh.userData.runtimeMaterial) return mesh.userData.runtimeMaterial;
    const source = mesh.userData.originalMaterial ?? mesh.material;
    const runtime = source?.clone?.() ?? mesh.material;
    mesh.userData.runtimeMaterial = runtime;
    mesh.material = runtime;
    return runtime;
  }

  function colorFor(structure, preferred) {
    if (!structure.sessionColor) {
      structure.sessionColor =
        preferred || paletteColor(structure.paletteIndex);
    }
    return structure.sessionColor;
  }

  function paint(structure, role, preferredColor) {
    const useColor = colorsApplied ? colorFor(structure, preferredColor) : null;
    const dimFactor =
      role === "dim"
        ? strongContrast
          ? 0.18
          : 0.38
        : role === "soft"
          ? 0.72
          : 1;
    if (useColor) structure.baseColor.set(useColor);
    else structure.baseColor.copy(structure.tissueColor);
    for (const mesh of structure.meshes) {
      const material = runtimeMaterial(mesh);
      if (!material) continue;
      tempColor.copy(structure.baseColor);
      if (role === "selected") tempColor.offsetHSL(0, 0.22, 0.08);
      else if (dimFactor !== 1) tempColor.multiplyScalar(dimFactor);
      material.color.copy(tempColor);
      const hadSheen = material.sheen > 0;
      if (colorsApplied) {
        material.roughness = role === "selected" ? 0.28 : 0.46;
        material.metalness = 0.04;
        material.clearcoat = role === "selected" ? 0.45 : 0.12;
        material.clearcoatRoughness = 0.35;
        material.sheen = 0;
      } else {
        material.roughness = role === "selected" ? 0.16 : 0.24;
        material.metalness = 0.03;
        material.clearcoat = role === "selected" ? 0.82 : 0.62;
        material.clearcoatRoughness = role === "selected" ? 0.12 : 0.2;
        material.sheen = 0.22;
      }
      if (material.emissive) {
        if (role === "selected") {
          material.emissive.copy(tempColor);
          material.emissiveIntensity = strongContrast ? 0.62 : 0.48;
        } else if (role === "hovered") {
          material.emissive.copy(structure.baseColor);
          material.emissiveIntensity = 0.28;
        } else {
          material.emissive.set("#000000");
          material.emissiveIntensity = 0;
        }
      }
      const fade =
        ghost < 0.999 &&
        !isolatedId &&
        highlightedId &&
        structure.id !== highlightedId;
      const nextMap = colorsApplied
        ? null
        : mesh.userData.veinTexture ?? sharedVeinTexture;
      const nextBumpMap = colorsApplied ? null : nextMap;
      const nextTransparent = Boolean(fade);
      const shaderConfigChanged =
        material.map !== nextMap ||
        material.bumpMap !== nextBumpMap ||
        material.transparent !== nextTransparent ||
        hadSheen !== (material.sheen > 0);
      material.map = nextMap;
      material.bumpMap = nextBumpMap;
      material.bumpScale = colorsApplied ? 0 : 0.008;
      if (fade) {
        material.transparent = nextTransparent;
        material.opacity = ghost;
        material.depthWrite = ghost > 0.45;
      } else {
        material.opacity = 1;
        material.transparent = nextTransparent;
        material.depthWrite = true;
      }
      const outline = mesh.userData.outline;
      if (outline) {
        outline.visible = role === "selected";
        outline.material.color.copy(tempColor).offsetHSL(0, 0.08, 0.18);
      }
      if (shaderConfigChanged) material.needsUpdate = true;
    }
  }

  function refreshAppearance(preferredColorFor) {
    for (const structure of structures) {
      let role = "normal";
      if (highlightedId && structure.id === highlightedId) role = "selected";
      else if (hoveredId && structure.id === hoveredId) role = "hovered";
      else if (highlightedId && structure.object.visible) role = "dim";
      else if (hoveredId && structure.object.visible) role = "soft";
      paint(structure, role, preferredColorFor?.(structure) ?? null);
    }
  }

  function applyVisibility() {
    for (const structure of structures) {
      const exploreHide =
        explore && !structure.forceVisible && suppressTest(structure);
      const isolateHide = Boolean(isolatedId) && structure.id !== isolatedId;
      structure.suppressed = exploreHide;
      structure.object.visible =
        exploreHide || isolateHide
          ? false
          : structure.originalVisible !== false;
    }
  }

  return {
    structures,
    byId,
    modelRadius,
    centroid,
    get explosion() {
      return explosion;
    },
    get colorsApplied() {
      return colorsApplied;
    },
    get explore() {
      return explore;
    },
    structureFromMesh(mesh) {
      let current = mesh;
      while (current) {
        const found = meshToStructure.get(current.uuid);
        if (found) return found;
        current = current.parent;
      }
      return null;
    },
    updateAnchors() {
      for (const structure of structures) {
        structure.worldAnchor
          .copy(structure.localCenter)
          .applyMatrix4(structure.object.matrixWorld);
        structure.object.getWorldScale(tempScale);
        structure.worldRadius =
          structure.localRadius *
          Math.max(tempScale.x, tempScale.y, tempScale.z);
      }
    },
    setExplosion(amount) {
      explosion = Math.min(1, Math.max(0, amount));
      if (explosion === 0) {
        for (const structure of structures) {
          structure.object.position.copy(structure.restLocalPosition);
        }
        return;
      }
      root.updateMatrixWorld(true);
      for (const structure of structures) {
        tempWorld
          .copy(structure.restWorldPosition)
          .addScaledVector(
            structure.restOffset,
            explosion * EXPLOSION_SPREAD * structure.explosionScale,
          );
        tempWorld.z -= explosion * structure.posteriorBias;
        structure.object.parent.worldToLocal(tempWorld);
        structure.object.position.copy(tempWorld);
      }
    },
    setExplore(active, shouldSuppress) {
      explore = active;
      suppressTest = shouldSuppress || (() => false);
      if (!active) {
        for (const structure of structures) structure.forceVisible = false;
      }
      applyVisibility();
    },
    reveal(structure) {
      structure.forceVisible = true;
      applyVisibility();
    },
    setColorsApplied(active) {
      colorsApplied = active;
    },
    ensureSessionColor(structure, preferred) {
      return colorFor(structure, preferred);
    },
    highlight(id) {
      highlightedId = id;
      if (isolatedId) {
        isolatedId = id;
        if (!id) isolatedId = null;
        applyVisibility();
      }
    },
    setHover(id) {
      hoveredId = id;
    },
    setIsolated(id) {
      isolatedId = id || null;
      applyVisibility();
    },
    setGhost(transparencyPercent) {
      const percent = Math.min(80, Math.max(0, transparencyPercent));
      ghost = 1 - percent / 100;
    },
    setStrongContrast(active) {
      strongContrast = Boolean(active);
    },
    refreshAppearance,
    boundingBoxOf(structure, target = new THREE.Box3()) {
      target.makeEmpty();
      for (const mesh of structure.meshes) {
        if (mesh.geometry) target.expandByObject(mesh);
      }
      return target;
    },
    dispose() {
      sharedVeinTexture.dispose();
      for (const structure of structures) {
        for (const mesh of structure.meshes) {
          mesh.userData.runtimeMaterial?.dispose?.();
          mesh.userData.outline?.material?.dispose?.();
          mesh.userData.veinTexture?.dispose?.();
        }
      }
    },
  };
}
