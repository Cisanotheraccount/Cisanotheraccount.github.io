import { useEffect, type RefObject } from 'react';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Channel = {
  property: string;
  unit: '' | 'px';
  resting: number;
  current: number;
  target: number;
  epsilon: number;
  originalValue: string;
  originalPriority: string;
};

/**
 * Mark stable wrappers with data-cosmic-region and data-cosmic-reveal; apply
 * transforms only to their decorative children, never to the measured wrappers.
 * CSS should pause its atmosphere animation unless data-atmosphere-running=true.
 * Names and body text should not consume these decorative motion variables.
 */
export function useCosmicMotion(
  rootRef: RefObject<HTMLElement | null>,
  reducedMotion: boolean,
  paused: boolean,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const originalRunning = root.getAttribute('data-atmosphere-running');
    const channel = (property: string, unit: '' | 'px', resting: number): Channel => ({
      property,
      unit,
      resting,
      current: resting,
      target: resting,
      epsilon: unit === 'px' ? 0.01 : 0.00005,
      originalValue: root.style.getPropertyValue(property),
      originalPriority: root.style.getPropertyPriority(property),
    });
    const x = channel('--space-x', 'px', 0);
    const y = channel('--space-y', 'px', 0);
    const scrollY = channel('--space-scroll-y', 'px', 0);
    const reveal = channel('--stage-reveal', '', 1);
    const scale = channel('--stage-scale', '', 1);
    const channels = [x, y, scrollY, reveal, scale];

    const write = (value: Channel) => {
      root.style.setProperty(value.property, `${value.current.toFixed(5)}${value.unit}`);
    };

    const setResting = () => {
      root.setAttribute('data-atmosphere-running', 'false');
      channels.forEach((value) => {
        value.current = value.resting;
        value.target = value.resting;
        write(value);
      });
    };

    const restore = () => {
      if (originalRunning === null) root.removeAttribute('data-atmosphere-running');
      else root.setAttribute('data-atmosphere-running', originalRunning);
      channels.forEach((value) => {
        if (value.originalValue) {
          root.style.setProperty(value.property, value.originalValue, value.originalPriority);
        } else {
          root.style.removeProperty(value.property);
        }
      });
    };

    setResting();
    const hero = root.querySelector<HTMLElement>('[data-cosmic-region]');
    const stage = root.querySelector<HTMLElement>('[data-cosmic-reveal]');

    // Static content is the fallback when visibility observation is unavailable.
    // It avoids a scroll listener that could keep decorative work alive offscreen.
    if (!hero || reducedMotion || paused || typeof IntersectionObserver === 'undefined') {
      return restore;
    }

    const pointerPreference = typeof window.matchMedia === 'function'
      ? window.matchMedia(FINE_POINTER)
      : null;
    let running = false;
    let destroyed = false;
    let frame: number | null = null;
    let previousFrameTime: number | null = null;
    let removeActiveListeners: Array<() => void> = [];

    const heroIsVisible = () => {
      const bounds = hero.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0
        && bounds.bottom > 0 && bounds.top < window.innerHeight
        && bounds.right > 0 && bounds.left < window.innerWidth;
    };

    const tick = (time: number) => {
      frame = null;
      if (destroyed || !running || document.hidden) return;

      const elapsed = previousFrameTime === null
        ? 1000 / 60
        : clamp(time - previousFrameTime, 0, 64);
      previousFrameTime = time;
      const damping = 1 - Math.exp(-elapsed / 100);
      let unsettled = false;

      channels.forEach((value) => {
        const distance = value.target - value.current;
        const next = Math.abs(distance) <= value.epsilon
          ? value.target
          : value.current + distance * damping;
        if (next !== value.current) {
          value.current = next;
          write(value);
        }
        if (next !== value.target) unsettled = true;
      });

      if (unsettled) frame = window.requestAnimationFrame(tick);
      else previousFrameTime = null;
    };

    const requestTick = () => {
      if (destroyed || !running || document.hidden || frame !== null) return;
      if (channels.some((value) => value.current !== value.target)) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const resetPointer = () => {
      x.target = 0;
      y.target = 0;
      requestTick();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = hero.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      x.target = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1) * 9;
      y.target = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1) * 6;
      requestTick();
    };

    const readTargets = () => {
      const heroBounds = hero.getBoundingClientRect();
      scrollY.target = clamp(-heroBounds.top * 0.035, -28, 28);
      if (stage) {
        const viewportHeight = Math.max(1, window.innerHeight);
        const stageTop = stage.getBoundingClientRect().top;
        reveal.target = clamp((viewportHeight - stageTop) / (viewportHeight * 0.75), 0, 1);
        scale.target = 0.97 + reveal.target * 0.03;
      }
    };

    const stop = (reset = false) => {
      running = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      previousFrameTime = null;
      removeActiveListeners.forEach((remove) => remove());
      removeActiveListeners = [];
      if (reset) {
        setResting();
      } else {
        // A fixed atmosphere remains visible beyond the hero. Freeze its last
        // rendered position when inactive instead of jumping back to the origin.
        root.setAttribute('data-atmosphere-running', 'false');
        channels.forEach((value) => { value.target = value.current; });
      }
    };

    const onScroll = () => {
      // Stop immediately on a scroll past the hero, without waiting for the
      // observer's next asynchronous notification. The observer handles reentry.
      if (!heroIsVisible()) {
        stop();
        return;
      }
      readTargets();
      requestTick();
    };

    const onResize = () => {
      resetPointer();
      onScroll();
    };

    const start = () => {
      if (destroyed || running || document.hidden || !heroIsVisible()) return;
      running = true;
      root.setAttribute('data-atmosphere-running', 'true');

      // Align with the current reading position on entry; never replay a long
      // interpolation from a stale scroll position after a hidden tab resumes.
      readTargets();
      channels.forEach((value) => {
        value.current = value.target;
        write(value);
      });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      removeActiveListeners.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      });

      if (pointerPreference?.matches) {
        hero.addEventListener('pointermove', onPointerMove, { passive: true });
        hero.addEventListener('pointerleave', resetPointer);
        hero.addEventListener('pointercancel', resetPointer);
        window.addEventListener('blur', resetPointer);
        removeActiveListeners.push(() => {
          hero.removeEventListener('pointermove', onPointerMove);
          hero.removeEventListener('pointerleave', resetPointer);
          hero.removeEventListener('pointercancel', resetPointer);
          window.removeEventListener('blur', resetPointer);
        });
      }
    };

    const synchronize = () => {
      if (destroyed) return;
      if (document.hidden || !heroIsVisible()) stop();
      else start();
    };

    const refreshPointerMode = () => {
      if (destroyed) return;
      stop(true);
      synchronize();
    };

    // A second tiny threshold catches reentry after a zero-area edge contact.
    const observer = new IntersectionObserver(synchronize, { threshold: [0, 0.001] });
    observer.observe(hero);
    document.addEventListener('visibilitychange', synchronize);
    pointerPreference?.addEventListener('change', refreshPointerMode);
    synchronize();

    return () => {
      destroyed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', synchronize);
      pointerPreference?.removeEventListener('change', refreshPointerMode);
      stop(true);
      restore();
    };
  }, [rootRef, reducedMotion, paused]);
}
