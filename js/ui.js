const COPY = {
  es: {
    code: "es",
    eyebrow: "Visualización interactiva en 3D",
    titleFallback: "Explorador del cerebro humano",
    language: "Idioma",
    explore: "Explorar cerebro",
    tour: "Recorrido guiado",
    resetView: "Restablecer",
    viewMenu: "Vista",
    labels: "Etiquetas",
    rotate: "Rotación automática",
    full: "Mostrar cerebro completo",
    colorsOriginal: "Colores originales",
    colorsDistinct: "Colores diferenciados",
    list: "Lista de estructuras",
    info: "Ver información",
    credits: "Créditos",
    creditsIntro:
      "Experiencia educativa interactiva para explorar la anatomía cerebral en 3D.",
    creditsLabel: "Tecnología",
    separation: "Separación de estructuras",
    close: "Cerrar",
    description: "Descripción",
    function: "Función principal",
    location: "Ubicación",
    fact: "Dato interesante",
    category: "Categoría anatómica",
    emptyTitle: "Ninguna estructura seleccionada",
    emptyInfo:
      "Selecciona una estructura en el modelo, en una etiqueta o en la lista anatómica.",
    generalView: "Vista general",
    prev: "Anterior",
    next: "Siguiente",
    finish: "Finalizar recorrido",
    restart: "Reiniciar recorrido",
    tourDone: "Recorrido finalizado",
    lastStop: "Última estructura del recorrido",
    loading: "Cargando modelo anatómico…",
    structures: "Estructuras anatómicas",
    technicalName: "Nombre en el modelo",
    hiddenTag: "Oculta en la exploración",
    pendingTag: "Sin ficha",
    uncategorized: "Sin categoría",
    skip: "Saltar a la lista de estructuras",
    viewerLabel: "Visor tridimensional del cerebro",
    toolbar: "Controles de exploración",
    noVisible:
      "El filtro de exploración no dejó estructuras visibles. Se mantiene el modelo completo.",
    emptyTour: "No hay estructuras visibles para el recorrido.",
    listEmpty: "El modelo no contiene estructuras identificables.",
    noStructures: "No se identificaron estructuras con nombre en el modelo.",
    fatal:
      "No se pudo cargar el modelo 3D. Ábrelo con un servidor HTTP local y comprueba que assets/brain.glb existe.",
    jsonWarn:
      "No se pudo cargar la información educativa. El modelo sigue disponible.",
    contextLost:
      "Se perdió el contexto gráfico. Recarga la página para continuar.",
    reload: "Recargar",
    dismiss: "Ocultar aviso",
    expandSheet: "Abrir ficha",
    collapseSheet: "Reducir ficha",
    access: "Accesibilidad",
    textSize: "Tamaño de letra",
    textMd: "Normal",
    textLg: "Grande",
    textXl: "Muy grande",
    contrast: "Contraste alto",
    viewerBg: "Fondo del visor",
    bgLight: "Claro",
    bgDark: "Oscuro",
    pointerName: "Nombre al señalar",
    isolate: "Aislar pieza seleccionada",
    ghost: "Transparencia del resto",
    capture: "Capturar imagen",
    motionOn: "",
    motionOff: "",
    progress: (name, index, total) => `${name} [${index}/${total}]`,
  },
  en: {
    code: "en",
    eyebrow: "Interactive 3D visualization",
    titleFallback: "Human brain explorer",
    language: "Language",
    explore: "Explore brain",
    tour: "Guided tour",
    resetView: "Reset",
    viewMenu: "View",
    labels: "Labels",
    rotate: "Auto-rotate",
    full: "Show whole brain",
    colorsOriginal: "Original colors",
    colorsDistinct: "Distinct colors",
    list: "Structure list",
    info: "Show information",
    credits: "Credits",
    creditsIntro:
      "An interactive educational experience for exploring brain anatomy in 3D.",
    creditsLabel: "Technology",
    separation: "Structure separation",
    close: "Close",
    description: "Description",
    function: "Main function",
    location: "Location",
    fact: "Interesting fact",
    category: "Anatomical category",
    emptyTitle: "No structure selected",
    emptyInfo:
      "Select a structure on the model, on a label, or from the anatomical list.",
    generalView: "Overview",
    prev: "Previous",
    next: "Next",
    finish: "End tour",
    restart: "Restart tour",
    tourDone: "Tour complete",
    lastStop: "Last stop on the tour",
    loading: "Loading anatomical model…",
    structures: "Anatomical structures",
    technicalName: "Name in the model",
    hiddenTag: "Hidden in exploration",
    pendingTag: "No entry",
    uncategorized: "Uncategorized",
    skip: "Skip to the structure list",
    viewerLabel: "Three-dimensional brain viewer",
    toolbar: "Exploration controls",
    noVisible:
      "The exploration filter left no visible structures. The whole model stays visible.",
    emptyTour: "There are no visible structures for the tour.",
    listEmpty: "The model does not contain identifiable structures.",
    noStructures: "No named structures were identified in the model.",
    fatal:
      "The 3D model could not be loaded. Open the app through a local HTTP server and check that assets/brain.glb exists.",
    jsonWarn:
      "The educational content could not be loaded. The model is still available.",
    contextLost: "The graphics context was lost. Reload the page to continue.",
    reload: "Reload",
    dismiss: "Dismiss notice",
    expandSheet: "Open details",
    collapseSheet: "Collapse details",
    access: "Accessibility",
    textSize: "Text size",
    textMd: "Normal",
    textLg: "Large",
    textXl: "Extra large",
    contrast: "High contrast",
    viewerBg: "Viewer background",
    bgLight: "Light",
    bgDark: "Dark",
    pointerName: "Name on hover",
    isolate: "Isolate selected part",
    ghost: "Transparency of the rest",
    capture: "Capture image",
    motionOn: "Animations are reduced to match the system preference.",
    motionOff: "Animations use the system's normal duration.",
    progress: (name, index, total) => `${name} [${index}/${total}]`,
  },
};

