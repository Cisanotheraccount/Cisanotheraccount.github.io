import * as THREE from 'three';

// Four independent touches share one connected surface, never four glass meshes.
// Units are local to the ~22.33-unit-wide signature. The shorter wavelength makes
// several gentle oscillations readable while each packet travels across letters.
export const glassRippleTiming = {
  capacity: 4, duration: 2.4, attack: .12, release: 1.55, travel: 2.15,
  width: 3.3, wavelength: 4.8, softness: 1.8,
  strength: .95, amplitudeBudget: 1.25, planar: .34, depth: .95,
  // Sum of effective amplitudes < 1.25; full displacement < 1.262 units.
  boundsMargin: 1.4,
};
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function sampleGlassRipple(time: number, reach: number) {
  const c = glassRippleTiming;
  return {
    front: c.softness + (Math.hypot(reach, c.softness) + 2 * c.width - c.softness) * Math.max(0, time / c.travel),
    amount: c.strength * smooth(0, c.attack, time) * (1 - smooth(c.release, c.duration, time)),
  };
}

// CPU equivalent of the shader, used only for on-demand deformed hit testing.
// Caller owns the scratch output: displacement xyz, planar Jacobian xx/xy/yy,
// and depth gradient xy. No vertex upload or geometry work occurs every frame.
export function evaluateGlassRipple(x: number, y: number, waves: readonly THREE.Vector4[], out: Float64Array) {
  const c = glassRippleTiming, frequency = 2 * Math.PI / c.wavelength;
  out.fill(0); out[3] = out[5] = 1;
  for (const wave of waves) {
    if (wave.w <= 0) continue;
    const dx = x - wave.x, dy = y - wave.y, s = Math.hypot(dx, dy, c.softness), q = s - wave.z;
    const e = wave.w * Math.exp(-.5 * q * q / (c.width * c.width));
    const sine = Math.sin(frequency * q), w = e * sine;
    const dw = e * (frequency * Math.cos(frequency * q) - q / (c.width * c.width) * sine);
    const f = c.planar * w / s, k = c.planar * (dw - w / s) / (s * s);
    out[0] += dx * f; out[1] += dy * f; out[2] += c.depth * w;
    out[3] += f + dx * dx * k; out[4] += dx * dy * k; out[5] += f + dy * dy * k;
    out[6] += c.depth * dw * dx / s; out[7] += c.depth * dw * dy / s;
  }
  return out;
}

