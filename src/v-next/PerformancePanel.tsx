import { useEffect, useState } from 'react';
import { getPerformanceSnapshot, subscribePerformance } from './runtime';

declare global { interface Window { __gxcPerformance?: () => ReturnType<typeof getPerformanceSnapshot> } }

/** Opt-in local diagnostics. No independent timer, device ID or network reporting. */
export function PerformancePanel() {
  const enabled = new URLSearchParams(location.search).get('perf') === '1';
  const [snapshot, setSnapshot] = useState(getPerformanceSnapshot);
  useEffect(() => {
    if (!enabled) return;
    window.__gxcPerformance = () => getPerformanceSnapshot();
    const off = subscribePerformance(() => setSnapshot(getPerformanceSnapshot()));
    return () => { off(); delete window.__gxcPerformance; };
  }, [enabled]);
  if (!enabled) return null;
  const stats = snapshot.stats;
  const ms = (value: number | null | undefined) => value == null ? 'unavailable' : `${value.toFixed(2)} ms`;
  return <aside aria-label="Local performance diagnostics" style={{ position: 'fixed', zIndex: 1000, left: 12, bottom: 12, width: 295, maxWidth: 'calc(100vw - 24px)', padding: 12, background: '#090a0cf0', color: '#f1f0ed', border: '1px solid #ffffff40', borderRadius: 8, font: '11px/1.6 var(--font-body)', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
    <strong>Full-quality adaptive rendering · {snapshot.scene ?? 'idle'}</strong>
    <div>Browser callbacks: {snapshot.observedHz?.toFixed(1) ?? 'measuring'} Hz · Target: {snapshot.targetFps.toFixed(1)} fps</div>
    <div>Scene updates: {stats?.fps.toFixed(1) ?? '—'} fps · {snapshot.phase}</div>
    <div>CPU p95: {ms(stats?.cpuP95Ms)} · GPU p95: {ms(stats?.gpuP95Ms)}</div>
    <div>Frame p95: {ms(stats?.intervalP95Ms)} · Missed: {stats ? (stats.missedRatio * 100).toFixed(1) + '%' : '—'}</div>
    <div>{snapshot.reason}</div>
    <small>Callback/update rates are not measured screen presentation. Data stays in this tab.</small>
  </aside>;
}
