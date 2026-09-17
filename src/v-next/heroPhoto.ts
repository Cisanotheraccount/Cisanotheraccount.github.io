import { visual } from './config';
import { subscribeViewportChange } from './runtime';
import metadata from '../../public/v-next/background/provenance.json';

export const heroPhoto = { width: metadata.width, height: metadata.height, variants: metadata.derivatives };
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
  private pending = '';
  private generation = 0;
  private disposed = false;
  private readonly observer: ResizeObserver;
  private readonly offViewport: () => void;

  constructor(private readonly hero: HTMLElement) {
    this.observer = new ResizeObserver(() => this.select());
    this.observer.observe(hero);
    window.addEventListener('resize', this.select);
    this.offViewport = subscribeViewportChange(this.select);
    this.select();
  }

  subscribe(listener: Listener, onError: () => void) {
    this.listeners.set(listener, onError);
    if (this.current) listener(this.current);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.disposed = true; this.generation++;
        this.observer.disconnect(); window.removeEventListener('resize', this.select);
        this.offViewport();
        controllers.delete(this.hero);
      }
    };
  }

  private select = () => {
    if (this.disposed) return;
    const { width, height } = this.hero.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, width < 700 ? visual.glass.mobileDpr : visual.glass.maxDpr);
    // A portrait viewport covers with the image height: width alone undersizes it.
    const needed = Math.max(width, height * heroPhoto.width / heroPhoto.height) * dpr;
    const variants = heroPhoto.variants;
    const selected = variants.find(item => item.width >= needed) ?? variants[variants.length - 1];
    if (selected.url === this.pending) return;
    if (selected.url === this.current?.url) {
      // Resizing back to the current image cancels a larger in-flight request.
      this.generation++; this.pending = selected.url; return;
    }
    this.pending = selected.url;
    const generation = ++this.generation;
    const candidates = [selected, ...variants.filter(item => item.width < selected.width).reverse()];
    const urls = candidates.map(item => item.url);
    // Last-resort local photo keeps the complete composition if every new asset fails.
    urls.push('/portfolio/cosmic-photograph-1920.webp');
    void (async () => {
      for (const url of urls) {
        if (this.disposed || generation !== this.generation) return;
        try {
          const image = new Image(); image.decoding = 'async'; image.src = url;
          await image.decode();
          if (this.disposed || generation !== this.generation) return;
          const photo = { url, image, width: image.naturalWidth, height: image.naturalHeight, fallback: !url.startsWith('/v-next/background/') };
          this.current = photo;
          this.hero.dataset.photoSource = url;
          this.hero.dataset.photoFallback = String(photo.fallback);
          for (const listener of this.listeners.keys()) listener(photo);
          return;
        } catch { /* Keep the current decoded image while trying a smaller local derivative. */ }
      }
      if (!this.disposed && generation === this.generation) {
        this.hero.dataset.photoFailed = 'true';
        if (!this.current) for (const onError of this.listeners.values()) onError();
      }
    })();
  };
}

export function subscribeHeroPhoto(hero: HTMLElement, listener: Listener, onError: () => void = () => {}) {
  let controller = controllers.get(hero);
  if (!controller) { controller = new HeroPhotoController(hero); controllers.set(hero, controller); }
  return controller.subscribe(listener, onError);
}
