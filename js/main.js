import * as THREE from "three";
import { prefersReducedMotion, createAnimator } from "./animator.js";
import { createScene } from "./scene.js";
import { loadBrainModel } from "./model-loader.js";
import { createContentManager } from "./content-manager.js";
import { createAnatomyManager } from "./anatomy-manager.js";
import { createLabels } from "./labels.js";
import { createCameraController } from "./camera-controller.js";
import { createInteractions } from "./interactions.js";
import { createExploration } from "./exploration.js";
import { createGuidedTour } from "./guided-tour.js";
import { createUI } from "./ui.js";

const OVERVIEW_VIEW = new THREE.Vector3(0.72, 0.42, 0.9);
const host = document.getElementById("canvas-host");
const animator = createAnimator();
const view = createScene(host);

const app = {
  mode: "loading",
  selectedId: null,
  hoveredId: null,
  labelsVisible: true,
  rotateEnabled: !prefersReducedMotion(),
  colorsOn: false,
  panelClosed: false,
  pointerNames: true,
  isolated: false,
  ghost: 0,
  contrast: false,
  textSize: "md",
  darkViewer: false,
};

let content = null;
let anatomy = null;
let labels = null;
let interactions = null;
let cameraController = null;
let exploration = null;
let tour = null;
let modelRoot = null;
let transitionLock = null;
let labelsAnchoredLastFrame = false;
const warnedLanguages = new Set();

const ui = createUI({
  exploreOrReset: () => {
    if (app.mode === "explore" || app.mode === "guidedTour") return lock(resetView);
    return lock(exploreBrain);
  },
  startTour: () => lock(startTour),
  toggleLabels,
  toggleRotate,
  setSeparation,
  select: selectStructure,
  refreshList,
  setLanguage: changeLanguage,
  tourPrev: () => tour?.prev(),
  tourNext: () => tour?.next(),
  tourRestart: () => tour?.restart(),
  tourFinish: () => lock(finishTour),
  reopenInfo,
  dismissPanel,
  setTextSize,
  setContrast,
  setViewerBackground,
  setPointerNames,
  setIsolation,
  setGhost,
  captureImage,
  onLayoutChange() {
    view.resize();
  },
});

cameraController = createCameraController({
  camera: view.camera,
  controls: view.controls,
  animator,
  getHome: () => view.home,
  setHome: (position, target) => view.setHome(position, target),
});

function paint() {
  if (!anatomy) return;
  anatomy.refreshAppearance((structure) => (anatomy.colorsApplied ? content.resolve(structure).color : null));
}

function syncAutoRotate() {
  const allow = app.rotateEnabled && app.mode === "overview" && !app.selectedId;
  view.setAutoRotate(allow);
}

function renderChrome() {
  ui.sync({
    mode: app.mode,
    labels: app.labelsVisible,
    rotate: app.rotateEnabled,
    colors: app.colorsOn,
    selected: Boolean(app.selectedId),
    panelClosed: app.panelClosed,
    pointerNames: app.pointerNames,
    isolated: app.isolated,
    ghost: app.ghost,
    contrast: app.contrast,
    textSize: app.textSize,
    darkViewer: app.darkViewer,
  });
}

function applyViewOptions() {
  view.setBackground(app.darkViewer ? "#1c2830" : "#e7eef3");
  if (!anatomy) return;
  anatomy.setStrongContrast(app.contrast);
  anatomy.setGhost(app.isolated ? 0 : app.ghost);
  anatomy.setIsolated(app.isolated ? app.selectedId : null);
  paint();
}

function present(structure) {
  const info = content.resolve(structure);
  return {
    ...info,
    technical: structure.nameUnique ? structure.nodeName : structure.path,
  };
}

