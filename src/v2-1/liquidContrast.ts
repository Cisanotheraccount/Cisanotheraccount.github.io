import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';
import { uiGlass } from './uiGlassConfig';
import { getLayoutRect, getLayoutRevision, getLayoutStyle, invalidateLayout, type LayoutRect } from './layoutSnapshot';
import { recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';

type RGB = [number, number, number];
type ImagePixels = { source: string; pixels: Uint8ClampedArray; width: number; height: number };
const imageCache = new WeakMap<HTMLImageElement, ImagePixels>();
const dark: RGB = [20, 23, 28];
const white: RGB = [255, 255, 255];
const base: RGB = [9, 10, 12];
const luminance = (color: RGB) => color.reduce((sum, value, i) => {
  const channel = value / 255;
  return sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i];
}, 0);
const contrast = (a: RGB, b: RGB) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const over = (color: RGB, veil: RGB, opacity: number): RGB => color.map((c, i) => c * (1 - opacity) + veil[i] * opacity) as RGB;

function pixelsFor(image: HTMLImageElement) {
  if (!image.complete || !image.naturalWidth) return null;
  const source = image.currentSrc || image.src;
  const cached = imageCache.get(image); if (cached?.source === source) return cached;
  try {
    // A small cache of the actual same-origin image, never a screenshot of the page.
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return null;
    context.drawImage(image, 0, 0, 128, 128);
    const result = { source, pixels: context.getImageData(0, 0, 128, 128).data, width: image.naturalWidth, height: image.naturalHeight };
    imageCache.set(image, result); canvas.width = 0; canvas.height = 0; return result;
  } catch { return null; }
}

type ImageSample = { rect: LayoutRect; pixels: ImagePixels; contain: boolean };
function imageAt({ rect, pixels: cache, contain }: ImageSample, x: number, y: number): RGB | null {
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom || !rect.width || !rect.height) return null;
  const scale = contain ? Math.min(rect.width / cache.width, rect.height / cache.height) : Math.max(rect.width / cache.width, rect.height / cache.height);
  const width = cache.width * scale, height = cache.height * scale;
  const u = (x - rect.left - (rect.width - width) / 2) / width;
  const v = (y - rect.top - (rect.height - height) / 2) / height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const offset = (Math.min(127, Math.floor(v * 128)) * 128 + Math.min(127, Math.floor(u * 128))) * 4;
  return [cache.pixels[offset], cache.pixels[offset + 1], cache.pixels[offset + 2]];
}

/** Native labels adapt only when their underlying image/position changes.
 * This shares the site's measurement phase and never requests another frame
 * just to keep sampling. Ink adapts locally; contrast never adds opaque plates
 * or increases the optical surface tint. Small shadows follow the glyphs only.
 */
