export type BackdropArea = { left: number; top: number; width: number; height: number };

export type BackdropSampler = {
  sample(area: BackdropArea, dpr: number, refreshCandidates?: boolean): HTMLCanvasElement;
  dispose(): void;
};

type Rect = { left: number; top: number; width: number; height: number };
type Candidate = { element: HTMLElement; rank: number };
type CanvasPatch = { canvas: HTMLCanvasElement; relativeBounds: Rect };

const PATCH_PADDING = 36;
const samplers = new Set<SamplerState>();

const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const right = (rect: Rect) => rect.left + rect.width;
const bottom = (rect: Rect) => rect.top + rect.height;

function intersect(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left), top = Math.max(a.top, b.top);
  const r = Math.min(right(a), right(b)), bot = Math.min(bottom(a), bottom(b));
  return r > left && bot > top ? { left, top, width: r - left, height: bot - top } : null;
}

function padded(rect: Rect): Rect {
  return {
    left: rect.left - PATCH_PADDING,
    top: rect.top - PATCH_PADDING,
    width: rect.width + PATCH_PADDING * 2,
    height: rect.height + PATCH_PADDING * 2,
  };
}

function rectOf(value: DOMRect | DOMRectReadOnly): Rect {
  return { left: value.left, top: value.top, width: value.width, height: value.height };
}

function visibleStyle(element: Element): CSSStyleDeclaration | null {
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return null;
  if (Number.parseFloat(style.opacity || '1') <= 0.001) return null;
  return style;
}

function effectiveOpacity(element: Element, stop: Element | null): number {
  let opacity = 1;
  for (let node: Element | null = element; node && node !== stop; node = node.parentElement) {
    const style = visibleStyle(node);
    if (!style) return 0;
    opacity *= finite(Number.parseFloat(style.opacity || '1'), 1);
    if (opacity <= 0.001) return 0;
  }
  return opacity;
}

function clippedRect(element: HTMLElement, initial: Rect, stop: Element | null): Rect | null {
  let clipped: Rect | null = initial;
  for (let parent = element.parentElement; clipped && parent && parent !== stop; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const clipsX = /(hidden|clip|auto|scroll)/.test(style.overflowX);
    const clipsY = /(hidden|clip|auto|scroll)/.test(style.overflowY);
    if (!clipsX && !clipsY) continue;
    const box = rectOf(parent.getBoundingClientRect());
    const constraint = {
      left: clipsX ? box.left : clipped.left,
      top: clipsY ? box.top : clipped.top,
      width: clipsX ? box.width : clipped.width,
      height: clipsY ? box.height : clipped.height,
    };
    if (!clipsX) constraint.width = clipped.width;
    if (!clipsY) constraint.height = clipped.height;
    clipped = intersect(clipped, constraint);
  }
  return clipped;
}

function topModal(): HTMLDialogElement | null {
  const open = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')];
  for (let i = open.length - 1; i >= 0; i--) {
    try { if (open[i].matches(':modal')) return open[i]; } catch { return open[i]; }
  }
  return null;
}

function hostIsVisible(host: HTMLElement): boolean {
  // The renderer canvas stays visibility:hidden until its first successful draw;
  // the semantic slot is the visibility authority during that bootstrap frame.
  const visualHost = host.parentElement ?? host;
  if (host.dataset.glassEnabled === 'false' || !host.isConnected || visualHost.getClientRects().length === 0 || !visibleStyle(visualHost)) return false;
  const modal = topModal();
  return !modal || modal.contains(visualHost);
}

function isBrandChrome(element: Element, host: HTMLElement): boolean {
  if (host === element || host.contains(element)) return true;
  return !!element.closest('.gxc-header, .gxc-brand, .gxc-detail-brand, .photo-brand');
}

function isDrawable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement || element instanceof HTMLCanvasElement) return true;
  const style = getComputedStyle(element);
  return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none';
}

function pointGrid(area: Rect): Array<[number, number]> {
  const insetX = Math.min(2, area.width / 4), insetY = Math.min(2, area.height / 4);
  const xs = [area.left + insetX, area.left + area.width / 2, right(area) - insetX];
  const ys = [area.top + insetY, area.top + area.height / 2, bottom(area) - insetY];
  const points: Array<[number, number]> = [];
  for (const y of ys) for (const x of xs) points.push([x, y]);
  return points;
}

