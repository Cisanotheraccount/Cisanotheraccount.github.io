import { meteorArt } from './meteorsConfig';
/** Separated vertical columns. Phase 0→1 covers the hero from top to bottom;
 * each project's modest speed difference survives every crossing. */
export type ProjectCrossing = { axis: 'vertical'; x: number; offsetX: number; offsetY: number; duration: number };
export function crossingPoint(path: ProjectCrossing, phase: number, width: number, height: number) {
  return { x: (path.x + path.offsetX) * width, y: (phase + path.offsetY) * height };
}
export function trackCenter(slot: number, count: number, mobile = false, landscape = false) {
  const band = landscape ? meteorArt.marks.landscapeBand : mobile ? meteorArt.marks.mobileBand : meteorArt.marks.band;
  return count < 2 ? (band[0] + band[1]) / 2 : band[0] + (band[1] - band[0]) * slot / (count - 1);
}
export function createCrossing(mobile: boolean, projectSlug: string, slot: number, count: number, landscape = false, random = Math.random): ProjectCrossing {
  const art = meteorArt.marks, center = trackCenter(slot, count, mobile, landscape);
  const speed = art.projectSpeed[projectSlug] ?? 1;
  const base = mobile ? art.mobileBaseDuration : art.baseDuration;
  return { axis: 'vertical', x: center, offsetX: (random() - .5) * art.laneJitter, offsetY: 0,
    duration: base / speed * (1 + (random() - .5) * art.durationJitter) };
}
