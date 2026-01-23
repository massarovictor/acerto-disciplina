const perfEnabled = import.meta.env.VITE_DEBUG_PERF === "true";
const isWorker =
  typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;

type PerfDetails = Record<string, number | string | boolean | null | undefined>;

export const perfLog = (label: string, details?: PerfDetails) => {
  if (!perfEnabled || isWorker) return;
  if (details) {
    console.log(`[PERF] ${label}`, details);
  } else {
    console.log(`[PERF] ${label}`);
  }
};

export const perfTimer = (label: string) => {
  if (!perfEnabled || isWorker) {
    return (_details?: PerfDetails) => undefined;
  }

  const start = performance.now();
  return (details?: PerfDetails) => {
    const elapsedMs = Math.round(performance.now() - start);
    if (details) {
      console.log(`[PERF] ${label}`, { ms: elapsedMs, ...details });
    } else {
      console.log(`[PERF] ${label}`, { ms: elapsedMs });
    }
  };
};
