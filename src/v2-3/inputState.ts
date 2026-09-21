/** Capability is stable for this visit; actual pointer and scroll source are separate. */
export const sharedPointer = { x: 0, y: 0, inside: false, speedX: 0, speedY: 0, lastMoved: 0,
  kind: 'mouse', pressed: false, pointerId: null as number | null, glassTouch: false, contacts: 0 };
const state = { touchCapable: navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches,
  pointerType: 'mouse', touchCount: 0, pressed: false, scrollSource: 'idle' as 'idle' | 'touch-native' | 'wheel-smooth' | 'native' | 'programmatic' };
const contacts = new Set<number>();
const listeners = new Set<() => void>();
let wake = () => {};
let sourceAt = -Infinity, scrollAt = -Infinity;
export const getInputState = () => {
  if (performance.now() - Math.max(sourceAt, scrollAt) > 300) state.scrollSource = 'idle';
  return state;
};
export function subscribeInputChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
const notify = () => { listeners.forEach(fn => fn()); wake(); };
export function setScrollSource(source: typeof state.scrollSource) { state.scrollSource = source; sourceAt = performance.now(); }
export function recordScrollInput(smooth: boolean) {
  const now = performance.now();
  if (now - sourceAt > 500 && now - scrollAt > 250) state.scrollSource = 'native';
  if (smooth && state.scrollSource !== 'programmatic') state.scrollSource = 'wheel-smooth';
  scrollAt = now;
}
function position(event: PointerEvent, initial = false) {
  const p = sharedPointer, now = performance.now(), dt = Math.max((now - p.lastMoved) / 1000, 1 / 240);
  p.speedX = !initial && p.inside ? (event.clientX - p.x) / dt : 0;
  p.speedY = !initial && p.inside ? (event.clientY - p.y) / dt : 0;
  p.x = event.clientX; p.y = event.clientY; p.inside = true;
  p.kind = event.pointerType || 'mouse'; p.lastMoved = now; wake();
}
export function endGlassTouch(event?: PointerEvent) {
  if (event && sharedPointer.pointerId !== event.pointerId) return;
  sharedPointer.glassTouch = false; sharedPointer.pressed = false; sharedPointer.pointerId = null;
  sharedPointer.inside = false; sharedPointer.speedX = 0; sharedPointer.speedY = 0; wake();
}
export function beginGlassTouch(event: PointerEvent) {
  if (event.pointerType !== 'touch' || state.touchCount !== 1 || sharedPointer.glassTouch) return false;
  position(event, true); sharedPointer.pointerId = event.pointerId;
  sharedPointer.glassTouch = true; sharedPointer.pressed = true; wake(); return true;
}
export function moveGlassTouch(event: PointerEvent) {
  if (sharedPointer.glassTouch && sharedPointer.pointerId === event.pointerId && state.touchCount === 1) position(event);
}
export function installInputState(requestFrame: () => void) {
  wake = requestFrame;
  const capability = matchMedia('(any-pointer: coarse)');
  const refresh = () => {
    const before = state.touchCapable;
    state.touchCapable ||= navigator.maxTouchPoints > 0 || capability.matches;
    if (before !== state.touchCapable) notify();
  };
  const down = (event: PointerEvent) => {
    state.pointerType = event.pointerType; state.pressed = true;
    if (event.pointerType === 'touch') {
      setScrollSource('touch-native');
      sharedPointer.kind = 'touch';
      if (!sharedPointer.glassTouch) sharedPointer.inside = false;
      contacts.add(event.pointerId); state.touchCount = contacts.size;
      const changed = !state.touchCapable; state.touchCapable = true;
      sharedPointer.contacts = contacts.size;
      if (contacts.size > 1) endGlassTouch();
      if (changed) notify();
    } else if (!sharedPointer.glassTouch) { sharedPointer.pressed = true; position(event, sharedPointer.kind !== event.pointerType); }
    wake();
  };
  const move = (event: PointerEvent) => {
    state.pointerType = event.pointerType;
    if (event.pointerType === 'touch') return; // Only the projected wordmark accepts touch motion.
    if (!sharedPointer.glassTouch) position(event, sharedPointer.kind !== event.pointerType);
  };
  const up = (event: PointerEvent) => {
    contacts.delete(event.pointerId); state.touchCount = contacts.size; sharedPointer.contacts = contacts.size;
    state.pressed = contacts.size > 0;
    if (event.pointerType === 'touch') endGlassTouch(event); else if (!sharedPointer.glassTouch) sharedPointer.pressed = false;
    wake();
  };
  const leave = () => { if (!sharedPointer.glassTouch) { sharedPointer.inside = false; sharedPointer.speedX = 0; sharedPointer.speedY = 0; wake(); } };
  const reset = () => { contacts.clear(); state.touchCount = 0; state.pressed = false; sharedPointer.contacts = 0; endGlassTouch(); };
  const visibility = () => { if (document.hidden) reset(); };
  capability.addEventListener('change', refresh);
  window.addEventListener('pointerdown', down, { passive: true, capture: true });
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility);
  refresh();
  return () => {
    capability.removeEventListener('change', refresh);
    window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    document.documentElement.removeEventListener('pointerleave', leave);
    window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility);
    reset(); wake = () => {};
  };
}
