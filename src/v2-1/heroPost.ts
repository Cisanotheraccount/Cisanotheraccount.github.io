import * as THREE from 'three';
import { visual } from './config';
import { getPerformanceSnapshot } from './runtime';

const vertex = `varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
const aces = `#include <tonemapping_pars_fragment>`;
const target = (depth = false, samples = 0, format: THREE.PixelFormat = THREE.RGBAFormat) => new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  format, depthBuffer: depth, stencilBuffer: false, samples,
  resolveDepthBuffer: false, resolveStencilBuffer: false,
  storeMultisampledDepthBuffer: false, storeMultisampledStencilBuffer: false,
});
export type HeroPostStage = 'fluid' | 'background' | 'color' | 'mask' | 'flare' | 'composite';
export type HeroPostMeasure = (stage: HeroPostStage, action: () => void) => void;
const unmeasured: HeroPostMeasure = (_stage, action) => action();

/** Check the actual attachment combination once, without weakening its sample count. */
function supportsTarget(renderer: THREE.WebGLRenderer, format: THREE.PixelFormat, samples = 0) {
  const gl = renderer.getContext();
  if (!('getInternalformatParameter' in gl)) return false;
  if (!renderer.extensions.has('EXT_color_buffer_float')) return false;
  const internalFormat = format === THREE.RedFormat ? gl.R16F : gl.RG16F;
  if (samples && !Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER, internalFormat, gl.SAMPLES) as Int32Array).includes(samples)) return false;
  const original = renderer.getRenderTarget();
  const probe = target(false, samples, format);
  try {
    renderer.setRenderTarget(probe);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  } catch { return false; }
  finally { renderer.setRenderTarget(original); probe.dispose(); }
}
type Uniforms = Record<string, THREE.IUniform>;
const shader = (fragmentShader: string, uniforms: Uniforms) => new THREE.ShaderMaterial({
  vertexShader: vertex, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false,
});

