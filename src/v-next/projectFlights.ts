/** Geometry only: choose each flight once, then interpolate it at constant speed. */
export type Rect = { left: number; top: number; width: number; height: number };
export type Point = { x: number; y: number };
export type LabelSide = 'bottom' | 'top' | 'left' | 'right';
export type FlightPath = { from: Point; to: Point; labelSide: LabelSide };
export type FlightField = { width: number; height: number; mobile: boolean; obstacles: Rect[] };

const inset = 8;
const clearance = 1;
const epsilon = .05;
const footprints: Record<LabelSide, readonly Rect[]> = {
  bottom: [{ left: -22, top: -22, width: 44, height: 44 }, { left: -41, top: 25, width: 82, height: 22 }],
  top: [{ left: -22, top: -22, width: 44, height: 44 }, { left: -41, top: -47, width: 82, height: 22 }],
  left: [{ left: -22, top: -22, width: 44, height: 44 }, { left: -108, top: -11, width: 82, height: 22 }],
  right: [{ left: -22, top: -22, width: 44, height: 44 }, { left: 26, top: -11, width: 82, height: 22 }],
};
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Region = { y: number; start: number; end: number };
type Prepared = { obstacles: Rect[]; sides: Map<LabelSide, { bounds: Bounds; regions: Region[]; points: Point[] }> };
// Callers supply a fresh field when measurements change. Cache only measured geometry.
const prepared = new WeakMap<FlightField, Prepared>();

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const midpoint = (path: FlightPath): Point => ({ x: (path.from.x + path.to.x) / 2, y: (path.from.y + path.to.y) / 2 });
const sample = (random: () => number) => Math.min(.999999999, Math.max(0, random()));

function boundsFor(field: FlightField, side: LabelSide): Bounds {
  return footprints[side].reduce((bounds, part) => ({
    minX: Math.max(bounds.minX, inset - part.left),
    minY: Math.max(bounds.minY, inset - part.top),
    maxX: Math.min(bounds.maxX, field.width - inset - part.left - part.width),
    maxY: Math.min(bounds.maxY, field.height - inset - part.top - part.height),
  }), { minX: 0, minY: 0, maxX: field.width, maxY: field.height });
}

/** Slab intersection against the center's forbidden rectangle. */
function crosses(from: Point, to: Point, minX: number, minY: number, maxX: number, maxY: number): boolean {
  let enter = 0, leave = 1;
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.abs(dx) < 1e-9) {
    if (from.x < minX || from.x > maxX) return false;
  } else {
    const a = (minX - from.x) / dx, b = (maxX - from.x) / dx;
    enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (from.y < minY || from.y > maxY) return false;
  } else {
    const a = (minY - from.y) / dy, b = (maxY - from.y) / dy;
    enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) return false;
  }
  return leave >= 0 && enter <= 1;
}

function safe(path: FlightPath, field: FlightField, obstacles: Rect[], bounds = boundsFor(field, path.labelSide)): boolean {
  for (const point of [path.from, path.to]) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) return false;
  }
  // Each component is checked separately, preserving the empty corners beside a label.
  for (const part of footprints[path.labelSide]) for (const obstacle of obstacles) {
    if (crosses(path.from, path.to,
      obstacle.left - part.left - part.width - clearance,
      obstacle.top - part.top - part.height - clearance,
      obstacle.left + obstacle.width - part.left + clearance,
      obstacle.top + obstacle.height - part.top + clearance)) return false;
  }
  return true;
}

