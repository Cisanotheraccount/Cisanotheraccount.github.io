import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import catalogJson from './catalog.json';
import type { PhotographyCatalog, PhotographyPhoto, PhotographySeries } from './catalog.types';
import { ManagedPhoto } from './media';
import { PhotoViewerImage } from './PhotoViewerImage';
import { GlassCategoryNav } from './GlassCategoryNav';
import type { PhotographyGlassCategory } from './GlassCategoryNav';
import { VideoGallery } from './VideoGallery';
import { photographyVideoCatalog } from './videoCatalog';
import { arrangePhotos, galleryMode } from './galleryLayout';
import { photographyText as t } from '../localization/photography';
import { isChinese, sitePath } from '../localization/locale';
import './site.css';

type Category = PhotographyGlassCategory;
type PhotoCategory = Exclude<Category, 'video'>;
// Only the dedicated English Photography builder defines this constant. Missing in every other
// entry (including both Chinese release builders) means off, independent of env.
declare const __PHOTOGRAPHY_VIDEO_ENABLED__: boolean;
const videoEnabled = (typeof __PHOTOGRAPHY_VIDEO_ENABLED__ !== 'undefined' && __PHOTOGRAPHY_VIDEO_ENABLED__ === true) && !isChinese;
const catalog = catalogJson as PhotographyCatalog;
const photoCategories = [
  { id: 'landscape' as const, label: t('Landscape'), data: 'Landscapes', description: t('Cities, landscapes, and the skies above.') },
  { id: 'concert' as const, label: t('Concert'), data: 'Live', description: t('Artists, audiences, and the energy of live music.') },
];
const categories = videoEnabled
  ? [...photoCategories, { id: 'video' as const, label: 'Video', data: null, description: 'Selected films and visual stories.' }]
  : photoCategories;
const photosById = new Map(catalog.photos.map(photo => [photo.id, photo]));
const seriesById = new Map(catalog.series.map(series => [series.id, series]));
const categoryPhotos = (category: Category) => catalog.series
  .filter(series => series.category === photoCategories.find(item => item.id === category)?.data)
  .flatMap(series => series.photoIds.map(id => photosById.get(id)).filter((photo): photo is PhotographyPhoto => !!photo));
const number = (value: number) => String(value).padStart(2, '0');
const fromHash = (): Category => {
  if (videoEnabled && window.location.hash === '#video') return 'video';
  return window.location.hash === '#concert' ? 'concert' : 'landscape';
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type PhotoAdmission = { admitted: Set<string>; visible: Set<string> };

function sameIds(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) return false;
  for (const id of left) if (!right.has(id)) return false;
  return true;
}

