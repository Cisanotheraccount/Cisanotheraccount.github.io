/**
 * Hand-authored writing guides for the EXISTING Pacifico-derived galaxci mesh.
 * These are reveal guides, never replacement outline/geometry. Intersect their
 * swept disks with the original mesh; its five counters must remain empty.
 *
 * Coordinates are model-local XY, +Y up, before the hero group's transform.
 * Each point is [x, y, revealRadius] in the same units (word height = 10).
 * Radii include a small reveal margin, calibrated against the actual outline;
 * they are NOT a replacement for the model's physical width or thickness.
 * Interpolate points with a polyline or a non-overshooting centripetal curve;
 * interpolate radii linearly. Do not bridge a pen lift across unpainted space.
 */
export type WritingPoint = readonly [x: number, y: number, radius: number];
export type WritingStroke = {
  readonly id: string;
  readonly letter: 'g' | 'a' | 'l' | 'x' | 'c' | 'i';
  readonly kind: 'loop' | 'connector' | 'crossing' | 'stem' | 'dot';
  readonly penLiftBefore: boolean;
  /** A suggested normalized timeline; final timing is owned by the renderer. */
  readonly time: readonly [start: number, end: number];
  readonly points: readonly WritingPoint[];
  readonly note: string;
};

// A counterclockwise a bowl, then its right downstroke and outgoing connector.
// The incoming stroke rides the existing left shoulder to the starting crest.
const firstABowl: readonly WritingPoint[] = [
  [-6.90, -.44, 0.625], [-6.80, .12, 0.638], [-6.53, .66, 0.650],
  [-6.12, 1.10, 0.625], [-5.58, 1.42, 0.588], [-5.07, 1.38, 0.562],
  [-5.58, 1.43, 0.588], [-6.12, 1.12, 0.638], [-6.57, .67, 0.662],
  [-6.84, .05, 0.662], [-6.84, -.60, 0.650], [-6.56, -1.24, 0.625],
  [-6.05, -1.43, 0.600], [-5.57, -1.17, 0.625], [-5.22, -.60, 0.638],
  [-4.80, .20, 0.638], [-4.65, 1.23, 0.625],
];
const firstAExit: readonly WritingPoint[] = [
  [-4.65, 1.23, 0.625], [-4.72, .55, 0.638], [-4.85, -.25, 0.650],
  [-4.83, -.83, 0.650], [-4.66, -1.33, 0.625], [-4.29, -1.40, 0.588],
  [-3.82, -1.09, 0.550], [-3.37, -.65, 0.537], [-2.98, -.21, 0.562],
];
// Measured from corresponding counter bounds in galaxci-shapes.json, rather
// than nominal font advance: the second a is the exact translated first a.
const secondAOffset = 6.00706;
const shift = (points: readonly WritingPoint[], dx: number): readonly WritingPoint[] =>
  points.map(([x, y, radius]) => [x + dx, y, radius] as const);