function listGroups() {
  const buckets = new Map();
  for (const structure of anatomy.structures) {
    const info = content.resolve(structure);
    const category = info.category || ui.copy.uncategorized;
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push({
      id: structure.id,
      name: info.name,
      technical: structure.nameUnique ? structure.nodeName : structure.path,
      hidden: structure.suppressed,
      pending: info.pending,
      order: info.order ?? 9999,
      selected: structure.id === app.selectedId,
    });
  }
  return [...buckets.entries()]
    .map(([category, items]) => {
      items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, content.language));
      return { category, items, min: Math.min(...items.map((item) => item.order)) };
    })
    .sort((a, b) => a.min - b.min || a.category.localeCompare(b.category, content.language));
}

function refreshList() {
  if (!anatomy) return;
  ui.renderList(listGroups());
}

function warnContentOnce() {
  if (!content || !anatomy || warnedLanguages.has(content.language)) return;
  warnedLanguages.add(content.language);
  content.warnUnmatched(anatomy.structures);
}

function lock(work) {
  if (transitionLock || app.mode === "loading" || app.mode === "error") return transitionLock;
  transitionLock = work().finally(() => {
    transitionLock = null;
    renderChrome();
  });
  return transitionLock;
}

function focusSelection(structure) {
  const info = content.resolve(structure);
  view.resize();
  cameraController.focusStructure(structure, {
    distanceFactor: info.cameraDistance,
    lift: ui.sheetCoversView() ? 0.9 : 0,
  });
}

function selectStructure(id, source = "model") {
  if (!anatomy || app.mode === "loading" || app.mode === "error") return;
  const structure = anatomy.byId.get(id);
  if (!structure) return;
  if (source !== "tour" && tour?.isActive()) {
    if (tour.contains(id)) {
      tour.goTo(id);
      return;
    }
    tour.finish();
    app.mode = "explore";
  }
  if (structure.suppressed) anatomy.reveal(structure);
  app.selectedId = id;
  app.panelClosed = false;
  anatomy.setColorsApplied(true);
  app.colorsOn = true;
  anatomy.highlight(id);
  if (app.isolated) anatomy.setIsolated(id);
  paint();
  syncAutoRotate();
  ui.showInfo(present(structure), { visible: true });
  focusSelection(structure);
  if (ui.isListOpen()) refreshList();
  renderChrome();
}

function clearSelection() {
  app.selectedId = null;
  app.panelClosed = false;
  app.isolated = false;
  anatomy?.highlight(null);
  anatomy?.setIsolated(null);
  anatomy?.setGhost(app.ghost);
  paint();
  ui.showInfo(null);
  syncAutoRotate();
}

function dismissPanel() {
  if (!app.selectedId) return;
  app.panelClosed = true;
  ui.showInfo(present(anatomy.byId.get(app.selectedId)), { visible: false });
  view.resize();
  renderChrome();
}

function reopenInfo() {
  if (!app.selectedId) return;
  app.panelClosed = false;
  ui.showInfo(present(anatomy.byId.get(app.selectedId)), { visible: true });
  view.resize();
  focusSelection(anatomy.byId.get(app.selectedId));
  renderChrome();
}

function toggleLabels() {
  app.labelsVisible = !app.labelsVisible;
  labels?.setVisible(app.labelsVisible);
  renderChrome();
}

function toggleRotate() {
  app.rotateEnabled = !app.rotateEnabled;
  syncAutoRotate();
  renderChrome();
}

function setSeparation(percent) {
  exploration?.setSeparation(percent);
}

function setHover(id) {
  if (!anatomy || app.hoveredId === id) return;
  app.hoveredId = id;
  anatomy.setHover(id);
  paint();
}

function setTextSize(size) {
  app.textSize = size;
  renderChrome();
}

function setContrast(enabled) {
  app.contrast = enabled;
  applyViewOptions();
  renderChrome();
}

function setViewerBackground(dark) {
  app.darkViewer = dark;
  applyViewOptions();
  renderChrome();
}

function setPointerNames(enabled) {
  app.pointerNames = enabled;
  if (!enabled) interactions?.hideChip();
  renderChrome();
}

