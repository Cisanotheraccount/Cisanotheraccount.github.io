import * as THREE from 'three';
import { createGlassRippleField, evaluateGlassRipple } from './glassRipple';

/** Apply the signature's exact wave packets after the opening's orbital wave.
 * CPU positions keep transmission, post masks, picking and docking identical. */
export function createEntryRipple(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const base = positions.clone();
  const bounds = geometry.boundingBox!.clone();
  // Match the spatial density/amplitude of the 22.33-unit signature at logo size.
  const scale = (bounds.max.x - bounds.min.x) / 22.33;
  bounds.min.divideScalar(scale); bounds.max.divideScalar(scale);
  const packets = createGlassRippleField(bounds);
  const field = new Float64Array(8);
  const origin = new THREE.Vector3();
  return {
    get count() { return packets.count; },
    get active() { return packets.active; },
    get full() { return packets.full; },
    get progress() { return packets.progress; },
    advance: packets.advance,
    cancel: packets.cancel,
    start(point: THREE.Vector3) { return packets.start(origin.copy(point).divideScalar(scale)); },
    hitPoint(hit: THREE.Intersection) {
      if (!hit.face || !hit.barycoord) return null;
      return THREE.Triangle.getInterpolatedAttribute(base, hit.face.a, hit.face.b, hit.face.c, hit.barycoord, new THREE.Vector3());
    },
    // Caller first restores/applies the orbit from immutable rest positions.
    // Never integrate displacement back into last frame's deformed positions.
    apply() {
      base.copyArray(positions.array);
      if (packets.active) for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        evaluateGlassRipple(x / scale, y / scale, packets.uniforms, field);
        positions.setXYZ(i, x + field[0] * scale, y + field[1] * scale, z + field[2] * scale);
        const nz = normals.getZ(i), qx = normals.getX(i) - field[6] * nz, qy = normals.getY(i) - field[7] * nz;
        const determinant = field[3] * field[5] - field[4] * field[4];
        const nx = (field[5] * qx - field[4] * qy) / determinant;
        const ny = (field[3] * qy - field[4] * qx) / determinant;
        const length = Math.hypot(nx, ny, nz) || 1;
        normals.setXYZ(i, nx / length, ny / length, nz / length);
      }
      positions.needsUpdate = true; normals.needsUpdate = true;
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    },
  };
}
