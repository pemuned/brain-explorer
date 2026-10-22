export function createGuidedTour({ anatomy, content, onSelect, onChange }) {
  let active = false;
  let finished = false;
  let index = 0;
  let entries = [];

  function compare(a, b) {
    const left = a.content.order;
    const right = b.content.order;
    if (left != null && right != null && left !== right) return left - right;
    if (left != null) return -1;
    if (right != null) return 1;
    return a.content.name.localeCompare(b.content.name, content.language);
  }

  function publish() {
    if (!active) {
      onChange(null);
      return;
    }
    onChange({
      finished,
      index,
      total: entries.length,
      name: entries[index]?.content.name ?? "",
    });
  }

  function focusCurrent() {
    const current = entries[index];
    if (!current) return;
    onSelect(current.structure.id);
  }

  return {
    isActive: () => active,
    contains(id) {
      return entries.some((item) => item.structure.id === id);
    },
    start() {
      entries = anatomy.structures
        .filter((structure) => structure.object.visible)
        .map((structure) => ({ structure, content: content.resolve(structure) }))
        .filter((item) => item.content.visibleInExplore !== false)
        .sort(compare);
      if (!entries.length) return false;
      active = true;
      finished = false;
      index = 0;
      focusCurrent();
      publish();
      return true;
    },
    goTo(id) {
      const nextIndex = entries.findIndex((item) => item.structure.id === id);
      if (nextIndex < 0) return false;
      index = nextIndex;
      finished = false;
      focusCurrent();
      publish();
      return true;
    },
    next() {
      if (!active || finished) return;
      if (index >= entries.length - 1) {
        finished = true;
        publish();
        return;
      }
      index += 1;
      focusCurrent();
      publish();
    },
    prev() {
      if (!active || finished || index <= 0) return;
      index -= 1;
      focusCurrent();
      publish();
    },
    restart() {
      if (!active || !entries.length) return;
      finished = false;
      index = 0;
      focusCurrent();
      publish();
    },
    refreshCopy() {
      if (!active) return;
      for (const item of entries) item.content = content.resolve(item.structure);
      publish();
    },
    finish() {
      active = false;
      finished = false;
      entries = [];
      index = 0;
      onChange(null);
    },
  };
}
