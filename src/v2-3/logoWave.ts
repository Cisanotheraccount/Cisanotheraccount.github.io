import * as THREE from 'three';

/** One shared polar field: no logo piece receives an independent XY transform. */
export const logoWaveConfig = {
  period: 2.4,
  radialStretch: .154,
  radialRecoil: .042,
  thicknessInflation: .21,
  tailLag: .5,
  concentration: 3.5,
  centerRadius: .15,
} as const;

const tau = Math.PI * 2;
const wrapPhase = (phase: number) => ((phase % tau) + tau) % tau;
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The same broad 2π-periodic crest used by the original loading ring. */
export function logoWaveCrest(angle: number, phase: number) {
  // Increasing phase moves the crest clockwise in the logo's y-up local space.
  return Math.exp(logoWaveConfig.concentration * (Math.cos(angle + phase) - 1));
}

export function logoWaveScalars(angle: number, radius: number, phase: number) {
  const lead = logoWaveCrest(angle, phase);
  const tail = logoWaveCrest(angle, phase - tau * logoWaveConfig.tailLag / logoWaveConfig.period);
  // Suppress angle-dependent motion smoothly at the elliptic-polar origin.
  const centerFade = smoothstep(logoWaveConfig.centerRadius, logoWaveConfig.centerRadius * 2, radius);
  const radial = 1 + centerFade * (logoWaveConfig.radialStretch * lead - logoWaveConfig.radialRecoil * tail);
  const thickness = 1 + centerFade * (logoWaveConfig.thicknessInflation * lead - logoWaveConfig.thicknessInflation * .3 * tail);
  return { radial, thickness, lead, tail, centerFade };
}

export type LogoWaveSnapshot = Readonly<{
  phase: number;
  amplitude: number;
  vertices: number;
  radialRange: readonly [number, number];
  thicknessRange: readonly [number, number];
  positionVersion: number;
  bounds: readonly [readonly number[], readonly number[]];
  restBounds: readonly [readonly number[], readonly number[]];
  currentPositions?: Float32Array;
  restPositions?: Float32Array;
}>;

export type LogoWave = {
  setPhase(phase: number, amplitude?: number): void;
  getSnapshot(includePositions?: boolean): LogoWaveSnapshot;
};

/**
 * Deforms only from immutable rest positions. Every vertex uses the same
 * elliptic polar r' = r * s(theta, phase), so a positive shared scale keeps
 * radial order between all three authored pieces and prevents crossings.
 */