function usePhotoAdmission(category: Category, paused: boolean, panels: MutableRefObject<Partial<Record<Category, HTMLElement | null>>>, layoutKey: string) {
  const [admission, setAdmission] = useState<PhotoAdmission>(() => ({ admitted: new Set(), visible: new Set() }));

  useLayoutEffect(() => {
    const panel = panels.current[category];
    if (!panel) return;
    let frame = 0;
    let disposed = false;

    const measure = () => {
      frame = 0;
      if (paused || document.visibilityState === 'hidden') return;
      const photos = categoryPhotos(category);
      const panelBounds = panel.getBoundingClientRect();
      const tiles = new Map(Array.from(panel.querySelectorAll<HTMLElement>('[data-photo-id]')).map(tile => [tile.dataset.photoId, tile]));
      const visible = new Set<string>();
      let lastVisible = -1;
      let firstBelowViewport = photos.length;

      photos.forEach((photo, index) => {
        const tile = tiles.get(photo.id);
        if (!tile) return;
        const bounds = tile.getBoundingClientRect();
        // Compare only vertical bounds: horizontal track translation must not hide the
        // newly active panel from admission while its category slide is in progress.
        if (bounds.bottom > panelBounds.top && bounds.top < panelBounds.bottom) {
          visible.add(photo.id);
          lastVisible = index;
        }
        if (firstBelowViewport === photos.length && bounds.bottom > panelBounds.top) firstBelowViewport = index;
      });

      const nextStart = lastVisible >= 0 ? lastVisible + 1 : firstBelowViewport;
      const requested = new Set(visible);
      photos.slice(nextStart, nextStart + 3).forEach(photo => requested.add(photo.id));
      setAdmission(previous => {
        const admitted = new Set(previous.admitted);
        requested.forEach(id => admitted.add(id));
        return sameIds(admitted, previous.admitted) && sameIds(visible, previous.visible) ? previous : { admitted, visible };
      });
    };
    const schedule = () => {
      if (disposed) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resume = () => { if (document.visibilityState !== 'hidden') schedule(); };

    panel.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', resume);
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    void document.fonts?.ready.then(schedule);
    // Layout effects flush this first admission before paint, so a category
    // switch does not briefly expose an empty active viewport.
    measure();
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      panel.removeEventListener('scroll', schedule);
      window.removeEventListener('pageshow', schedule);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [category, paused, panels, layoutKey]);

  return admission;
}

function trapFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])'))
    .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
  if (!focusable.length) return;
  const current = focusable.indexOf(document.activeElement as HTMLElement);
  const next = current < 0 ? (event.shiftKey ? focusable.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
  event.preventDefault();
  focusable[next].focus();
}

