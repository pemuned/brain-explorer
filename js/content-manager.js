const PENDING = {
  es: "Información anatómica pendiente de incorporar",
  en: "Anatomical information not yet available",
};

const GENERIC_NAME = /^(scene|root|gltf|armature|sketchfab|auxscene|collection|object|group|node|brain-root)$/i;

export function isGenericName(name) {
  return !name || !String(name).trim() || GENERIC_NAME.test(String(name).trim());
}

export function humanizeNodeName(name) {
  if (!name || !String(name).trim()) return "";
  const cleaned = String(name)
    .replace(/[._]+/g, " ")
    .replace(/\s+\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(value.trim()) ? value.trim() : null;
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function validateDocument(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("El JSON educativo no tiene un objeto raíz.");
  }
  if (!data.structures || typeof data.structures !== "object" || Array.isArray(data.structures)) {
    throw new Error("El JSON educativo no contiene el objeto structures.");
  }
  return data;
}

async function fetchDocument(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo obtener ${url} (${response.status}).`);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`El archivo ${url} no contiene JSON válido.`);
  }
  return validateDocument(data);
}

export async function createContentManager() {
  const documents = { es: null, en: null };
  const resolvedByLanguage = {
    es: new WeakMap(),
    en: new WeakMap(),
  };
  const listeners = new Set();
  let language = "es";

  const [spanish, english] = await Promise.allSettled([
    fetchDocument("./data/anatomy.es.json"),
    fetchDocument("./data/anatomy.en.json"),
  ]);

  if (spanish.status === "fulfilled") documents.es = spanish.value;
  else console.error("[brain-explorer] No se pudo cargar anatomy.es.json.", spanish.reason);

  if (english.status === "fulfilled") documents.en = english.value;
  else {
    console.warn(
      "[brain-explorer] anatomy.en.json no está disponible. Se usará el español.",
      english.reason,
    );
  }

  if (!documents.es && documents.en) {
    documents.es = documents.en;
    language = "en";
  }

  function activeDocument() {
    return documents[language] || documents.es || documents.en || null;
  }

  function notify() {
    for (const listener of listeners) listener(language);
  }

  function nameKeys(value) {
    if (!value) return [];
    const spaced = value.replace(/_/g, " ");
    const underscored = value.replace(/\s+/g, "_");
    return [...new Set([value, spaced, underscored])];
  }

  function readEntry(map, key) {
    const entry = map[key];
    return entry && typeof entry === "object" ? entry : null;
  }

  function lookupEntry(structure) {
    const doc = activeDocument();
    const map = doc?.structures ?? {};
    const keys = structure.nameUnique
      ? [...nameKeys(structure.nodeName), ...nameKeys(structure.id), ...nameKeys(structure.path)]
      : [...nameKeys(structure.id), ...nameKeys(structure.path)];
    for (const key of keys) {
      const entry = readEntry(map, key);
      if (entry) return entry;
    }
    return null;
  }

  return {
    get language() {
      return language;
    },
    availableLanguages() {
      return ["es", "en"].filter((code) => documents[code]);
    },
    setLanguage(code) {
      if (!documents[code]) {
        console.warn(`[brain-explorer] Idioma no disponible: ${code}.`);
        return false;
      }
      language = code;
      document.documentElement.lang = code;
      notify();
      return true;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    modelMeta() {
      const model = activeDocument()?.model ?? {};
      return {
        title: cleanText(model.title),
        description: cleanText(model.description),
        language: model.language || language,
      };
    },
    pendingText() {
      return PENDING[language] || PENDING.es;
    },
    hasDocument() {
      return Boolean(activeDocument());
    },
    resolve(structure) {
      const cache = resolvedByLanguage[language];
      const cached = cache?.get(structure);
      if (cached) return cached;
      const entry = lookupEntry(structure);
      const pending = !entry;
      const fallbackName = humanizeNodeName(structure.nodeName) || (language === "en" ? "Unnamed structure" : "Estructura sin nombre");
      const orderValue = Number(entry?.order);
      const distanceValue = Number(entry?.cameraDistance);
      const resolved = {
        name: cleanText(entry?.name) || fallbackName,
        category: cleanText(entry?.category),
        description: pending ? PENDING[language] || PENDING.es : cleanText(entry?.description),
        function: cleanText(entry?.function),
        location: cleanText(entry?.location),
        interestingFact: cleanText(entry?.interestingFact),
        order: Number.isFinite(orderValue) ? orderValue : null,
        color: parseColor(entry?.color),
        labelEnabled: entry?.labelEnabled !== false,
        visibleInExplore: entry?.visibleInExplore !== false,
        cameraDistance: Number.isFinite(distanceValue) ? Math.min(3, Math.max(0.35, distanceValue)) : 1,
        pending,
      };
      cache?.set(structure, resolved);
      return resolved;
    },
    warnUnmatched(structures) {
      const doc = activeDocument();
      if (!doc) return;
      const known = new Set();
      const duplicateNames = new Set();
      for (const structure of structures) {
        const keys = structure.nameUnique
          ? [structure.nodeName, structure.id, structure.path]
          : [structure.id, structure.path];
        if (!structure.nameUnique && structure.nodeName) duplicateNames.add(structure.nodeName);
        for (const key of keys) {
          for (const variant of nameKeys(key)) known.add(variant);
        }
      }
      for (const key of Object.keys(doc.structures)) {
        if (duplicateNames.has(key) || duplicateNames.has(key.replace(/_/g, " "))) {
          console.warn(`[brain-explorer] El identificador "${key}" está duplicado en el GLB. Usa su ruta jerárquica.`);
          continue;
        }
        if (!known.has(key)) {
          console.warn(`[brain-explorer] El identificador "${key}" no existe en el modelo GLB.`);
        }
      }
    },
  };
}