export function createLogoWave(geometry: THREE.BufferGeometry): LogoWave {
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  if (!(positions instanceof THREE.BufferAttribute) || positions.itemSize !== 3
    || !(normals instanceof THREE.BufferAttribute) || normals.count !== positions.count) {
    throw new Error('Logo wave needs positions and smooth surface normals');
  }
  positions.setUsage(THREE.DynamicDrawUsage); normals.setUsage(THREE.DynamicDrawUsage);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const restBounds = geometry.boundingBox!.clone(), center = restBounds.getCenter(new THREE.Vector3());
  const radiusX = Math.max(.00001, (restBounds.max.x - restBounds.min.x) * .5);
  const radiusY = Math.max(.00001, (restBounds.max.y - restBounds.min.y) * .5);
  const rest = new Float32Array(positions.array), restNormals = new Float32Array(normals.array);
  const count = positions.count;
  const cosines = new Float32Array(count), sines = new Float32Array(count), fades = new Float32Array(count);
  const angleX = new Float32Array(count), angleY = new Float32Array(count), fadeX = new Float32Array(count), fadeY = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const offset = i * 3, nx = (rest[offset] - center.x) / radiusX, ny = (rest[offset + 1] - center.y) / radiusY;
    const radius = Math.hypot(nx, ny), angle = Math.atan2(ny, nx);
    cosines[i] = Math.cos(angle); sines[i] = Math.sin(angle);
    const t = THREE.MathUtils.clamp((radius - logoWaveConfig.centerRadius) / logoWaveConfig.centerRadius, 0, 1);
    fades[i] = t * t * (3 - 2 * t);
    if (radius > logoWaveConfig.centerRadius) {
      const dr = 6 * t * (1 - t) / logoWaveConfig.centerRadius;
      angleX[i] = -ny / (radius * radius * radiusX);
      angleY[i] = nx / (radius * radius * radiusY);
      fadeX[i] = dr * nx / (radius * radiusX); fadeY[i] = dr * ny / (radius * radiusY);
    }
  }
  // Conservative for all phases; the same center and positive radial field
  // preserve all three pieces without a per-frame bounding-sphere traversal.
  geometry.boundingSphere!.center.copy(center);
  let radiusSquared = 0;
  for (let i = 0; i < rest.length; i += 3) {
    radiusSquared = Math.max(radiusSquared, (rest[i] - center.x) ** 2 + (rest[i + 1] - center.y) ** 2 + (rest[i + 2] - center.z) ** 2);
  }
  geometry.boundingSphere!.radius = Math.sqrt(radiusSquared) * (1 + Math.max(logoWaveConfig.radialStretch, logoWaveConfig.thicknessInflation));
  let phase = 0, amplitude = 0, radialMin = 1, radialMax = 1, thicknessMin = 1, thicknessMax = 1;
  const apply = (nextPhase: number, nextAmplitude = 1) => {
    phase = wrapPhase(nextPhase); amplitude = THREE.MathUtils.clamp(nextAmplitude, 0, 1);
    radialMin = Infinity; radialMax = -Infinity; thicknessMin = Infinity; thicknessMax = -Infinity;
    const tailPhase = phase - tau * logoWaveConfig.tailLag / logoWaveConfig.period;
    const cp = Math.cos(phase), sp = Math.sin(phase), ct = Math.cos(tailPhase), st = Math.sin(tailPhase);
    const k = logoWaveConfig.concentration;
    for (let i = 0; i < count; i++) {
      const offset = i * 3, ca = cosines[i], sa = sines[i], fade = fades[i];
      const lead = Math.exp(k * (ca * cp - sa * sp - 1));
      const tail = Math.exp(k * (ca * ct - sa * st - 1));
      const leadDerivative = -k * (sa * cp + ca * sp) * lead;
      const tailDerivative = -k * (sa * ct + ca * st) * tail;
      const stretch = logoWaveConfig.radialStretch * lead - logoWaveConfig.radialRecoil * tail;
      const inflation = logoWaveConfig.thicknessInflation * (lead - .3 * tail);
      const stretchDerivative = logoWaveConfig.radialStretch * leadDerivative - logoWaveConfig.radialRecoil * tailDerivative;
      const inflationDerivative = logoWaveConfig.thicknessInflation * (leadDerivative - .3 * tailDerivative);
      const radial = 1 + fade * stretch * amplitude, thickness = 1 + fade * inflation * amplitude;
      const dx = rest[offset] - center.x, dy = rest[offset + 1] - center.y, dz = rest[offset + 2] - center.z;
      positions.setXYZ(i, center.x + dx * radial, center.y + dy * radial, center.z + dz * thickness);

      // Transform the precomputed smooth normal by J^-T. Rebuilding normals
      // from uneven triangle areas would bring the old high-gloss facets back.
      const sx = (fadeX[i] * stretch + fade * stretchDerivative * angleX[i]) * amplitude;
      const sy = (fadeY[i] * stretch + fade * stretchDerivative * angleY[i]) * amplitude;
      const tx = (fadeX[i] * inflation + fade * inflationDerivative * angleX[i]) * amplitude;
      const ty = (fadeY[i] * inflation + fade * inflationDerivative * angleY[i]) * amplitude;
      const a = radial + dx * sx, b = dx * sy, c = dy * sx, d = radial + dy * sy;
      const determinant = a * d - b * c;
      const nz = restNormals[offset + 2] / thickness;
      const vx = restNormals[offset] - dz * tx * nz, vy = restNormals[offset + 1] - dz * ty * nz;
      const nx = (d * vx - c * vy) / determinant, ny = (a * vy - b * vx) / determinant;
      const length = Math.hypot(nx, ny, nz) || 1;
      normals.setXYZ(i, nx / length, ny / length, nz / length);
      radialMin = Math.min(radialMin, radial); radialMax = Math.max(radialMax, radial);
      thicknessMin = Math.min(thicknessMin, thickness); thicknessMax = Math.max(thicknessMax, thickness);
    }
    positions.needsUpdate = true; normals.needsUpdate = true; geometry.computeBoundingBox();
    geometry.userData.logoWave = { phase, amplitude, vertices: count, radialRange: [radialMin, radialMax],
      thicknessRange: [thicknessMin, thicknessMax], positionVersion: positions.version };
  };
  apply(0, 0);
  return {
    setPhase: apply,
    getSnapshot: (includePositions = false) => Object.freeze({ phase, amplitude, vertices: count,
      radialRange: [radialMin, radialMax] as const, thicknessRange: [thicknessMin, thicknessMax] as const, positionVersion: positions.version,
      bounds: [geometry.boundingBox!.min.toArray(), geometry.boundingBox!.max.toArray()] as const,
      restBounds: [restBounds.min.toArray(), restBounds.max.toArray()] as const,
      ...(includePositions ? { currentPositions: new Float32Array(positions.array), restPositions: new Float32Array(rest) } : {}),
    }),
  };
}
