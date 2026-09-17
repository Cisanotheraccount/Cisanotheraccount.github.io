import type { PhotoStar, PulseEnvelope, Twinkle } from './twinkle';

export type StarLightProfile = { coreOpacity: number; haloOpacity: number; haloSigma: number; supportSigma: number };
const fwhm = 2 * Math.sqrt(2 * Math.log(2));

/** One readable brightening, with independently timed rise and soft shoulder. */
export function singlePeakEnvelope(rise: readonly [number, number], hold: readonly [number, number]): PulseEnvelope {
  return (duration, random) => {
    const peak = (rise[0] + random() * (rise[1] - rise[0])) / duration;
    const shoulder = peak + (hold[0] + random() * (hold[1] - hold[0])) / duration;
    return [{ time: 0, value: 0 }, { time: peak, value: 1 }, { time: shoulder, value: .96 }, { time: 1, value: 0 }];
  };
}

/** The footprint is fixed in CSS pixels; its center remains in photo UV space. */
export function projectStarLight(point: Twinkle, star: PhotoStar, sourceWidth: number, coverWidth: number, diameter: { min: number; max: number; scale: number }): Twinkle {
  const scale = coverWidth / sourceWidth;
  const diameterPx = Math.max(diameter.min, Math.min(diameter.max, point.radiusPx * scale * fwhm * diameter.scale));
  const peak = Math.max(...star.color, .001);
  const color = star.color.map(channel => .25 + .75 * channel / peak) as [number, number, number];
  return { ...point, radiusPx: diameterPx / fwhm / scale, overlay: { diameterPx, color } };
}

/** Only start new pulses in exposed sky. Existing pulses keep their own lifetime. */
export function chooseExposedStar(available: PhotoStar[], active: PhotoStar[], exposed: ReadonlySet<string>, coverWidth: number, coverHeight: number, distance: number): PhotoStar | undefined {
  const clear = available.filter(star => exposed.has(star.id));
  const separated = clear.filter(star => active.every(other => Math.hypot((star.u - other.u) * coverWidth, (star.v - other.v) * coverHeight) >= distance));
  const pool = separated.length ? separated : clear;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
}

/** Match the finite Gaussian profile used in the hero transmission shader. */
export function starLightGradient(color: readonly number[], profile: StarLightProfile) {
  const rgb = color.map(channel => Math.round(channel * 255)).join(' ');
  const { coreOpacity, haloOpacity, haloSigma, supportSigma } = profile;
  const stops = Array.from({ length: 41 }, (_, index) => {
    const fraction = index / 40, q = (fraction * supportSigma) ** 2;
    const t = Math.max(0, Math.min(1, (q - 16) / (supportSigma ** 2 - 16)));
    const taper = 1 - t * t * (3 - 2 * t);
    const opacity = Math.min(1, (coreOpacity * Math.exp(-q / 2) + haloOpacity * Math.exp(-q / (2 * haloSigma ** 2))) * taper);
    return `rgb(${rgb} / ${opacity.toFixed(5)}) ${fraction * 100}%`;
  });
  return `radial-gradient(circle closest-side, ${stops.join(',')})`;
}
