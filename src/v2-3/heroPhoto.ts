import { subscribeViewportChange } from './runtime';
import metadata from '../../public/v-next/background/provenance.json';
import backgrounds from '../../public/v2-1/backgrounds/manifest.json';
import { selectBackgroundVariant } from './backgroundQuality';

const manifestMatches = backgrounds.hero.sourceSha256 === metadata.sourceSha256
  && backgrounds.hero.width === metadata.width && backgrounds.hero.height === metadata.height;
export const heroPhoto = { width: metadata.width, height: metadata.height, variants: manifestMatches ? backgrounds.hero.variants : metadata.derivatives };
export type LoadedHeroPhoto = { url: string; image: HTMLImageElement; width: number; height: number; fallback: boolean };
/** CSS object-fit: cover, using the currently decoded variant's actual dimensions. */
export function photoCover(width: number, height: number, imageWidth: number, imageHeight: number) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const renderedWidth = imageWidth * scale, renderedHeight = imageHeight * scale;
  return { width: renderedWidth, height: renderedHeight, left: (width - renderedWidth) / 2, top: (height - renderedHeight) / 2 };
}
type Listener = (photo: LoadedHeroPhoto) => void;
const controllers = new WeakMap<HTMLElement, HeroPhotoController>();

/** DOM and transmission use the same decoded photograph and centered cover crop. */
class HeroPhotoController {
  private listeners = new Map<Listener, () => void>();
  private current?: LoadedHeroPhoto;
  private staged?: LoadedHeroPhoto;
  private stagedRequestWidth = 0;
  private pending = '';
  private generation = 0;
  private disposed = false;
  private terminalFailure = false;
  private failed = new Set<string>();
  private failedSelections = new Set<string>();
  private width = 0;
  private height = 0;
  private dpr = 1;
  private viewportKey = '';
  private lastViewportAt = -Infinity;
  private lastScrollAt = -Infinity;
  private lastScrollY = window.scrollY;
  private timer = 0;
  private readonly observer: ResizeObserver;
  private readonly offViewport: () => void;

  constructor(private readonly hero: HTMLElement) {
    this.observer = new ResizeObserver(this.measure);
    this.observer.observe(hero);
    window.addEventListener('resize', this.measure);
    window.addEventListener('scroll', this.scroll, { capture: true, passive: true });
    document.addEventListener('visibilitychange', this.visibility);
    this.offViewport = subscribeViewportChange(this.measure);
    this.measure();
  }

