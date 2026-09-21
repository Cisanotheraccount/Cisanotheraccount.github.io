import { useEffect, useLayoutEffect } from 'react';
import Lenis from 'lenis';
import { PerformanceGovernor, type PerformanceScene } from './performanceGovernor';
import { performancePolicy } from './performanceConfig';
import { sharedPointer, installInputState, setScrollSource, recordScrollInput } from './inputState';
import { installLayoutSnapshot, invalidateLayout, prepareLayoutSnapshot, getLayoutRevision, getLayoutRect } from './layoutSnapshot';
import { recordTouchMetric, recordTouchEvent, sampleTouchMetric } from './touchDiagnostics';

export type FramePhase = 'scroll' | 'measure' | 'update' | 'render';
type Frame = (time: number, delta: number) => boolean | void;
const phases: FramePhase[] = ['scroll', 'measure', 'update', 'render'];
const subscribers = new Map<FramePhase, Set<Frame>>(phases.map(phase => [phase, new Set()]));
const pointer = sharedPointer;
const snapshot = { time: 0, delta: 1 / 60, elapsed: 1 / 60, nativeDelta: 1 / 60, targetFps: 60, scrollY: 0, scrollSpeed: 0, width: 0, height: 0, pointer };
let frame = 0, previous = 0, previousScroll: number | null = null;
let lenis: Lenis | undefined;
let scrollLocked = false;
const governor = new PerformanceGovernor();
const sceneRoots = new Map<PerformanceScene, { element: HTMLElement; top: number; bottom: number }>();
const performanceListeners = new Set<() => void>();
export type ViewportChange = { kind: 'layout' | 'height'; width: number; height: number; dpr: number };
const viewportListeners = new Set<(change?: ViewportChange) => void>();
let continuous = false, motionDisabled = false, nativePrevious = 0, nativeScrollAt = -Infinity, lastNotify = 0;
let viewportKey = '';
let sceneLayoutRevision = -1;

export const getPerformanceSnapshot = (scene?: PerformanceScene) => governor.getSnapshot(scene);
export function subscribePerformance(listener: () => void) { performanceListeners.add(listener); return () => { performanceListeners.delete(listener); }; }
export function subscribeViewportChange(listener: (change?: ViewportChange) => void) { viewportListeners.add(listener); return () => { viewportListeners.delete(listener); }; }
export function setPerformanceReady(scene: PerformanceScene, ready: boolean) { governor.setReady(scene, ready, performance.now()); }
export function reportGpuTime(scene: PerformanceScene, milliseconds: number) { governor.recordGpuTime(milliseconds, scene); }
export function registerPerformanceScene(scene: PerformanceScene, element: HTMLElement) {
  const entry = { element, top: 0, bottom: 0 }; sceneRoots.set(scene, entry);
  const resize = () => {
    const box = element.getBoundingClientRect(); entry.top = box.top + window.scrollY; entry.bottom = entry.top + box.height;
    requestFrame();
  };
  const observer = new ResizeObserver(resize); observer.observe(element); resize();
  return () => { observer.disconnect(); if (sceneRoots.get(scene) === entry) sceneRoots.delete(scene); };
}
export function nativeScrollNeedsFallback() {
  const performance = getPerformanceSnapshot();
  return (performance.observedHz === null || performance.targetFps < performance.observedHz * .9)
    && window.performance.now() - nativeScrollAt < performancePolicy.nativeScrollSettleMs;
}

export const getFrameSnapshot = () => snapshot;
export function requestFrame() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
}
function tick(now: number) {
  frame = 0;
  const started = performance.now();
  if (sceneLayoutRevision !== getLayoutRevision()) {
    sceneLayoutRevision = getLayoutRevision();
    for (const bounds of sceneRoots.values()) {
      const box = getLayoutRect(bounds.element);
      bounds.top = box.top + window.scrollY; bounds.bottom = bounds.top + box.height;
    }
  }
  const center = window.scrollY + innerHeight * .45;
  let currentScene: PerformanceScene | null = null;
  for (const [name, bounds] of sceneRoots) if (center >= bounds.top && center < bounds.bottom) currentScene = name;
  if (!currentScene) {
    let largest = 0;
    for (const [name, bounds] of sceneRoots) {
      const overlap = Math.min(bounds.bottom, window.scrollY + innerHeight) - Math.max(bounds.top, window.scrollY);
      if (overlap > largest) { largest = overlap; currentScene = name; }
    }
  }
  governor.setScene(currentScene, now);
  const measuring = !motionDisabled && !scrollLocked && currentScene !== null;
  if (measuring) governor.observeNativeFrame(now);
  snapshot.nativeDelta = nativePrevious ? (now - nativePrevious) / 1000 : 1 / 60; nativePrevious = now;
  // Every raw callback reaches the cadence estimator, including callbacks which
  // deliberately skip the entire dependent scroll/update/render pipeline.
  if (!governor.shouldRender(now, !continuous)) { requestFrame(); return; }
  const elapsed = previous ? (now - previous) / 1000 : 1 / 60;
  const delta = Math.min(.05, elapsed);
  previous = now;
  snapshot.elapsed = elapsed; snapshot.targetFps = getPerformanceSnapshot().targetFps;
  let active = false;
  for (const phase of phases) {
    if (phase === 'measure') {
      const y = window.scrollY;
      snapshot.time = now; snapshot.delta = delta;
      snapshot.scrollSpeed = previousScroll === null ? 0 : (y - previousScroll) / Math.max(delta, 1 / 240);
      snapshot.scrollY = y; previousScroll = y;
      snapshot.width = document.documentElement.clientWidth; snapshot.height = innerHeight;
      prepareLayoutSnapshot();
      if (now - pointer.lastMoved > 70) { pointer.speedX = 0; pointer.speedY = 0; }
    }
    const phaseStart = performance.now();
    for (const subscriber of subscribers.get(phase)!) active = !!subscriber(now, delta) || active;
    sampleTouchMetric(`${phase}Ms`, performance.now() - phaseStart);
  }
  if (measuring && active) governor.recordFrame(now, performance.now() - started);
  if (performanceListeners.size && now - lastNotify >= performancePolicy.diagnosticIntervalMs) { lastNotify = now; performanceListeners.forEach(listener => listener()); }
  continuous = active;
  if (active) requestFrame();
  else { previous = 0; nativePrevious = 0; governor.suspend(); }
}
export function subscribeFrame(fn: Frame, phase: FramePhase = 'update') {
  const group = subscribers.get(phase)!;
  group.add(fn); requestFrame();
  return () => {
    group.delete(fn);
    if (phases.every(p => !subscribers.get(p)!.size)) {
      cancelAnimationFrame(frame); frame = 0; previous = 0; previousScroll = null; continuous = false; nativePrevious = 0; governor.suspend();
    }
  };
}
export function resetScrollSample() {
  previousScroll = window.scrollY;
  snapshot.scrollY = previousScroll; snapshot.scrollSpeed = 0;
  requestFrame();
}
export function setScrollLocked(value: boolean) {
  if (value === scrollLocked) return;
  scrollLocked = value;
  governor.suspend();
  invalidateLayout('detail-lock');
  if (value) {
    lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
    lenis?.stop();
    // Also cancel an in-flight native smooth scroll on touch devices.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
  } else lenis?.start();
  resetScrollSample();
}
export function scrollToPage(top: number, { immediate = false }: { immediate?: boolean } = {}) {
  setScrollSource('programmatic');
  const target = Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
  if (lenis) lenis.scrollTo(target, { immediate, force: true });
  else window.scrollTo({ top: target, behavior: immediate ? 'instant' : 'smooth' });
  if (immediate) resetScrollSample();
  requestFrame();
}

