export const touchRelease = 'adaptive-photo-v32-20260918';
export const touchDiagnosticsEnabled = ['perf', 'qa'].some(key => new URLSearchParams(location.search).get(key) === '1');
const counters: Record<string, number> = {};
const samples: Record<string, number[]> = {};
const events: { time: number; type: string; data?: Record<string, unknown> }[] = [];
const began = performance.now();
export function recordTouchMetric(name: string, value = 1) { if (touchDiagnosticsEnabled) counters[name] = (counters[name] ?? 0) + value; }
export function sampleTouchMetric(name: string, value: number) {
  if (!touchDiagnosticsEnabled || !Number.isFinite(value)) return;
  const values = samples[name] ??= []; values.push(value); if (values.length > 1200) values.shift();
}
export function recordTouchEvent(type: string, data?: Record<string, unknown>) {
  if (!touchDiagnosticsEnabled) return;
  events.push({ time: performance.now(), type, data }); if (events.length > 240) events.shift();
}
export function readTouchDiagnostics() {
  return { release: touchRelease, elapsedSeconds: (performance.now() - began) / 1000, counters: { ...counters },
    samples: Object.fromEntries(Object.entries(samples).map(([name, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return [name, { count: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
        p95: sorted[Math.floor((sorted.length - 1) * .95)], max: sorted[sorted.length - 1], values: [...values] }];
    })), events: [...events] };
}