export function PhotographySite() {
  const [category, setCategory] = useState<Category>(fromHash);
  const [opened, setOpened] = useState<{ category: PhotoCategory; photoId: string; opener: HTMLElement } | null>(null);
  const panels = useRef<Partial<Record<Category, HTMLElement | null>>>({});
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight, galleryWidth: window.innerWidth - 32 }));

  useLayoutEffect(() => {
    document.documentElement.dataset.photography = 'true';
    const measure = () => {
      const panel = panels.current.landscape;
      if (!panel) return;
      const style = getComputedStyle(panel);
      setViewport({ width: window.innerWidth, height: window.innerHeight, galleryWidth: panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (panels.current.landscape) observer.observe(panels.current.landscape);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); delete document.documentElement.dataset.photography; };
  }, []);

  useEffect(() => {
    const sync = () => { setOpened(null); setCategory(fromHash()); };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);

  useLayoutEffect(() => {
    for (const item of categories) {
      const panel = panels.current[item.id];
      if (panel) panel.inert = item.id !== category;
    }
    document.title = `${categories.find(item => item.id === category)?.label} — Ci Song ${t('Photography')}`;
  }, [category]);

  const navigate = (next: Category, keyboard = false) => {
    if (category !== next) {
      window.history.pushState(null, '', `#${next}`);
      setCategory(next);
    }
    if (keyboard) requestAnimationFrame(() => panels.current[next]?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }));
  };
  const backToTop = (id: Category) => panels.current[id]?.scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' });
  const mode = galleryMode(viewport.width, viewport.height);
  const gap = viewport.width <= 1366 ? 8 : 12;
  const admission = usePhotoAdmission(category, !!opened, panels, `${viewport.galleryWidth}:${viewport.height}:${mode}:${gap}`);

  const categoryIndex = Math.max(0, categories.findIndex(item => item.id === category));

  return <div className="photo-site" data-video-enabled={videoEnabled ? 'true' : undefined}>
    <div className="photo-background" aria-hidden="true"><picture><img src="/photography-assets/background/stars-1536.jpg" srcSet="/photography-assets/background/stars-1536.jpg 1536w, /photography-assets/background/stars-2560.jpg 2560w, /photography-assets/background/stars-4096.jpg 4096w" sizes="100vw" alt="" width="8192" height="5464" /></picture></div>
    <a className="photo-skip" href={`#${category}`} onClick={event => { event.preventDefault(); panels.current[category]?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); backToTop(category); }}>{videoEnabled ? t('Skip to current collection') : t('Skip to photographs')}</a>
    <a className="photo-brand" href={isChinese ? sitePath('home') : '/galaxci/'} aria-label={t('Gala X Ci — design portfolio')}>Gala <span>X</span> Ci<span className="photo-brand-sub">{t('Photography')}</span></a>
    <GlassCategoryNav active={category} showVideo={videoEnabled} onNavigate={navigate} />
    <main className="photo-viewport" aria-label={t('Photography')}>
      <div className="photo-track" style={{ transform: `translate3d(-${categoryIndex * 100}%, 0, 0)` }}>
        {categories.map(item => {
          const series = item.data ? catalog.series.filter(series => series.category === item.data) : [];
          return <section key={item.id} ref={node => { panels.current[item.id] = node; }} className="photo-panel" data-category={item.id} aria-labelledby={`${item.id}-title`} aria-hidden={item.id !== category}>
            <header className="photo-intro">
              <p className="photo-kicker">{t('Ci Song / Photography')}</p>
              <h1 id={`${item.id}-title`} tabIndex={-1}>{item.label}</h1>
              <p className="photo-description">{item.description}</p>
            </header>
            <div className="photo-series-list">
              {series.map(series => <PhotoSeries key={series.id} item={series} width={viewport.galleryWidth} height={viewport.height} gap={gap} mode={mode} admitted={admission.admitted} visible={admission.visible} onOpen={(photoId, opener) => setOpened({ category: item.id as PhotoCategory, photoId, opener })} />)}
            </div>
            {item.id === 'video' && <VideoGallery items={photographyVideoCatalog} active={category === 'video'} />}
            <section className="photo-contact" aria-labelledby={`${item.id}-contact-title`}>
              <div className="photo-contact-top photo-kicker"><span>{t('Let’s work together')}</span><span>{t('Photography inquiries')}</span></div>
              <h2 id={`${item.id}-contact-title`}>{t('Let’s make')}<br /><em>{t('something real.')}</em><a className="photo-contact-arrow" href="mailto:galaxci.song@gmail.com" aria-label={t('Email Ci Song')}><ArrowUpRight strokeWidth={1} aria-hidden="true" /></a></h2>
              <a className="photo-email" href={`mailto:galaxci.song@gmail.com?subject=${encodeURIComponent(t('Photography inquiry'))}`}>galaxci.song@gmail.com</a>
              <footer className="photo-footer"><span>GALA X CI / CI SONG</span><div><a href={isChinese ? sitePath('home') : '/galaxci/'}>{t('Design portfolio')} <ArrowUpRight size={14} aria-hidden="true" /></a><a href={`#${item.id}`} onClick={event => { event.preventDefault(); backToTop(item.id); }}>{t('Back to top ↑')}</a></div></footer>
            </section>
          </section>;
        })}
      </div>
    </main>
    {opened && <PhotoDialog key={opened.category} photos={categoryPhotos(opened.category)} initialPhotoId={opened.photoId} returnFocus={opened.opener} onClose={() => setOpened(null)} />}
  </div>;
}

function PhotoSeries({ item, width, height, gap, mode, admitted, visible, onOpen }: { item: PhotographySeries; width: number; height: number; gap: number; mode: 1 | 2 | 3; admitted: Set<string>; visible: Set<string>; onOpen: (id: string, opener: HTMLElement) => void }) {
  const photos = useMemo(() => item.photoIds.map(id => photosById.get(id)).filter((photo): photo is PhotographyPhoto => !!photo), [item]);
  const rows = useMemo(() => arrangePhotos(photos, width, gap, mode, height), [photos, width, gap, mode, height]);
  return <section className="photo-series" aria-labelledby={`series-${item.id}`}>
    <div className="photo-series-heading"><h2 id={`series-${item.id}`}>{t(item.title)}</h2><span>{number(photos.length)} {t('photographs')}</span></div>
    <div className="photo-rows" style={{ gap }}>
      {rows.map(row => <div className="photo-row" key={row.photos[0].id} style={{ gap, height: row.height }}>
        {row.photos.map((photo, photoIndex) => <PhotoTile key={photo.id} photo={photo} width={row.widths[photoIndex]} height={row.height} admitted={admitted.has(photo.id)} priority={visible.has(photo.id)} onOpen={opener => onOpen(photo.id, opener)} />)}
      </div>)}
    </div>
  </section>;
}

