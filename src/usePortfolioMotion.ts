import { useEffect, useState, type RefObject } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(REDUCED_MOTION).matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const preference = window.matchMedia(REDUCED_MOTION);
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Reveals preserve document flow. One event-driven frame coordinator owns the
 * atmosphere, featured artwork, work viewfinder, magnetic links and project reel.
 * Scroll/pointer events only save inputs; geometry is cached separately from
 * transform writes. No scroll interception or document-wide animated variables.
 */
export function usePortfolioMotion(
  rootRef: RefObject<HTMLElement | null>,
  reducedMotion: boolean,
  suspended = false,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const originalReady = root.getAttribute('data-motion-ready');
    let observer: IntersectionObserver | undefined;

    const reveal = (element: HTMLElement) => element.classList.add('is-revealed');

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      root.removeAttribute('data-motion-ready');
      elements.forEach(reveal);
    } else {
      // Set up observation before opting into CSS that hides offscreen content.
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target as HTMLElement);
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0, rootMargin: '0px 0px -24px 0px' },
      );

      elements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight - 24) {
          reveal(element);
        } else if (!element.classList.contains('is-revealed')) {
          observer?.observe(element);
        }
      });
      root.setAttribute('data-motion-ready', 'true');
    }

    // Keyboard users must not focus controls inside an unrevealed section.
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let element = event.target.closest<HTMLElement>('[data-reveal]');
      while (element && root.contains(element)) {
        reveal(element);
        observer?.unobserve(element);
        element = element.parentElement?.closest<HTMLElement>('[data-reveal]') ?? null;
      }
    };
    root.addEventListener('focusin', onFocus);

    return () => {
      observer?.disconnect();
      root.removeEventListener('focusin', onFocus);
      if (originalReady === null) root.removeAttribute('data-motion-ready');
      else root.setAttribute('data-motion-ready', originalReady);
      // Revealed content stays revealed across pause, dialogs and StrictMode.
      // Restoring old classes here would replay previously read sections.
    };
  }, [rootRef, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const camera = root.querySelector<HTMLElement>('.cosmic-camera');
    const hero = root.querySelector<HTMLElement>('[data-cosmic-region]');
    const shell = root.querySelector<HTMLElement>('.featured-shell');
    const stage = root.querySelector<HTMLElement>('.featured-stage');
    const orb = root.querySelector<HTMLElement>('.explore-orb');
    const viewfinder = root.querySelector<HTMLElement>('.work-viewfinder');
    const viewfinderWindow = viewfinder?.querySelector<HTMLElement>('.viewfinder-window');
    const viewfinderStrip = viewfinder?.querySelector<HTMLElement>('.viewfinder-strip');
    const captionTrack = viewfinder?.querySelector<HTMLElement>('.viewfinder-caption-track');
    const reelRegion = root.querySelector<HTMLElement>('[data-reel-region]');
    const reelTrack = reelRegion?.querySelector<HTMLElement>('.project-reel-track');
    const readingProgress = root.querySelector<HTMLElement>('.reading-progress > span');
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-work-index]'));
    const originalAttributes: Array<[HTMLElement, string, string | null]> = [
      [root, 'data-atmosphere-running', root.getAttribute('data-atmosphere-running')],
      [root, 'data-pointer-ready', root.getAttribute('data-pointer-ready')],
    ];
    if (viewfinder) originalAttributes.push([viewfinder, 'data-visible', viewfinder.getAttribute('data-visible')]);
    const originalTransforms = new Map<HTMLElement, [string, string]>();
    const rememberTransform = (element: HTMLElement | null | undefined) => {
      if (element && !originalTransforms.has(element)) {
        originalTransforms.set(element, [element.style.getPropertyValue('transform'), element.style.getPropertyPriority('transform')]);
      }
    };
    [camera, stage, orb, viewfinder, viewfinderStrip, captionTrack, reelTrack, readingProgress].forEach(rememberTransform);
    const restore = () => {
      originalTransforms.forEach(([value, priority], element) => {
        if (value) element.style.setProperty('transform', value, priority);
        else element.style.removeProperty('transform');
      });
      originalAttributes.forEach(([element, attribute, value]) => {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      });
    };

    root.setAttribute('data-atmosphere-running', 'false');
    root.setAttribute('data-pointer-ready', 'false');
    viewfinder?.setAttribute('data-visible', 'false');
    if (reducedMotion || suspended || typeof window.matchMedia !== 'function') return restore;

    type Geometry = { left: number; top: number; width: number; height: number };
    type Axis = { current: number; target: number; epsilon: number };
    const axis = (initial = 0, epsilon = 0.025): Axis => ({ current: initial, target: initial, epsilon });
    const emptyGeometry = (): Geometry => ({ left: 0, top: 0, width: 0, height: 0 });
    const cameraX = axis();
    const cameraY = axis();
    const stageScale = axis(1, 0.00005);
    const orbX = axis();
    const orbY = axis();
    const finderX = axis();
    const finderY = axis();
    const reelX = axis();
    const magnets = Array.from(root.querySelectorAll<HTMLElement>('[data-magnetic]')).map((element) => {
      rememberTransform(element);
      return { element, bounds: emptyGeometry(), x: axis(), y: axis(), active: false };
    });
    const rowGeometry = new Map<HTMLElement, Geometry>();
    const preference = window.matchMedia(FINE_POINTER);
    let finePointer = preference.matches;
    let destroyed = false;
    let active = !document.hidden;
    let frame: number | null = null;
    let lastTime: number | null = null;
    let geometryDirty = true;
    let finderSizeDirty = true;
    let alignOnResume = false;
    let forcePaint = true;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let scrollY = window.scrollY;
    let scrollRange = 1;
    let paintedProgress = -1;
    let heroBounds = emptyGeometry();
    let shellBounds = emptyGeometry();
    let reelBounds = emptyGeometry();
    let reelTravel = 0;
    let reelHasFocus = false;
    let stageWidth = 0;
    let stageHeight = 0;
    let finderWidth = 320;
    let finderHeight = 230;
    let pointerX = 0;
    let pointerY = 0;
    let pointerInsideHero = false;
    let pointerInsideStage = false;
    let activeRow: HTMLElement | null = null;
    let selectedIndex = 0;
    let paintedIndex = -1;
    let finderWasVisible = false;
    let atmosphereRunning = false;
    let reelWasEnhanced = false;

    const visible = (bounds: Geometry) => bounds.width > 0 && bounds.height > 0
      && bounds.top + bounds.height > scrollY && bounds.top < scrollY + viewportHeight;
    const readGeometry = (element: HTMLElement): Geometry => {
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top + scrollY, width: bounds.width, height: bounds.height };
    };
    const measure = () => {
      // All layout reads occur in this phase, before any frame's style writes.
      if (geometryDirty) {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        scrollY = window.scrollY;
        scrollRange = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
        if (hero) heroBounds = readGeometry(hero);
        if (shell) shellBounds = readGeometry(shell);
        if (reelRegion) reelBounds = readGeometry(reelRegion);
        if (reelTrack) reelTravel = Math.max(0, reelTrack.scrollWidth - viewportWidth + Math.max(22, shellBounds.left));
        if (stage) { stageWidth = stage.offsetWidth; stageHeight = stage.offsetHeight; }
        rows.forEach((row) => rowGeometry.set(row, readGeometry(row)));
        magnets.forEach((item) => {
          const bounds = readGeometry(item.element);
          // A magnetic leaf may be its own hit area. Recover its resting box,
          // rather than feeding the translated box back into the next target.
          item.bounds = { ...bounds, left: bounds.left - item.x.current, top: bounds.top - item.y.current };
        });
        geometryDirty = false;
        finderSizeDirty = true;
      }
      if (finderSizeDirty && viewfinder) {
        finderWidth = viewfinder.offsetWidth || viewfinderWindow?.offsetWidth || finderWidth;
        finderHeight = viewfinder.offsetHeight || viewfinderWindow?.offsetHeight || finderHeight;
        finderSizeDirty = false;
      }
    };
    const paintTranslate = (element: HTMLElement | null | undefined, x: number, y: number) => {
      if (element) element.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
    };
    const requestFrame = () => {
      if (!destroyed && active && !document.hidden && frame === null) frame = window.requestAnimationFrame(tick);
    };
    const tick = (time: number) => {
      frame = null;
      if (destroyed || !active || document.hidden) return;
      measure();
      const elapsed = lastTime === null ? 1000 / 60 : clamp(time - lastTime, 0, 64);
      const damping = 1 - Math.exp(-elapsed / 70);
      lastTime = time;
      const heroVisible = Boolean(hero && visible(heroBounds));
      const stageVisible = Boolean(stage && visible(shellBounds));
      const reelEnhanced = Boolean(reelTrack && finePointer && !reelHasFocus && viewportWidth > 700);
      const reelVisible = reelEnhanced && visible(reelBounds);
      if (!reelEnhanced) { reelX.current = 0; reelX.target = 0; }
      if (activeRow) {
        // A stationary pointer can move to a different row during native scroll.
        // Resolve that hit from cached rectangles without a fresh layout read.
        const rowAtPointer = rows.find((row) => {
          const bounds = rowGeometry.get(row);
          return bounds && pointerX >= bounds.left && pointerX <= bounds.left + bounds.width
            && pointerY + scrollY >= bounds.top && pointerY + scrollY <= bounds.top + bounds.height;
        });
        activeRow = rowAtPointer ?? null;
        if (rowAtPointer) {
          const index = Number.parseInt(rowAtPointer.dataset.workIndex ?? '0', 10);
          selectedIndex = Number.isFinite(index) ? clamp(index, 0, rows.length - 1) : 0;
        }
      }
      const rowBounds = activeRow ? rowGeometry.get(activeRow) : undefined;
      const finderVisible = Boolean(finePointer && activeRow && rowBounds && visible(rowBounds));
      let unsettled = false;
      const advance = (value: Axis, enabled = true) => {
        if (!enabled) { value.target = value.current; return false; }
        const difference = value.target - value.current;
        const next = alignOnResume || Math.abs(difference) <= value.epsilon
          ? value.target : value.current + difference * damping;
        const changed = next !== value.current;
        value.current = next;
        if (next !== value.target) unsettled = true;
        return changed;
      };

      if (heroVisible) {
        const relativeX = finePointer && pointerInsideHero
          ? clamp((pointerX - heroBounds.left) / Math.max(heroBounds.width, 1) * 2 - 1, -1, 1) : 0;
        const relativeY = finePointer && pointerInsideHero
          ? clamp((pointerY + scrollY - heroBounds.top) / Math.max(heroBounds.height, 1) * 2 - 1, -1, 1) : 0;
        cameraX.target = relativeX * 12;
        cameraY.target = relativeY * 8 + clamp((scrollY - heroBounds.top) * 0.045, -8, 32);
      }
      if (stageVisible) {
        const progress = clamp((viewportHeight - (shellBounds.top - scrollY)) / Math.max(viewportHeight * 0.82, 1), 0, 1);
        stageScale.target = 0.965 + progress * 0.035;
      }
      if (reelVisible) {
        const progress = clamp((viewportHeight * 0.9 + scrollY - reelBounds.top) / Math.max(viewportHeight * 0.75, 1), 0, 1);
        const lead = viewportWidth * 0.02;
        reelX.target = lead - progress * (reelTravel + lead);
      }
      if (stageVisible && finePointer && pointerInsideStage) {
        const centerX = shellBounds.left + stageWidth / 2;
        const centerY = shellBounds.top - scrollY + stageHeight / 2;
        const horizontalLimit = Math.max(0, stageWidth / 2 - 86);
        const verticalLimit = Math.max(0, stageHeight / 2 - 40);
        orbX.target = clamp((pointerX - centerX) / stageScale.current, -horizontalLimit, horizontalLimit);
        orbY.target = clamp((pointerY - centerY) / stageScale.current, -verticalLimit, verticalLimit);
      } else { orbX.target = 0; orbY.target = 0; }
      if (finderVisible) {
        const marginX = Math.min(finderWidth / 2 + 16, viewportWidth / 2);
        const marginY = Math.min(finderHeight / 2 + 16, viewportHeight / 2);
        finderX.target = clamp(pointerX + 22, marginX, viewportWidth - marginX);
        finderY.target = clamp(pointerY - 16, marginY, viewportHeight - marginY);
        if (!finderWasVisible) {
          finderX.current = finderX.target;
          finderY.current = finderY.target;
        }
      }
      magnets.forEach((item) => {
        if (finePointer && item.active && visible(item.bounds)) {
          item.x.target = clamp((pointerX - item.bounds.left - item.bounds.width / 2) * 0.2, -14, 14);
          item.y.target = clamp((pointerY + scrollY - item.bounds.top - item.bounds.height / 2) * 0.2, -10, 10);
        } else { item.x.target = 0; item.y.target = 0; }
      });

      // Pure number updates precede the transform/attribute write phase.
      const cameraChanged = [advance(cameraX, heroVisible), advance(cameraY, heroVisible)].some(Boolean);
      const stageChanged = advance(stageScale, stageVisible);
      const orbChanged = [advance(orbX, stageVisible), advance(orbY, stageVisible)].some(Boolean);
      const finderChanged = [advance(finderX, finderVisible), advance(finderY, finderVisible)].some(Boolean);
      const reelChanged = advance(reelX, reelVisible);
      const magnetChanges = magnets.map((item) =>
        [advance(item.x, visible(item.bounds)), advance(item.y, visible(item.bounds))].some(Boolean));
      if (heroVisible !== atmosphereRunning || forcePaint) {
        root.setAttribute('data-atmosphere-running', heroVisible ? 'true' : 'false');
        atmosphereRunning = heroVisible;
      }
      if (cameraChanged || forcePaint) paintTranslate(camera, cameraX.current, cameraY.current);
      if ((stageChanged || forcePaint) && stage) stage.style.transform = `scale(${stageScale.current.toFixed(5)})`;
      if (orbChanged || forcePaint) paintTranslate(orb, orbX.current, orbY.current);
      if (finderChanged || forcePaint || finderVisible !== finderWasVisible) paintTranslate(viewfinder, finderX.current, finderY.current);
      if (finderVisible !== finderWasVisible || forcePaint) viewfinder?.setAttribute('data-visible', finderVisible ? 'true' : 'false');
      if (selectedIndex !== paintedIndex) {
        if (viewfinderStrip) viewfinderStrip.style.transform = `translate3d(0, ${-selectedIndex * 100}%, 0)`;
        if (captionTrack) captionTrack.style.transform = `translate3d(0, ${-selectedIndex * 100}%, 0)`;
        paintedIndex = selectedIndex;
      }
      if (reelEnhanced) {
        if (reelChanged || forcePaint || !reelWasEnhanced) paintTranslate(reelTrack, reelX.current, 0);
      } else if (reelTrack && (reelWasEnhanced || forcePaint)) {
        const original = originalTransforms.get(reelTrack);
        if (original?.[0]) reelTrack.style.setProperty('transform', original[0], original[1]);
        else reelTrack.style.removeProperty('transform');
      }
      reelWasEnhanced = reelEnhanced;
      magnets.forEach((item, index) => {
        if (magnetChanges[index] || forcePaint) paintTranslate(item.element, item.x.current, item.y.current);
      });
      const progress = clamp(scrollY / scrollRange, 0, 1);
      if (readingProgress && (progress !== paintedProgress || forcePaint)) {
        readingProgress.style.transform = `scaleX(${progress.toFixed(5)})`;
        paintedProgress = progress;
      }
      finderWasVisible = finderVisible;
      forcePaint = false;
      alignOnResume = false;
      if (unsettled) requestFrame();
      else lastTime = null;
    };

    const cleanups: Array<() => void> = [];
    const listen = <K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, listener: (event: HTMLElementEventMap[K]) => void) => {
      element.addEventListener(type, listener, { passive: true });
      cleanups.push(() => element.removeEventListener(type, listener));
    };
    const updatePointer = (event: PointerEvent) => {
      if (!finePointer || !active || event.pointerType !== 'mouse') return false;
      pointerX = event.clientX;
      pointerY = event.clientY;
      return true;
    };
    const clearPointer = () => {
      pointerInsideHero = false;
      pointerInsideStage = false;
      activeRow = null;
      magnets.forEach((item) => { item.active = false; });
      requestFrame();
    };
    listen(root, 'pointermove', (event) => { if (updatePointer(event)) requestFrame(); });
    listen(root, 'pointerleave', clearPointer);
    listen(root, 'pointercancel', clearPointer);
    if (hero) {
      listen(hero, 'pointerenter', (event) => { if (updatePointer(event)) { pointerInsideHero = true; requestFrame(); } });
      listen(hero, 'pointermove', (event) => { if (updatePointer(event)) pointerInsideHero = true; });
      listen(hero, 'pointerleave', () => { pointerInsideHero = false; requestFrame(); });
    }
    if (stage) {
      listen(stage, 'pointerenter', (event) => { if (updatePointer(event)) { pointerInsideStage = true; requestFrame(); } });
      listen(stage, 'pointermove', (event) => { if (updatePointer(event)) pointerInsideStage = true; });
      listen(stage, 'pointerleave', () => { pointerInsideStage = false; requestFrame(); });
    }
    rows.forEach((row) => {
      const enter = (event: PointerEvent) => {
        if (!updatePointer(event)) return;
        if (activeRow !== row) {
          activeRow = row;
          const requestedIndex = Number.parseInt(row.dataset.workIndex ?? '0', 10);
          selectedIndex = Number.isFinite(requestedIndex) ? clamp(requestedIndex, 0, rows.length - 1) : 0;
          finderSizeDirty = true;
          geometryDirty = true;
        }
        requestFrame();
      };
      listen(row, 'pointerenter', enter);
      listen(row, 'pointermove', enter);
      listen(row, 'pointerleave', (event) => {
        // Crossing directly into another row keeps the same physical panel.
        const nextRow = event.relatedTarget instanceof Element ? event.relatedTarget.closest<HTMLElement>('[data-work-index]') : null;
        if (!nextRow || !rows.includes(nextRow)) { activeRow = null; requestFrame(); }
      });
    });
    magnets.forEach((item) => {
      listen(item.element, 'pointerenter', (event) => {
        if (!updatePointer(event)) return;
        item.active = true;
        geometryDirty = true;
        requestFrame();
      });
      listen(item.element, 'pointermove', (event) => { if (updatePointer(event)) item.active = true; });
      const leave = () => { item.active = false; requestFrame(); };
      listen(item.element, 'pointerleave', leave);
      listen(item.element, 'pointercancel', leave);
      listen(item.element, 'blur', leave);
    });
    const invalidateGeometry = () => {
      if (destroyed) return;
      geometryDirty = true;
      requestFrame();
    };
    if (reelRegion) {
      listen(reelRegion, 'focusin', () => { reelHasFocus = true; invalidateGeometry(); });
      listen(reelRegion, 'focusout', (event) => {
        reelHasFocus = event.relatedTarget instanceof Element && reelRegion.contains(event.relatedTarget);
        invalidateGeometry();
      });
    }
    listen(root, 'transitionend', (event) => {
      if (event.propertyName === 'translate') invalidateGeometry();
    });
    const onScroll = () => {
      if (!active) return;
      scrollY = window.scrollY;
      requestFrame();
    };
    const onVisibility = () => {
      active = !document.hidden;
      if (!active) {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        lastTime = null;
        root.setAttribute('data-atmosphere-running', 'false');
        viewfinder?.setAttribute('data-visible', 'false');
        atmosphereRunning = false;
        finderWasVisible = false;
        clearPointer();
      } else {
        alignOnResume = true;
        forcePaint = true;
        invalidateGeometry();
      }
    };
    const onPointerPreference = () => {
      finePointer = preference.matches;
      root.setAttribute('data-pointer-ready', finePointer ? 'true' : 'false');
      clearPointer();
      invalidateGeometry();
    };
    // Keyboard focus uses the actual project buttons. It never summons a
    // pointer-positioned panel, even if the mouse happens to remain over a row.
    const onKeyDown = () => clearPointer();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', invalidateGeometry, { passive: true });
    window.addEventListener('blur', clearPointer);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    preference.addEventListener('change', onPointerPreference);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidateGeometry) : null;
    [root, hero, shell, reelRegion, reelTrack, viewfinder].forEach((element) => { if (element) resizeObserver?.observe(element); });
    const fonts = document.fonts;
    fonts?.ready.then(invalidateGeometry);
    fonts?.addEventListener('loadingdone', invalidateGeometry);
    root.setAttribute('data-pointer-ready', finePointer ? 'true' : 'false');
    requestFrame();

    return () => {
      destroyed = true;
      active = false;
      if (frame !== null) window.cancelAnimationFrame(frame);
      cleanups.forEach((remove) => remove());
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', invalidateGeometry);
      window.removeEventListener('blur', clearPointer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
      preference.removeEventListener('change', onPointerPreference);
      resizeObserver?.disconnect();
      fonts?.removeEventListener('loadingdone', invalidateGeometry);
      restore();
    };
  }, [rootRef, reducedMotion, suspended]);
}
