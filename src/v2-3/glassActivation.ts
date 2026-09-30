/** A tap/click is separate from dragging the existing liquid surface. */
export function bindGlassActivation(target: HTMLElement, activate: (x?: number, y?: number) => void) {
  let press: { id: number; x: number; y: number; scroll: number; moved: boolean } | undefined;
  let tap = false;
  const down = (event: PointerEvent) => {
    tap = false;
    if (!event.isPrimary || (press && press.id !== event.pointerId)) { press = undefined; return; }
    if (!target.contains(event.target as Node) || event.button !== 0) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: window.scrollY, moved: false };
  };
  const move = (event: PointerEvent) => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
  };
  const up = (event: PointerEvent) => {
    tap = !!press && press.id === event.pointerId && !press.moved && Math.abs(window.scrollY - press.scroll) < 3;
    press = undefined;
  };
  const cancel = () => { tap = false; press = undefined; };
  const click = (event: MouseEvent) => {
    if (event.detail === 0) activate();
    else if (tap) activate(event.clientX, event.clientY);
    tap = false;
  };
  window.addEventListener('pointerdown', down, { capture: true, passive: true });
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', cancel); window.addEventListener('blur', cancel);
  target.addEventListener('click', click);
  return () => {
    window.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('blur', cancel);
    target.removeEventListener('click', click);
  };
}
