const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion() {
  return reducedQuery.matches;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function createAnimator() {
  const jobs = new Map();

  function finish(key, completed) {
    const job = jobs.get(key);
    if (!job) return;
    jobs.delete(key);
    job.onDone?.(completed);
  }

  return {
    /**
     * @param {string} key
     * @param {number} from
     * @param {number} to
     * @param {number} duration
     * @param {(value: number, t: number) => void} onUpdate
     * @param {(completed: boolean) => void} [onDone]
     */
    to(key, from, to, duration, onUpdate, onDone) {
      finish(key, false);
      const reduced = prefersReducedMotion() || duration <= 0;
      if (reduced || from === to) {
        onUpdate(to, 1);
        onDone?.(true);
        return;
      }
      jobs.set(key, {
        from,
        to,
        duration,
        start: performance.now(),
        onUpdate,
        onDone,
      });
    },

    cancel(key) {
      finish(key, false);
    },

    cancelAll() {
      for (const key of [...jobs.keys()]) finish(key, false);
    },

    has(key) {
      return jobs.has(key);
    },

    update() {
      const now = performance.now();
      for (const [key, job] of jobs) {
        const t = Math.min(1, (now - job.start) / job.duration);
        const eased = easeInOut(t);
        job.onUpdate(job.from + (job.to - job.from) * eased, eased);
        if (t >= 1) finish(key, true);
      }
    },
  };
}