function discoverCandidates(host: HTMLElement, root: HTMLElement, area: Rect): Candidate[] {
  const scores = new Map<HTMLElement, { total: number; count: number }>();
  const modal = topModal();
  for (const [x, y] of pointGrid(area)) {
    const stack = document.elementsFromPoint(
      Math.max(0, Math.min(innerWidth - 1, x)),
      Math.max(0, Math.min(innerHeight - 1, y)),
    );
    for (let index = 0; index < stack.length; index++) {
      for (let node: Element | null = stack[index]; node; node = node.parentElement) {
        if (node === document.documentElement) break;
        if (!(node instanceof HTMLElement) || (!root.contains(node) && node !== root)) continue;
        if (modal && !modal.contains(node)) continue;
        if (isBrandChrome(node, host) || !isDrawable(node)) continue;
        const score = scores.get(node) ?? { total: 0, count: 0 };
        score.total += index; score.count++;
        scores.set(node, score);
        if (node === root) break;
      }
    }
  }
  // pointer-events:none layers do not reliably participate in elementsFromPoint.
  // Query this fixed scene-source set only when the local cache is dirty.
  const underlaySelector = [
    '.gxc-hero', '.gxc-hero-image', '.gxc-hero-image > img', '.gxc-canvas canvas',
    '.gxc-work-backdrop', '.gxc-work-backdrop-photo', '.gxc-work-backdrop-light', '.gxc-work-canvas canvas',
    '.gxc-detail-bg',
    '.photo-background', '.photo-background img', '.photo-dialog',
  ].join(',');
  const underlays = [...root.querySelectorAll<HTMLElement>(underlaySelector)]
    .filter(element => !isBrandChrome(element, host) && isDrawable(element));
  const underlaySet = new Set(underlays);
  const result = [
    ...underlays.map(element => ({ element, rank: Number.POSITIVE_INFINITY })),
    ...[...scores].filter(([element]) => !underlaySet.has(element))
      .map(([element, score]) => ({ element, rank: score.total / score.count })),
  ];
  result.sort((a, b) => {
    if (a.element.contains(b.element)) return -1;
    if (b.element.contains(a.element)) return 1;
    return b.rank - a.rank;
  });
  return result;
}

