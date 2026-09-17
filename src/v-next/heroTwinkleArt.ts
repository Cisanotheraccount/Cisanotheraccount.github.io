import { starCatalog, type PhotoStar, type Twinkle } from './twinkle';

/** Hero-only appearance. The work-section field keeps its existing settings. */
export const heroTwinkleArt = {
  capacity: 6, mobileCapacity: 3, mobileBreakpoint: 760,
  interval: [.42, .7], duration: [2.5, 4.5], cooldown: [8, 24], strength: [.52, .9],
  diameter: { min: 1.35, max: 4, scale: 1.35 },
  coreOpacity: .62, haloOpacity: .16, haloSigma: 1.8, supportSigma: 5,
  separation: .16,
} as const;

const starsById = new Map(starCatalog.points.map(star => [star.id, star]));
const fwhm = 2 * Math.sqrt(2 * Math.log(2));

/** Size in CSS pixels; return source-space sigma for the exact photo-UV shader. */
export function projectHeroTwinkle(point: Twinkle, coverWidth: number): Twinkle {
  const scale = coverWidth / starCatalog.source.width;
  const diameterPx = Math.max(heroTwinkleArt.diameter.min, Math.min(heroTwinkleArt.diameter.max,
    point.radiusPx * scale * fwhm * heroTwinkleArt.diameter.scale));
  const sampled = starsById.get(point.id)?.color ?? [1, 1, 1];
  const peak = Math.max(...sampled, .001);
  const color = sampled.map(channel => .25 + .75 * channel / peak) as [number, number, number];
  return { ...point, radiusPx: diameterPx / fwhm / scale, overlay: { diameterPx, color } };
}

/** Spread the next pulse around active stars, while retaining photographic positions. */
export function chooseHeroStar(available: PhotoStar[], active: PhotoStar[], width: number, height: number, coverWidth: number, coverHeight: number): PhotoStar {
  const distance = Math.max(48, Math.min(width, height) * heroTwinkleArt.separation);
  const separated = available.filter(star => active.every(other =>
    Math.hypot((star.u - other.u) * coverWidth, (star.v - other.v) * coverHeight) >= distance));
  const pool = separated.length ? separated : available;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Same finite Gaussian core/shoulder profile as the WebGL overlay, in sRGB. */
export function heroTwinkleGradient(color: readonly number[]) {
  const rgb = color.map(channel => Math.round(channel * 255)).join(' ');
  const { coreOpacity, haloOpacity, haloSigma, supportSigma } = heroTwinkleArt;
  const stops = Array.from({ length: 21 }, (_, index) => {
    const fraction = index / 20, q = (fraction * supportSigma) ** 2;
    const t = Math.max(0, Math.min(1, (q - 16) / (supportSigma ** 2 - 16)));
    const taper = 1 - t * t * (3 - 2 * t);
    const opacity = (coreOpacity * Math.exp(-q / 2) + haloOpacity * Math.exp(-q / (2 * haloSigma ** 2))) * taper;
    return `rgb(${rgb} / ${opacity.toFixed(5)}) ${index * 5}%`;
  });
  return `radial-gradient(circle closest-side, ${stops.join(',')})`;
}
