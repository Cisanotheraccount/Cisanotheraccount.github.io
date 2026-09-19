import * as THREE from 'three';
import { getFrameSnapshot, getPerformanceSnapshot, nativeScrollNeedsFallback, reportGpuTime, requestFrame, setPerformanceReady, subscribeFrame, subscribeViewportChange } from './runtime';
import { createGpuTimer } from './gpuTiming';
import { visual } from './config';
import { getInputState, subscribeInputChange } from './inputState';
import { getLayoutRect, getLayoutStyle, getLayoutRevision, invalidateLayout } from './layoutSnapshot';
import { recordTouchEvent, recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';
import { createWorkTextureQueue } from './workTextureQueue';

const WORK_VISUAL = visual.work;

export interface WorkScene {
  setMotion(enabled: boolean): void;
  flatten(options?: { duration?: number; signal?: AbortSignal }): Promise<void>;
  restore(): Promise<void>;
  setSuspended(value: boolean): void;
  dispose(): void;
}

type Box = { x: number; y: number; width: number; height: number };
type ImageLayer = { element: HTMLImageElement; texture: THREE.Texture | null; source: string; generation: number; pending: string; retryAt: number; attempts: number; load(): void; documentBox: Box; box: Box; fit: string; radius: number; position: [number, number]; off(): void };
type Surface = { frame: HTMLElement; anchor: HTMLElement; images: ImageLayer[]; material: THREE.ShaderMaterial; mesh: THREE.Mesh; documentBox: Box; anchorDocumentBox: Box; box: Box; anchorBox: Box; hitKey: string; color: THREE.Color; radius: number; visible: boolean; hovered: boolean; hover: number; ready: boolean; off(): void };
type PendingFlatten = { from: number; hoverFrom: Map<Surface, number>; start: number; duration: number; resolve(): void; reject(reason: unknown): void; off(): void; complete: boolean };
const zeroBox = (): Box => ({ x: 0, y: 0, width: 0, height: 0 });
const abortError = () => new DOMException('The transition was superseded.', 'AbortError');

// All surfaces sample one viewport field. The profile belongs to the screen, never to a card.
const vertexShader = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const fragmentShader = `
uniform vec2 uViewport;
uniform vec2 uBuffer;
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
  // Buffered rows travel with native scrolling between paints. Curvature is
  // still referenced to the actual viewport, not the larger drawing buffer.
  vec2 screen = vec2(vUv.x, ((1.0 - vUv.y) * uBuffer.x - uBuffer.y) / uViewport.y);
  float q = clamp(2.0 * screen.y - 1.0, -1.0, 1.0);
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

function plainHandle(host: HTMLElement, reason = 'unavailable'): WorkScene {
  host.dataset.state = 'fallback'; host.style.visibility = 'hidden';
  recordTouchEvent('work.fallback', { reason });
  setPerformanceReady('work', true);
  return { setMotion() {}, flatten: async () => {}, restore: async () => {}, setSuspended() {}, dispose() {} };
}

export async function mountWorkScene(host: HTMLElement, root: HTMLElement, disabled: boolean): Promise<WorkScene> {
  const query = new URLSearchParams(location.search);
  if (query.has('no-webgl') || query.has('no-curl') || query.has('no-curve')) return plainHandle(host, 'query');
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, depth: false, stencil: false, powerPreference: 'high-performance' }); }
  catch { return plainHandle(host, 'webgl-initialization'); }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;
  renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
  host.append(renderer.domElement); host.style.visibility = 'hidden';
  const gpu = createGpuTimer(renderer.getContext() as WebGL2RenderingContext, ms => reportGpuTime('work', ms));
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const empty = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); empty.needsUpdate = true;
  let documentScroll = getInputState().touchCapable;
  const contentRoot = root.closest('.gxc-site')?.querySelector('main') ?? root;
  const diagnostics = import.meta.env.DEV || query.get('qa') === '1' || query.get('perf') === '1';
  let enabled = !disabled, suspended = false, disposed = false, failed = false;
  let width = 0, height = 0, hostX = 0, hostY = 0, lastDpr = 0;
  let bufferHeight = 0, bufferCapacity = 0, bufferInset = 0, drawTop = 0, overscan = 0;
  let paintedScroll = NaN, paintedAt = 0, paintedTop = 0, paintedHeight = 0, metricPaintedAt = 0, allocationGeneration = 0;
  let contentBottom = 0, layoutRevision = -1, resetCapacity = true;
  let dirty = true, needsMeasure = true, strength = 0, activity = 0, flatHold = false;
  let previousScroll = NaN, moving = false, afterRender: Array<() => void> = [];
  let pending: PendingFlatten | null = null;
  const surfaces: Surface[] = [];
  let nativeFallbacks = 0;
  const setState = (state: string, reason = state) => {
    const fallbackReason = state === 'ready' ? '' : reason;
    if (state === host.dataset.state && fallbackReason === host.dataset.fallbackReason) return;
    if (state !== 'ready') recordTouchEvent('work.state', { state, reason });
    host.dataset.fallbackReason = fallbackReason;
    if (state === 'native-scroll' || state === 'scroll-catchup') nativeFallbacks++;
    host.dataset.state = state;
    if (diagnostics) host.dataset.nativeFallbacks = String(nativeFallbacks);
  };
  const sourceFor = (layer: ImageLayer) => layer.element.currentSrc || layer.element.src;
  const currentTexture = (layer: ImageLayer) => !!layer.texture && layer.element.complete
    && layer.element.naturalWidth > 0 && layer.source === sourceFor(layer);
  const wake = () => { dirty = true; requestFrame(); };
  const invalidate = () => { needsMeasure = true; wake(); };
  const textureQueue = createWorkTextureQueue(wake);
  const imagePriority = (surface: Surface) => {
    const b = surface.box, viewHeight = Math.max(1, height);
    if (layoutRevision < 0 || b.width <= 0 || b.height <= 0) return Infinity;
    if (b.y < viewHeight && b.y + b.height > 0) return Math.max(0, b.y) / viewHeight;
    const below = b.y >= viewHeight;
    const gap = below ? b.y - viewHeight : -b.y - b.height;
    if (gap > viewHeight) return Infinity;
    const next = getFrameSnapshot().scrollSpeed < 0 ? !below : below;
    return (next ? 2 : 4) + gap / viewHeight;
  };
  const fallback = (surface: Surface, reason = 'source-pending') => {
    if (surface.ready) { recordTouchMetric('work.surfaceFallback'); recordTouchEvent('work.surface-fallback', { reason }); }
    delete surface.frame.dataset.workReady; delete surface.anchor.dataset.workHit;
    surface.ready = false; surface.mesh.visible = false;
  };
  const fallbackAll = (reason = 'unavailable') => {
    surfaces.forEach(surface => fallback(surface, reason)); host.style.visibility = 'hidden';
    // Hidden absolute boxes still extend scrollable overflow. Removing the tile
    // from layout prevents a paused portrait buffer extending a shorter page
    // after landscape rotation. The next successful paint restores its box.
    if (documentScroll) host.style.display = 'none';
  };
  const finishPending = () => { if (!pending) return; const task = pending; pending = null; task.off(); task.resolve(); };
  const drain = () => { const queue = afterRender; afterRender = []; queue.forEach(fn => fn()); };
  const fail = (reason = 'webgl-error') => { failed = true; textureQueue.dispose(); gpu.dispose(); setPerformanceReady('work', true); setState('fallback', reason); fallbackAll(reason); finishPending(); drain(); };
  const nativeScroll = () => {
    if (disposed || failed || !enabled || suspended || document.hidden) return;
    // Touch artwork belongs to the document scroll layer. The compositor moves
    // its last drawing with links/text between capped GPU frames, including on
    // high-refresh screens. Only jumps beyond coverage need a native fallback.
    if (documentScroll) {
      const top = window.scrollY, bottom = Math.min(contentBottom, top + innerHeight);
      const uncovered = !Number.isFinite(paintedScroll) || top < paintedTop - 1 || bottom > paintedTop + paintedHeight + 1;
      const stale = performance.now() - paintedAt > WORK_VISUAL.scrollStaleMs;
      if (uncovered || stale) {
        const reason = uncovered ? 'tile-coverage' : 'stale-paint';
        fallbackAll(reason); setState('scroll-catchup', reason);
      }
    } else if (nativeScrollNeedsFallback()) { fallbackAll('native-cadence'); setState('native-scroll'); finishPending(); drain(); }
    // No layout invalidation: the cached document geometry moves with scrollY.
    invalidate();
  };

  for (const frame of root.querySelectorAll<HTMLElement>('.gxc-project-picture')) {
    const anchor = frame.closest('a'); if (!anchor) continue;
    const elements = [...frame.querySelectorAll<HTMLImageElement>(':scope > img')];
    if (!elements.length || elements.length > 2) continue;
    const style = getLayoutStyle(frame);
    const color = new THREE.Color(style.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#181a1d' : style.backgroundColor);
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { uViewport: { value: new THREE.Vector2(1, 1) }, uBuffer: { value: new THREE.Vector2(1, 0) }, uCurl: { value: 0 }, uFrame: { value: new THREE.Vector4() }, uBackground: { value: color }, uFrameRadius: { value: 0 }, uMap0: { value: empty }, uMap1: { value: empty }, uImage0: { value: new THREE.Vector4() }, uImage1: { value: new THREE.Vector4() }, uClip0: { value: new THREE.Vector4() }, uClip1: { value: new THREE.Vector4() }, uRadii: { value: new THREE.Vector2() }, uCount: { value: elements.length } },
    });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = surfaces.length;
    const surface: Surface = { frame, anchor, images: [], material, mesh, documentBox: zeroBox(), anchorDocumentBox: zeroBox(), box: zeroBox(), anchorBox: zeroBox(), hitKey: '', color, radius: parseFloat(style.borderTopLeftRadius) || 0, visible: false, hovered: false, hover: 0, ready: false, off() {} };
    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') { surface.hovered = true; wake(); } };
    const leave = () => { surface.hovered = false; wake(); };
    anchor.addEventListener('pointerenter', enter); anchor.addEventListener('pointerleave', leave);
    surface.off = () => { anchor.removeEventListener('pointerenter', enter); anchor.removeEventListener('pointerleave', leave); };
    for (const element of elements) {
      const layer: ImageLayer = { element, texture: null, source: '', generation: 0, pending: '', retryAt: 0, attempts: 0, load() {}, documentBox: zeroBox(), box: zeroBox(), fit: 'cover', radius: 0, position: [.5, .5], off() {} };
      let retryTimer: ReturnType<typeof setTimeout> | undefined;
      const load = () => {
        if (disposed || failed || !element.complete || !element.naturalWidth) return;
        const source = sourceFor(layer); if (currentTexture(layer) || source === layer.pending || performance.now() < layer.retryAt) return;
        // A stale responsive-image texture must never cover a newer DOM selection.
        fallback(surface); wake();
        const generation = ++layer.generation;
        layer.pending = source;
        const valid = () => !disposed && !failed && generation === layer.generation
          && element.complete && element.naturalWidth > 0 && source === sourceFor(layer);
        textureQueue.enqueue({
          key: layer, valid, priority: () => imagePriority(surface),
          async decode() {
            // Keep raw decoded dimensions; DOM naturalWidth may be density-corrected.
            const image = new Image(); image.decoding = 'async'; image.src = source;
            await image.decode(); return image;
          },
          upload(image) {
            if (!valid()) return;
            const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            texture.flipY = false; texture.needsUpdate = true;
            try {
              // Move upload and mipmap preparation out of the card's first draw.
              // The queue admits at most one image per actual render phase.
              renderer.initTexture(texture);
              if (renderer.getContext().isContextLost()) throw new Error('Work WebGL context lost');
            } catch (error) { texture.dispose(); throw error; }
            if (!valid()) { texture.dispose(); return; }
            layer.texture?.dispose(); layer.texture = texture; layer.source = source; layer.pending = '';
            layer.attempts = 0; layer.retryAt = 0;
            if (diagnostics) {
              element.dataset.workTextureSource = source;
              element.dataset.workTextureWidth = String(image.naturalWidth);
              element.dataset.workTextureHeight = String(image.naturalHeight);
              element.dataset.workTextureGeneration = String(generation);
            }
            sampleTouchMetric('work.upload.pixels', image.naturalWidth * image.naturalHeight);
            invalidate();
          },
          discarded() { if (generation === layer.generation && layer.pending === source) layer.pending = ''; },
          failed(stage) {
            if (!valid()) return;
            layer.pending = ''; layer.attempts++;
            const delay = layer.attempts === 1 ? 250 : 1000;
            layer.retryAt = layer.attempts <= 2 ? performance.now() + delay : Infinity;
            if (layer.attempts <= 2) retryTimer = setTimeout(() => { retryTimer = undefined; layer.retryAt = 0; load(); }, delay);
            recordTouchEvent('work.texture-retry', { stage, attempt: layer.attempts });
            fallback(surface, stage + '-failed'); invalidate();
          },
        });
      };
      layer.load = () => { void load(); };
      const reset = () => {
        textureQueue.cancel(layer); layer.generation++; layer.pending = ''; layer.attempts = 0; layer.retryAt = 0;
        if (retryTimer !== undefined) { clearTimeout(retryTimer); retryTimer = undefined; }
        invalidateLayout('work-image-source'); fallback(surface); invalidate();
      };
      const loaded = () => { reset(); void load(); };
      const error = () => { reset(); layer.texture?.dispose(); layer.texture = null; layer.source = ''; };
      const changed = new MutationObserver(() => { reset(); void load(); });
      changed.observe(element, { attributes: true, attributeFilter: ['src', 'srcset', 'sizes'] });
      element.addEventListener('load', loaded); element.addEventListener('error', error);
      layer.off = () => { textureQueue.cancel(layer); layer.generation++; if (retryTimer !== undefined) clearTimeout(retryTimer); changed.disconnect(); element.removeEventListener('load', loaded); element.removeEventListener('error', error); };
      surface.images.push(layer); void load();
    }
    mesh.onBeforeRender = () => {
      const box = warpedBounds(surface.box);
      const left = Math.max(0, Math.floor(box.x - 2)), top = Math.max(0, Math.floor(box.y + bufferInset - 2));
      const right = Math.min(width, Math.ceil(box.x + box.width + 2)), bottom = Math.min(bufferHeight, Math.ceil(box.y + box.height + bufferInset + 2));
      renderer.setScissor(left, bufferHeight - bottom, Math.max(0, right - left), Math.max(0, bottom - top));
    };
    surfaces.push(surface); scene.add(mesh);
  }

  function screenX(x: number, y: number) {
    const q = 2 * Math.max(0, Math.min(1, y / Math.max(height, 1))) - 1;
    const profile = 1 - Math.sqrt(Math.max(0, 1 - q * q));
    return width / 2 + (x - width / 2) / (1 - profile * strength);
  }
  function warpedBounds(box: Box): Box {
    const ys = [box.y, box.y + box.height];
    if (box.y < height / 2 && box.y + box.height > height / 2) ys.push(height / 2);
    const xs = ys.flatMap(y => [screenX(box.x, y), screenX(box.x + box.width, y)]);
    return { x: Math.min(...xs), y: box.y, width: Math.max(...xs) - Math.min(...xs), height: box.height };
  }
  function setHit(surface: Surface) {
    const b = surface.box, anchor = surface.anchorBox;
    const key = [b.x, b.y, b.width, b.height, anchor.x, anchor.y, width, height, strength].join(':');
    if (key === surface.hitKey) return;
    surface.hitKey = key;
    const bounds = warpedBounds(b);
    const left = Math.min(bounds.x, b.x) - 1, right = Math.max(bounds.x + bounds.width, b.x + b.width) + 1;
    const points: string[] = [];
    for (let i = 0; i <= 32; i++) { const y = b.y + b.height * i / 32; points.push(`${(screenX(b.x, y) - left).toFixed(2)}px ${(y - b.y).toFixed(2)}px`); }
    for (let i = 32; i >= 0; i--) { const y = b.y + b.height * i / 32; points.push(`${(screenX(b.x + b.width, y) - left).toFixed(2)}px ${(y - b.y).toFixed(2)}px`); }
    const css = surface.anchor.style;
    const properties = { left: `${left - anchor.x}px`, top: `${b.y - anchor.y}px`, width: `${right - left}px`, height: `${b.height}px`, path: `polygon(${points.join(',')})` };
    for (const [name, value] of Object.entries(properties)) {
      const property = '--work-hit-' + name;
      if (css.getPropertyValue(property) !== value) css.setProperty(property, value);
    }
    recordTouchMetric('work.hitPath.updated');
  }
  const documentBoxFor = (element: Element): Box => {
    const b = getLayoutRect(element);
    return { x: b.left + window.scrollX, y: b.top + window.scrollY, width: b.width, height: b.height };
  };
  const viewportBox = (box: Box): Box => ({ x: box.x - window.scrollX - hostX, y: box.y - getFrameSnapshot().scrollY - hostY, width: box.width, height: box.height });
  const vectorBox = (value: THREE.Vector4, box: Box) => value.set(box.x, box.y, box.width, box.height);
  function measure() {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    if (getPerformanceSnapshot('work').staticFallback) { fail('performance'); return false; }
    if (!documentScroll && nativeScrollNeedsFallback()) { fallbackAll('native-cadence'); setState('native-scroll'); needsMeasure = true; return false; }
    const snapshot = getFrameSnapshot(), revision = getLayoutRevision();
    if (previousScroll !== snapshot.scrollY) { previousScroll = snapshot.scrollY; needsMeasure = true; dirty = true; }
    if (revision !== layoutRevision) { needsMeasure = true; dirty = true; }
    if (!needsMeasure) return false;
    const geometryChanged = revision !== layoutRevision;
    host.dataset.scrollLayer = documentScroll ? 'document' : 'viewport';
    if (!documentScroll) { host.style.removeProperty('width'); host.style.removeProperty('height'); host.style.removeProperty('transform'); host.style.removeProperty('display'); }
    const hostBox = documentScroll ? null : getLayoutRect(host);
    hostX = hostBox?.left ?? 0; hostY = hostBox?.top ?? 0;
    const w = documentScroll ? snapshot.width : hostBox?.width || snapshot.width;
    const h = documentScroll ? snapshot.height : hostBox?.height || snapshot.height;
    const dpr = Math.min(devicePixelRatio, documentScroll ? WORK_VISUAL.touchDpr : WORK_VISUAL.maxDpr);
    if (geometryChanged) {
      contentBottom = getLayoutRect(contentRoot).bottom + window.scrollY;
      for (const surface of surfaces) {
        surface.documentBox = documentBoxFor(surface.frame);
        surface.anchorDocumentBox = documentBoxFor(surface.anchor);
        surface.radius = parseFloat(getLayoutStyle(surface.frame).borderTopLeftRadius) || 0;
        for (const layer of surface.images) {
          layer.documentBox = documentBoxFor(layer.element);
          const style = getLayoutStyle(layer.element); layer.fit = style.objectFit;
          layer.radius = parseFloat(style.borderTopLeftRadius) || 0;
          const position = style.objectPosition.split(' ');
          layer.position = position.slice(0, 2).map(p => Number.isFinite(parseFloat(p)) ? parseFloat(p) / 100 : .5) as [number, number];
          // Cache the unscaled source box, even when native hover is mid-transition.
          if (style.transform !== 'none') {
            const transform = new DOMMatrixReadOnly(style.transform), sx = Math.hypot(transform.a, transform.b), sy = Math.hypot(transform.c, transform.d);
            if (sx && sy) {
              const b = layer.documentBox, imageWidth = b.width / sx, imageHeight = b.height / sy;
              layer.documentBox = { x: b.x + (b.width - imageWidth) / 2, y: b.y + (b.height - imageHeight) / 2, width: imageWidth, height: imageHeight };
            }
          }
        }
      }
      layoutRevision = revision; recordTouchMetric('work.geometry.refresh');
    } else recordTouchMetric('work.geometry.cachedFrame');
    if (documentScroll) {
      const wantedPad = Math.ceil(Math.min(WORK_VISUAL.scrollOverscanMax, Math.max(WORK_VISUAL.scrollOverscanMin, h * WORK_VISUAL.scrollOverscan)));
      if (resetCapacity || w !== width || dpr !== lastDpr || h + 2 * WORK_VISUAL.scrollOverscanMin > bufferCapacity) {
        // A high-water allocation absorbs toolbar-only height changes. It never
        // scales the image; logical viewport height and native DPR stay exact.
        bufferCapacity = Math.ceil((h + 2 * wantedPad) / 64) * 64;
      }
      overscan = Math.min(wantedPad, Math.max(0, (bufferCapacity - h) / 2));
    } else { bufferCapacity = h; overscan = 0; }
    const drawHeight = documentScroll ? Math.max(1, Math.min(Math.floor(contentBottom), bufferCapacity)) : h;
    drawTop = documentScroll ? Math.min(Math.max(0, snapshot.scrollY - overscan), Math.max(0, contentBottom - drawHeight)) : snapshot.scrollY;
    bufferInset = documentScroll ? snapshot.scrollY - drawTop : 0;
    if (w !== width || drawHeight !== bufferHeight || dpr !== lastDpr) {
      renderer.setDrawingBufferSize(w, drawHeight, dpr); allocationGeneration++;
      recordTouchMetric('work.canvas.reallocation');
      sampleTouchMetric('work.canvas.pixels', Math.round(w * dpr) * Math.round(drawHeight * dpr));
    }
    width = w; height = h; bufferHeight = drawHeight; lastDpr = dpr; resetCapacity = false;
    if (diagnostics) host.dataset.dpr = String(dpr);
    for (const surface of surfaces) {
      surface.box = viewportBox(surface.documentBox); surface.anchorBox = viewportBox(surface.anchorDocumentBox);
      const b = surface.box; surface.visible = b.height > 0 && b.width > 0 && b.y < bufferHeight - bufferInset + 1 && b.y + b.height > -bufferInset - 1;
      if (!surface.visible) { surface.mesh.visible = false; delete surface.anchor.dataset.workHit; continue; }
      for (const layer of surface.images) layer.box = viewportBox(layer.documentBox);
    }
    needsMeasure = false; return false;
  }
  function update(time: number, delta: number) {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    if (!documentScroll && nativeScrollNeedsFallback()) { strength = 0; activity = 0; return true; }
    textureQueue.prepare();
    if (!surfaces.some(surface => surface.visible)) {
      strength = 0; activity = 0; moving = false;
      if (pending) pending.complete = true;
      return false;
    }
    const maxCurl = documentScroll ? WORK_VISUAL.touchCurl : WORK_VISUAL.maxCurl;
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
      const targetHover = !flatHold && surface.hovered && getInputState().pointerType === 'mouse' ? 1 : 0;
      const hoverDelta = targetHover - surface.hover;
      if (pending) { surface.hover = (pending.hoverFrom.get(surface) ?? 0) * flattenRatio; dirty = true; }
      else if (Math.abs(hoverDelta) > .0005) { surface.hover += hoverDelta * (1 - Math.exp(-WORK_VISUAL.hoverDamping * dt)); moving = true; dirty = true; } else surface.hover = targetHover;
      if (!surface.images.every(currentTexture)) {
        fallback(surface);
        for (const layer of surface.images) if (!currentTexture(layer)) layer.load();
        continue;
      }
      surface.mesh.visible = true;
      const uniforms = surface.material.uniforms;
      uniforms.uViewport.value.set(width, height); uniforms.uBuffer.value.set(bufferHeight, bufferInset); uniforms.uCurl.value = strength;
      vectorBox(uniforms.uFrame.value, surface.box); uniforms.uFrameRadius.value = surface.radius;
      const scale = 1 + surface.hover * (WORK_VISUAL.hoverScale - 1);
      surface.images.forEach((layer, index) => {
        const raw = layer.box;
        const clip = { x: raw.x + raw.width * (1 - scale) / 2, y: raw.y + raw.height * (1 - scale) / 2, width: raw.width * scale, height: raw.height * scale };
        // Responsive DOM naturalWidth can be density-corrected and rounded.
        // Fit the same decoded pixel ratio that WebGL actually samples.
        const decoded = layer.texture!.image as HTMLImageElement;
        const naturalW = decoded.naturalWidth, naturalH = decoded.naturalHeight;
        let ratio = layer.fit === 'contain' ? Math.min(clip.width / naturalW, clip.height / naturalH) : Math.max(clip.width / naturalW, clip.height / naturalH);
        if (!Number.isFinite(ratio)) ratio = 1;
        const image = { x: clip.x + (clip.width - naturalW * ratio) * layer.position[0], y: clip.y + (clip.height - naturalH * ratio) * layer.position[1], width: naturalW * ratio, height: naturalH * ratio };
        vectorBox(uniforms[`uClip${index}`].value, clip); vectorBox(uniforms[`uImage${index}`].value, image);
        uniforms[`uMap${index}`].value = layer.texture;
        uniforms.uRadii.value.setComponent(index, layer.radius * scale);
      });
      if (dirty) setHit(surface);
    }
    return moving || textureQueue.hasReadyWork();
  }
  function render() {
    if (disposed || failed || !enabled || suspended || document.hidden) return false;
    if (!documentScroll && nativeScrollNeedsFallback()) return true;
    const uploaded = textureQueue.uploadOne();
    if (!dirty && !pending?.complete && !afterRender.length) {
      const queued = textureQueue.hasReadyWork();
      if (!moving && !uploaded && !queued) metricPaintedAt = 0;
      return uploaded || queued;
    }
    // Responsive selection can change after measurement. Recheck immediately
    // before drawing, so stale pixels never take over a newer DOM source.
    for (const surface of surfaces) {
      if (surface.mesh.visible && !surface.images.every(currentTexture)) {
        fallback(surface); surface.images.forEach(layer => layer.load());
      }
    }
    // With no visible, decoded surface the DOM remains the complete fallback.
    // Hiding the canvas avoids even a GPU clear while another section is scrolling.
    if (!surfaces.some(surface => surface.mesh.visible)) {
      const inView = surfaces.some(surface => surface.visible);
      fallbackAll(inView ? 'decode-or-upload' : 'offscreen');
      setState(inView ? 'source-pending' : 'offscreen');
      if (!inView) metricPaintedAt = 0;
      host.dataset.curl = '0.000000'; dirty = uploaded;
      if (pending?.complete) finishPending();
      drain();
      return uploaded || textureQueue.hasReadyWork();
    }
    try {
      gpu.begin();
      try {
        renderer.setScissorTest(false); renderer.clear(true, false, false); renderer.setScissorTest(true);
        renderer.render(scene, camera); renderer.setScissorTest(false);
      } finally { gpu.end(); }
      if (renderer.getContext().isContextLost()) { fail('context-lost'); return false; }
      for (const surface of surfaces) {
        if (!surface.mesh.visible) continue;
        if (!surface.ready) { surface.ready = true; surface.frame.dataset.workReady = 'true'; }
        if (diagnostics) surface.images.forEach(layer => { layer.element.dataset.workDrawTop = String(layer.box.y); });
        surface.anchor.dataset.workHit = 'true';
      }
      // Move the buffered drawing only together with the newly painted pixels.
      // Between frames its document positioning follows native scroll for free.
      if (documentScroll) {
        if (host.style.width !== width + 'px') host.style.width = width + 'px';
        if (host.style.height !== bufferHeight + 'px') host.style.height = bufferHeight + 'px';
        host.style.transform = `translate3d(0, ${drawTop}px, 0)`;
      }
      const paintedNow = performance.now();
      if (metricPaintedAt) sampleTouchMetric('workDrawIntervalMs', paintedNow - metricPaintedAt);
      metricPaintedAt = paintedNow; recordTouchMetric('workDraws');
      paintedScroll = getFrameSnapshot().scrollY; paintedAt = paintedNow; paintedTop = drawTop; paintedHeight = bufferHeight;
      if (diagnostics) {
        host.dataset.renderScrollY = String(paintedScroll); host.dataset.windowTop = String(drawTop);
        host.dataset.overscan = String(bufferInset); host.dataset.renderViewportHeight = String(height);
        host.dataset.bufferHeight = String(bufferHeight); host.dataset.bufferCapacity = String(bufferCapacity);
        host.dataset.allocationGeneration = String(allocationGeneration); host.dataset.layoutRevision = String(layoutRevision);
      }
      host.style.removeProperty('display'); host.style.visibility = 'visible'; setState('ready');
      setPerformanceReady('work', true);
      host.dataset.curl = strength.toFixed(6); renderer.domElement.dataset.frames = String(renderer.info.render.frame);
      dirty = uploaded;
      if (pending?.complete) finishPending();
      drain();
    } catch { fail(); }
    return needsMeasure || moving || uploaded || textureQueue.hasReadyWork();
  }

  const lost = (event: Event) => { event.preventDefault(); fail('context-lost'); };
  const retryImages = () => {
    for (const surface of surfaces) for (const layer of surface.images) {
      if (!currentTexture(layer)) { layer.retryAt = 0; layer.attempts = 0; layer.load(); }
    }
  };
  const visibility = () => {
    previousScroll = NaN; activity = 0; strength = 0;
    if (document.hidden) { metricPaintedAt = 0; fallbackAll('hidden'); finishPending(); drain(); }
    else { retryImages(); invalidate(); }
  };
  const layoutChanged = () => {
    // Restore current DOM geometry before the next capped paint. Never observe
    // the canvas host: it is an output and would create a resize feedback loop.
    invalidateLayout('work-content'); layoutRevision = -1;
    fallbackAll('layout'); paintedScroll = NaN; setState('layout-change'); invalidate();
  };
  const viewportChanged = (change?: { kind: 'layout' | 'height'; width: number; height: number; dpr: number }) => {
    if (documentScroll && change?.kind === 'height') {
      // Native document positioning remains valid. Update curvature and coverage
      // on the next frame; an actual content resize is caught separately below.
      recordTouchMetric('work.viewport.heightOnly'); invalidate();
      return;
    }
    resetCapacity = true; layoutChanged();
  };
  const inputChanged = () => {
    const next = getInputState().touchCapable;
    if (next === documentScroll) return;
    documentScroll = next; resetCapacity = true; layoutChanged();
  };
  const ro = new ResizeObserver(layoutChanged); ro.observe(root);
  if (contentRoot !== root) ro.observe(contentRoot);
  const offViewport = subscribeViewportChange(viewportChanged);
  const offInput = subscribeInputChange(inputChanged);
  for (const surface of surfaces) { ro.observe(surface.frame); surface.images.forEach(layer => ro.observe(layer.element)); }
  window.addEventListener('scroll', nativeScroll, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('online', retryImages);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  const offMeasure = subscribeFrame(measure, 'measure'), offUpdate = subscribeFrame(update, 'update'), offRender = subscribeFrame(render, 'render');
  invalidate();
  return {
    setMotion(value) { enabled = value; activity = 0; strength = 0; previousScroll = NaN; if (!value) { metricPaintedAt = 0; fallbackAll('paused'); finishPending(); drain(); } else invalidate(); },
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
      invalidateLayout('work-restore'); layoutRevision = -1;
      if (disposed || failed || !enabled || document.hidden) { flatHold = false; fallbackAll(); surfaces.forEach(surface => { delete surface.anchor.dataset.workNeutral; }); return Promise.resolve(); }
      return new Promise<void>(resolve => { afterRender.push(() => { flatHold = false; surfaces.forEach(surface => { delete surface.anchor.dataset.workNeutral; }); resolve(); }); invalidate(); });
    },
    setSuspended(value) { suspended = value; activity = 0; strength = 0; if (value) { metricPaintedAt = 0; surfaces.forEach(surface => { surface.hovered = false; surface.hover = 0; }); fallbackAll('suspended'); finishPending(); drain(); } else { invalidateLayout('work-resume'); layoutRevision = -1; invalidate(); } },
    dispose() {
      disposed = true;
      if (pending) { pending.off(); pending.reject(abortError()); pending = null; }
      textureQueue.dispose(); drain(); fallbackAll('disposed'); offMeasure(); offUpdate(); offRender(); ro.disconnect(); offViewport(); offInput();
      window.removeEventListener('scroll', nativeScroll); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', retryImages);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      for (const surface of surfaces) { surface.off(); delete surface.anchor.dataset.workNeutral; surface.images.forEach(layer => { layer.off(); layer.texture?.dispose(); }); surface.material.dispose(); for (const key of ['left', 'top', 'width', 'height', 'path']) surface.anchor.style.removeProperty('--work-hit-' + key); }
      gpu.dispose(); geometry.dispose(); empty.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