function PhotoTile({ photo, width, height, admitted, priority, onOpen }: { photo: PhotographyPhoto; width: number; height: number; admitted: boolean; priority: boolean; onOpen: (opener: HTMLElement) => void }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  return <div className="photo-tile" style={{ width, height }} data-photo-id={photo.id}>
    {failed ? <div className="photo-media-error" role="status"><span>{t('Image unavailable')}</span><button type="button" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{t('Retry image')}</button><button type="button" data-photo-open onClick={event => onOpen(event.currentTarget)}>{t('Open photograph')}</button></div> :
      <button className="photo-open" data-photo-open type="button" onContextMenu={event => event.preventDefault()} onDragStart={event => event.preventDefault()} onClick={event => onOpen(event.currentTarget)} aria-label={`${t('View')} ${t(photo.alt)}`}>{admitted && <ManagedPhoto key={retry} photo={photo} sizes={`${Math.ceil(width)}px`} loading="eager" fetchPriority={priority ? 'high' : 'low'} priority={priority} onFailure={() => setFailed(true)} />}</button>}
  </div>;
}

function PhotoDialog({ photos, initialPhotoId, returnFocus, onClose }: { photos: PhotographyPhoto[]; initialPhotoId: string; returnFocus: HTMLElement; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(returnFocus);
  const [frame, setFrame] = useState(() => Math.max(0, photos.findIndex(photo => photo.id === initialPhotoId)));
  const photo = photos[frame];
  const series = seriesById.get(photo.seriesId);
  const step = (direction: number) => {
    // Keep focus on a persistent control when the keyed image/retry UI unmounts.
    dialog.current?.querySelector<HTMLButtonElement>(`button[data-photo-step="${direction > 0 ? 'next' : 'previous'}"]`)?.focus({ preventScroll: true });
    setFrame(value => (value + direction + photos.length) % photos.length);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    document.documentElement.dataset.photoDialogOpen = 'true';
    element.showModal();
    element.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      delete document.documentElement.dataset.photoDialogOpen;
      const target = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>(`[data-photo-id="${initialPhotoId}"] [data-photo-open]`);
      if (target && !target.closest('[inert]')) target.focus({ preventScroll: true });
    };
  }, []);

  return <dialog className="photo-dialog" ref={dialog} aria-labelledby="photo-viewer-title" aria-describedby="photo-viewer-count" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
    trapFocus(event);
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  }}>
    <header className="photo-dialog-header"><div><h2 id="photo-viewer-title">{series ? t(series.title) : ''}</h2><p id="photo-viewer-count" aria-live="polite" aria-atomic="true">{number(frame + 1)} / {number(photos.length)}</p></div><button type="button" onClick={onClose} aria-label={t('Close photograph')}>{t('Close')} <X size={20} aria-hidden="true" /></button></header>
    <div className="photo-dialog-stage"><PhotoViewerImage key={photo.id} photo={photo} onStep={step} /></div>
    <div className="photo-dialog-controls"><button type="button" data-photo-step="previous" onClick={() => step(-1)} aria-label={t('Previous photograph')}><ArrowLeft size={22} aria-hidden="true" /></button><span>{t('Ci Song / Photography')}</span><button type="button" data-photo-step="next" onClick={() => step(1)} aria-label={t('Next photograph')}><ArrowRight size={22} aria-hidden="true" /></button></div>
  </dialog>;
}
