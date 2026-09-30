import * as THREE from 'three';

// A single continuous deformation. The original indexed surface is never split.
export const glassRippleTiming = { duration: 1.7, attack: .2, strength: .14, depth: 1.1, boundsMargin: .5 };
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function sampleGlassRipple(time: number) {
  return {
    radius: 1.8 + 2.4 * smooth(0, .85, time),
    amount: glassRippleTiming.strength * smooth(0, glassRippleTiming.attack, time) * (1 - smooth(.25, glassRippleTiming.duration, time)),
  };
}

export function createGlassRipple(source: THREE.BufferGeometry, original: THREE.MeshPhysicalMaterial) {
  const ripple = new THREE.Vector4(0, 0, 1.8, 0);
  // Apply the same smooth mapping to the transmission surface and its post mask.
  // The inverse-transpose Jacobian keeps the existing lighting attached to the
  // deformed surface, rather than displaying a new overlay or a tinted ring.
  const header = `uniform vec4 gxcRipple;
    vec3 gxcRipplePosition(vec3 p) {
      vec2 d = p.xy - gxcRipple.xy;
      float f = gxcRipple.w * exp(-dot(d,d) / (2. * gxcRipple.z * gxcRipple.z));
      return p + vec3(d * f, -${glassRippleTiming.depth.toFixed(1)} * f);
    }
    vec3 gxcRippleNormal(vec3 p, vec3 n) {
      if (gxcRipple.w == 0.) return n;
      vec2 d = p.xy - gxcRipple.xy;
      float invS2 = 1. / (gxcRipple.z * gxcRipple.z);
      float f = gxcRipple.w * exp(-dot(d,d) * invS2 * .5);
      float a = 1. + f - f * d.x * d.x * invS2;
      float b = -f * d.x * d.y * invS2;
      float c = 1. + f - f * d.y * d.y * invS2;
      vec2 q = n.xy - ${glassRippleTiming.depth.toFixed(1)} * f * invS2 * d * n.z;
      return normalize(vec3(vec2(c*q.x - b*q.y, a*q.y - b*q.x) / (a*c - b*b), n.z));
    }
`;
  const material = original.clone(), mask = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const decorate = (target: THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial, physical: boolean) => {
    target.onBeforeCompile = (shader, renderer) => {
      if (physical) original.onBeforeCompile.call(target, shader, renderer);
      shader.uniforms.gxcRipple = { value: ripple };
      shader.vertexShader = header + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = gxcRippleNormal(position, normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
      `).replace('#include <begin_vertex>', 'vec3 transformed = gxcRipplePosition(position);');
    };
    target.customProgramCacheKey = () => `gxc-continuous-ripple-1-${physical ? original.customProgramCacheKey() : 'mask'}`;
  };
  decorate(material, true); decorate(mask, false);
  const surface = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(source, material);
  surface.frustumCulled = false;
  surface.userData.heroMaskMaterial = mask;
  // Bounds belong to this effect, not to the original shared geometry.
  surface.userData.heroBounds = source.boundingBox!.clone().expandByScalar(glassRippleTiming.boundsMargin);
  const root = new THREE.Group(); root.add(surface); root.visible = false;
  let elapsed = 0, active = false;
  const pose = () => { const state = sampleGlassRipple(elapsed); ripple.z = state.radius; ripple.w = state.amount; };
  const cancel = () => { active = false; root.visible = false; elapsed = 0; ripple.w = 0; };
  return {
    root, surface, mask, physical: material,
    get active() { return active; }, get progress() { return active ? elapsed / glassRippleTiming.duration : 0; },
    start(origin: THREE.Vector3) {
      if (active) return false; // One ripple at a time; taps never queue.
      elapsed = 0; active = true; ripple.set(origin.x, origin.y, 1.8, 0); root.visible = true; return true;
    },
    cancel,
    advance(dt: number) {
      if (!active) return false;
      elapsed = Math.min(glassRippleTiming.duration, elapsed + Math.max(0, dt));
      if (elapsed >= glassRippleTiming.duration) cancel(); else pose();
      return true;
    },
    dispose() { cancel(); root.removeFromParent(); material.dispose(); mask.dispose(); },
  };
}