function prepare(field: FlightField): Prepared {
  const cached = prepared.get(field); if (cached) return cached;
  const unique = new Map<string, Rect>();
  for (const rect of field.obstacles) {
    if (rect.width > 0 && rect.height > 0 && [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) {
      unique.set(`${rect.left},${rect.top},${rect.width},${rect.height}`, rect);
    }
  }
  const obstacles = [...unique.values()];
  const sides: Prepared['sides'] = new Map();
  for (const side of (field.mobile ? ['right', 'left'] : ['bottom', 'top']) as LabelSide[]) {
    const bounds = boundsFor(field, side), regions: Region[] = [], points: Point[] = [];
    if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) { sides.set(side, { bounds, regions, points }); continue; }
    const rows = new Set<number>([bounds.minY, bounds.maxY]);
    // Obstacle edges preserve narrow safe strips that a regular grid would miss.
    for (const part of footprints[side]) for (const obstacle of obstacles) {
      rows.add(obstacle.top - part.top - part.height - clearance - epsilon);
      rows.add(obstacle.top + obstacle.height - part.top + clearance + epsilon);
    }
    const step = field.mobile ? 28 : 42;
    for (let y = bounds.minY; y <= bounds.maxY; y += step) rows.add(y);
    for (const y of [...rows].filter(y => y >= bounds.minY && y <= bounds.maxY).sort((a, b) => a - b)) {
      const blocked: [number, number][] = [];
      for (const part of footprints[side]) for (const obstacle of obstacles) {
        if (y + part.top + part.height < obstacle.top - clearance || y + part.top > obstacle.top + obstacle.height + clearance) continue;
        blocked.push([obstacle.left - part.left - part.width - clearance, obstacle.left + obstacle.width - part.left + clearance]);
      }
      blocked.sort((a, b) => a[0] - b[0]);
      let start = bounds.minX;
      const add = (end: number) => {
        if (end < start) return;
        regions.push({ y, start, end });
        for (const t of end - start > 80 ? [0, .25, .5, .75, 1] : [0, .5, 1]) points.push({ x: start + (end - start) * t, y });
      };
      for (const [left, right] of blocked) {
        if (right < start || left > bounds.maxX) continue;
        if (left > start) add(Math.min(bounds.maxX, left - epsilon));
        start = Math.max(start, right + epsilon);
        if (start > bounds.maxX) break;
      }
      if (start <= bounds.maxX) add(bounds.maxX);
    }
    sides.set(side, { bounds, regions, points });
  }
  const result = { obstacles, sides }; prepared.set(field, result); return result;
}

function pointSegmentDistance(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - from.x - dx * t, point.y - from.y - dy * t);
}

function pathDistance(a: FlightPath, b: FlightPath): number {
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const aa = cross(a.from, a.to, b.from), ab = cross(a.from, a.to, b.to);
  const ba = cross(b.from, b.to, a.from), bb = cross(b.from, b.to, a.to);
  if (((aa > 0 && ab < 0) || (aa < 0 && ab > 0)) && ((ba > 0 && bb < 0) || (ba < 0 && bb > 0))) return 0;
  return Math.min(pointSegmentDistance(a.from, b.from, b.to), pointSegmentDistance(a.to, b.from, b.to),
    pointSegmentDistance(b.from, a.from, a.to), pointSegmentDistance(b.to, a.from, a.to));
}

function roomAt(point: Point, parts: readonly Rect[], obstacles: Rect[]): number {
  let room = 160;
  for (const part of parts) for (const obstacle of obstacles) {
    const left = point.x + part.left, top = point.y + part.top;
    const dx = Math.max(obstacle.left - left - part.width, left - obstacle.left - obstacle.width, 0);
    const dy = Math.max(obstacle.top - top - part.height, top - obstacle.top - obstacle.height, 0);
    room = Math.min(room, Math.hypot(dx, dy));
  }
  return room;
}

