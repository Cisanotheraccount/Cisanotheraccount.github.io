import { recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';
export type LayoutRect = { x: number; y: number; top: number; bottom: number; left: number; right: number; width: number; height: number };
type Entry = { rect: LayoutRect; fixed: boolean; revision: number; style?: CSSStyleDeclaration };
const entries = new Map<Element, Entry>();
let revision = 1;
export const getLayoutRevision = () => revision;
export function invalidateLayout(_reason = 'content') { revision++; }
function read(element: Element): Entry {
  const r = element.getBoundingClientRect();
  let fixed = false;
  // Fixed navigation is not translated with the document.
  for (let el: Element | null = element; el; el = el.parentElement) {
    if (getComputedStyle(el).position === 'fixed') { fixed = true; break; }
  }
  const y = r.top + (fixed ? 0 : window.scrollY), x = r.left + (fixed ? 0 : window.scrollX);
  const entry: Entry = { rect: { x, y, left: x, right: x + r.width, top: y, bottom: y + r.height, width: r.width, height: r.height }, fixed, revision };
  entries.set(element, entry); recordTouchMetric('layoutReads'); return entry;
}
function get(element: Element) { const entry = entries.get(element); return entry?.revision === revision ? entry : read(element); }
export function getLayoutRect(element: Element): LayoutRect {
  const { rect, fixed } = get(element), x = fixed ? 0 : window.scrollX, y = fixed ? 0 : window.scrollY;
  return { ...rect, x: rect.x - x, y: rect.y - y, left: rect.left - x, right: rect.right - x, top: rect.top - y, bottom: rect.bottom - y };
}
export function getLayoutStyle(element: Element) {
  const entry = get(element); return entry.style ??= getComputedStyle(element);
}
/** Refresh registered geometry at the start of the shared measure phase, before writes. */
export function prepareLayoutSnapshot() {
  const start = performance.now();
  for (const [element, entry] of entries) {
    if (!element.isConnected) entries.delete(element);
    else if (entry.revision !== revision) read(element);
  }
  sampleTouchMetric('layoutMs', performance.now() - start);
}
export function installLayoutSnapshot(wake: () => void) {
  const dirty = () => { invalidateLayout(); wake(); };
  const observer = new ResizeObserver(dirty);
  document.querySelectorAll('main, .gxc-hero, .gxc-work, .gxc-project, .gxc-project-picture, .gxc-project-picture > img, .gxc-header').forEach(el => observer.observe(el));
  document.addEventListener('load', dirty, true);
  document.fonts.addEventListener('loadingdone', dirty);
  void document.fonts.ready.then(dirty);
  return () => { observer.disconnect(); document.removeEventListener('load', dirty, true); document.fonts.removeEventListener('loadingdone', dirty); entries.clear(); };
}
