import * as THREE from 'three';
import { getFrameSnapshot, requestFrame, subscribeFrame } from './runtime';
import { visual } from './config';

const WORK_VISUAL = visual.work;

export interface WorkScene {
  setMotion(enabled: boolean): void;
  flatten(options?: { duration?: number; signal?: AbortSignal }): Promise<void>;
  restore(): Promise<void>;
  setSuspended(value: boolean): void;
  dispose(): void;
}

type Box = { x: number; y: number; width: number; height: number };
type ImageLayer = { element: HTMLImageElement; texture: THREE.Texture | null; source: string; generation: number; box: Box; fit: string; radius: number; position: [number, number]; off(): void };
type Surface = { frame: HTMLElement; anchor: HTMLElement; images: ImageLayer[]; material: THREE.ShaderMaterial; mesh: THREE.Mesh; box: Box; anchorBox: Box; color: THREE.Color; radius: number; visible: boolean; hovered: boolean; hover: number; ready: boolean; off(): void };
type PendingFlatten = { from: number; hoverFrom: Map<Surface, number>; start: number; duration: number; resolve(): void; reject(reason: unknown): void; off(): void; complete: boolean };
const zeroBox = (): Box => ({ x: 0, y: 0, width: 0, height: 0 });
const abortError = () => new DOMException('The transition was superseded.', 'AbortError');