  subscribe(listener: Listener, onError: () => void) {
    this.listeners.set(listener, onError);
    if (this.current) listener(this.current);
    else if (this.terminalFailure) onError();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.disposed = true; this.generation++;
        window.clearTimeout(this.timer);
        this.observer.disconnect(); window.removeEventListener('resize', this.measure);
        window.removeEventListener('scroll', this.scroll, true);
        document.removeEventListener('visibilitychange', this.visibility);
        this.offViewport();
        controllers.delete(this.hero);
      }
    };
  }

  private measure = () => {
    if (this.disposed) return;
    const { width, height } = this.hero.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const key = `${width}:${height}:${dpr}`;
    if (this.viewportKey !== key) { this.viewportKey = key; this.lastViewportAt = performance.now(); }
    this.width = width; this.height = height; this.dpr = dpr;
    this.select();
  };

  private scroll = () => {
    // Native dialog scroll events also bubble through window; only page motion
    // postpones this photograph's upgrade.
    if (window.scrollY === this.lastScrollY) return;
    this.lastScrollY = window.scrollY; this.lastScrollAt = performance.now();
    if (this.staged || this.pending) this.waitForStable();
  };

  private visibility = () => {
    if (document.hidden) { window.clearTimeout(this.timer); this.timer = 0; }
    else this.measure();
  };

  private waitForStable = () => {
    if (this.timer || this.disposed || document.hidden) return;
    const delay = Math.max(1, Math.max(this.lastScrollAt, this.lastViewportAt) + 300 - performance.now());
    this.timer = window.setTimeout(() => { this.timer = 0; this.select(); }, delay);
  };

  private publish(photo: LoadedHeroPhoto) {
    // All consumers receive the same already-decoded object in one task: DOM,
    // Three transmission, and the measured star overlays change source together.
    this.current = photo; this.staged = undefined; this.terminalFailure = false;
    this.hero.dataset.photoSource = photo.url;
    this.hero.dataset.photoFallback = String(photo.fallback);
    this.hero.dataset.photoWidth = String(photo.width);
    delete this.hero.dataset.photoFailed;
    for (const listener of this.listeners.keys()) listener(photo);
  }

  private select = () => {
    if (this.disposed || document.hidden || !this.width || !this.height) return;
    const variants = heroPhoto.variants;
    const quality = selectBackgroundVariant({ width: this.width, height: this.height,
      imageWidth: heroPhoto.width, imageHeight: heroPhoto.height, dpr: this.dpr, variants });
    const selected = quality.variant;
    if (!selected) return;
    this.hero.dataset.photoDesiredWidth = quality.desiredWidth.toFixed(2);
    this.hero.dataset.photoDpr = String(quality.dpr);
    this.hero.dataset.photoDesiredSource = selected.url;
    this.hero.dataset.photoSourceLimited = String(quality.sourceLimited);
    const stable = performance.now() >= Math.max(this.lastViewportAt, this.lastScrollAt) + 300;
    if (this.staged) {
      // If rotation increased the demand while the serial request was decoding,
      // its obsolete smaller result cannot replace the previous settled image.
      if (this.stagedRequestWidth < selected.width) this.staged = undefined;
      // A late smaller decode cannot overwrite an already sharper resource.
      else if (this.current && !this.current.fallback && (this.staged.fallback || this.staged.width <= this.current.width)) this.staged = undefined;
      else if (!this.current || stable) this.publish(this.staged);
      else { this.waitForStable(); return; }
    }
    // A smaller display never discards the sharp, already-decoded photograph.
    if (this.current && !this.current.fallback && this.current.width >= selected.width) return;
    if (this.pending || this.failedSelections.has(selected.url)) return;
    if (this.current && !stable) { this.waitForStable(); return; }
    this.pending = selected.url;
    const generation = ++this.generation;
    const candidates = [selected, ...variants.filter(item => item.width < selected.width).sort((a, b) => b.width - a.width)];
    const urls = candidates.map(item => item.url).filter(url => !this.failed.has(url));
    // Last-resort local photo keeps the complete composition if every new asset fails.
    const legacy = '/portfolio/cosmic-photograph-1920.webp';
    if (!this.failed.has(legacy)) urls.push(legacy);
    void (async () => {
      for (const url of urls) {
        if (this.disposed || generation !== this.generation) return;
        try {
          this.hero.dataset.photoPending = url;
          const image = new Image(); image.decoding = 'async'; image.src = url;
          await image.decode();
          if (this.disposed || generation !== this.generation) return;
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Photograph has no decoded dimensions');
          const photo = { url, image, width: image.naturalWidth, height: image.naturalHeight, fallback: url === legacy };
          if (url !== selected.url) this.failedSelections.add(selected.url);
          this.pending = ''; delete this.hero.dataset.photoPending;
          this.staged = photo; this.stagedRequestWidth = selected.width;
          this.select();
          return;
        } catch { this.failed.add(url); /* Keep the decoded image while trying a smaller derivative once. */ }
      }
      if (!this.disposed && generation === this.generation) {
        this.pending = ''; delete this.hero.dataset.photoPending;
        this.failedSelections.add(selected.url);
        this.hero.dataset.photoFailed = 'true';
        if (!this.current) {
          this.terminalFailure = true;
          for (const onError of this.listeners.values()) onError();
        }
      }
    })();
  };
}

export function subscribeHeroPhoto(hero: HTMLElement, listener: Listener, onError: () => void = () => {}) {
  let controller = controllers.get(hero);
  if (!controller) { controller = new HeroPhotoController(hero); controllers.set(hero, controller); }
  return controller.subscribe(listener, onError);
}
