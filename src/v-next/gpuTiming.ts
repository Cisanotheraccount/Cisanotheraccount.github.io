/** Optional GPU timing; all results are delayed and no call waits for the GPU. */
export interface GpuTimer {
  readonly supported: boolean;
  begin(): void;
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
 * when drawing: it polls previous queries and samples at most four draws/sec.
 * `report` receives GPU milliseconds, not CPU submission or presentation time.
 * Missing extensions, invalid timing periods, and context loss produce no data.
 * No RAF is owned here; dispose when the renderer is disposed.
 */
export function createGpuTimer(gl: WebGL2RenderingContext, report: (milliseconds: number) => void): GpuTimer {
  let extension: TimerExtension | null = null;
  let disposed = false;
  let contextWasLost = gl.isContextLost();
  let lastSample = -Infinity;
  let active: { query: WebGLQuery; started: number } | null = null;
  const pending: { query: WebGLQuery; started: number }[] = [];

  function discoverExtension() {
    try { extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null; }
    catch { extension = null; }
    lastSample = -Infinity;
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
    begin() {
      if (!contextAvailable() || !extension || active) return;
      const now = performance.now();
      const results: number[] = [];
      try {
        if (gl.getParameter(extension.GPU_DISJOINT_EXT)) {
          discardQueries(true);
          lastSample = now;
          return;
        }
        for (let i = pending.length - 1; i >= 0; i--) {
          const item = pending[i];
          if (gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)) {
            const nanoseconds: unknown = gl.getQueryParameter(item.query, gl.QUERY_RESULT);
            gl.deleteQuery(item.query);
            pending.splice(i, 1);
            if (typeof nanoseconds === 'number' && Number.isFinite(nanoseconds) && nanoseconds >= 0) {
              results.push(nanoseconds / 1e6);
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
          lastSample = now;
          return;
        }
        if (now - lastSample >= SAMPLE_INTERVAL_MS && pending.length < MAX_PENDING_QUERIES) {
          // Respect another consumer of this context's elapsed-time target.
          if (!gl.getQuery(extension.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) {
            const query = gl.createQuery();
            if (query) {
              active = { query, started: now };
              gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
              lastSample = now;
            }
          }
        }
      } catch {
        disableAfterError();
        return;
      }
      for (const milliseconds of results.reverse()) report(milliseconds);
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
