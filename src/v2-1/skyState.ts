export type SkyStreak = { x: number; y: number; length: number; angle: number; opacity: number; width: number };
export type SkyFrame = { streaks: SkyStreak[]; revision: number };
const frames = new WeakMap<HTMLElement, SkyFrame>();
export function publishSky(hero: HTMLElement, streaks: SkyStreak[]) {
  const previous = frames.get(hero);
  if (!streaks.length && !previous?.streaks.length) return;
  if (previous && previous.streaks.length === streaks.length && streaks.every((star, i) => {
    const old = previous.streaks[i];
    return star.x === old.x && star.y === old.y && star.opacity === old.opacity && star.length === old.length && star.angle === old.angle && star.width === old.width;
  })) return;
  frames.set(hero, { streaks, revision: (previous?.revision ?? 0) + 1 });
}
export function getSky(hero: HTMLElement): SkyFrame { return frames.get(hero) ?? { streaks: [], revision: 0 }; }
export function clearSky(hero: HTMLElement) { frames.delete(hero); }
