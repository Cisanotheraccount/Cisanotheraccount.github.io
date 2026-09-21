import { requestFrame, subscribeFrame, subscribeViewportChange } from './runtime';

export interface HeroLayout {
  canvas: DOMRect;
  word: DOMRect;
  documentTop: number;
  dpr: number;
}

/** Read layout once after intrinsic content settles, before visual updates. */
export function observeHeroLayout(host: HTMLElement, area: HTMLElement, publish: (layout: HeroLayout) => void) {
  let dirty = true, disposed = false;
  const invalidate = () => {
    if (disposed) return;
    dirty = true;
    requestFrame();
  };
  const measure = () => {
    if (disposed) return;
    dirty = false;
    const canvas = host.getBoundingClientRect(), word = area.getBoundingClientRect();
    if (!canvas.width || !canvas.height || !word.width || !word.height) return;
    publish({ canvas, word, documentTop: canvas.top + window.scrollY, dpr: window.devicePixelRatio });
  };
  const hero = host.closest<HTMLElement>('.gxc-hero') ?? host;
  const observer = new ResizeObserver(invalidate);
  // A fixed-height signature can move while neither it nor the Canvas resizes.
  // Observe the row content too; never observe animated floating descendants.
  const targets = new Set<Element>([host, area, hero, ...hero.querySelectorAll(
    '.gxc-hero-top, .gxc-hero-top > *, .gxc-hero-footer, .gxc-hero-bottom, .gxc-hero-bottom > *, .gxc-hero-rule, .gxc-meteors',
  )]);
  for (const target of targets) observer.observe(target);
  const offFrame = subscribeFrame(() => { if (dirty) measure(); }, 'measure');
  const offViewport = subscribeViewportChange(invalidate);
  document.fonts.addEventListener('loadingdone', invalidate);
  void document.fonts.ready.then(invalidate);
  return {
    invalidate,
    // Initial renderer compilation and an atomic opening handoff can explicitly
    // use the current layout; ordinary changes stay in the shared measure phase.
    measure,
    dispose() {
      disposed = true;
      observer.disconnect(); offFrame(); offViewport();
      document.fonts.removeEventListener('loadingdone', invalidate);
    },
  };
}