export function useSmoothScene(disabled: boolean, locked: boolean) {
  useLayoutEffect(() => { setScrollLocked(locked); }, [locked]);
  useLayoutEffect(() => { motionDisabled = disabled; governor.suspend(); }, [disabled]);
  useEffect(() => {
    const media = matchMedia('(pointer: fine)');
    let off: (() => void) | undefined;
    const configure = () => {
      off?.(); lenis?.destroy(); lenis = undefined;
      if (!disabled && media.matches) {
        lenis = new Lenis({ autoRaf: false, lerp: .14, smoothWheel: true, syncTouch: false, anchors: false, prevent: node => !!node.closest('dialog, [data-native-scroll]') });
        if (scrollLocked) lenis.stop();
        off = subscribeFrame(time => { lenis?.raf(time); return lenis?.isScrolling === 'smooth'; }, 'scroll');
      }
      resetScrollSample();
    };
    const offInput = installInputState(requestFrame);
    const offLayout = installLayoutSnapshot(requestFrame);
    const wake = () => { setScrollSource(lenis ? 'wheel-smooth' : 'native'); requestFrame(); };
    const scroll = () => {
      recordScrollInput(lenis?.isScrolling === 'smooth');
      if (!scrollLocked && lenis?.isScrolling !== 'smooth') {
        nativeScrollAt = performance.now();
      }
      requestFrame();
    };
    const visibility = () => {
      previous = 0; nativePrevious = 0; continuous = false; governor.suspend(); resetScrollSample();
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestFrame();
    };
    const resize = () => {
      const width = document.documentElement.clientWidth, height = innerHeight, dpr = devicePixelRatio;
      const key = `${width}:${dpr}:${screen.orientation?.angle ?? window.orientation ?? 0}`;
      const realLayout = viewportKey !== key;
      viewportKey = key;
      lenis?.resize();
      // Mobile browser bars resize the visual height repeatedly while scrolling.
      // They must not restart cadence qualification or zero the scroll velocity.
      if (realLayout) {
        resetScrollSample(); invalidateLayout('viewport-layout');
        governor.resetMeasurements(performance.now(), 'Layout width, orientation or DPR changed');
        recordTouchMetric('governorViewportResets');
        for (const bounds of sceneRoots.values()) { const box = bounds.element.getBoundingClientRect(); bounds.top = box.top + scrollY; bounds.bottom = bounds.top + box.height; }
      }
      const change: ViewportChange = { kind: realLayout ? 'layout' : 'height', width, height, dpr };
      recordTouchEvent('viewport', change);
      viewportListeners.forEach(listener => listener(change)); requestFrame();
    };
    // Some browsers change DPR without changing the window's CSS dimensions.
    // Re-arm the query at the new ratio; it creates no polling or permission request.
    let resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    const densityChanged = () => {
      resolution.removeEventListener('change', densityChanged);
      resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      resolution.addEventListener('change', densityChanged); resize();
    };
    resolution.addEventListener('change', densityChanged);
    viewportKey = `${document.documentElement.clientWidth}:${devicePixelRatio}:${screen.orientation?.angle ?? window.orientation ?? 0}`;
    configure(); media.addEventListener('change', configure);
    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true, capture: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      off?.(); offInput(); offLayout(); lenis?.destroy(); lenis = undefined;
      media.removeEventListener('change', configure);
      resolution.removeEventListener('change', densityChanged);
      window.removeEventListener('wheel', wake); window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pageshow', resize); document.removeEventListener('visibilitychange', visibility);
    };
  }, [disabled]);
}
