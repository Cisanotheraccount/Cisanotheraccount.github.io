import { useEffect, useLayoutEffect } from 'react';
import Lenis from 'lenis';

export type FramePhase = 'scroll' | 'measure' | 'update' | 'render';
type Frame = (time: number, delta: number) => boolean | void;
const phases: FramePhase[] = ['scroll', 'measure', 'update', 'render'];
const subscribers = new Map<FramePhase, Set<Frame>>(phases.map(phase => [phase, new Set()]));
const pointer = { x: 0, y: 0, inside: false, speedX: 0, speedY: 0, lastMoved: 0, kind: 'mouse' };
const snapshot = { time: 0, delta: 1 / 60, scrollY: 0, scrollSpeed: 0, width: 0, height: 0, pointer };
let frame = 0, previous = 0, previousScroll: number | null = null;
let lenis: Lenis | undefined;
let scrollLocked = false;

export const getFrameSnapshot = () => snapshot;
export function requestFrame() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
}
function tick(now: number) {
  frame = 0;
  const delta = Math.min(.05, previous ? (now - previous) / 1000 : 1 / 60);
  previous = now;
  let active = false;
  for (const phase of phases) {
    if (phase === 'measure') {
      const y = window.scrollY;
      snapshot.time = now; snapshot.delta = delta;
      snapshot.scrollSpeed = previousScroll === null ? 0 : (y - previousScroll) / Math.max(delta, 1 / 240);
      snapshot.scrollY = y; previousScroll = y;
      snapshot.width = document.documentElement.clientWidth; snapshot.height = innerHeight;
      if (now - pointer.lastMoved > 70) { pointer.speedX = 0; pointer.speedY = 0; }
    }
    for (const subscriber of subscribers.get(phase)!) active = !!subscriber(now, delta) || active;
  }
  if (active) requestFrame();
}
export function subscribeFrame(fn: Frame, phase: FramePhase = 'update') {
  const group = subscribers.get(phase)!;
  group.add(fn); requestFrame();
  return () => {
    group.delete(fn);
    if (phases.every(p => !subscribers.get(p)!.size)) {
      cancelAnimationFrame(frame); frame = 0; previous = 0; previousScroll = null;
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
  if (value) {
    lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
    lenis?.stop();
    // Also cancel an in-flight native smooth scroll on touch devices.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
  } else lenis?.start();
  resetScrollSample();
}
export function scrollToPage(top: number, { immediate = false }: { immediate?: boolean } = {}) {
  const target = Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
  if (lenis) lenis.scrollTo(target, { immediate, force: true });
  else window.scrollTo({ top: target, behavior: immediate ? 'instant' : 'smooth' });
  if (immediate) resetScrollSample();
  requestFrame();
}

export function useSmoothScene(disabled: boolean, locked: boolean) {
  useLayoutEffect(() => { setScrollLocked(locked); }, [locked]);
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
    const wake = () => requestFrame();
    const move = (event: PointerEvent) => {
      const now = performance.now(), dt = Math.max((now - pointer.lastMoved) / 1000, 1 / 240);
      pointer.speedX = pointer.inside ? (event.clientX - pointer.x) / dt : 0;
      pointer.speedY = pointer.inside ? (event.clientY - pointer.y) / dt : 0;
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.inside = true;
      pointer.kind = event.pointerType; pointer.lastMoved = now; requestFrame();
    };
    const leave = () => { pointer.inside = false; pointer.speedX = 0; pointer.speedY = 0; requestFrame(); };
    const visibility = () => {
      previous = 0; resetScrollSample(); leave();
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestFrame();
    };
    const resize = () => { lenis?.resize(); resetScrollSample(); };
    configure(); media.addEventListener('change', configure);
    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave); window.addEventListener('resize', resize);
    window.addEventListener('pageshow', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      off?.(); lenis?.destroy(); lenis = undefined;
      media.removeEventListener('change', configure);
      window.removeEventListener('wheel', wake); window.removeEventListener('scroll', wake);
      window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave); window.removeEventListener('resize', resize);
      window.removeEventListener('pageshow', resize); document.removeEventListener('visibilitychange', visibility);
    };
  }, [disabled]);
}
