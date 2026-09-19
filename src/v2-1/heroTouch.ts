import { beginGlassTouch, endGlassTouch, getInputState, moveGlassTouch, subscribeInputChange } from './inputState';
import { recordTouchEvent, recordTouchMetric } from './touchDiagnostics';

/** A narrow, projected wordmark target. It never changes the page's scroll policy. */
export function bindHeroTouch(target: HTMLElement, canvas: HTMLElement) {
  let pointerId: number | null = null, boundsReady = false, disposed = false;

  const release = (reason: string, event?: PointerEvent) => {
    if (pointerId === null) return;
    const releasedId = pointerId;
    pointerId = null;
    endGlassTouch(event);
    if (target.hasPointerCapture(releasedId)) {
      try { target.releasePointerCapture(releasedId); } catch { /* Already cancelled by the browser. */ }
    }
    target.dataset.touchState = boundsReady && getInputState().touchCapable ? 'ready' : 'inactive';
    recordTouchEvent('glass-touch-end', { reason, pointerId: releasedId });
  };
  const availability = () => {
    const input = getInputState();
    if (input.touchCount > 1) release('multiple-contacts');
    const available = boundsReady && input.touchCapable;
    target.dataset.touchAvailable = String(available);
    if (pointerId === null) target.dataset.touchState = available ? 'ready' : 'inactive';
  };
  const align = () => {
    if (disposed) return;
    try {
      const box = JSON.parse(canvas.dataset.touchRect ?? canvas.dataset.wordRect ?? 'null') as { left: number; top: number; width: number; height: number } | null;
      boundsReady = !!box && [box.left, box.top, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0;
      if (boundsReady && box) {
        // The canvas and target share the hero's containing block. Keep every
        // subpixel of the same projected bounds; no viewport-width heuristic.
        target.style.transform = `translate3d(${box.left}px,${box.top}px,0)`;
        target.style.width = `${box.width}px`; target.style.height = `${box.height}px`;
      }
    } catch { boundsReady = false; }
    availability();
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !boundsReady || pointerId !== null || getInputState().touchCount > 1) return;
    if (!beginGlassTouch(event)) return;
    pointerId = event.pointerId;
    // touch-action is installed before the gesture starts. Do not preventDefault:
    // the browser must retain its two-finger zoom and pointercancel behavior.
    try { target.setPointerCapture(pointerId); }
    catch { release('capture-unavailable', event); return; }
    target.dataset.touchState = 'dragging';
    recordTouchMetric('glassGestures');
    recordTouchEvent('glass-touch-start', { pointerId, x: event.clientX, y: event.clientY });
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || event.pointerType !== 'touch') return;
    if (getInputState().touchCount > 1) { release('multiple-contacts'); return; }
    moveGlassTouch(event);
    recordTouchMetric('glassTouchMoves');
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId === pointerId) release(event.type, event);
  };
  const anotherContact = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && pointerId !== null && event.pointerId !== pointerId) release('second-finger');
  };
  const blur = () => release('blur');
  const visibility = () => { if (document.hidden) release('hidden'); };
  const observer = new MutationObserver(align);
  observer.observe(canvas, { attributes: true, attributeFilter: ['data-word-rect', 'data-touch-rect'] });
  const unsubscribe = subscribeInputChange(availability);
  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
  target.addEventListener('lostpointercapture', up);
  // A second finger can start outside the wordmark. Listen without consuming it.
  window.addEventListener('pointerdown', anotherContact, { capture: true, passive: true });
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);
  align();
  return () => {
    disposed = true; release('disabled'); observer.disconnect(); unsubscribe();
    target.dataset.touchAvailable = 'false'; target.dataset.touchState = 'inactive';
    target.removeEventListener('pointerdown', down); target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up); target.removeEventListener('lostpointercapture', up);
    window.removeEventListener('pointerdown', anotherContact, true); window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility);
  };
}
