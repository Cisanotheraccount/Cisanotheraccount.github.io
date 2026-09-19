import { useEffect, useState } from 'react';
import { getPerformanceSnapshot, subscribePerformance } from './runtime';
import { readHeroGpuStages } from './gpuTiming';
import { getInputState } from './inputState';
import { readTouchDiagnostics, touchRelease } from './touchDiagnostics';

export function collectDeviceDiagnostics() {
  const work = document.querySelector<HTMLElement>('.gxc-work-canvas');
  const glass = document.querySelector<HTMLCanvasElement>('.gxc-canvas canvas');
  return { ...readTouchDiagnostics(), capturedAt: new Date().toISOString(), url: location.href,
    browser: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
      visualHeight: visualViewport?.height, zoom: visualViewport?.scale }, input: { ...getInputState() },
    performance: { hero: getPerformanceSnapshot('hero'), work: getPerformanceSnapshot('work') },
    work: { ...work?.dataset }, glass: { ...glass?.dataset },
    images: [...document.querySelectorAll<HTMLImageElement>('.gxc-project-picture > img')].map(image => ({
      source: image.currentSrc, natural: [image.naturalWidth, image.naturalHeight], ...image.dataset,
    })), note: 'Local browser measurements; no measured display presentation or uploaded telemetry.' };
}

// Both version source trees are typechecked together but run on separate pages.
// Do not change the frozen 2.0 global declaration to describe a 2.1-only snapshot.
type DiagnosticWindow = Omit<Window, '__gxcPerformance'> & {
  __gxcPerformance?: () => ReturnType<typeof getPerformanceSnapshot>;
  __gxcTouchDiagnostics?: typeof collectDeviceDiagnostics;
};

/** Opt-in local diagnostics. No independent timer, device ID or network reporting. */
export function PerformancePanel() {
  const enabled = new URLSearchParams(location.search).get('perf') === '1';
  const [snapshot, setSnapshot] = useState(getPerformanceSnapshot);
  const [copied, setCopied] = useState(false);
  const [exportText, setExportText] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const diagnosticWindow = window as DiagnosticWindow;
    diagnosticWindow.__gxcPerformance = () => getPerformanceSnapshot();
    diagnosticWindow.__gxcTouchDiagnostics = collectDeviceDiagnostics;
    const off = subscribePerformance(() => setSnapshot(getPerformanceSnapshot()));
    return () => { off(); delete diagnosticWindow.__gxcPerformance; delete diagnosticWindow.__gxcTouchDiagnostics; };
  }, [enabled]);
  if (!enabled) return null;
  const stats = snapshot.stats;
  const stages = readHeroGpuStages();
  const ms = (value: number | null | undefined) => value == null ? 'unavailable' : `${value.toFixed(2)} ms`;
  const copy = async () => {
    const text = JSON.stringify(collectDeviceDiagnostics(), null, 2);
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setExportText(text); }
  };
  return <aside aria-label="Local performance diagnostics" style={{ position: 'fixed', zIndex: 1000, left: 12, bottom: 12, width: 295, maxWidth: 'calc(100vw - 24px)', padding: 12, background: '#090a0cf0', color: '#f1f0ed', border: '1px solid #ffffff40', borderRadius: 8, font: '11px/1.6 var(--font-body)', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
    <strong>galaxci {snapshot.version} · {snapshot.scene ?? 'idle'}</strong>
    <div>{touchRelease} · {getInputState().touchCapable ? 'Touch-capable' : 'Mouse'} · {document.querySelector<HTMLElement>('.gxc-work-canvas')?.dataset.state ?? 'preparing'}</div>
    <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
      <button type="button" style={{ minHeight: 44 }} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy diagnostics'}</button>
      <button type="button" style={{ minHeight: 44 }} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Less' : 'More'}</button>
    </div>
    {exportText && <textarea aria-label="Copy diagnostic report" value={exportText} readOnly onFocus={event => event.target.select()} style={{ width: '100%', height: 100, pointerEvents: 'auto' }} />}
    {expanded && <>
    <div>Internal effects: {snapshot.quality} · Main canvas: unchanged</div>
    <div>Browser callbacks: {snapshot.observedHz?.toFixed(1) ?? 'measuring'} Hz · Target: {snapshot.targetFps.toFixed(1)} fps</div>
    <div>Scene updates: {stats?.fps.toFixed(1) ?? '—'} fps · {snapshot.phase}</div>
    <div>CPU p95: {ms(stats?.cpuP95Ms)} · GPU p95: {ms(stats?.gpuP95Ms)}</div>
    <div>Frame p95: {ms(stats?.intervalP95Ms)} · Missed: {stats ? (stats.missedRatio * 100).toFixed(1) + '%' : '—'}</div>
    <div>{snapshot.reason}</div>
    {stages.map(stage => <div key={stage.name}>{stage.name}: {ms(stage.p95Ms)} p95 · {stage.samples} samples</div>)}
    <small>Callback/update rates are not measured screen presentation. Data stays in this tab.</small>
    </>}
  </aside>;
}