export function createUI(actions) {
  const byId = (id) => document.getElementById(id);
  const compactQuery = window.matchMedia("(max-width: 900px)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let copy = COPY.es;
  let fatal = false;

  const viewer = byId("viewer");
  const viewerTools = byId("viewer-tools");
  const workspace = byId("workspace");
  const loader = byId("loader");
  const loaderText = byId("loader-text");
  const loaderTrack = byId("loader-track");
  const loaderBar = byId("loader-bar");
  const banner = byId("status-banner");
  const bannerMessage = byId("status-message");
  const bannerAction = byId("status-action");
  const bannerDismiss = byId("status-dismiss");
  const titleEl = byId("app-title");
  const eyebrowEl = byId("app-eyebrow");
  const languageField = byId("language-field");
  const languageSelect = byId("language-select");
  const languageLabel = byId("language-label");
  const panel = byId("info-panel");
  const infoName = byId("info-name");
  const infoEmpty = byId("info-empty");
  const infoFacts = byId("info-facts");
  const infoTechnical = byId("info-technical");
  const infoClose = byId("info-close");
  const infoExpand = byId("info-expand");
  const tourBar = byId("tour-bar");
  const tourStatus = byId("tour-status");
  const tourPrev = byId("tour-prev");
  const tourNext = byId("tour-next");
  const tourRestart = byId("tour-restart");
  const tourEnd = byId("tour-end");
  const list = byId("structure-list");
  const dialog = byId("structure-dialog");
  const dialogTitle = byId("structure-dialog-title");
  const dialogClose = byId("structure-dialog-close");
  const creditsDialog = byId("credits-dialog");
  const creditsButton = byId("btn-credits");
  const creditsTitle = byId("credits-dialog-title");
  const creditsClose = byId("credits-dialog-close");
  const creditsIntro = byId("credits-intro");
  const separation = byId("separation");
  const separationValue = byId("separation-value");
  const separationLabel = byId("separation-label");
  const live = byId("live-region");
  const skip = byId("skip-list");
  const buttons = {
    explore: byId("btn-explore"),
    tour: byId("btn-tour"),
    labels: byId("toggle-labels"),
    rotate: byId("toggle-rotate"),
    list: byId("btn-list"),
    view: byId("btn-view"),
    access: byId("btn-access"),
    info: byId("btn-info"),
  };
  const viewPanel = byId("view-panel");
  const accessPanel = byId("access-panel");
  const textButtons = [...document.querySelectorAll("[data-text]")];
  const bgButtons = [...document.querySelectorAll("[data-bg]")];
  const contrastInput = byId("access-contrast");
  const namesInput = byId("access-names");
  const isolateInput = byId("access-isolate");
  const ghostInput = byId("access-ghost");
  const ghostValue = byId("access-ghost-value");
  const captureButton = byId("access-capture");
  const motionNote = byId("access-motion");

  function isCompact() {
    return compactQuery.matches;
  }

  function setField(id, text) {
    const field = byId(id);
    const value = field.querySelector("dd");
    field.hidden = !text;
    value.textContent = text || "";
  }

  function applyCopy() {
    document.documentElement.lang = copy.code;
    document.title = titleEl.textContent || copy.titleFallback;
    skip.textContent = copy.skip;
    languageLabel.textContent = copy.language;
    eyebrowEl.textContent = copy.eyebrow;
    viewer.setAttribute("aria-label", copy.viewerLabel);
    byId("toolbar").setAttribute("aria-label", copy.toolbar);
    buttons.explore.textContent = copy.explore;
    buttons.tour.textContent = copy.tour;
    byId("toggle-labels-text").textContent = copy.labels;
    byId("toggle-rotate-text").textContent = copy.rotate;
    buttons.list.textContent = copy.list;
    buttons.view.textContent = copy.viewMenu;
    buttons.access.textContent = copy.access;
    buttons.info.textContent = copy.info;
    creditsButton.textContent = copy.credits;
    creditsTitle.textContent = copy.credits;
    creditsClose.textContent = copy.close;
    creditsIntro.textContent = copy.creditsIntro;
    byId("credits-label").textContent = copy.creditsTech;
    byId("access-text-label").textContent = copy.textSize;
    textButtons[0].textContent = copy.textMd;
    textButtons[1].textContent = copy.textLg;
    textButtons[2].textContent = copy.textXl;
    byId("access-contrast-label").textContent = copy.contrast;
    byId("access-bg-label").textContent = copy.viewerBg;
    bgButtons[0].textContent = copy.bgLight;
    bgButtons[1].textContent = copy.bgDark;
    byId("access-names-label").textContent = copy.pointerName;
    byId("access-isolate-label").textContent = copy.isolate;
    byId("access-ghost-label").textContent = copy.ghost;
    captureButton.textContent = copy.capture;
    motionNote.textContent = motionQuery.matches
      ? copy.motionOn
      : copy.motionOff;
    separationLabel.textContent = copy.separation;
    infoClose.textContent = copy.close;
    infoEmpty.textContent = copy.emptyInfo;
    byId("label-category").textContent = copy.category;
    byId("label-description").textContent = copy.description;
    byId("label-function").textContent = copy.function;
    byId("label-location").textContent = copy.location;
    byId("label-fact").textContent = copy.fact;
    tourPrev.textContent = copy.prev;
    tourNext.textContent = copy.next;
    tourRestart.textContent = copy.restart;
    tourEnd.textContent = copy.finish;
    dialogTitle.textContent = copy.structures;
    dialogClose.textContent = copy.close;
    bannerDismiss.textContent = copy.dismiss;
    bannerAction.textContent = copy.reload;
    loaderText.textContent = copy.loading;
    if (!panel.classList.contains("is-open") && infoFacts.hidden)
      infoName.textContent = copy.emptyTitle;
    syncSheetButton();
  }

  function syncSheetButton() {
    const expanded = panel.classList.contains("is-expanded");
    infoExpand.textContent = expanded ? copy.collapseSheet : copy.expandSheet;
    infoExpand.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function showBanner(message, isFatal) {
    banner.hidden = false;
    banner.classList.toggle("is-fatal", isFatal);
    bannerMessage.textContent = message;
    bannerAction.hidden = !isFatal;
  }

  function closePopovers() {
    viewPanel.hidden = true;
    accessPanel.hidden = true;
    buttons.view.setAttribute("aria-expanded", "false");
    buttons.access.setAttribute("aria-expanded", "false");
  }

  function togglePopover(button, panel) {
    const willOpen = panel.hidden;
    closePopovers();
    if (!willOpen) return;
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  buttons.explore.addEventListener("click", () => actions.exploreOrReset());
  buttons.tour.addEventListener("click", () => actions.startTour());
  buttons.labels.addEventListener("change", () => actions.toggleLabels());
  buttons.rotate.addEventListener("change", () => actions.toggleRotate());
  buttons.info.addEventListener("click", () => actions.reopenInfo());
  buttons.list.addEventListener("click", () => {
    closePopovers();
    actions.refreshList();
    if (!dialog.open) dialog.showModal();
  });
  buttons.view.addEventListener("click", () =>
    togglePopover(buttons.view, viewPanel),
  );
  buttons.access.addEventListener("click", () =>
    togglePopover(buttons.access, accessPanel),
  );
  byId("view-menu").addEventListener("click", (event) =>
    event.stopPropagation(),
  );
  byId("access-menu").addEventListener("click", (event) =>
    event.stopPropagation(),
  );
  document.addEventListener("click", closePopovers);
  textButtons.forEach((button) => {
    button.addEventListener("click", () =>
      actions.setTextSize(button.dataset.text),
    );
  });
  bgButtons.forEach((button) => {
    button.addEventListener("click", () =>
      actions.setViewerBackground(button.dataset.bg === "dark"),
    );
  });
  contrastInput.addEventListener("change", () =>
    actions.setContrast(contrastInput.checked),
  );
  namesInput.addEventListener("change", () =>
    actions.setPointerNames(namesInput.checked),
  );
  isolateInput.addEventListener("change", () =>
    actions.setIsolation(isolateInput.checked),
  );
  ghostInput.addEventListener("input", () => {
    ghostValue.textContent = `${ghostInput.value}%`;
    actions.setGhost(Number(ghostInput.value));
  });
  captureButton.addEventListener("click", () => actions.captureImage());
  infoClose.addEventListener("click", () => actions.dismissPanel());
  infoExpand.addEventListener("click", () => {
    panel.classList.toggle("is-expanded");
    syncSheetButton();
  });
  tourPrev.addEventListener("click", () => actions.tourPrev());
  tourNext.addEventListener("click", () => actions.tourNext());
  tourRestart.addEventListener("click", () => actions.tourRestart());
  tourEnd.addEventListener("click", () => actions.tourFinish());
  dialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  creditsButton.addEventListener("click", () => {
    closePopovers();
    if (!creditsDialog.open) creditsDialog.showModal();
  });
  creditsClose.addEventListener("click", () => creditsDialog.close());
  creditsDialog.addEventListener("click", (event) => {
    if (event.target === creditsDialog) creditsDialog.close();
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    actions.select(button.dataset.id, "list");
    dialog.close();
  });
  languageSelect.addEventListener("change", () =>
    actions.setLanguage(languageSelect.value),
  );
  separation.addEventListener("input", () => {
    separationValue.textContent = `${separation.value}%`;
    actions.setSeparation(Number(separation.value));
  });
  bannerDismiss.addEventListener("click", () => {
    banner.hidden = true;
  });
  bannerAction.addEventListener("click", () => location.reload());
  skip.addEventListener("click", (event) => {
    event.preventDefault();
    actions.refreshList();
    if (!dialog.open) dialog.showModal();
  });
  compactQuery.addEventListener("change", () => actions.onLayoutChange());

  //hide the language selector for now, since we only have Spanish content available. Uncomment the line below to show the language selector when English content is available.
  languageField.style.display = "none";

  applyCopy();

  return {
    get copy() {
      return copy;
    },
    isCompact,
    closePopovers,
    isListOpen() {
      return dialog.open;
    },
    sheetCoversView() {
      return (
        isCompact() &&
        panel.classList.contains("is-open") &&
        panel.classList.contains("is-expanded")
      );
    },
    getInsets() {
      let bottom = isCompact() ? 12 : 16;
      if (!tourBar.hidden) bottom += tourBar.offsetHeight + 12;
      if (isCompact() && panel.classList.contains("is-open")) {
        const covered = panel.classList.contains("is-expanded")
          ? Math.min(panel.offsetHeight, window.innerHeight * 0.48)
          : 76;
        bottom = Math.max(bottom, covered + 12);
      }
      const top = (viewerTools?.offsetHeight || 0) + 24;
      return { top, right: 10, bottom, left: 10 };
    },
    setLanguage(code) {
      copy = COPY[code] || COPY.es;
      applyCopy();
      languageSelect.value = copy.code;
    },
    setLanguageOptions(languages, current) {
      for (const option of languageSelect.options) {
        const available = languages.includes(option.value);
        option.disabled = !available;
        option.hidden = !available;
      }
      languageField.hidden = languages.length < 2;
      if (languages.includes(current)) languageSelect.value = current;
    },
    setTitle(title) {
      const next = title || copy.titleFallback;
      titleEl.textContent = next;
      document.title = next;
    },
    setLoading(visible, progress, text) {
      loader.hidden = !visible;
      viewer.setAttribute("aria-busy", visible ? "true" : "false");
      if (text) loaderText.textContent = text;
      const indeterminate = progress == null;
      loaderTrack.classList.toggle("is-indeterminate", indeterminate);
      loaderBar.style.width = indeterminate
        ? "35%"
        : `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
    },
    showWarning(message) {
      if (fatal) return;
      showBanner(message, false);
    },
    showFatal(message) {
      fatal = true;
      showBanner(message, true);
    },
    clearBanner() {
      fatal = false;
      banner.hidden = true;
    },
    showInfo(info, { visible = true } = {}) {
      if (!info) {
        panel.classList.remove("is-open", "is-expanded");
        workspace.classList.remove("panel-closed");
        infoFacts.hidden = true;
        infoEmpty.hidden = false;
        infoName.textContent = copy.emptyTitle;
        infoClose.hidden = true;
        infoTechnical.hidden = true;
        infoExpand.hidden = true;
        return;
      }
      infoEmpty.hidden = true;
      infoFacts.hidden = false;
      infoName.textContent = info.name;
      infoClose.hidden = false;
      infoExpand.hidden = false;
      infoTechnical.hidden = !info.technical;
      // infoTechnical.textContent = info.technical ? `${copy.technicalName}: ${info.technical}` : "";
      infoTechnical.textContent = "";
      setField("field-category", info.category);
      setField("field-description", info.description);
      setField("field-function", info.function);
      setField("field-location", info.location);
      setField("field-fact", info.interestingFact);
      panel.classList.toggle("is-open", visible);
      panel.classList.toggle("is-expanded", visible);
      workspace.classList.toggle("panel-closed", !visible);
      if (visible) live.textContent = info.name;
      syncSheetButton();
    },
    setTour(state) {
      if (!state) {
        tourBar.hidden = true;
        return;
      }
      tourBar.hidden = false;
      tourRestart.hidden = !state.finished;
      tourNext.hidden = state.finished;
      tourPrev.disabled = state.finished || state.index === 0;
      if (state.finished) {
        tourStatus.textContent = copy.tourDone;
        return;
      }
      const progress = copy.progress(state.name, state.index + 1, state.total);
      tourStatus.textContent =
        state.index === state.total - 1
          ? `${progress}. ${copy.lastStop}`
          : progress;
    },
    setSeparation(percent) {
      const value = String(Math.round(percent));
      if (document.activeElement !== separation) separation.value = value;
      separationValue.textContent = `${value}%`;
    },
    renderList(groups) {
      list.replaceChildren();
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "list-empty";
        empty.textContent = copy.listEmpty;
        list.appendChild(empty);
        return;
      }
      for (const group of groups) {
        const section = document.createElement("section");
        const heading = document.createElement("h3");
        heading.textContent = group.category;
        const items = document.createElement("div");
        items.className = "structure-items";
        for (const item of group.items) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "structure-item";
          button.dataset.id = item.id;
          if (item.selected) button.setAttribute("aria-current", "true");
          const name = document.createElement("span");
          name.className = "structure-item-name";
          name.textContent = item.name;
          const meta = document.createElement("span");
          meta.className = "structure-item-meta";
          const bits = [item.technical];
          if (item.hidden) bits.push(copy.hiddenTag);
          if (item.pending) bits.push(copy.pendingTag);
          meta.textContent = bits.filter(Boolean).join(" · ");
          button.append(name, meta);
          items.appendChild(button);
        }
        section.append(heading, items);
        list.appendChild(section);
      }
    },
    sync(state) {
      const ready = state.mode !== "loading" && state.mode !== "error";
      const exploring = state.mode === "explore" || state.mode === "guidedTour";
      for (const button of [
        buttons.explore,
        buttons.tour,
        buttons.list,
        buttons.view,
        buttons.access,
        captureButton,
      ]) {
        button.disabled = !ready;
      }
      buttons.labels.disabled = !ready;
      buttons.rotate.disabled = !ready;
      buttons.explore.textContent = exploring ? copy.resetView : copy.explore;
      buttons.explore.setAttribute(
        "aria-pressed",
        exploring ? "true" : "false",
      );
      buttons.labels.checked = Boolean(state.labels);
      buttons.rotate.checked = Boolean(state.rotate);
      buttons.info.hidden = !(ready && state.selected && state.panelClosed);
      separation.disabled = !ready;
      viewer.dataset.mode = state.mode;
      document.documentElement.dataset.text = state.textSize || "md";
      document.documentElement.dataset.contrast = state.contrast
        ? "high"
        : "normal";
      viewer.classList.toggle("is-dark", Boolean(state.darkViewer));
      textButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          button.dataset.text === (state.textSize || "md") ? "true" : "false",
        );
      });
      bgButtons.forEach((button) => {
        const dark = button.dataset.bg === "dark";
        button.setAttribute(
          "aria-pressed",
          dark === Boolean(state.darkViewer) ? "true" : "false",
        );
      });
      contrastInput.checked = Boolean(state.contrast);
      namesInput.checked = state.pointerNames !== false;
      isolateInput.checked = Boolean(state.isolated && state.selected);
      isolateInput.disabled = !ready || !state.selected;
      ghostInput.disabled =
        !ready || !state.selected || Boolean(state.isolated);
      if (document.activeElement !== ghostInput)
        ghostInput.value = String(state.ghost || 0);
      ghostValue.textContent = `${state.ghost || 0}%`;
      motionNote.textContent = motionQuery.matches
        ? copy.motionOn
        : copy.motionOff;
    },
  };
}