function splitLayers(value: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function gradientColors(layer: string): Array<{ color: string; stop?: number }> {
  const colors: Array<{ color: string; stop?: number }> = [];
  const pattern = /(#[\da-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\btransparent\b)(?:\s+(-?[\d.]+)%?)?/gi;
  for (const match of layer.matchAll(pattern)) {
    const raw = match[2] === undefined ? undefined : Number.parseFloat(match[2]);
    colors.push({ color: match[1], stop: raw === undefined || !Number.isFinite(raw) ? undefined : Math.max(0, Math.min(1, raw / 100)) });
  }
  return colors;
}

function addStops(gradient: CanvasGradient, colors: Array<{ color: string; stop?: number }>): void {
  colors.forEach((entry, index) => {
    const stop = entry.stop ?? (colors.length === 1 ? 0 : index / (colors.length - 1));
    try { gradient.addColorStop(stop, entry.color); } catch { /* Ignore CSS colors Canvas does not understand. */ }
  });
}

function paintGradient(context: CanvasRenderingContext2D, layer: string, rect: Rect): void {
  const colors = gradientColors(layer);
  if (colors.length === 0) return;
  let gradient: CanvasGradient;
  if (/^radial-gradient/i.test(layer)) {
    const at = /\bat\s+([\d.]+)%\s+([\d.]+)%/i.exec(layer);
    const cx = rect.left + rect.width * (at ? Number(at[1]) / 100 : .5);
    const cy = rect.top + rect.height * (at ? Number(at[2]) / 100 : .5);
    gradient = context.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(rect.width, rect.height) * .72);
  } else {
    const degrees = finite(Number.parseFloat(/linear-gradient\(\s*(-?[\d.]+)deg/i.exec(layer)?.[1] ?? '180'), 180);
    const radians = (degrees - 90) * Math.PI / 180;
    const dx = Math.cos(radians) * rect.width / 2, dy = Math.sin(radians) * rect.height / 2;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    gradient = context.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  }
  addStops(gradient, colors);
  context.fillStyle = gradient;
  context.fillRect(rect.left, rect.top, rect.width, rect.height);
}

function paintSurface(context: CanvasRenderingContext2D, element: HTMLElement, style: CSSStyleDeclaration, rect: Rect): void {
  if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
    context.fillStyle = style.backgroundColor;
    context.fillRect(rect.left, rect.top, rect.width, rect.height);
  }
  const layers = splitLayers(style.backgroundImage).filter(layer => /^(linear|radial)-gradient/i.test(layer));
  for (let i = layers.length - 1; i >= 0; i--) paintGradient(context, layers[i], rect);
}

function sameOrigin(source: string): boolean {
  if (!source) return false;
  try {
    const url = new URL(source, location.href);
    return url.origin === location.origin || url.protocol === 'blob:' || url.protocol === 'data:';
  } catch { return false; }
}

function positionPart(token: string | undefined, free: number, axis: 'x' | 'y'): number {
  if (!token) return free / 2;
  if (token === 'center') return free / 2;
  if (token === (axis === 'x' ? 'left' : 'top')) return 0;
  if (token === (axis === 'x' ? 'right' : 'bottom')) return free;
  if (token.endsWith('%')) return free * finite(Number.parseFloat(token), 50) / 100;
  if (token.endsWith('px')) return finite(Number.parseFloat(token));
  return free / 2;
}

function mediaPlacement(element: HTMLImageElement | HTMLVideoElement, rect: Rect, style: CSSStyleDeclaration): Rect | null {
  const naturalWidth = element instanceof HTMLImageElement ? element.naturalWidth : element.videoWidth;
  const naturalHeight = element instanceof HTMLImageElement ? element.naturalHeight : element.videoHeight;
  if (!naturalWidth || !naturalHeight || rect.width <= 0 || rect.height <= 0) return null;
  const fit = style.objectFit || 'fill';
  let width = rect.width, height = rect.height;
  if (fit !== 'fill') {
    const contain = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const cover = Math.max(rect.width / naturalWidth, rect.height / naturalHeight);
    let scale = fit === 'cover' ? cover : fit === 'none' ? 1 : contain;
    if (fit === 'scale-down') scale = Math.min(1, contain);
    width = naturalWidth * scale; height = naturalHeight * scale;
  }
  const tokens = style.objectPosition.trim().split(/\s+/);
  const xToken = tokens.find(token => /^(left|right)$/.test(token)) ?? tokens[0];
  const yToken = tokens.find(token => /^(top|bottom)$/.test(token)) ?? tokens[1] ?? (tokens[0] === 'center' ? 'center' : undefined);
  return {
    left: rect.left + positionPart(xToken, rect.width - width, 'x'),
    top: rect.top + positionPart(yToken, rect.height - height, 'y'),
    width, height,
  };
}

function drawMedia(context: CanvasRenderingContext2D, element: HTMLImageElement | HTMLVideoElement, rect: Rect, style: CSSStyleDeclaration): void {
  const source = element.currentSrc || element.getAttribute('src') || '';
  if (!sameOrigin(source)) return;
  if (element instanceof HTMLImageElement && (!element.complete || !element.naturalWidth)) return;
  if (element instanceof HTMLVideoElement && element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  const placement = mediaPlacement(element, rect, style);
  if (!placement) return;
  context.save();
  context.beginPath(); context.rect(rect.left, rect.top, rect.width, rect.height); context.clip();
  try { context.drawImage(element, placement.left, placement.top, placement.width, placement.height); } catch { /* Media can change readiness between the checks and draw. */ }
  context.restore();
  if (element.closest('.photo-background')) {
    context.fillStyle = 'rgb(0 0 0 / 70%)';
    context.fillRect(rect.left, rect.top, rect.width, rect.height);
  }
}

class SamplerState {
  readonly output = document.createElement('canvas');
  private readonly patches = new Map<HTMLCanvasElement, CanvasPatch>();
  private readonly root: HTMLElement;
  private area: Rect;
  private candidates: Candidate[] = [];
  private candidatesDirty = true;
  private disposed = false;
  private intersecting = true;
  private readonly mutation: MutationObserver;
  private readonly resize: ResizeObserver;
  private readonly intersection?: IntersectionObserver;
  private readonly videoFrames = new Map<HTMLVideoElement, number>();

  constructor(private readonly host: HTMLElement, private readonly invalidate: () => void) {
    this.root = host.closest<HTMLElement>('dialog, .photo-site, .gxc-site') ?? document.body;
    this.area = rectOf(host.getBoundingClientRect());
    this.mutation = new MutationObserver(() => { this.candidatesDirty = true; this.wake(); });
    this.mutation.observe(this.root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'open', 'src', 'aria-hidden'] });
    this.resize = new ResizeObserver(() => { this.candidatesDirty = true; this.area = rectOf(host.getBoundingClientRect()); this.wake(); });
    this.resize.observe(host); this.resize.observe(this.root);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersection = new IntersectionObserver(entries => {
        this.intersecting = entries[entries.length - 1]?.isIntersecting ?? true;
        if (this.intersecting) this.wake();
      });
      this.intersection.observe(host.parentElement ?? host);
    }
    window.addEventListener('resize', this.onResize, { passive: true });
    document.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    this.root.addEventListener('load', this.onLoad, true);
    this.root.addEventListener('play', this.onMediaState, true);
    this.root.addEventListener('pause', this.onMediaState, true);
    this.root.addEventListener('ended', this.onMediaState, true);
    this.root.addEventListener('loadeddata', this.onMediaState, true);
    this.root.addEventListener('seeked', this.onMediaState, true);
  }

  private wake = () => {
    if (this.disposed) return;
    try { this.invalidate(); } catch { /* An unmounted renderer may reject a late observer notification. */ }
  };

  private onResize = () => { this.candidatesDirty = true; this.wake(); };
  private onScroll = () => { this.candidatesDirty = true; this.wake(); };
  private onLoad = () => { this.candidatesDirty = true; this.wake(); };
  private onMediaState = () => { this.candidatesDirty = true; this.wake(); };

  private stopVideoFrames(): void {
    for (const [video, id] of this.videoFrames) video.cancelVideoFrameCallback?.(id);
    this.videoFrames.clear();
  }

  private syncVideoFrames(): void {
    this.stopVideoFrames();
    for (const { element } of this.candidates) {
      if (!(element instanceof HTMLVideoElement) || element.paused || element.ended || !element.requestVideoFrameCallback) continue;
      const follow = () => {
        if (this.disposed || !this.videoFrames.has(element) || element.paused || element.ended) {
          this.videoFrames.delete(element); return;
        }
        this.wake();
        this.videoFrames.set(element, element.requestVideoFrameCallback(follow));
      };
      this.videoFrames.set(element, element.requestVideoFrameCallback(follow));
    }
  }

  capture(source: HTMLCanvasElement): void {
    if (this.disposed || !this.intersecting || !hostIsVisible(this.host) || this.host.contains(source)) return;
    const sourceRect = rectOf(source.getBoundingClientRect());
    if (source.width === 0 || source.height === 0 || sourceRect.width === 0 || sourceRect.height === 0) return;
    const target = intersect(padded(this.area), sourceRect);
    if (!target) return;
    const sourceScaleX = source.width / sourceRect.width, sourceScaleY = source.height / sourceRect.height;
    const sx = Math.max(0, Math.floor((target.left - sourceRect.left) * sourceScaleX));
    const sy = Math.max(0, Math.floor((target.top - sourceRect.top) * sourceScaleY));
    const ex = Math.min(source.width, Math.ceil((right(target) - sourceRect.left) * sourceScaleX));
    const ey = Math.min(source.height, Math.ceil((bottom(target) - sourceRect.top) * sourceScaleY));
    if (ex <= sx || ey <= sy) return;
    const bounds = {
      left: sourceRect.left + sx / sourceScaleX,
      top: sourceRect.top + sy / sourceScaleY,
      width: (ex - sx) / sourceScaleX,
      height: (ey - sy) / sourceScaleY,
    };
    const captureScaleX = Math.min(sourceScaleX, 2.5), captureScaleY = Math.min(sourceScaleY, 2.5);
    const captureWidth = Math.max(1, Math.ceil(bounds.width * captureScaleX));
    const captureHeight = Math.max(1, Math.ceil(bounds.height * captureScaleY));
    const existing = this.patches.get(source);
    const snapshot = existing?.canvas ?? document.createElement('canvas');
    if (snapshot.width !== captureWidth) snapshot.width = captureWidth;
    if (snapshot.height !== captureHeight) snapshot.height = captureHeight;
    const context = snapshot.getContext('2d', { alpha: true });
    if (!context) return;
    context.clearRect(0, 0, snapshot.width, snapshot.height);
    try { context.drawImage(source, sx, sy, ex - sx, ey - sy, 0, 0, snapshot.width, snapshot.height); }
    catch { return; }
    const relativeBounds = {
      left: (bounds.left - sourceRect.left) / sourceRect.width,
      top: (bounds.top - sourceRect.top) / sourceRect.height,
      width: bounds.width / sourceRect.width,
      height: bounds.height / sourceRect.height,
    };
    this.patches.set(source, { canvas: snapshot, relativeBounds });
    this.wake();
  }

  sample(nextArea: BackdropArea, requestedDpr: number, refreshCandidates = false): HTMLCanvasElement {
    if (refreshCandidates) this.candidatesDirty = true;
    const area = {
      left: finite(nextArea.left), top: finite(nextArea.top),
      width: Math.max(0, finite(nextArea.width)), height: Math.max(0, finite(nextArea.height)),
    };
    if (Math.abs(area.left - this.area.left) > 2 || Math.abs(area.top - this.area.top) > 2
      || Math.abs(area.width - this.area.width) > 2 || Math.abs(area.height - this.area.height) > 2) {
      this.candidatesDirty = true;
    }
    this.area = area;
    const dpr = Math.max(.25, finite(requestedDpr, 1));
    const width = Math.max(1, Math.ceil(area.width * dpr)), height = Math.max(1, Math.ceil(area.height * dpr));
    if (this.output.width !== width) this.output.width = width;
    if (this.output.height !== height) this.output.height = height;
    const context = this.output.getContext('2d', { alpha: false });
    if (!context) return this.output;
    context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = '#090a0c'; context.fillRect(0, 0, width, height);
    if (this.disposed || !this.intersecting || !hostIsVisible(this.host) || area.width === 0 || area.height === 0) return this.output;
    if (this.candidatesDirty) {
      this.candidates = discoverCandidates(this.host, this.root, area);
      this.candidatesDirty = false;
      this.syncVideoFrames();
    }
    context.setTransform(dpr, 0, 0, dpr, -area.left * dpr, -area.top * dpr);
    context.beginPath(); context.rect(area.left, area.top, area.width, area.height); context.clip();
    for (const { element } of this.candidates) {
      if (!element.isConnected || isBrandChrome(element, this.host)) continue;
      const style = visibleStyle(element), opacity = effectiveOpacity(element, this.root.parentElement);
      if (!style || opacity <= .001) continue;
      const box = rectOf(element.getBoundingClientRect());
      const clipped = clippedRect(element, box, this.root.parentElement);
      if (!clipped || !intersect(clipped, area)) continue;
      context.save(); context.globalAlpha = opacity;
      context.beginPath(); context.rect(clipped.left, clipped.top, clipped.width, clipped.height); context.clip();
      if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) drawMedia(context, element, box, style);
      else if (element instanceof HTMLCanvasElement) {
        const patch = this.patches.get(element);
        if (patch) {
          const bounds = {
            left: box.left + patch.relativeBounds.left * box.width,
            top: box.top + patch.relativeBounds.top * box.height,
            width: patch.relativeBounds.width * box.width,
            height: patch.relativeBounds.height * box.height,
          };
          context.drawImage(patch.canvas, bounds.left, bounds.top, bounds.width, bounds.height);
        }
        else if (element.width && element.height) {
          try { context.drawImage(element, box.left, box.top, box.width, box.height); } catch { /* A cleared or protected canvas is simply omitted. */ }
        }
      } else paintSurface(context, element, style, box);
      context.restore();
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    return this.output;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    samplers.delete(this);
    this.mutation.disconnect(); this.resize.disconnect(); this.intersection?.disconnect();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('scroll', this.onScroll, true);
    this.root.removeEventListener('load', this.onLoad, true);
    this.root.removeEventListener('play', this.onMediaState, true);
    this.root.removeEventListener('pause', this.onMediaState, true);
    this.root.removeEventListener('ended', this.onMediaState, true);
    this.root.removeEventListener('loadeddata', this.onMediaState, true);
    this.root.removeEventListener('seeked', this.onMediaState, true);
    for (const patch of this.patches.values()) { patch.canvas.width = 0; patch.canvas.height = 0; }
    this.stopVideoFrames();
    this.patches.clear(); this.candidates = [];
    this.output.width = 0; this.output.height = 0;
  }
}

/**
 * Builds a small, demand-driven raster of the pixels immediately behind a brand mark.
 * It deliberately supports the site's solid/gradient surfaces and same-origin img,
 * video, and canvas layers. It does not attempt to rasterize DOM text, SVG, shadows,
 * blend/filter effects, cross-origin media, arbitrary clip-paths, CSS pseudo-elements
 * (apart from the known Photography background shade), or rotated 3D DOM.
 */
export function createBackdropSampler(host: HTMLElement, invalidate: () => void): BackdropSampler {
  const state = new SamplerState(host, invalidate);
  samplers.add(state);
  return { sample: (area, dpr, refresh) => state.sample(area, dpr, refresh), dispose: () => state.dispose() };
}

/** Capture the local patch while a WebGL drawing buffer is known to be present. */
export function presentBrandBackdrop(canvas: HTMLCanvasElement): void {
  if (!canvas.isConnected || canvas.width === 0 || canvas.height === 0) return;
  for (const sampler of samplers) sampler.capture(canvas);
}