export function observeLiquidContrast(element: HTMLElement) {
  let dirty = true, previousScroll = -1, previousRevision = -1, register = true;
  const previousInk = new WeakMap<HTMLElement, 'dark' | 'light'>();
  const pendingInk = new Map<HTMLElement, 'dark' | 'light'>();
  const glyphs = new WeakMap<HTMLElement, { revision: number; x: number; y: number; width: number; height: number }>();
  let images: HTMLImageElement[] = [], boxes: HTMLElement[] = [], controls: HTMLElement[] = [];
  const observed = new Set<HTMLElement>();
  const dialog = element.closest('dialog');
  const invalidate = () => { dirty = true; requestFrame(); };
  const geometryChanged = () => { invalidateLayout('liquid-controls'); invalidate(); };
  const observer = new ResizeObserver(geometryChanged); observer.observe(element);
  const registerElements = () => {
    images = [...document.querySelectorAll<HTMLImageElement>('main .gxc-project-picture img, main .gxc-hero-image img')];
    boxes = [...document.querySelectorAll<HTMLElement>('.gxc-project-picture')];
    controls = [...element.querySelectorAll<HTMLElement>('nav a, button, .gxc-menu-photo, .gxc-menu-top > span, :scope > .gxc-mono')];
    for (const control of observed) if (!controls.includes(control)) { observer.unobserve(control); observed.delete(control); }
    for (const control of controls) if (!observed.has(control)) { observer.observe(control); observed.add(control); }
    register = false;
  };
  const measure = () => {
    const snapshot = getFrameSnapshot();
    if (snapshot.scrollY !== previousScroll) { previousScroll = snapshot.scrollY; dirty = true; }
    const revision = getLayoutRevision();
    if (revision !== previousRevision) { previousRevision = revision; dirty = true; }
    if (!dirty || document.hidden || (dialog && !dialog.open)) return;
    const elementBounds = getLayoutRect(element);
    if (!elementBounds.width || !elementBounds.height) return;
    const started = performance.now();
    dirty = false;
    if (register) registerElements();
    const overlaps = (rect: LayoutRect) => rect.right >= elementBounds.left && rect.left <= elementBounds.right
      && rect.bottom >= elementBounds.top && rect.top <= elementBounds.bottom && rect.width > 0 && rect.height > 0;
    // Read each image once for every control/sample. Geometry is shared with the
    // work canvas; scrolling translates the cached document coordinates only.
    const samplesFromImages: ImageSample[] = images.flatMap(image => {
      const rect = getLayoutRect(image); if (!overlaps(rect)) return [];
      const pixels = pixelsFor(image); if (!pixels) return [];
      return [{ rect, pixels, contain: getLayoutStyle(image).objectFit === 'contain' }];
    });
    const frames = boxes.flatMap(box => {
      const rect = getLayoutRect(box); if (!overlaps(rect)) return [];
      const rgb = getLayoutStyle(box).backgroundColor.match(/[\d.]+/g);
      return rgb && rgb.length >= 3 && (rgb.length < 4 || Number(rgb[3]) > .5)
        ? [{ rect, color: rgb.slice(0, 3).map(Number) as RGB }] : [];
    });
    const menu = !!dialog;
    const backdrop = (x: number, y: number): RGB => {
      let color: RGB | null = null;
      for (const image of samplesFromImages) { color = imageAt(image, x, y); if (color) break; }
      if (!color) {
        for (const { rect: r, color: frameColor } of frames) {
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            color = frameColor;
          }
        }
      }
      const behind = menu ? over(color ?? base, [3, 5, 9], uiGlass.menuBackdropOpacity) : color ?? base;
      return over(behind, [0, 0, 0], menu ? uiGlass.menuTint : uiGlass.tint);
    };
    for (const control of controls) {
      const rect = getLayoutRect(control); if (!rect.width || !rect.height) continue;
      // Read the glyph area, not the much wider hit target. One bright pixel or
      // a photo edge at the end of a button must not turn the entire nav white.
      let glyph = glyphs.get(control);
      if (!glyph || glyph.revision !== revision) {
        const node = [...control.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        const svg = control.querySelector('svg');
        let bounds: Pick<LayoutRect, 'x' | 'y' | 'width' | 'height'> = rect;
        if (node) {
          const range = document.createRange(); range.selectNode(node); bounds = range.getBoundingClientRect();
          recordTouchMetric('liquidGlyphReads');
        } else if (svg) bounds = getLayoutRect(svg);
        glyph = { revision, x: bounds.x - rect.x, y: bounds.y - rect.y, width: bounds.width, height: bounds.height };
        glyphs.set(control, glyph);
      }
      const label = { x: rect.x + glyph.x, y: rect.y + glyph.y, width: glyph.width, height: glyph.height };
      const samples: RGB[] = [];
      for (const fx of [.1, .3, .5, .7, .9]) for (const fy of [.2, .5, .8]) {
        samples.push(backdrop(label.x + label.width * fx, label.y + label.height * fy));
      }
      const score = (ink: RGB) => {
        const ratios = samples.map(sample => contrast(ink, sample)).sort((a, b) => a - b);
        return ratios[Math.floor(ratios.length * .25)];
      };
      const darkScore = score(dark), lightScore = score(white);
      const prior = previousInk.get(control);
      const useDark = prior === 'dark'
        ? lightScore <= darkScore * (1 + uiGlass.inkHysteresis)
        : darkScore > lightScore * (1 + uiGlass.inkHysteresis);
      const ink = useDark ? 'dark' : 'light';
      if (ink !== prior) pendingInk.set(control, ink);
    }
    sampleTouchMetric('liquidContrastMs', performance.now() - started);
  };
  const off = subscribeFrame(measure, 'measure');
  const offUpdate = subscribeFrame(() => {
    for (const [control, ink] of pendingInk) {
      if (!control.isConnected) continue;
      const useDark = ink === 'dark'; previousInk.set(control, ink);
      control.style.setProperty('--liquid-ink', useDark ? '#14171c' : '#fff');
      control.style.setProperty('--liquid-ink-edge', useDark ? '#ffffffcc' : '#000000d9');
      control.style.setProperty('--liquid-label-shadow', useDark ? '0 1px 2px #ffffff66' : '0 1px 2px #000b');
      control.dataset.liquidInk = ink; recordTouchMetric('liquidInkWrites');
    }
    pendingInk.clear();
  }, 'update');
  let previousTransform = element.style.transform;
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList' || record.type === 'characterData')) register = true;
    // Only the menu's actual Motion transform invalidates geometry. Ink and
    // material CSS variables must not create an observer → write → observer loop.
    if (records.some(record => record.attributeName === 'open') || element.style.transform !== previousTransform || register) {
      previousTransform = element.style.transform; geometryChanged();
    }
  });
  const main = document.querySelector('main');
  if (main) mutations.observe(main, { childList: true, subtree: true });
  mutations.observe(element, { childList: true, subtree: true, characterData: true });
  if (dialog) {
    mutations.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    mutations.observe(element, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true, characterData: true });
  }
  document.addEventListener('load', invalidate, true);
  document.fonts.addEventListener('loadingdone', geometryChanged);
  // Runtime invalidates width/DPR changes; element RO catches actual reflow.
  // A moving Safari toolbar alone must not invalidate every work card.
  window.addEventListener('resize', invalidate);
  document.addEventListener('visibilitychange', invalidate);
  return () => {
    off(); offUpdate(); observer.disconnect(); mutations.disconnect(); pendingInk.clear();
    document.removeEventListener('load', invalidate, true); document.fonts.removeEventListener('loadingdone', geometryChanged);
    window.removeEventListener('resize', invalidate); document.removeEventListener('visibilitychange', invalidate);
  };
}
