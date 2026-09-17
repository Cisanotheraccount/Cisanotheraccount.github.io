import { starCatalog, type Twinkle } from './twinkle';
import { projectStarLight, starLightGradient } from './starLight';
import { combinedHeroStars } from './heroStarCatalog';

/** Hero-only appearance, independent of the work-section photograph and light. */
export const heroTwinkleArt = {
  capacity: 80, mobileCapacity: 40, mobileBreakpoint: 760,
  interval: [.025, .045], duration: [1.8, 5.4], cooldown: [.45, 1.2], strength: [.36, 1], catchUp: true,
  rise: [.18, .8], hold: [.1, .45],
  diameter: { min: 1.6, max: 4 },
  mobileDiameter: { min: 1.4, max: 4 },
  color: { cool: [.48, .72, 1], warm: [1, .78, .42], tint: [.35, .78], neutralThreshold: .08 },
  coreOpacity: .98, haloOpacity: .38, haloSigma: 2.1, supportSigma: 5,
  separation: .035,
  distribution: { wideColumns: 6, mediumColumns: 4, narrowColumns: 3, wideBreakpoint: 1100, minRows: 3, maxRows: 6 },
} as const;

const starsById = new Map(combinedHeroStars.map(star => [star.id, star]));
// A star retains its size and temperature across pulses, rotation and fallback.
// Brightness and lifetime vary independently for every pulse.
function variation(id: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}
const appearances = new Map(combinedHeroStars.map(star => {
  const measuredSize = Math.max(0, Math.min(1, (star.radiusPx - 2) / 3));
  const size = .85 * variation(star.id, 17) + .15 * measuredSize;
  const temperature = star.color[0] - star.color[2];
  const warm = Math.abs(temperature) > heroTwinkleArt.color.neutralThreshold
    ? temperature > 0 : variation(star.id, 39) > .5;
  const palette = warm ? heroTwinkleArt.color.warm : heroTwinkleArt.color.cool;
  const tint = heroTwinkleArt.color.tint[0] + variation(star.id, 71)
    * (heroTwinkleArt.color.tint[1] - heroTwinkleArt.color.tint[0]);
  const peak = Math.max(...star.color, .001);
  const color = palette.map((channel, i) => (.85 + .15 * star.color[i] / peak) * (1 - tint) + channel * tint) as [number, number, number];
  return [star.id, { size, color }] as const;
}));
export function projectHeroTwinkle(point: Twinkle, coverWidth: number, mobile = false): Twinkle {
  const bounds = mobile ? heroTwinkleArt.mobileDiameter : heroTwinkleArt.diameter;
  const appearance = appearances.get(point.id)!;
  const diameter = bounds.min + appearance.size * (bounds.max - bounds.min);
  const projected = projectStarLight(point, starsById.get(point.id)!, starCatalog.source.width, coverWidth,
    { min: diameter, max: diameter, scale: 1 });
  return { ...projected, overlay: { diameterPx: diameter, color: appearance.color } };
}
export const heroTwinkleGradient = (color: readonly number[]) => starLightGradient(color, heroTwinkleArt);