/** Original hero-only post processing. DOM text never enters these buffers. */
export class HeroPost {
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.Camera();
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private readonly color = target(true, 4);
  private readonly mask: THREE.WebGLRenderTarget;
  private readonly background = target();
  private readonly flare = target();
  private velocity: THREE.WebGLRenderTarget;
  private velocitySwap: THREE.WebGLRenderTarget;
  private pressure: THREE.WebGLRenderTarget;
  private pressureSwap: THREE.WebGLRenderTarget;
  private readonly divergence: THREE.WebGLRenderTarget;
  private readonly texel = new THREE.Vector2(1, 1);
  private readonly pointer = new THREE.Vector2(-1, -1);
  private readonly pointerFrom = new THREE.Vector2(-1, -1);
  private readonly impulse = new THREE.Vector2();
  private readonly pixel = new THREE.Vector2(1, 1);
  private readonly aspect = { value: 1 };
  private readonly dt = { value: 1 / 60 };
  private readonly maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  private readonly advect: THREE.ShaderMaterial;
  private readonly diverge: THREE.ShaderMaterial;
  private readonly solve: THREE.ShaderMaterial;
  private readonly project: THREE.ShaderMaterial;
  private readonly star: THREE.ShaderMaterial;
  private readonly composite: THREE.ShaderMaterial;
  private readonly cachedBackdrop: THREE.ShaderMaterial;
  private readonly cacheViewport = new THREE.Vector4();
  private readonly maskWorld = new THREE.Matrix4();
  private readonly maskView = new THREE.Matrix4();
  private readonly maskProjection = new THREE.Matrix4();
  private readonly clipMatrix = new THREE.Matrix4();
  private readonly corner = new THREE.Vector4();
  private readonly flareBounds = new THREE.Vector4();
  private readonly previousFlareBounds = new THREE.Vector4();
  private maskGeometry = '';
  private maskGeometryVersion = '';
  private maskVisible = false;
  private maskDirty = true;
  private quality: 'full' | 'balanced' = 'full';
  private energy = 0;
  private stale = true;
  private backgroundDirty = true;
  private nextFlareAt = -Infinity;
  private flareAllowed = true;
  private disposed = false;
  private width = 1;
  private height = 1;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    (this.quad.material as THREE.Material).dispose();
    const samples = Math.min(4, renderer.capabilities.maxSamples);
    this.color.samples = samples;
    const single = supportsTarget(renderer, THREE.RedFormat) ? THREE.RedFormat : THREE.RGBAFormat;
    const pair = supportsTarget(renderer, THREE.RGFormat) ? THREE.RGFormat : THREE.RGBAFormat;
    this.mask = target(false, samples, supportsTarget(renderer, THREE.RedFormat, samples) ? THREE.RedFormat : THREE.RGBAFormat);
    this.velocity = target(false, 0, pair); this.velocitySwap = target(false, 0, pair);
    this.pressure = target(false, 0, single); this.pressureSwap = target(false, 0, single);
    this.divergence = target(false, 0, single);
    // The expensive sky is already linear HDR. Reuse it in both the main color
    // pass and Three's own transmission capture without applying tone mapping.
    this.cachedBackdrop = new THREE.ShaderMaterial({
      vertexShader: 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform sampler2D uBackground; uniform vec4 uViewport; void main(){vec2 uv=(gl_FragCoord.xy-uViewport.xy)/uViewport.zw;gl_FragColor=texture2D(uBackground,uv);}',
      uniforms: { uBackground: { value: this.background.texture }, uViewport: { value: this.cacheViewport } },
      toneMapped: false,
    });
    this.cachedBackdrop.onBeforeRender = currentRenderer => {
      // Transmission has its own viewport, especially at 0.85 resolution.
      // Never normalize its gl_FragCoord by the full-size color-buffer size.
      currentRenderer.getCurrentViewport(this.cacheViewport).floor();
      this.cachedBackdrop.uniformsNeedUpdate = true;
    };
    this.quad.frustumCulled = false; this.quadScene.add(this.quad);
    this.advect = shader(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform float uDt, uAspect;
      uniform vec2 uPointer, uFrom, uImpulse;
      void main() {
        vec2 old = texture2D(uVelocity, vUv).xy;
        vec2 velocity = texture2D(uVelocity, clamp(vUv - old * uDt, .001, .999)).xy;
        velocity *= exp(-${visual.fluid.dissipation.toFixed(2)} * uDt);
        // Splat along the actual pointer segment, avoiding disconnected dents on fast passes.
        vec2 metric=vec2(uAspect,1.);
        vec2 segment=(uPointer-uFrom)*metric;
        vec2 relative=(vUv-uFrom)*metric;
        float along=clamp(dot(relative,segment)/max(dot(segment,segment),.000001),0.,1.);
        vec2 d=relative-segment*along;
        float splat = exp(-dot(d,d) / ${ (visual.fluid.radius ** 2).toFixed(6) });
        velocity += uImpulse * splat * ${visual.fluid.force.toFixed(2)};
        float speed = length(velocity*metric);
        if (speed > ${visual.fluid.velocityLimit}) velocity *= ${visual.fluid.velocityLimit} / speed;
        gl_FragColor = vec4(velocity, 0., 1.);
      }`, { uVelocity: { value: this.velocity.texture }, uDt: this.dt, uAspect: this.aspect, uPointer: { value: this.pointer }, uFrom: { value: this.pointerFrom }, uImpulse: { value: this.impulse } });
    this.diverge = shader(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`, { uVelocity: { value: this.velocitySwap.texture }, uTexel: { value: this.texel } });
    this.solve = shader(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`, { uPressure: { value: this.pressure.texture }, uDivergence: { value: this.divergence.texture }, uTexel: { value: this.texel } });
    this.project = shader(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`, { uPressure: { value: this.pressure.texture }, uVelocity: { value: this.velocitySwap.texture }, uTexel: { value: this.texel } });
    this.star = shader(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${aces}
      vec3 bright(vec2 uv) {
        vec2 sampleUv=clamp(uv,0.,1.);
        float coverage=texture2D(uMask,sampleUv).r;
        // Zero coverage made the original result exactly zero. Test it before
        // HDR sampling and ACES: most ray taps cross sky or letter holes.
        // Contributing taps retain the original interpolation/tonemap order.
        if(coverage<=0.) return vec3(0.);
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,sampleUv).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${visual.flare.threshold})/${1 - visual.flare.threshold},0.,1.),${visual.flare.power.toFixed(1)});
        return c*b*coverage;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        // The eighth pair has (1 - 8/8)^2 = 0 weight, so it adds no light.
        for(int i=1;i<=7;i++) {
          float t=float(i)/8.; vec2 d=axis*uPixel*${visual.flare.length.toFixed(1)}*t;
          float weight=pow(1.-t,2.);
          sum+=(bright(vUv+d)+bright(vUv-d))*weight;
        }
        return sum;
      }
      void main() {
        vec3 glow=ray(vec2(0.,1.))+ray(vec2(.8660254,.5))+ray(vec2(.8660254,-.5));
        gl_FragColor=vec4(glow*${(visual.flare.intensity / 5).toFixed(5)},1.);
      }`, { uColor: { value: this.color.texture }, uMask: { value: this.mask.texture }, uPixel: { value: new THREE.Vector2(1, 1) }, toneMappingExposure: { value: visual.lighting.exposure } });
    this.composite = shader(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${aces}
      vec3 glassAt(vec2 uv,float coverage) {
        vec3 c=texture2D(uColor,uv).rgb;
        // Unmix edge coverage before tone mapping; do not bake the backdrop into the matte.
        vec3 bg=texture2D(uBackground,uv).rgb;
        c=max(c-bg*(1.-coverage),0.)/max(coverage,.0001);
        return ACESFilmicToneMapping(c);
      }
      void main() {
        // Background always samples the undisplaced screen coordinate, including vacated edges.
        vec3 bg=texture2D(uBackground,vUv).rgb;
        vec2 d=vec2(0.);
        if(uFluid>0.) {
          d=texture2D(uVelocity,vUv).xy*${visual.fluid.displacement}*uFluid;
          float pixels=length(d/uPixel);
          // A soft limit keeps large pushes rounded instead of clipping them into a flat dent.
          d /= sqrt(1. + pow(pixels / uMaxDisplacement, 2.));
        }
        vec2 uv=clamp(vUv-d,.0001,.9999);
        float coverage=texture2D(uMask,uv).r;
        vec3 result=bg;
        // Coverage is tested AFTER displacement, including all pushed-out edges.
        // Letter holes and untouched sky need neither ACES nor glass color fetches.
        if(coverage>0.) {
          vec3 glass=glassAt(uv,coverage);
          if(uFluid>0.) {
            // Dispersion stays inside one silhouette, never three displaced outlines.
            vec2 redUv=uv-d*${visual.fluid.chroma}, blueUv=uv+d*${visual.fluid.chroma};
            float redMask=texture2D(uMask,redUv).r, blueMask=texture2D(uMask,blueUv).r;
            if(redMask>.2) glass.r=mix(glass.r,glassAt(redUv,redMask).r,smoothstep(.2,.95,redMask));
            if(blueMask>.2) glass.b=mix(glass.b,glassAt(blueUv,blueMask).b,smoothstep(.2,.95,blueMask));
          }
          if(uFlareEnabled>.5) glass+=texture2D(uFlare,uv).rgb;
          result=mix(bg,glass,coverage);
        }
        gl_FragColor=vec4(result,1.);
        #include <colorspace_fragment>
      }`, { uColor: { value: this.color.texture }, uMask: { value: this.mask.texture }, uBackground: { value: this.background.texture }, uFlare: { value: this.flare.texture }, uVelocity: { value: this.velocity.texture }, uPixel: { value: this.pixel }, uMaxDisplacement: { value: visual.fluid.maxPixels }, uFluid: { value: 0 }, uFlareEnabled: { value: 1 }, toneMappingExposure: { value: visual.lighting.exposure } });
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('glass-mask')) {
      this.composite.fragmentShader = this.composite.fragmentShader.replace('vec4(result,1.)', 'vec4(vec3(coverage),1.)');
    }
  }

  setSize(cssWidth: number, cssHeight: number, dpr: number) {
    this.width = Math.max(1, Math.round(cssWidth * dpr)); this.height = Math.max(1, Math.round(cssHeight * dpr));
    this.color.setSize(this.width, this.height); this.mask.setSize(this.width, this.height);
    this.background.setSize(this.width, this.height); this.backgroundDirty = true; this.maskDirty = true;
    this.sizeFlare();
    const aspect = cssWidth / cssHeight;
    const simWidth = Math.round(visual.fluid.resolution * Math.max(1, aspect));
    const simHeight = Math.round(visual.fluid.resolution * Math.max(1, 1 / aspect));
    for (const t of [this.velocity, this.velocitySwap, this.pressure, this.pressureSwap, this.divergence]) t.setSize(simWidth, simHeight);
    this.texel.set(1 / simWidth, 1 / simHeight); this.aspect.value = aspect;
    this.pixel.set(1 / cssWidth, 1 / cssHeight);
    this.composite.uniforms.uMaxDisplacement.value = Math.min(visual.fluid.maxPixels, cssWidth * visual.fluid.widthRatio);
    this.star.uniforms.uPixel.value.set(1 / cssWidth, 1 / cssHeight);
    this.reset(); this.nextFlareAt = -Infinity;
  }

  private sizeFlare() {
    const scale = visual.renderQuality[this.quality].flareScale;
    this.flare.setSize(Math.ceil(this.width * scale), Math.ceil(this.height * scale));
    this.previousFlareBounds.set(0, 0, 0, 0);
    this.nextFlareAt = -Infinity;
  }

  setQuality(quality: 'full' | 'balanced') {
    if (this.quality === quality) return;
    this.quality = quality;
    // Reallocate only the soft highlight target. Fluid state and sharp coverage
    // keep their dimensions and contents throughout a quality transition.
    this.sizeFlare();
  }

  setFlare(value: boolean) { this.flareAllowed = value; this.composite.uniforms.uFlareEnabled.value = +value; }
  // Sky updates invalidate only their buffer, never the independent highlight clock.
  invalidateBackground() { this.backgroundDirty = true; }
  async warm() {
    const original = this.renderer.getRenderTarget();
    const passes: [THREE.ShaderMaterial, THREE.WebGLRenderTarget | null][] = [
      [this.advect, this.velocitySwap], [this.diverge, this.divergence], [this.solve, this.pressureSwap],
      [this.project, this.velocity], [this.star, this.flare], [this.cachedBackdrop, this.color], [this.composite, null],
    ];
    try {
      for (const [material, destination] of passes) {
        if (this.disposed) return;
        this.quad.material = material; this.renderer.setRenderTarget(destination);
        await this.renderer.compileAsync(this.quadScene, this.quadCamera);
      }
    } finally { this.renderer.setRenderTarget(original); }
  }
  push(uv: THREE.Vector2, delta: THREE.Vector2) {
    this.pointerFrom.copy(uv).sub(delta); this.pointer.copy(uv); this.impulse.add(delta).clampLength(0, visual.fluid.maxImpulse);
    this.energy = Math.max(this.energy, Math.min(.3, delta.length() * 8));
  }
  reset() { this.energy = 0; this.impulse.set(0, 0); this.pointer.set(-1, -1); this.stale = true; }
  get active() { return this.energy > visual.fluid.settle || this.impulse.lengthSq() > 1e-9; }

  private draw(material: THREE.ShaderMaterial, destination: THREE.WebGLRenderTarget | null) {
    this.quad.material = material; this.renderer.setRenderTarget(destination); this.renderer.render(this.quadScene, this.quadCamera);
  }
  private clear(destination: THREE.WebGLRenderTarget) { this.renderer.setRenderTarget(destination); this.renderer.clear(); }

  private needsMask(glass: THREE.Mesh, camera: THREE.Camera) {
    glass.updateWorldMatrix(true, false); camera.updateWorldMatrix(true, false);
    const position = glass.geometry.getAttribute('position');
    const positionVersion = position && ('version' in position ? position.version : position.data.version);
    const version = `${positionVersion ?? 0}:${glass.geometry.index?.version ?? 0}`;
    const geometryChanged = glass.geometry.uuid !== this.maskGeometry || version !== this.maskGeometryVersion;
    if (geometryChanged) glass.geometry.computeBoundingBox();
    const changed = this.maskDirty || geometryChanged || glass.visible !== this.maskVisible
      || !this.maskWorld.equals(glass.matrixWorld) || !this.maskView.equals(camera.matrixWorldInverse)
      || !this.maskProjection.equals(camera.projectionMatrix);
    return { changed, version };
  }

  private rememberMask(glass: THREE.Mesh, camera: THREE.Camera, version: string) {
    this.maskWorld.copy(glass.matrixWorld); this.maskView.copy(camera.matrixWorldInverse);
    this.maskProjection.copy(camera.projectionMatrix); this.maskVisible = glass.visible;
    this.maskGeometry = glass.geometry.uuid; this.maskGeometryVersion = version; this.maskDirty = false;
  }

  private drawFlare(glass: THREE.Mesh, camera: THREE.Camera) {
    const r = this.renderer;
    const bounds = this.flareBounds;
    bounds.set(1, 1, 0, 0);
    const box = glass.geometry.boundingBox;
    if (box && glass.visible) {
      this.clipMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(glass.matrixWorld);
      for (let i = 0; i < 8; i++) {
        this.corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z, 1).applyMatrix4(this.clipMatrix);
        if (this.corner.w <= 0) { bounds.set(0, 0, 1, 1); break; }
        const x = this.corner.x / this.corner.w * .5 + .5, y = this.corner.y / this.corner.w * .5 + .5;
        bounds.x = Math.min(bounds.x, x); bounds.y = Math.min(bounds.y, y);
        bounds.z = Math.max(bounds.z, x); bounds.w = Math.max(bounds.w, y);
      }
    }
    // Include the complete ray, filtering footprint and maximum displacement.
    // Retain the last footprint as well during moving-camera/wordmark frames.
    const padding = visual.flare.length + visual.fluid.maxPixels + 4;
    const px = padding * this.pixel.x, py = padding * this.pixel.y;
    const current = bounds.clone();
    const previous = this.previousFlareBounds;
    if (previous.z > previous.x && previous.w > previous.y) {
      bounds.x = Math.min(bounds.x, previous.x); bounds.y = Math.min(bounds.y, previous.y);
      bounds.z = Math.max(bounds.z, previous.z); bounds.w = Math.max(bounds.w, previous.w);
    }
    previous.copy(current);
    const x = Math.max(0, Math.floor((bounds.x - px) * this.flare.width));
    const y = Math.max(0, Math.floor((bounds.y - py) * this.flare.height));
    const right = Math.min(this.flare.width, Math.ceil((bounds.z + px) * this.flare.width));
    const top = Math.min(this.flare.height, Math.ceil((bounds.w + py) * this.flare.height));
    // Clear the FULL old target first: no stranded highlights outside the new box.
    this.flare.scissorTest = false; r.setClearColor(0, 1); this.clear(this.flare);
    if (right <= x || top <= y) return;
    const autoClear = r.autoClear;
    try {
      this.flare.scissor.set(x, y, right - x, top - y); this.flare.scissorTest = true;
      r.autoClear = false;
      this.draw(this.star, this.flare);
    } finally {
      r.autoClear = autoClear; this.flare.scissorTest = false;
      this.flare.scissor.set(0, 0, this.flare.width, this.flare.height);
    }
  }

  render(scene: THREE.Scene, camera: THREE.Camera, glass: THREE.Mesh, backdrop: THREE.Mesh, dt: number, fluidAllowed: boolean, measure: HeroPostMeasure = unmeasured) {
    const r = this.renderer;
    const oldTarget = r.getRenderTarget(); const oldColor = r.getClearColor(new THREE.Color()); const oldAlpha = r.getClearAlpha();
    const savedMaterial = glass.material, savedBackdropMaterial = backdrop.material;
    const savedBackdrop = backdrop.visible, savedGlass = glass.visible;
    try {
      measure('fluid', () => {
        r.setClearColor(0, 1);
        if (this.stale || (!fluidAllowed && this.active)) {
          this.clear(this.velocity); this.clear(this.velocitySwap); this.stale = false;
          if (!fluidAllowed) { this.energy = 0; this.impulse.set(0, 0); }
        }
        if (fluidAllowed && this.active) {
          this.dt.value = Math.min(dt, .05);
          this.advect.uniforms.uVelocity.value = this.velocity.texture; this.draw(this.advect, this.velocitySwap);
          this.diverge.uniforms.uVelocity.value = this.velocitySwap.texture; this.draw(this.diverge, this.divergence);
          this.clear(this.pressure);
          for (let i = 0; i < visual.fluid.pressureIterations; i++) {
            this.solve.uniforms.uPressure.value = this.pressure.texture; this.draw(this.solve, this.pressureSwap);
            [this.pressure, this.pressureSwap] = [this.pressureSwap, this.pressure];
          }
          this.project.uniforms.uPressure.value = this.pressure.texture; this.project.uniforms.uVelocity.value = this.velocitySwap.texture;
          this.draw(this.project, this.velocity);
          this.energy *= Math.exp(-visual.fluid.dissipation * dt); this.impulse.set(0, 0);
        }
      });
      r.setClearColor(oldColor, oldAlpha);
      if (this.backgroundDirty) measure('background', () => {
        glass.visible = false; r.setRenderTarget(this.background); r.render(scene, camera);
        glass.visible = savedGlass; this.backgroundDirty = false;
      });
      // Reuse the same sky instant in Three's opaque transmission pass and the
      // main color pass. Its expensive star/project shader now runs only once.
      backdrop.material = this.cachedBackdrop;
      measure('color', () => { r.setRenderTarget(this.color); r.render(scene, camera); });
      const mask = this.needsMask(glass, camera);
      if (mask.changed) measure('mask', () => {
        glass.material = this.maskMaterial; backdrop.visible = false;
        r.setClearColor(0, 1); r.setRenderTarget(this.mask); r.render(scene, camera);
        glass.material = savedMaterial; backdrop.visible = savedBackdrop;
        this.rememberMask(glass, camera, mask.version);
      });
      const now = performance.now();
      if (this.flareAllowed && now + .5 >= this.nextFlareAt) measure('flare', () => {
        this.drawFlare(glass, camera);
        const flareFps = getPerformanceSnapshot('hero').targetFps > 60 ? visual.flare.highRefreshFps : visual.flare.standardFps;
        const interval = 1000 / flareFps;
        // Preserve the phase through scheduling jitter, but never replay stale work.
        const late = Number.isFinite(this.nextFlareAt) ? Math.max(0, now - this.nextFlareAt) % interval : 0;
        this.nextFlareAt = now + interval - late;
      });
      this.composite.uniforms.uVelocity.value = this.velocity.texture;
      const tail = Math.min(1, this.energy / visual.fluid.tailThreshold);
      this.composite.uniforms.uFluid.value = fluidAllowed && this.active ? tail * tail * (3 - 2 * tail) : 0;
      measure('composite', () => this.draw(this.composite, oldTarget));
    } finally {
      glass.material = savedMaterial; backdrop.material = savedBackdropMaterial;
      backdrop.visible = savedBackdrop; glass.visible = savedGlass;
      // We only change target-owned viewport/scissor state; rebinding restores
      // the caller's target (or its unchanged default framebuffer settings).
      r.setClearColor(oldColor, oldAlpha); r.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of [this.color, this.mask, this.background, this.flare, this.velocity, this.velocitySwap, this.pressure, this.pressureSwap, this.divergence]) t.dispose();
    for (const m of [this.advect, this.diverge, this.solve, this.project, this.star, this.composite, this.maskMaterial, this.cachedBackdrop]) m.dispose();
    this.quad.geometry.dispose();
  }
}