// All surfaces sample one viewport field. The profile belongs to the screen, never to a card.
const vertexShader = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const fragmentShader = `
uniform vec2 uViewport;
uniform float uCurl;
uniform vec4 uFrame;
uniform vec3 uBackground;
uniform float uFrameRadius;
uniform sampler2D uMap0;
uniform sampler2D uMap1;
uniform vec4 uImage0;
uniform vec4 uImage1;
uniform vec4 uClip0;
uniform vec4 uClip1;
uniform vec2 uRadii;
uniform float uCount;
varying vec2 vUv;
float maskBox(vec2 p, vec4 rect, float radius) {
  vec2 halfSize = max(rect.zw * .5, vec2(.001));
  float r = min(radius, min(halfSize.x, halfSize.y));
  vec2 q = abs(p - rect.xy - halfSize) - halfSize + r;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float aa = max(fwidth(d), .5);
  return 1.0 - smoothstep(-aa * .5, aa * .5, d);
}
vec4 imageAt(sampler2D map, vec2 p, vec4 image, vec4 clip, float radius) {
  vec2 uv = (p - image.xy) / max(image.zw, vec2(.001));
  vec4 color = texture2D(map, clamp(uv, 0.0, 1.0));
  color.a *= maskBox(p, image, 0.0) * maskBox(p, clip, radius);
  return color;
}
void main() {
  vec2 screen = vec2(vUv.x, 1.0 - vUv.y);
  float q = 2.0 * screen.y - 1.0;
  float profile = 1.0 - sqrt(max(0.0, 1.0 - q * q));
  vec2 p = vec2(.5 + (screen.x - .5) * (1.0 - profile * uCurl), screen.y) * uViewport;
  float alpha = maskBox(p, uFrame, uFrameRadius);
  if (alpha < .001) discard;
  vec3 color = uBackground;
  vec4 a = imageAt(uMap0, p, uImage0, uClip0, uRadii.x);
  color = mix(color, a.rgb, a.a);
  if (uCount > 1.5) {
    vec4 b = imageAt(uMap1, p, uImage1, uClip1, uRadii.y);
    color = mix(color, b.rgb, b.a);
  }
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

function plainHandle(host: HTMLElement): WorkScene {
  host.dataset.state = 'fallback'; host.style.visibility = 'hidden';
  return { setMotion() {}, flatten: async () => {}, restore: async () => {}, setSuspended() {}, dispose() {} };
}

export async function mountWorkScene(host: HTMLElement, root: HTMLElement, disabled: boolean): Promise<WorkScene> {
  const query = new URLSearchParams(location.search);
  if (query.has('no-webgl') || query.has('no-curl') || query.has('no-curve')) return plainHandle(host);
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch { return plainHandle(host); }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;
  renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
  host.append(renderer.domElement); host.style.visibility = 'hidden';
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); empty.needsUpdate = true;
  const coarse = matchMedia('(pointer: coarse)');
  let enabled = !disabled, suspended = false, disposed = false, failed = false;
  let width = 0, height = 0, hostX = 0, hostY = 0, lastDpr = 0;
  let dirty = true, needsMeasure = true, strength = 0, activity = 0, flatHold = false;
  let previousScroll = NaN, moving = false, afterRender: Array<() => void> = [];
  let pending: PendingFlatten | null = null;
  const surfaces: Surface[] = [];
  const wake = () => { dirty = true; requestFrame(); };
  const invalidate = () => { needsMeasure = true; wake(); };
  const fallback = (surface: Surface) => {
    delete surface.frame.dataset.workReady; delete surface.anchor.dataset.workHit;
    surface.ready = false; surface.mesh.visible = false;
  };
  const fallbackAll = () => { surfaces.forEach(fallback); host.style.visibility = 'hidden'; };
  const finishPending = () => { if (!pending) return; const task = pending; pending = null; task.off(); task.resolve(); };
  const drain = () => { const queue = afterRender; afterRender = []; queue.forEach(fn => fn()); };
  const fail = () => { failed = true; host.dataset.state = 'fallback'; fallbackAll(); finishPending(); drain(); };

  for (const frame of root.querySelectorAll<HTMLElement>('.gxc-project-picture')) {
    const anchor = frame.closest('a'); if (!anchor) continue;
    const elements = [...frame.querySelectorAll<HTMLImageElement>(':scope > img')];
    if (!elements.length || elements.length > 2) continue;
    const style = getComputedStyle(frame);
    const color = new THREE.Color(style.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#181a1d' : style.backgroundColor);
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { uViewport: { value: new THREE.Vector2(1, 1) }, uCurl: { value: 0 }, uFrame: { value: new THREE.Vector4() }, uBackground: { value: color }, uFrameRadius: { value: 0 }, uMap0: { value: empty }, uMap1: { value: empty }, uImage0: { value: new THREE.Vector4() }, uImage1: { value: new THREE.Vector4() }, uClip0: { value: new THREE.Vector4() }, uClip1: { value: new THREE.Vector4() }, uRadii: { value: new THREE.Vector2() }, uCount: { value: elements.length } },
    });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = surfaces.length;
    const surface: Surface = { frame, anchor, images: [], material, mesh, box: zeroBox(), anchorBox: zeroBox(), color, radius: parseFloat(style.borderTopLeftRadius) || 0, visible: false, hovered: false, hover: 0, ready: false, off() {} };
    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') { surface.hovered = true; wake(); } };
    const leave = () => { surface.hovered = false; wake(); };
    anchor.addEventListener('pointerenter', enter); anchor.addEventListener('pointerleave', leave);
    surface.off = () => { anchor.removeEventListener('pointerenter', enter); anchor.removeEventListener('pointerleave', leave); };
    for (const element of elements) {
      const layer: ImageLayer = { element, texture: null, source: '', generation: 0, box: zeroBox(), fit: 'cover', radius: 0, position: [.5, .5], off() {} };
      const load = async () => {
        if (disposed || failed || !element.complete || !element.naturalWidth) return;
        const source = element.currentSrc || element.src; if (source === layer.source && layer.texture) return;
        const generation = ++layer.generation;
        // Upload an undecorated image source. Responsive DOM images can expose density-corrected
        // natural sizes, which do not necessarily match the underlying decoded upload dimensions.
        const sourceImage = new Image(); sourceImage.decoding = 'async'; sourceImage.src = source;
        try { await sourceImage.decode(); } catch { return; }
        if (disposed || failed || generation !== layer.generation || !element.naturalWidth || source !== (element.currentSrc || element.src)) return;
        const texture = new THREE.Texture(sourceImage); texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        // Screen coordinates run downward; the shader deliberately samples image V downward too.
        texture.flipY = false; texture.needsUpdate = true;
        layer.texture?.dispose(); layer.texture = texture; layer.source = source; invalidate();
      };
      const error = () => { layer.generation++; layer.texture?.dispose(); layer.texture = null; layer.source = ''; fallback(surface); invalidate(); };
      element.addEventListener('load', load); element.addEventListener('error', error);
      layer.off = () => { element.removeEventListener('load', load); element.removeEventListener('error', error); };
      surface.images.push(layer); void load();
    }
    mesh.onBeforeRender = () => {
      const box = warpedBounds(surface.box);
      const left = Math.max(0, Math.floor(box.x - 2)), top = Math.max(0, Math.floor(box.y - 2));
      const right = Math.min(width, Math.ceil(box.x + box.width + 2)), bottom = Math.min(height, Math.ceil(box.y + box.height + 2));
      renderer.setScissor(left, height - bottom, Math.max(0, right - left), Math.max(0, bottom - top));
    };
    surfaces.push(surface); scene.add(mesh);
  }

  function screenX(x: number, y: number) {
    const q = 2 * Math.max(0, Math.min(1, y / Math.max(height, 1))) - 1;
    const profile = 1 - Math.sqrt(Math.max(0, 1 - q * q));
    return width / 2 + (x - width / 2) / (1 - profile * strength);
  }
  function warpedBounds(box: Box): Box {
    const ys = [Math.max(0, box.y), Math.min(height, box.y + box.height)];
    if (box.y < height / 2 && box.y + box.height > height / 2) ys.push(height / 2);
    const xs = ys.flatMap(y => [screenX(box.x, y), screenX(box.x + box.width, y)]);
    return { x: Math.min(...xs), y: box.y, width: Math.max(...xs) - Math.min(...xs), height: box.height };
  }
  function setHit(surface: Surface) {
    const b = surface.box, bounds = warpedBounds(b), anchor = surface.anchorBox;
    const left = Math.min(bounds.x, b.x) - 1, right = Math.max(bounds.x + bounds.width, b.x + b.width) + 1;
    const points: string[] = [];
    for (let i = 0; i <= 32; i++) { const y = b.y + b.height * i / 32; points.push(`${(screenX(b.x, y) - left).toFixed(2)}px ${(y - b.y).toFixed(2)}px`); }
    for (let i = 32; i >= 0; i--) { const y = b.y + b.height * i / 32; points.push(`${(screenX(b.x + b.width, y) - left).toFixed(2)}px ${(y - b.y).toFixed(2)}px`); }
    const css = surface.anchor.style;
    css.setProperty('--work-hit-left', `${left - anchor.x}px`); css.setProperty('--work-hit-top', `${b.y - anchor.y}px`);
    css.setProperty('--work-hit-width', `${right - left}px`); css.setProperty('--work-hit-height', `${b.height}px`);
    css.setProperty('--work-hit-path', `polygon(${points.join(',')})`);
  }
  const boxFor = (element: Element): Box => { const b = element.getBoundingClientRect(); return { x: b.left - hostX, y: b.top - hostY, width: b.width, height: b.height }; };
  const vectorBox = (value: THREE.Vector4, box: Box) => value.set(box.x, box.y, box.width, box.height);
  function measure() {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    const snapshot = getFrameSnapshot();
    if (previousScroll !== snapshot.scrollY) { previousScroll = snapshot.scrollY; needsMeasure = true; dirty = true; }
    if (!needsMeasure) return false;
    const hostBox = host.getBoundingClientRect(); hostX = hostBox.left; hostY = hostBox.top;
    const w = hostBox.width || snapshot.width, h = hostBox.height || snapshot.height;
    const dpr = Math.min(devicePixelRatio, coarse.matches ? WORK_VISUAL.touchDpr : WORK_VISUAL.maxDpr);
    if (w !== width || h !== height || dpr !== lastDpr) { width = w; height = h; lastDpr = dpr; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
    for (const surface of surfaces) {
      surface.box = boxFor(surface.frame); surface.anchorBox = boxFor(surface.anchor);
      const b = surface.box; surface.visible = b.height > 0 && b.width > 0 && b.y < height + 1 && b.y + b.height > -1;
      if (!surface.visible) { surface.mesh.visible = false; delete surface.anchor.dataset.workHit; continue; }
      for (const layer of surface.images) {
        layer.box = boxFor(layer.element);
        const style = getComputedStyle(layer.element); layer.fit = style.objectFit; layer.radius = parseFloat(style.borderTopLeftRadius) || 0;
        const position = style.objectPosition.split(' '); layer.position = position.slice(0, 2).map(p => Number.isFinite(parseFloat(p)) ? parseFloat(p) / 100 : .5) as [number, number];
        // Before takeover a CSS hover may have already scaled the source element. Recover its untransformed box.
        if (!surface.ready && style.transform !== 'none') {
          const transform = new DOMMatrixReadOnly(style.transform), scaleX = Math.hypot(transform.a, transform.b), scaleY = Math.hypot(transform.c, transform.d);
          if (scaleX && scaleY) { const box = layer.box, w = box.width / scaleX, h = box.height / scaleY; layer.box = { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h }; }
        }
      }
    }
    needsMeasure = false; return false;
  }
  function update(time: number, delta: number) {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    if (!surfaces.some(surface => surface.visible)) {
      strength = 0; activity = 0; moving = false;
      if (pending) pending.complete = true;
      return false;
    }
    const maxCurl = coarse.matches ? WORK_VISUAL.touchCurl : WORK_VISUAL.maxCurl;
    const dt = Math.max(1 / 240, Math.min(.1, delta));
    const oldStrength = strength;
    let flattenRatio = 0;
    if (pending) {
      const p = Math.min(1, Math.max(0, (time - pending.start) / Math.max(1, pending.duration)));
      flattenRatio = Math.pow(1 - p, 3);
      strength = pending.from * flattenRatio; activity = strength / maxCurl;
      if (p >= 1 || pending.duration === 0) { strength = 0; activity = 0; pending.complete = true; }
    } else if (flatHold) { strength = 0; activity = 0; }
    else {
      const target = Math.min(1, Math.abs(getFrameSnapshot().scrollSpeed) / WORK_VISUAL.speedReference);
      activity += (target - activity) * (1 - Math.exp(-dt / (target > activity ? WORK_VISUAL.attack : WORK_VISUAL.release)));
      if (activity < .0005 && target === 0) activity = 0;
      strength = activity * maxCurl;
    }
    moving = !!pending && !pending.complete || activity > .0005;
    if (Math.abs(oldStrength - strength) > .000001) dirty = true;
    for (const surface of surfaces) {
      if (!surface.visible) continue;
      const targetHover = !flatHold && surface.hovered && !coarse.matches ? 1 : 0;
      const hoverDelta = targetHover - surface.hover;
      if (pending) { surface.hover = (pending.hoverFrom.get(surface) ?? 0) * flattenRatio; dirty = true; }
      else if (Math.abs(hoverDelta) > .0005) { surface.hover += hoverDelta * (1 - Math.exp(-WORK_VISUAL.hoverDamping * dt)); moving = true; dirty = true; } else surface.hover = targetHover;
      if (!surface.images.every(layer => !!layer.texture)) { fallback(surface); continue; }
      surface.mesh.visible = true;
      const uniforms = surface.material.uniforms;
      uniforms.uViewport.value.set(width, height); uniforms.uCurl.value = strength;
      vectorBox(uniforms.uFrame.value, surface.box); uniforms.uFrameRadius.value = surface.radius;
      const scale = 1 + surface.hover * (WORK_VISUAL.hoverScale - 1);
      surface.images.forEach((layer, index) => {
        const raw = layer.box;
        const clip = { x: raw.x + raw.width * (1 - scale) / 2, y: raw.y + raw.height * (1 - scale) / 2, width: raw.width * scale, height: raw.height * scale };
        const naturalW = layer.element.naturalWidth, naturalH = layer.element.naturalHeight;
        let ratio = layer.fit === 'contain' ? Math.min(clip.width / naturalW, clip.height / naturalH) : Math.max(clip.width / naturalW, clip.height / naturalH);
        if (!Number.isFinite(ratio)) ratio = 1;
        const image = { x: clip.x + (clip.width - naturalW * ratio) * layer.position[0], y: clip.y + (clip.height - naturalH * ratio) * layer.position[1], width: naturalW * ratio, height: naturalH * ratio };
        vectorBox(uniforms[`uClip${index}`].value, clip); vectorBox(uniforms[`uImage${index}`].value, image);
        uniforms[`uMap${index}`].value = layer.texture;
        uniforms.uRadii.value.setComponent(index, layer.radius * scale);
      });
      if (dirty) setHit(surface);
    }
    return moving;
  }
  function render() {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    if (!dirty && !pending?.complete && !afterRender.length) return false;
    // With no visible, decoded surface the DOM remains the complete fallback.
    // Hiding the canvas avoids even a GPU clear while another section is scrolling.
    if (!surfaces.some(surface => surface.mesh.visible)) {
      host.style.visibility = 'hidden'; host.dataset.curl = '0.000000'; dirty = false;
      if (pending?.complete) finishPending();
      drain();
      return false;
    }
    try {
      renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
      renderer.render(scene, camera); renderer.setScissorTest(false);
      if (renderer.getContext().isContextLost()) { fail(); return false; }
      for (const surface of surfaces) {
        if (!surface.mesh.visible) continue;
        if (!surface.ready) { surface.ready = true; surface.frame.dataset.workReady = 'true'; needsMeasure = true; }
        surface.anchor.dataset.workHit = 'true';
      }
      host.style.visibility = 'visible'; host.dataset.state = 'ready';
      host.dataset.curl = strength.toFixed(6); renderer.domElement.dataset.frames = String(renderer.info.render.frame);
      dirty = false;
      if (pending?.complete) finishPending();
      drain();
    } catch { fail(); }
    return needsMeasure || moving;
  }

  const lost = (event: Event) => { event.preventDefault(); fail(); };
  const visibility = () => {
    previousScroll = NaN; activity = 0; strength = 0;
    if (document.hidden) { fallbackAll(); finishPending(); drain(); }
    else invalidate();
  };
  const ro = new ResizeObserver(invalidate); ro.observe(root); ro.observe(host);
  for (const surface of surfaces) { ro.observe(surface.frame); surface.images.forEach(layer => ro.observe(layer.element)); }
  window.addEventListener('scroll', invalidate, { passive: true }); window.addEventListener('resize', invalidate, { passive: true });
  document.addEventListener('visibilitychange', visibility); coarse.addEventListener('change', invalidate);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const offMeasure = subscribeFrame(measure, 'measure'), offUpdate = subscribeFrame(update, 'update'), offRender = subscribeFrame(render, 'render');
  invalidate();
  return {
    setMotion(value) { enabled = value; activity = 0; strength = 0; previousScroll = NaN; if (!value) { fallbackAll(); finishPending(); drain(); } else invalidate(); },
    flatten(options = {}) {
      if (options.signal?.aborted) return Promise.reject(abortError());
      if (pending) { const old = pending; pending = null; old.off(); old.reject(abortError()); }
      flatHold = true; surfaces.forEach(surface => { surface.anchor.dataset.workNeutral = 'true'; });
      if (disposed || failed || !enabled || suspended || !surfaces.some(surface => surface.ready && surface.visible)) { strength = 0; activity = 0; return Promise.resolve(); }
      return new Promise<void>((resolve, reject) => {
        const abort = () => { if (pending !== task) return; pending = null; task.off(); flatHold = false; surfaces.forEach(surface => { delete surface.anchor.dataset.workNeutral; }); reject(abortError()); wake(); };
        const task: PendingFlatten = { from: strength, hoverFrom: new Map(surfaces.map(surface => [surface, surface.hover])), start: performance.now(), duration: strength < .0001 && !surfaces.some(surface => surface.hover > .001) ? 0 : (options.duration ?? WORK_VISUAL.flattenDuration), resolve, reject, off: () => options.signal?.removeEventListener('abort', abort), complete: false };
        pending = task; options.signal?.addEventListener('abort', abort, { once: true }); wake();
      });
    },
    restore() {
      suspended = false; flatHold = true; strength = 0; activity = 0; previousScroll = NaN;
      if (disposed || failed || !enabled || document.hidden) { flatHold = false; fallbackAll(); surfaces.forEach(surface => { delete surface.anchor.dataset.workNeutral; }); return Promise.resolve(); }
      return new Promise<void>(resolve => { afterRender.push(() => { flatHold = false; surfaces.forEach(surface => { delete surface.anchor.dataset.workNeutral; }); resolve(); }); invalidate(); });
    },
    setSuspended(value) { suspended = value; activity = 0; strength = 0; if (value) { surfaces.forEach(surface => { surface.hovered = false; surface.hover = 0; }); fallbackAll(); finishPending(); drain(); } else invalidate(); },
    dispose() {
      disposed = true;
      if (pending) { pending.off(); pending.reject(abortError()); pending = null; }
      drain(); fallbackAll(); offMeasure(); offUpdate(); offRender(); ro.disconnect();
      window.removeEventListener('scroll', invalidate); window.removeEventListener('resize', invalidate); document.removeEventListener('visibilitychange', visibility); coarse.removeEventListener('change', invalidate);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      for (const surface of surfaces) { surface.off(); delete surface.anchor.dataset.workNeutral; surface.images.forEach(layer => { layer.off(); layer.texture?.dispose(); }); surface.material.dispose(); for (const key of ['left', 'top', 'width', 'height', 'path']) surface.anchor.style.removeProperty('--work-hit-' + key); }
      geometry.dispose(); empty.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