/** Pick a finite, random path; distinct paths do not cross even at different phases. */
export function createFlight(field: FlightField, random: () => number, occupied: FlightPath[] = []): FlightPath | null {
  const data = prepare(field);
  const minTravel = field.mobile ? 65 : 90;
  const minSeparation = field.mobile ? 50 : 62;
  const diagonal = Math.hypot(field.width, field.height);
  let best: FlightPath | null = null, bestScore = -Infinity;
  for (const [labelSide, { bounds, regions, points }] of data.sides) {
    if (!points.length) continue;
    for (let attempt = 0; attempt < 440; attempt++) {
      let from: Point, to: Point;
      if (attempt % 4 === 0 && regions.length) {
        // Short strips remain available on phones without forcing every flight horizontal.
        const region = regions[Math.floor(sample(random) * regions.length)];
        const span = region.end - region.start;
        if (span < minTravel) continue;
        const left = region.start + sample(random) * (span - minTravel) * .6;
        const right = region.end - sample(random) * (span - minTravel) * .4;
        from = { x: left, y: region.y }; to = { x: right, y: region.y };
      } else {
        from = points[Math.floor(sample(random) * points.length)];
        to = points[Math.floor(sample(random) * points.length)];
      }
      const length = distance(from, to); if (length < minTravel) continue;
      const path = { from, to, labelSide };
      if (!safe(path, field, data.obstacles, bounds)) continue;
      let separation = diagonal, midSeparation = diagonal;
      const mid = midpoint(path);
      for (const previous of occupied) {
        separation = Math.min(separation, pathDistance(path, previous));
        midSeparation = Math.min(midSeparation, distance(mid, midpoint(previous)));
      }
      if (separation < minSeparation) continue;
      const score = Math.min(length / (field.mobile ? 240 : 600), 1) * .42
        + Math.min(separation / diagonal, .65) * 2.6 + Math.min(midSeparation / diagonal, .75) * 1.3
        + Math.min(roomAt(mid, footprints[labelSide], data.obstacles) / 100, 1) * .18
        + sample(random) * .65;
      if (score > bestScore) { best = path; bestScore = score; }
    }
  }
  if (!best) return null;
  // Either direction is valid: no fixed right-to-left conveyor-belt cadence.
  const reverse = sample(random) < .5;
  return { from: { ...(reverse ? best.to : best.from) }, to: { ...(reverse ? best.from : best.to) }, labelSide: best.labelSide };
}

export function pointOnFlight(path: FlightPath, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  return { x: path.from.x + (path.to.x - path.from.x) * t, y: path.from.y + (path.to.y - path.from.y) * t };
}

/** Resume from an exact held point, never replace it with an unrelated origin. */
export function resumeFlight(field: FlightField, origin: Point, labelSide: LabelSide, occupied: FlightPath[] = []): FlightPath | null {
  const data = prepare(field), side = data.sides.get(labelSide);
  if (!side) return null;
  let best: Point | null = null, bestScore = 0;
  for (const to of side.points) {
    const length = distance(origin, to);
    if (length < 35) continue;
    const path = { from: origin, to, labelSide };
    if (!safe(path, field, data.obstacles, side.bounds)) continue;
    const separation = Math.min(120, ...occupied.map(previous => pathDistance(path, previous)));
    const score = Math.min(length, field.mobile ? 240 : 650) + separation;
    if (score > bestScore) { best = to; bestScore = score; }
  }
  return best ? { from: { ...origin }, to: { ...best }, labelSide } : null;
}

export function isFlightSafe(path: FlightPath, field: FlightField): boolean {
  return safe(path, field, prepare(field).obstacles);
}

/** Preserve a focused entrance during a resize without placing it on top of copy. */
export function nearestSafePoint(field: FlightField, point: Point): { point: Point; labelSide: LabelSide } | null {
  const data = prepare(field);
  let best: { point: Point; labelSide: LabelSide } | null = null, bestDistance = Infinity;
  for (const [labelSide, { bounds, regions }] of data.sides) {
    if (safe({ from: point, to: point, labelSide }, field, data.obstacles, bounds)) return { point: { ...point }, labelSide };
    for (const region of regions) {
      const candidate = { x: Math.max(region.start, Math.min(region.end, point.x)), y: region.y };
      const length = distance(point, candidate);
      if (length < bestDistance && safe({ from: candidate, to: candidate, labelSide }, field, data.obstacles, bounds)) {
        best = { point: candidate, labelSide }; bestDistance = length;
      }
    }
  }
  return best;
}