function setIsolation(enabled) {
  if (enabled && !app.selectedId) {
    app.isolated = false;
    renderChrome();
    return;
  }
  app.isolated = enabled;
  applyViewOptions();
  renderChrome();
}

function setGhost(percent) {
  app.ghost = percent;
  if (!app.isolated) anatomy?.setGhost(percent);
  paint();
  renderChrome();
}

async function captureImage() {
  if (!view || app.mode === "loading" || app.mode === "error") return;
  const structure = app.selectedId ? anatomy?.byId.get(app.selectedId) : null;
  const caption = structure && content ? content.resolve(structure).name : "";
  const url = await view.capture(caption, labels?.visibleEntries?.() ?? []);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = url;
  link.download = `cerebro-${stamp}.png`;
  link.click();
}

async function exploreBrain() {
  if (!exploration) return;
  if (tour?.isActive()) {
    tour.finish();
    app.mode = "explore";
    app.rotateEnabled = false;
    syncAutoRotate();
    return;
  }
  if (exploration.isActive()) return;
  app.mode = "explore";
  app.rotateEnabled = false;
  clearSelection();
  const entered = await exploration.enter();
  if (!entered) {
    app.mode = "overview";
    ui.showWarning(ui.copy.noVisible);
    syncAutoRotate();
    return;
  }
  app.colorsOn = true;
  syncAutoRotate();
}

async function startTour() {
  if (!exploration || !tour) return;
  if (tour.isActive()) return;
  app.mode = "explore";
  app.rotateEnabled = false;
  clearSelection();
  const entered = await exploration.enter();
  if (!entered) {
    app.mode = "overview";
    ui.showWarning(ui.copy.noVisible);
    syncAutoRotate();
    return;
  }
  app.colorsOn = anatomy.colorsApplied;
  const started = tour.start();
  if (!started) {
    ui.showWarning(ui.copy.emptyTour);
    return;
  }
  app.mode = "guidedTour";
  syncAutoRotate();
}

async function resetView() {
  if (!cameraController || !exploration) return;
  if (tour?.isActive()) tour.finish();
  clearSelection();
  await exploration.exit();
  app.mode = "overview";
  app.colorsOn = false;
  await cameraController.goHome(800);
  syncAutoRotate();
}

async function finishTour() {
  if (!tour?.isActive()) return;
  tour.finish();
  clearSelection();
  app.mode = exploration?.isActive() ? "explore" : "overview";
  if (exploration?.isActive()) {
    await cameraController.frameStructures(exploration.visibleStructures(), {
      direction: exploration.viewDirection,
      distanceFactor: 1.38,
      duration: 800,
    });
  }
  syncAutoRotate();
}

function changeLanguage(code) {
  if (!content?.setLanguage(code)) return;
  ui.setLanguage(code);
  const meta = content.modelMeta();
  ui.setTitle(meta.title || ui.copy.titleFallback);
  labels?.refreshText();
  tour?.refreshCopy();
  if (exploration?.isActive()) anatomy.setExplore(true, exploration.shouldSuppress);
  paint();
  if (app.selectedId) {
    ui.showInfo(present(anatomy.byId.get(app.selectedId)), { visible: !app.panelClosed });
  }
  if (ui.isListOpen()) refreshList();
  warnContentOnce();
  renderChrome();
}

function logStructures() {
  const pending = anatomy.structures.filter((structure) => content.resolve(structure).pending);
  console.info(`[brain-explorer] ${anatomy.structures.length} estructuras identificadas.`);
  for (const structure of anatomy.structures) {
    console.info(`• ${structure.nameUnique ? structure.nodeName : structure.path}`);
  }
  if (pending.length) {
    console.info(`[brain-explorer] Sin ficha educativa: ${pending.map((structure) => structure.id).join(", ")}`);
  }
}

host.addEventListener("controlstart", () => animator.cancel("camera"));
host.addEventListener("contextlost", () => ui.showFatal(ui.copy.contextLost));
host.addEventListener("contextrestored", () => {
  ui.clearBanner();
  view.resize();
});

