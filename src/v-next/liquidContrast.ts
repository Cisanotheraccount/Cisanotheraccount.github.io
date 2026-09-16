import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';

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
 * just to keep sampling. A mixed light/dark photo receives a small label veil.
 */
export function observeLiquidContrast(element: HTMLElement) {
  let dirty = true, previousScroll = -1;
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
    for (const control of controls) {
      const rect = control.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      const samples: RGB[] = [];
      for (const fx of [.2, .35, .5, .65, .8]) for (const fy of [.35, .5, .65]) samples.push(backdrop(rect.x + rect.width * fx, rect.y + rect.height * fy));
      const opacityFor = (ink: RGB, veil: RGB) => {
        // A little headroom for the optical map's sheen and image interpolation.
        for (let opacity = 0; opacity <= .72; opacity += .025) {
          if (samples.every(sample => contrast(ink, over(sample, veil, opacity)) >= 5.2)) return opacity;
        }
        return .72;
      };
      const lightVeil = opacityFor(white, [0, 0, 0]);
      const darkVeil = opacityFor(dark, white);
      const useDark = darkVeil + .06 < lightVeil;
      // Some WebKit surfaces advertise backdrop-filter while rendering the
      // unblurred source. Keep a conservative veil behind the actual label in
      // this branch, so a tiny bright star cannot erase a white glyph.
      const fallback = element.dataset.glass === 'frosted';
      const opacity = Math.max(useDark ? darkVeil : lightVeil, fallback && !menuFallback ? .6 : 0);
      control.style.setProperty('--liquid-ink', useDark ? '#14171c' : '#fff');
      control.style.setProperty('--liquid-label-veil', `rgba(${useDark ? '255,255,255' : '0,0,0'},${opacity.toFixed(3)})`);
      control.style.setProperty('--liquid-label-shadow', useDark ? '0 1px 2px #ffffff22' : '0 1px 3px #0006');
      control.dataset.liquidInk = useDark ? 'dark' : 'light';
      // The safety veil hugs the label, never the whole 44px hit target. This
      // preserves the continuous glass face instead of nesting more capsules.
      const textNode = [...control.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
      const icon = control.querySelector('svg');
      const range = document.createRange();
      if (textNode) range.selectNode(textNode); else range.selectNodeContents(control);
      const label = textNode || !icon ? range.getBoundingClientRect() : icon.getBoundingClientRect();
      const prefix = control.querySelector('.gxc-mono')?.getBoundingClientRect();
      const left = Math.min(label.left, prefix?.left ?? label.left) - rect.left - 4;
      const top = label.top - rect.top - 3;
      const width = label.right - rect.left - left + 4, height = label.height + 6;
      const veilImage = (w: number, h: number) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'><rect width='${w}' height='${h}' rx='5' fill='${useDark ? 'white' : 'black'}' fill-opacity='${opacity.toFixed(3)}'/></svg>`)}")`;
      control.style.setProperty('--liquid-veil-image', veilImage(width, height));
      control.style.setProperty('--liquid-veil-size', `${width}px ${height}px`);
      control.style.setProperty('--liquid-veil-position', `${left}px ${top}px`);
      if (textNode && icon) {
        const iconRect = icon.getBoundingClientRect();
        control.style.setProperty('--liquid-icon-image', veilImage(iconRect.width + 8, iconRect.height + 8));
        control.style.setProperty('--liquid-icon-size', `${iconRect.width + 8}px ${iconRect.height + 8}px`);
        control.style.setProperty('--liquid-icon-position', `${iconRect.x - rect.x - 4}px ${iconRect.y - rect.y - 4}px`);
      }
    }
  };
  const off = subscribeFrame(measure, 'measure');
  const observer = new ResizeObserver(invalidate); observer.observe(element);
  const dialog = element.closest('dialog');
  const mutations = new MutationObserver(invalidate);
  if (dialog) mutations.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  document.addEventListener('load', invalidate, true);
  window.addEventListener('resize', invalidate);
  return () => { off(); observer.disconnect(); mutations.disconnect(); document.removeEventListener('load', invalidate, true); window.removeEventListener('resize', invalidate); };
}
