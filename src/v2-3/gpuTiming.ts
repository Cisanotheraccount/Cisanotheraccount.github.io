/** Optional GPU timing; all results are delayed and no call waits for the GPU. */
export interface GpuTimer {
  readonly supported: boolean;
  begin(label?: string, sample?: boolean): void;
  end(): void;
  dispose(): void;
}

interface TimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

const SAMPLE_INTERVAL_MS = 250;
const MAX_PENDING_QUERIES = 4;
const QUERY_TIMEOUT_MS = 5000;

/**
 * Wrap one complete scene draw in begin()/try/finally/end(). Call begin only
 * when drawing: query/status polling and sampling attempts each run at most four
 * times/sec. Ordinary rendered frames do not read synchronizing GL query state.
 * `report` receives GPU milliseconds, not CPU submission or presentation time.
 * Missing extensions, invalid timing periods, and context loss produce no data.
 * No RAF is owned here; dispose when the renderer is disposed.
 */
export function createGpuTimer(gl: WebGL2RenderingContext, report: (milliseconds: number, label: string) => void): GpuTimer {
  let extension: TimerExtension | null = null;
  let disposed = false;
  let contextWasLost = gl.isContextLost();
  let lastPoll = -Infinity;
  let lastSampleAttempt = -Infinity;
  let active: { query: WebGLQuery; started: number; label: string } | null = null;
  const pending: { query: WebGLQuery; started: number; label: string }[] = [];

  function discoverExtension() {
    try { extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null; }
    catch { extension = null; }
    lastPoll = -Infinity;
    lastSampleAttempt = -Infinity;
  }
  if (!contextWasLost) discoverExtension();

  function discardQueries(canDelete: boolean) {
    if (active) {
      if (canDelete && extension) {
        try { gl.endQuery(extension.TIME_ELAPSED_EXT); } catch { /* Context may have been lost. */ }
      }
      pending.push(active);
      active = null;
    }
    if (canDelete) {
      for (const { query } of pending) {
        try { gl.deleteQuery(query); } catch { /* Disposing must not disrupt the visual fallback. */ }
      }
    }
    pending.length = 0;
  }

  function contextAvailable() {
    if (disposed) return false;
    if (gl.isContextLost()) {
      discardQueries(false);
      extension = null;
      contextWasLost = true;
      return false;
    }
    if (contextWasLost) {
      contextWasLost = false;
      discoverExtension();
    }
    return extension !== null;
  }

  function disableAfterError() {
    discardQueries(!gl.isContextLost());
    // Do not repeat a failing extension operation every frame. Context
    // restoration rediscovers support, just as it restores other GL resources.
    extension = null;
  }

  return {
    get supported() { return !disposed && extension !== null && !gl.isContextLost(); },
    begin(label = 'total', sample = true) {
      if (!contextAvailable() || !extension || active) return;
      const now = performance.now();
      const pollDue = now - lastPoll >= SAMPLE_INTERVAL_MS;
      const sampleDue = sample && now - lastSampleAttempt >= SAMPLE_INTERVAL_MS;
      if (!pollDue && !sampleDue) return;
      const results: { milliseconds: number; label: string }[] = [];
      try {
        if (pollDue) {
          lastPoll = now;
          if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
            discardQueries(true);
            lastSampleAttempt = now;
            return;
          }
          for (let i = pending.length - 1; i >= 0; i--) {
            const item = pending[i];
            if (gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)) {
              const nanoseconds: unknown = gl.getQueryParameter(item.query, gl.QUERY_RESULT);
              gl.deleteQuery(item.query);
              pending.splice(i, 1);
              if (typeof nanoseconds === 'number' && Number.isFinite(nanoseconds) && nanoseconds >= 0) {
                results.push({ milliseconds: nanoseconds / 1e6, label: item.label });
              }
            } else if (now - item.started >= QUERY_TIMEOUT_MS) {
              gl.deleteQuery(item.query);
              pending.splice(i, 1);
            }
          }
          // A disjoint period invalidates even results that became available
          // during this poll. Never pass those measurements to the governor.
          if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
            discardQueries(true);
            lastSampleAttempt = now;
            return;
          }
        }
        if (sampleDue) {
          // A poll-only call must not consume this allowance: the profiler can
          // poll then start the selected whole-frame/subpass query in one frame.
          // Conversely, a busy foreign query or full pool must not trigger a
          // synchronizing CURRENT_QUERY read on every following render frame.
          lastSampleAttempt = now;
          // Respect another consumer of this context's elapsed-time target.
          if (pending.length < MAX_PENDING_QUERIES && !gl.getQuery(extension.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) {
            const query = gl.createQuery();
            if (query) {
              active = { query, started: now, label };
              gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
            }
          }
        }
      } catch {
        disableAfterError();
        return;
      }
      for (const result of results.reverse()) report(result.milliseconds, result.label);
    },
    end() {
      if (!contextAvailable() || !extension || !active) return;
      try {
        gl.endQuery(extension.TIME_ELAPSED_EXT);
        pending.push(active);
        active = null;
      } catch { disableAfterError(); }
    },
    dispose() {
      if (disposed) return;
      discardQueries(!gl.isContextLost());
      extension = null;
      disposed = true;
    },
  };
}

export type HeroGpuStage = 'fluid' | 'background' | 'color' | 'mask' | 'flare' | 'composite';
export type HeroGpuStageResult = { name: string; p95Ms: number; samples: number };
let stageSnapshot: HeroGpuStageResult[] = [];
export const readHeroGpuStages = () => stageSnapshot;

/** One query pool: frame and subpass queries never overlap or nest. */
export function createHeroGpuProfiler(gl: WebGL2RenderingContext, reportTotal: (ms: number) => void, enabled: boolean) {
  const stages: HeroGpuStage[] = ['fluid', 'background', 'color', 'mask', 'flare', 'composite'];
  const history = new Map<string, number[]>();
  const timer = createGpuTimer(gl, (ms, label) => {
    if (label === 'total') reportTotal(ms);
    if (!enabled) return;
    const values = history.get(label) ?? [];
    values.push(ms); if (values.length > 60) values.shift(); history.set(label, values);
    stageSnapshot = [...history].map(([name, readings]) => ({ name, samples: readings.length,
      p95Ms: [...readings].sort((a, b) => a - b)[Math.min(readings.length - 1, Math.floor(readings.length * .95))],
    }));
  });
  let selected: string | null = null, consumed = false, nextAt = -Infinity, cursor = 0;
  return {
    begin() {
      if (!enabled) { timer.begin(); return; }
      timer.begin('poll', false);
      selected = null; consumed = false;
      const now = performance.now();
      if (now < nextAt) return;
      nextAt = now + SAMPLE_INTERVAL_MS;
      selected = cursor % 2 === 0 ? 'total' : stages[Math.floor(cursor / 2) % stages.length]; cursor++;
      if (selected === 'total') timer.begin('total');
    },
    measure(name: HeroGpuStage, draw: () => void) {
      if (!enabled || selected !== name || consumed) { draw(); return; }
      consumed = true; timer.begin(name);
      try { draw(); } finally { timer.end(); }
    },
    end() { if (!enabled || selected === 'total') timer.end(); selected = null; },
    dispose() { timer.dispose(); history.clear(); stageSnapshot = []; },
  };
}
