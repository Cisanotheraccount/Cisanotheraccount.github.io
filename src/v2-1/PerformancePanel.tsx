import { useEffect, useState } from 'react';
import { getPerformanceSnapshot, subscribePerformance } from './runtime';
import { readHeroGpuStages } from './gpuTiming';

// Both version source trees are typechecked together but run on separate pages.
// Do not change the frozen 2.0 global declaration to describe a 2.1-only snapshot.
type DiagnosticWindow = Omit<Window, '__gxcPerformance'> & {
  __gxcPerformance?: () => ReturnType<typeof getPerformanceSnapshot>;
};

/** Opt-in local diagnostics. No independent timer, device ID or network reporting. */
export function PerformancePanel() {
  const enabled = new URLSearchParams(location.search).get('perf') === '1';
  const [snapshot, setSnapshot] = useState(getPerformanceSnapshot);
  useEffect(() => {
    if (!enabled) return;
    const diagnosticWindow = window as DiagnosticWindow;
    diagnosticWindow.__gxcPerformance = () => getPerformanceSnapshot();
    const off = subscribePerformance(() => setSnapshot(getPerformanceSnapshot()));
    return () => { off(); delete diagnosticWindow.__gxcPerformance; };
  }, [enabled]);
  if (!enabled) return null;
  const stats = snapshot.stats;
  const stages = readHeroGpuStages();
  const ms = (value: number | null | undefined) => value == null ? 'unavailable' : `${value.toFixed(2)} ms`;
  return <aside aria-label="Local performance diagnostics" style={{ position: 'fixed', zIndex: 1000, left: 12, bottom: 12, width: 295, maxWidth: 'calc(100vw - 24px)', padding: 12, background: '#090a0cf0', color: '#f1f0ed', border: '1px solid #ffffff40', borderRadius: 8, font: '11px/1.6 var(--font-body)', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
    <strong>galaxci {snapshot.version} · {snapshot.scene ?? 'idle'}</strong>
    <div>Internal effects: {snapshot.quality} · Main canvas: unchanged</div>
    <div>Browser callbacks: {snapshot.observedHz?.toFixed(1) ?? 'measuring'} Hz · Target: {snapshot.targetFps.toFixed(1)} fps</div>
    <div>Scene updates: {stats?.fps.toFixed(1) ?? '—'} fps · {snapshot.phase}</div>
    <div>CPU p95: {ms(stats?.cpuP95Ms)} · GPU p95: {ms(stats?.gpuP95Ms)}</div>
    <div>Frame p95: {ms(stats?.intervalP95Ms)} · Missed: {stats ? (stats.missedRatio * 100).toFixed(1) + '%' : '—'}</div>
    <div>{snapshot.reason}</div>
    {stages.map(stage => <div key={stage.name}>{stage.name}: {ms(stage.p95Ms)} p95 · {stage.samples} samples</div>)}
    <small>Callback/update rates are not measured screen presentation. Data stays in this tab.</small>
  </aside>;
}
