/** One update-phase snapshot drives both the DOM links and the glass backdrop. */
export type ProjectSkyPoint = {
  index: number;
  slug: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  /** Label shares the icon's backdrop layer and a fixed offset beneath it. */
  labelOpacity: number;
  tailLength: number;
  /** Degrees, in screen coordinates, pointing backwards along the tail. */
  angle: number;
};
export type ProjectSkyFrame = { points: ProjectSkyPoint[]; revision: number };

const frames = new WeakMap<HTMLElement, ProjectSkyFrame>();
const empty: ProjectSkyFrame = { points: [], revision: 0 };

export function publishProjectSky(hero: HTMLElement, points: ProjectSkyPoint[]) {
  const previous = frames.get(hero);
  if (!points.length && !previous?.points.length) return;
  if (previous && previous.points.length === points.length && points.every((point, i) => {
    const old = previous.points[i];
    return point.index === old.index && point.slug === old.slug && point.x === old.x
      && point.y === old.y && point.size === old.size && point.opacity === old.opacity
      && point.tailLength === old.tailLength && point.angle === old.angle
      && point.labelOpacity === old.labelOpacity;
  })) return;
  frames.set(hero, { points, revision: (previous?.revision ?? 0) + 1 });
}

export function getProjectSky(hero: HTMLElement): ProjectSkyFrame { return frames.get(hero) ?? empty; }
// Keep the per-hero revision monotonic across effect cleanup/restart; otherwise
// a new frame could reuse the old revision and remain invisible to the renderer.
export function clearProjectSky(hero: HTMLElement) { publishProjectSky(hero, []); }