window.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
  if (event.key === "ArrowRight" && tour?.isActive()) {
    event.preventDefault();
    tour.next();
  } else if (event.key === "ArrowLeft" && tour?.isActive()) {
    event.preventDefault();
    tour.prev();
  } else if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
    ui.closePopovers?.();
    dismissPanel();
  }
});

view.start(
  () => {
    animator.update();
  },
  () => {
    if (!anatomy || !labels) return;
    const anchored = app.labelsVisible && (app.mode === "explore" || app.mode === "guidedTour");
    if (!anchored) {
      if (labelsAnchoredLastFrame) labels.update(app.selectedId, app.hoveredId, false);
      labelsAnchoredLastFrame = false;
      return;
    }
    labelsAnchoredLastFrame = true;
    modelRoot?.updateMatrixWorld(true);
    anatomy.updateAnchors();
    labels.update(app.selectedId, app.hoveredId, anchored);
    if (app.hoveredId && labels.isShown(app.hoveredId)) interactions?.hideChip();
  },
);

async function boot() {
  ui.setLoading(true, null, ui.copy.loading);
  renderChrome();
  try {
    const [loadedContent, loadedModel] = await Promise.all([
      createContentManager(),
      loadBrainModel("./assets/brain.glb", (progress) => ui.setLoading(true, progress, ui.copy.loading)),
    ]);
    content = loadedContent;
    ui.setLanguage(content.language);
    ui.setLanguageOptions(content.availableLanguages(), content.language);
    ui.setTitle(content.modelMeta().title || ui.copy.titleFallback);

    modelRoot = loadedModel.wrapper;
    view.scene.add(modelRoot);
    modelRoot.updateMatrixWorld(true);
    anatomy = createAnatomyManager(modelRoot);
    paint();
    view.setDistanceLimits(0.02, Math.max(8, anatomy.modelRadius * 10));
    labels = createLabels({
      layer: document.getElementById("label-layer"),
      svg: document.getElementById("leaders"),
      camera: view.camera,
      canvas: view.renderer.domElement,
      anatomy,
      getContent: (structure) => content.resolve(structure),
      onSelect: (id) => selectStructure(id, "label"),
      getInsets: () => ui.getInsets(),
      isCompact: () => ui.isCompact(),
    });
    labels.setVisible(app.labelsVisible);
    interactions = createInteractions({
      dom: view.renderer.domElement,
      camera: view.camera,
      anatomy,
      chip: document.getElementById("pointer-chip"),
      getContent: (structure) => content.resolve(structure),
      namesEnabled: () => app.pointerNames,
      labelShown: (id) => Boolean(labels?.isShown(id)),
      onSelect: (id) => selectStructure(id, "model"),
      onHover: setHover,
    });
    exploration = createExploration({
      anatomy,
      content,
      camera: cameraController,
      animator,
      onSeparation: (percent) => ui.setSeparation(percent),
      onPaint: paint,
    });
    tour = createGuidedTour({
      anatomy,
      content,
      onSelect: (id) => selectStructure(id, "tour"),
      onChange: (state) => ui.setTour(state),
    });
    view.resize();
    await cameraController.frameObject(modelRoot, {
      direction: OVERVIEW_VIEW,
      distanceFactor: 1.05,
      duration: 0,
      storeHome: true,
    });
    warnContentOnce();
    logStructures();
    if (!content.hasDocument()) ui.showWarning(ui.copy.jsonWarn);
    if (!anatomy.structures.length) ui.showWarning(ui.copy.noStructures);
    ui.setLoading(false);
    app.mode = "overview";
    syncAutoRotate();
    renderChrome();
  } catch (error) {
    console.error("[brain-explorer] No se pudo iniciar el visor.", error);
    ui.setLoading(false);
    ui.showFatal(ui.copy.fatal);
    app.mode = "error";
    renderChrome();
  }
}

boot();