export function createGlassRipple(source: THREE.BufferGeometry, original: THREE.MeshPhysicalMaterial) {
  const c = glassRippleTiming;
  const waves = Array.from({ length: c.capacity }, () => ({ uniform: new THREE.Vector4(0, 0, c.softness, 0), elapsed: 0, reach: 0, active: false, amount: 0 }));
  const uniforms = waves.map(wave => wave.uniform);
  // Sum displacements AND their Jacobians before transforming the normal. Both
  // surface and mask borrow this uniform array, including interference regions.
  const header = `uniform vec4 gxcRipples[${c.capacity}];
    void gxcField(vec3 p, out vec3 offset, out vec3 j, out vec2 hz) {
      offset = vec3(0.); j = vec3(1., 0., 1.); hz = vec2(0.);
      for (int i = 0; i < ${c.capacity}; i++) {
        vec4 wave = gxcRipples[i];
        if (wave.w <= 0.) continue;
        vec2 d = p.xy - wave.xy;
        float s = sqrt(dot(d,d) + ${c.softness * c.softness});
        float q = s - wave.z;
        float e = wave.w * exp(-.5 * q*q / ${c.width * c.width});
        float sine = sin(${2 * Math.PI / c.wavelength} * q);
        float w = e * sine;
        float dw = e * (${2 * Math.PI / c.wavelength} * cos(${2 * Math.PI / c.wavelength} * q) - q / ${c.width * c.width} * sine);
        float f = ${c.planar} * w / s;
        float k = ${c.planar} * (dw - w / s) / (s*s);
        offset += vec3(d * f, ${c.depth} * w);
        j += vec3(f + d.x*d.x*k, d.x*d.y*k, f + d.y*d.y*k);
        hz += ${c.depth} * dw * d / s;
      }
    }
    vec3 gxcRipplePosition(vec3 p) {
      vec3 offset, j; vec2 hz;
      gxcField(p, offset, j, hz);
      return p + offset;
    }
    vec3 gxcRippleNormal(vec3 p, vec3 n) {
      vec3 offset, j; vec2 hz;
      gxcField(p, offset, j, hz);
      vec2 q = n.xy - hz * n.z;
      return normalize(vec3(vec2(j.z*q.x - j.y*q.y, j.x*q.y - j.y*q.x) / (j.x*j.z - j.y*j.y), n.z));
    }
`;
  const material = original.clone(), mask = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const decorate = (target: THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial, physical: boolean) => {
    target.onBeforeCompile = (shader, renderer) => {
      if (physical) original.onBeforeCompile.call(target, shader, renderer);
      shader.uniforms.gxcRipples = { value: uniforms };
      shader.vertexShader = header + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = gxcRippleNormal(position, normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
      `).replace('#include <begin_vertex>', 'vec3 transformed = gxcRipplePosition(position);');
    };
    target.customProgramCacheKey = () => `gxc-multi-wave-3-${physical ? original.customProgramCacheKey() : 'mask'}`;
  };
  decorate(material, true); decorate(mask, false);
  const surface = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(source, material);
  surface.frustumCulled = false;
  surface.userData.heroMaskMaterial = mask;
  const bounds = source.boundingBox!;
  surface.userData.heroBounds = bounds.clone().expandByScalar(c.boundsMargin);
  const root = new THREE.Group(); root.add(surface); root.visible = false;
  let latest = waves[0];
  let hitMesh: THREE.Mesh | undefined;
  const field = new Float64Array(8);
  const pose = () => {
    let total = 0;
    for (const wave of waves) {
      const state = sampleGlassRipple(wave.elapsed, wave.reach);
      wave.uniform.z = state.front; wave.amount = wave.active ? state.amount : 0; total += wave.amount;
    }
    // A smooth energy budget, not an active-count divisor. A new wave enters at
    // zero and never abruptly dims or restarts the waves already on the surface.
    const gain = 1 / Math.hypot(1, total / c.amplitudeBudget);
    for (const wave of waves) wave.uniform.w = wave.amount * gain;
    root.visible = waves.some(wave => wave.active);
  };
  const cancel = () => { for (const wave of waves) { wave.active = false; wave.elapsed = 0; wave.uniform.w = 0; } root.visible = false; };
  return {
    root, surface, mask, physical: material,
    get active() { return root.visible; },
    get full() { return waves.every(wave => wave.active); },
    get count() { return waves.filter(wave => wave.active).length; },
    get progress() { return latest.active ? latest.elapsed / c.duration : 0; },
    start(origin: THREE.Vector3) {
      const wave = waves.find(candidate => !candidate.active);
      if (!wave) return false; // Bounded simultaneous input, never a delayed queue.
      wave.reach = Math.hypot(Math.max(Math.abs(bounds.min.x - origin.x), Math.abs(bounds.max.x - origin.x)),
        Math.max(Math.abs(bounds.min.y - origin.y), Math.abs(bounds.max.y - origin.y)));
      wave.elapsed = 0; wave.active = true; latest = wave;
      wave.uniform.set(origin.x, origin.y, c.softness, 0); pose(); return true;
    },
    // The second click must hit the visible displaced stroke, not its old rest
    // outline. A lazy CPU-only mesh updates once per click; it is never rendered.
    hitRestPoint(raycaster: THREE.Raycaster) {
      if (!hitMesh) {
        const geometry = source.clone();
        geometry.boundingBox = surface.userData.heroBounds.clone();
        geometry.boundingSphere = geometry.boundingBox!.getBoundingSphere(new THREE.Sphere());
        hitMesh = new THREE.Mesh(geometry, original); hitMesh.matrixAutoUpdate = false;
      }
      const rest = source.getAttribute('position'), position = hitMesh.geometry.getAttribute('position');
      for (let i = 0; i < rest.count; i++) {
        evaluateGlassRipple(rest.getX(i), rest.getY(i), uniforms, field);
        position.setXYZ(i, rest.getX(i) + field[0], rest.getY(i) + field[1], rest.getZ(i) + field[2]);
      }
      surface.updateWorldMatrix(true, false); hitMesh.matrixWorld.copy(surface.matrixWorld);
      const hit = raycaster.intersectObject(hitMesh, false)[0];
      if (!hit?.face || !hit.barycoord) return null;
      // Interpolate back into the undeformed domain so the new disturbance is
      // attached precisely to the material point that was touched.
      return THREE.Triangle.getInterpolatedAttribute(rest, hit.face.a, hit.face.b, hit.face.c, hit.barycoord, new THREE.Vector3());
    },
    cancel,
    advance(dt: number) {
      if (!root.visible) return false;
      for (const wave of waves) if (wave.active) {
        wave.elapsed = Math.min(c.duration, wave.elapsed + Math.max(0, dt));
        if (wave.elapsed >= c.duration) wave.active = false;
      }
      pose(); return true;
    },
    dispose() { cancel(); root.removeFromParent(); hitMesh?.geometry.dispose(); material.dispose(); mask.dispose(); },
  };
}
