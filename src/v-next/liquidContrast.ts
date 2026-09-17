import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';
import { uiGlass } from './uiGlassConfig';

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

function imageAt(image: HTMLImageElement, x: number, y: number): RGB | null {
  const rect = image.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom || !rect.width || !rect.height) return null;
  const cache = pixelsFor(image); if (!cache) return null;
  const style = getComputedStyle(image);
  const scale = style.objectFit === 'contain' ? Math.min(rect.width / cache.width, rect.height / cache.height) : Math.max(rect.width / cache.width, rect.height / cache.height);
  const width = cache.width * scale, height = cache.height * scale;
  const u = (x - rect.left - (rect.width - width) / 2) / width;
  const v = (y - rect.top - (rect.height - height) / 2) / height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const offset = (Math.min(127, Math.floor(v * 128)) * 128 + Math.min(127, Math.floor(u * 128))) * 4;
  return [cache.pixels[offset], cache.pixels[offset + 1], cache.pixels[offset + 2]];
}

/** Native labels adapt only when their underlying image/position changes.
 * This shares the site's measurement phase and never requests another frame
 * just to keep sampling. Any necessary tint belongs to the whole optical surface,
 * never to individual labels or icons.
 */
export function observeLiquidContrast(element: HTMLElement) {
  let dirty = true, previousScroll = -1, previousInk: 'dark' | 'light' | null = null;
  const invalidate = () => { dirty = true; requestFrame(); };
  const measure = () => {
    const snapshot = getFrameSnapshot();
    if (snapshot.scrollY !== previousScroll) { previousScroll = snapshot.scrollY; dirty = true; }
    if (!dirty || document.hidden || !element.offsetWidth) return;
    dirty = false;
    const images = [...document.querySelectorAll<HTMLImageElement>('main .gxc-project-picture img, main .gxc-hero-image img')];
    const controls = [...element.querySelectorAll<HTMLElement>('nav a, button, .gxc-menu-photo, .gxc-menu-top > span, :scope > .gxc-mono')];
    const menu = !!element.closest('dialog');
    const menuFallback = menu && element.dataset.glass === 'frosted';
    const backdrop = (x: number, y: number): RGB => {
      let color: RGB | null = null;
      for (const image of images) { color = imageAt(image, x, y); if (color) break; }
      if (!color) {
        for (const box of document.querySelectorAll<HTMLElement>('.gxc-project-picture')) {
          const r = box.getBoundingClientRect();
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            const rgb = getComputedStyle(box).backgroundColor.match(/[\d.]+/g);
            if (rgb && rgb.length >= 3 && (rgb.length < 4 || Number(rgb[3]) > .5)) color = rgb.slice(0, 3).map(Number) as RGB;
          }
        }
      }
      const behind = menu ? over(color ?? base, [3, 5, 9], .24) : color ?? base;
      return menuFallback ? over(behind, [18, 22, 29], .9) : behind;
    };
    const samples: RGB[] = [];
    for (const control of controls) {
      const rect = control.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      for (const fx of [.15, .3, .5, .7, .85]) for (const fy of [.3, .5, .7]) {
        samples.push(backdrop(rect.x + rect.width * fx, rect.y + rect.height * fy));
      }
    }
    if (!samples.length) return;
    const opacityFor = (ink: RGB, tint: RGB) => {
      for (let step = 0; step <= uiGlass.contrastMaxTint * 100; step += 2) {
        const opacity = step / 100;
        if (samples.every(sample => {
          // Allow for the lens sheen, plus the existing selected-tab highlight.
          // The tint is above the lens but below that highlight and all text.
          const surface = over(over(sample, white, .06), tint, opacity);
          return contrast(ink, surface) >= uiGlass.contrastTarget
            && (menu || contrast(ink, over(surface, white, .17)) >= uiGlass.contrastTarget);
        })) return opacity;
      }
      return uiGlass.contrastMaxTint;
    };
    const lightTint = opacityFor(white, [0, 0, 0]);
    const darkTint = opacityFor(dark, white);
    // A small cost to changing ink prevents flicker at image boundaries.
    const switchCost = uiGlass.contrastHysteresis;
    const useDark = previousInk === 'dark'
      ? darkTint <= lightTint + switchCost
      : darkTint + switchCost < lightTint;
    previousInk = useDark ? 'dark' : 'light';
    // WebKit can leave individual bright stars unblurred. Protect white ink
    // across the continuous surface, without reinstating label-sized plates.
    const fallbackFloor = !menu && element.dataset.glass === 'frosted' ? uiGlass.fallbackLightTint : 0;
    const opacity = useDark ? darkTint : Math.max(lightTint, fallbackFloor);
    element.style.setProperty('--liquid-ink', useDark ? '#14171c' : '#fff');
    element.style.setProperty('--liquid-contrast-tint', `rgba(${useDark ? '255,255,255' : '0,0,0'},${opacity.toFixed(2)})`);
    element.style.setProperty('--liquid-label-shadow', useDark ? '0 1px 2px #ffffff22' : '0 1px 3px #0006');
    element.dataset.liquidInk = previousInk;
  };
  const off = subscribeFrame(measure, 'measure');
  const observer = new ResizeObserver(invalidate); observer.observe(element);
  const dialog = element.closest('dialog');
  const mutations = new MutationObserver(invalidate);
  if (dialog) mutations.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  document.addEventListener('load', invalidate, true);
  window.addEventListener('resize', invalidate);
  document.addEventListener('visibilitychange', invalidate);
  return () => { off(); observer.disconnect(); mutations.disconnect(); document.removeEventListener('load', invalidate, true); window.removeEventListener('resize', invalidate); document.removeEventListener('visibilitychange', invalidate); };
}