export const writingStrokes: readonly WritingStroke[] = [
  {
    id: 'g-bowl', letter: 'g', kind: 'loop', penLiftBefore: true, time: [0, .115],
    note: 'Upper g counter: start at its upper-right shoulder and turn counterclockwise.',
    points: [
      [-8.60, 1.29, 0.612], [-9.11, 1.39, 0.562], [-9.64, 1.09, 0.588],
      [-10.09, .60, 0.625], [-10.35, -.03, 0.650], [-10.33, -.70, 0.650],
      [-10.05, -1.30, 0.625], [-9.54, -1.42, 0.600], [-9.06, -1.13, 0.625],
      [-8.52, -.53, 0.650], [-8.34, .23, 0.675], [-8.20, 1.22, 0.662],
    ],
  },
  {
    id: 'g-descender-and-join', letter: 'g', kind: 'loop', penLiftBefore: false, time: [.115, .265],
    note: 'Descend into the second g loop, turn around the bottom, then rise diagonally into a.',
    points: [
      [-8.20, 1.22, 0.662], [-8.32, .41, 0.675], [-8.46, -.54, 0.713],
      [-8.63, -1.53, 0.713], [-8.92, -2.67, 0.713], [-9.34, -3.76, 0.688],
      [-9.86, -4.48, 0.625], [-10.43, -4.56, 0.588], [-10.82, -4.25, 0.575],
      [-10.76, -3.69, 0.600], [-10.37, -3.05, 0.588], [-9.82, -2.52, 0.562],
      [-9.14, -2.02, 0.562], [-8.39, -1.49, 0.550], [-7.64, -.97, 0.562],
      [-6.90, -.44, 0.625],
    ],
  },
  {
    id: 'a-first-bowl', letter: 'a', kind: 'loop', penLiftBefore: false, time: [.265, .345],
    note: 'The short shoulder retrace stays on already written glass; do not jump across the counter.',
    points: firstABowl,
  },
  {
    id: 'a-first-exit', letter: 'a', kind: 'connector', penLiftBefore: false, time: [.345, .385],
    note: 'Right downstroke bends into the ascending l connection.', points: firstAExit,
  },
  {
    id: 'l-ascender', letter: 'l', kind: 'loop', penLiftBefore: false, time: [.385, .54],
    note: 'Follow the tall, narrow l loop around its actual counter, then return to the baseline.',
    points: [
      [-2.98, -.21, 0.588], [-3.01, .66, 0.612], [-2.86, 1.91, 0.638],
      [-2.54, 3.16, 0.625], [-2.13, 4.12, 0.562], [-1.66, 4.64, 0.488],
      [-1.10, 4.60, 0.475], [-.86, 4.16, 0.475], [-.90, 3.44, 0.500],
      [-1.15, 2.54, 0.550], [-1.58, 1.66, 0.575], [-2.12, .80, 0.575],
      [-2.73, .01, 0.612], [-2.98, -.34, 0.650], [-2.79, -.90, 0.638],
      [-2.33, -1.35, 0.612], [-1.76, -1.39, 0.575], [-1.27, -1.03, 0.550],
      [-.89294, -.44, 0.625],
    ],
  },
  {
    id: 'a-second-bowl', letter: 'a', kind: 'loop', penLiftBefore: false, time: [.54, .625],
    note: 'Same a counter and stroke widths, translated by the measured optical spacing.',
    points: shift(firstABowl, secondAOffset),
  },
  {
    id: 'a-second-exit', letter: 'a', kind: 'connector', penLiftBefore: false, time: [.625, .67],
    note: 'Downstroke and low connector feed the lower-left terminal of x.',
    points: [
      ...shift(firstAExit.slice(0, 6), secondAOffset),
      [2.20, -1.08, 0.537], [2.63, -.66, 0.562], [2.90, -.41, 0.562],
    ],
  },
  {
    id: 'x-rising', letter: 'x', kind: 'crossing', penLiftBefore: false, time: [.67, .76],
    note: 'Pacifico x has curved diagonals: curl from its lower-left terminal up to the upper right.',
    points: [
      [2.90, -.41, 0.562], [2.74, -.91, 0.588], [2.98, -1.34, 0.588],
      [3.44, -1.38, 0.612], [3.84, -.96, 0.638], [4.17, -.30, 0.650],
      [4.43, .44, 0.650], [4.86, 1.06, 0.638], [5.34, 1.42, 0.600],
      [5.78, 1.39, 0.575], [5.91, .90, 0.575],
    ],
  },
  {
    id: 'x-cross-and-join', letter: 'x', kind: 'crossing', penLiftBefore: true, time: [.76, .835],
    note: 'Lift to x upper-left hook, cross the first diagonal, then continue into c; no airborne bridge.',
    points: [
      [3.14, .87, 0.562], [3.19, 1.33, 0.588], [3.57, 1.47, 0.588],
      [3.95, 1.22, 0.600], [4.25, .62, 0.638], [4.36, -.11, 0.662],
      [4.42, -.77, 0.650], [4.79, -1.27, 0.612], [5.30, -1.42, 0.562],
      [5.86, -1.32, 0.537], [6.35, -1.00, 0.537], [6.73, -.63, 0.575],
    ],
  },
  {
    id: 'c-bowl-and-join', letter: 'c', kind: 'loop', penLiftBefore: false, time: [.835, .925],
    note: 'Open c: visit its top-right hooked terminal, sweep around the bowl, and exit right.',
    points: [
      [6.73, -.63, 0.575], [6.93, .20, 0.625], [7.28, .89, 0.625],
      [7.79, 1.37, 0.600], [8.25, 1.40, 0.588], [8.60, 1.00, 0.550],
      [8.58, .51, 0.513], [8.60, 1.00, 0.550], [8.25, 1.40, 0.588],
      [7.79, 1.37, 0.600], [7.28, .89, 0.625], [6.93, .20, 0.625],
      [6.84, -.55, 0.650], [7.14, -1.19, 0.638], [7.65, -1.40, 0.600],
      [8.25, -1.37, 0.562], [8.84, -1.13, 0.525], [9.40, -.76, 0.525],
    ],
  },
  {
    id: 'i-body', letter: 'i', kind: 'stem', penLiftBefore: false, time: [.925, .975],
    note: 'Finish the connected body; the separated i dot stays untouched until the final stroke.',
    points: [
      [9.40, -.76, 0.525], [9.67, -.22, 0.562], [9.86, .54, 0.588],
      [10.05, 1.29, 0.612], [10.13, 1.43, 0.612], [10.02, .64, 0.638],
      [9.87, -.24, 0.650], [9.77, -1.12, 0.625], [9.77, -1.40, 0.660],
    ],
  },
  {
    id: 'i-dot', letter: 'i', kind: 'dot', penLiftBefore: true, time: [.975, 1],
    note: 'Last, a short dab over the distinct second mesh component; never draw a line up to it.',
    points: [[10.46, 2.68, 0.750], [10.49, 2.76, 0.750]],
  },
];

export const writingPath = {
  version: 'galaxci-pacifico-manual-v1',
  coordinateSpace: 'model-local-xy-y-up',
  bounds: { minX: -11.16517, minY: -5, maxX: 11.16517, maxY: 5 },
  width: 22.33034, height: 10,
  source: {
    mesh: '/v-next/galaxci-inflated-mesh.json',
    outline: '/v-next/galaxci-shapes.json',
    outlineSha256: 'b8d0a08c97c92914db4913546d4ca562f6f9874225eee4a51169483bf6a9664f',
    meshSha256: 'a6b2088475ad6200fdd9909b972a16dd003f2597940c23b7a204bac967183f20',
    font: 'Pacifico Regular, with the existing optical warp and pair spacing',
    meshComponents: 2, counters: 5,
  },
  strokes: writingStrokes,
  validation: {
    // X intersections/retraced shoulders can belong to more than one stroke.
    // Assign each mesh sample its earliest covering time; future passes must
    // not erase it. Radius sweeps are always clipped to the original silhouette.
    policy: 'earliest-covering-stroke; original-mesh-clipped; no-pen-lift-bridges',
    preservedCounters: ['g-bowl', 'g-descender', 'a-first', 'l', 'a-second'],
    delayedComponent: 'i-dot',
    // CPU guide validation only; this does not replace GPU/transition viewing.
    verifiedFrontVertices: 13915,
    coveredFrontVertices: 13915,
    rasterPixelsPerModelUnit: 144,
    rasterCoverage: 1,
    dotVerticesCoveredBeforeFinalStroke: 0,
  },
} as const;
