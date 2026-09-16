import * as THREE from 'three';
import { visual } from './config';

const vertex = `varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
const aces = `#include <tonemapping_pars_fragment>`;
const target = (depth = false, samples = 0) => new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  depthBuffer: depth, stencilBuffer: false, samples,
});
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
  private readonly mask = target(true, 4);
  private readonly background = target();
  private readonly flare = target();
  private velocity = target();
  private velocitySwap = target();
  private pressure = target();
  private pressureSwap = target();
  private readonly divergence = target();
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
  private energy = 0;
  private stale = true;
  private backgroundDirty = true;
  private cadence = 0;
  private flareAllowed = true;
  private disposed = false;
  private width = 1;
  private height = 1;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    (this.quad.material as THREE.Material).dispose();
    this.color.samples = this.mask.samples = Math.min(4, renderer.capabilities.maxSamples);
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
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,clamp(uv,0.,1.)).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${visual.flare.threshold})/${1 - visual.flare.threshold},0.,1.),${visual.flare.power.toFixed(1)});
        return c*b*texture2D(uMask,clamp(uv,0.,1.)).r;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        for(int i=1;i<=8;i++) {
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
        vec2 d=texture2D(uVelocity,vUv).xy*${visual.fluid.displacement}*uFluid;
        float pixels=length(d/uPixel);
        // A soft limit keeps large pushes rounded instead of clipping them into a flat dent.
        d /= sqrt(1. + pow(pixels / uMaxDisplacement, 2.));
        vec2 uv=clamp(vUv-d,.0001,.9999);
        float coverage=texture2D(uMask,uv).r;
        vec3 glass=glassAt(uv,coverage);
        // Dispersion remains inside a single coherent silhouette, never three displaced outlines.
        vec2 redUv=uv-d*${visual.fluid.chroma}, blueUv=uv+d*${visual.fluid.chroma};
        float redMask=texture2D(uMask,redUv).r, blueMask=texture2D(uMask,blueUv).r;
        glass.r=mix(glass.r,glassAt(redUv,redMask).r,smoothstep(.2,.95,redMask));
        glass.b=mix(glass.b,glassAt(blueUv,blueMask).b,smoothstep(.2,.95,blueMask));
        if(uFlareEnabled>.5) glass+=texture2D(uFlare,uv).rgb;
        gl_FragColor=vec4(mix(bg,glass,coverage),1.);
        #include <colorspace_fragment>
      }`, { uColor: { value: this.color.texture }, uMask: { value: this.mask.texture }, uBackground: { value: this.background.texture }, uFlare: { value: this.flare.texture }, uVelocity: { value: this.velocity.texture }, uPixel: { value: this.pixel }, uMaxDisplacement: { value: visual.fluid.maxPixels }, uFluid: { value: 0 }, uFlareEnabled: { value: 1 }, toneMappingExposure: { value: visual.lighting.exposure } });
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('glass-mask')) {
      this.composite.fragmentShader = this.composite.fragmentShader.replace('vec4(mix(bg,glass,coverage),1.)', 'vec4(vec3(coverage),1.)');
    }
  }

  setSize(cssWidth: number, cssHeight: number, dpr: number) {
    this.width = Math.max(1, Math.round(cssWidth * dpr)); this.height = Math.max(1, Math.round(cssHeight * dpr));
    this.color.setSize(this.width, this.height); this.mask.setSize(this.width, this.height);
    this.background.setSize(this.width, this.height); this.backgroundDirty = true;
    this.flare.setSize(Math.ceil(this.width * visual.flare.resolutionScale), Math.ceil(this.height * visual.flare.resolutionScale));
    const aspect = cssWidth / cssHeight;
    const simWidth = Math.round(visual.fluid.resolution * Math.max(1, aspect));
    const simHeight = Math.round(visual.fluid.resolution * Math.max(1, 1 / aspect));
    for (const t of [this.velocity, this.velocitySwap, this.pressure, this.pressureSwap, this.divergence]) t.setSize(simWidth, simHeight);
    this.texel.set(1 / simWidth, 1 / simHeight); this.aspect.value = aspect;
    this.pixel.set(1 / cssWidth, 1 / cssHeight);
    this.composite.uniforms.uMaxDisplacement.value = Math.min(visual.fluid.maxPixels, cssWidth * visual.fluid.widthRatio);
    this.star.uniforms.uPixel.value.set(1 / cssWidth, 1 / cssHeight);
    this.reset(); this.cadence = 0;
  }

  setFlare(value: boolean) { this.flareAllowed = value; this.composite.uniforms.uFlareEnabled.value = +value; this.cadence = 0; }
  invalidateBackground() { this.backgroundDirty = true; this.cadence = 0; }
  async warm() {
    const original = this.renderer.getRenderTarget();
    const passes: [THREE.ShaderMaterial, THREE.WebGLRenderTarget | null][] = [
      [this.advect, this.velocitySwap], [this.diverge, this.divergence], [this.solve, this.pressureSwap],
      [this.project, this.velocity], [this.star, this.flare], [this.composite, null],
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

  render(scene: THREE.Scene, camera: THREE.Camera, glass: THREE.Mesh, backdrop: THREE.Mesh, dt: number, fluidAllowed: boolean) {
    const r = this.renderer;
    const oldTarget = r.getRenderTarget(); const oldColor = r.getClearColor(new THREE.Color()); const oldAlpha = r.getClearAlpha();
    const savedMaterial = glass.material, savedBackdrop = backdrop.visible, savedGlass = glass.visible;
    try {
      r.setClearColor(0, 1);
      if (this.stale || !fluidAllowed) {
        this.clear(this.velocity); this.clear(this.velocitySwap); this.stale = false;
        if (!fluidAllowed) { this.energy = 0; this.impulse.set(0, 0); }
      }
      const animate = fluidAllowed && this.active;
      if (animate) {
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
      r.setClearColor(oldColor, oldAlpha);
      if(this.backgroundDirty) {
        glass.visible=false; r.setRenderTarget(this.background); r.render(scene,camera);
        glass.visible=savedGlass; this.backgroundDirty=false;
      }
      r.setRenderTarget(this.color); r.render(scene, camera);
      glass.material = this.maskMaterial; backdrop.visible = false;
      r.setClearColor(0, 1); r.setRenderTarget(this.mask); r.render(scene, camera);
      glass.material = savedMaterial; backdrop.visible = savedBackdrop;
      if (this.flareAllowed && this.cadence++ % visual.flare.stride === 0) this.draw(this.star, this.flare);
      this.composite.uniforms.uVelocity.value = this.velocity.texture;
      const tail = Math.min(1, this.energy / visual.fluid.tailThreshold);
      this.composite.uniforms.uFluid.value = fluidAllowed && this.active ? tail * tail * (3 - 2 * tail) : 0;
      this.draw(this.composite, oldTarget);
    } finally {
      glass.material = savedMaterial; backdrop.visible = savedBackdrop; glass.visible = savedGlass;
      r.setClearColor(oldColor, oldAlpha); r.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of [this.color, this.mask, this.background, this.flare, this.velocity, this.velocitySwap, this.pressure, this.pressureSwap, this.divergence]) t.dispose();
    for (const m of [this.advect, this.diverge, this.solve, this.project, this.star, this.composite, this.maskMaterial]) m.dispose();
    this.quad.geometry.dispose();
  }
}
