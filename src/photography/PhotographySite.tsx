import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import catalogJson from './catalog.json';
import type { PhotographyCatalog, PhotographyCategory, PhotographyPhoto, PhotographySeries } from './catalog.types';
import { ManagedPhoto, OriginalPhoto } from './media';
import '../photography.css';
import './site.css';

const catalog = catalogJson as PhotographyCatalog;
const filters: Array<'All' | PhotographyCategory> = ['All', 'Landscapes', 'Portraits', 'Restaurants', 'Spaces', 'Live'];

function number(value: number) {
  return String(value).padStart(2, '0');
}

function fileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const megabytes = bytes / 1_000_000;
  return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function trapFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])'))
    .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  if (focusable.length === 0) return;
  const current = focusable.indexOf(document.activeElement as HTMLElement);
  const next = current < 0
    ? (event.shiftKey ? focusable.length - 1 : 0)
    : (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
  event.preventDefault();
  focusable[next].focus();
}

function catalogState(input: PhotographyCatalog) {
  const photosById = new Map(input.photos.map((photo) => [photo.id, photo]));
  const series = input.series.filter((item) => photosById.has(item.coverId) && item.photoIds.some((id) => photosById.has(id)));
  return { photosById, series };
}

export function PhotographySite() {
  const { photosById, series } = useMemo(() => catalogState(catalog), []);
  const hero = photosById.get(catalog.heroPhotoId) ?? photosById.get(series[0]?.coverId);
  const [category, setCategory] = useState<'All' | PhotographyCategory>('All');
  const [opened, setOpened] = useState<PhotographySeries | null>(null);
  const visibleCategories = filters.filter((filter) => filter === 'All' || series.some((item) => item.category === filter));
  const visibleSeries = series.filter((item) => category === 'All' || item.category === category);

  useEffect(() => {
    document.title = 'Ci Song — Photography';
    document.documentElement.dataset.photography = 'true';
    return () => { delete document.documentElement.dataset.photography; };
  }, []);

  useEffect(() => {
    if (category !== 'All' && !visibleCategories.includes(category)) setCategory('All');
  }, [category, visibleCategories]);

  return <div className="photo-site">
    <a href="#photo-main" className="skip-link">Skip to content</a>
    <header className="photo-header">
      <a className="wordmark" href="/photography/" aria-label="Gala X Ci Photography home">Gala <span className="brand-x">X</span> Ci<span className="wordmark-dot" aria-hidden="true">.</span></a>
      <nav aria-label="Photography navigation">
        <a className="nav-link" href="#selected">Work</a>
        <a className="nav-link" href="#photo-contact">Contact</a>
      </nav>
      <a className="photo-design-link" href="/galaxci/">Design portfolio <ArrowUpRight size={15} aria-hidden="true" /></a>
    </header>
    <main id="photo-main" tabIndex={-1}>
      <section className="photo-hero" aria-labelledby="photo-title">
        <div className="photo-hero-line"><span>Ci Song / Photography</span><span>{number(series.length)} series</span></div>
        <h1 id="photo-title"><span>Gala</span><span>X</span><span>Ci</span></h1>
        <div className="photo-hero-discipline"><p>Photography<br />by Ci Song.</p><a href="#selected" className="text-link">View photographs <ArrowDown size={19} strokeWidth={1.5} aria-hidden="true" /></a></div>
        {hero ? <figure className="photo-cover">
          <ManagedPhoto photo={hero} sizes="100vw" priority className="photo-cover-image" />
          <figcaption className="photo-cover-caption"><span>Selected photograph</span><a href="#selected">Explore the work <ArrowDown size={16} aria-hidden="true" /></a></figcaption>
        </figure> : <div className="photo-catalog-error" role="status"><p>Photography is unavailable right now.</p><button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
      </section>
      <section id="selected" className="photo-selected" aria-labelledby="selected-title">
        <div className="photo-section-intro"><span className="photo-kicker">01 / Photographs</span><h2 id="selected-title">Selected <em>work.</em></h2><p>Photographs organized<br />by series.</p></div>
        <div className="photo-filters" role="group" aria-label="Filter photography by category">
          {visibleCategories.map((item) => {
            const count = item === 'All' ? series.length : series.filter((entry) => entry.category === item).length;
            return <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}<span aria-hidden="true">{number(count)}</span></button>;
          })}
        </div>
        <p className="photo-preview-note" role="status">{visibleSeries.length} series</p>
        <div className="photo-grid">
          {visibleSeries.map((item, index) => {
            const cover = photosById.get(item.coverId);
            if (!cover) return null;
            return <PhotoSeriesCard item={item} cover={cover} index={index} key={item.id} onOpen={() => setOpened(item)} />;
          })}
        </div>
      </section>
      <section id="photo-contact" className="photo-contact" aria-labelledby="photo-contact-title"><div><span className="photo-kicker">02 / Inquiries</span><h2 id="photo-contact-title">Let’s make<br /><em>something real.</em></h2></div><div className="photo-contact-info"><p>For photography inquiries, get in touch with a little about your project.</p><a href="mailto:galaxci.song@gmail.com?subject=Photography%20inquiry">galaxci.song@gmail.com<ArrowUpRight size={20} aria-hidden="true" /></a></div></section>
    </main>
    <footer className="photo-footer"><span>© {new Date().getFullYear()} Ci Song</span><a href="/galaxci/">Gala X Ci / Design <ArrowUpRight size={14} aria-hidden="true" /></a><a href="#photo-main">Back to top ↑</a></footer>
    {opened && <SeriesDialog item={opened} photosById={photosById} onClose={() => setOpened(null)} />}
  </div>;
}

function PhotoSeriesCard({ item, cover, index, onOpen }: { item: PhotographySeries; cover: PhotographyPhoto; index: number; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [forceJpeg, setForceJpeg] = useState(false);
  const label = <span className="photo-card-caption"><span>{item.title}</span><span>{item.category} / {number(index + 1)}</span></span>;
  return <article className="photo-card">
    {failed ? <div className="photo-card-image photo-card-image-error"><div className="photo-media-error" role="status"><span>Image unavailable</span><button type="button" onClick={() => { setFailed(false); setForceJpeg(true); setRetry((value) => value + 1); }}>Retry</button></div>{label}</div> : <button type="button" className="photo-card-open" onClick={onOpen} aria-label={`Open ${item.title} series`}><span className="photo-card-image"><ManagedPhoto key={retry} photo={cover} sizes="(max-width: 600px) 100vw, (max-width: 950px) 48vw, 54vw" forceJpeg={forceJpeg} onFailure={() => setFailed(true)} /></span>{label}</button>}
  </article>;
}

function SeriesDialog({ item, photosById, onClose }: { item: PhotographySeries; photosById: Map<string, PhotographyPhoto>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const fullRequestId = useRef(0);
  const [frame, setFrame] = useState(0);
  const [full, setFull] = useState<{ photoId: string; requestId: number; status: 'loading' | 'ready' | 'error' } | null>(null);
  const photos = item.photoIds.map((id) => photosById.get(id)).filter((photo): photo is PhotographyPhoto => Boolean(photo));
  const photo = photos[frame] ?? photos[0];
  const step = (direction: number) => {
    fullRequestId.current += 1;
    setFull(null);
    setFrame((value) => (value + direction + photos.length) % photos.length);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const previous = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.body.style.overflow };
    document.documentElement.dataset.photoDialogOpen = 'true';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    element.showModal();
    element.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      delete document.documentElement.dataset.photoDialogOpen;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  if (!photo) return null;
  const original = photo.original;
  const activeFull = full?.photoId === photo.id ? full : null;
  const requestFull = () => {
    const requestId = fullRequestId.current + 1;
    fullRequestId.current = requestId;
    setFull({ photoId: photo.id, requestId, status: 'loading' });
  };
  const settleFull = (requestId: number, status: 'ready' | 'error') => {
    setFull((current) => current?.requestId === requestId && current.photoId === photo.id ? { ...current, status } : current);
  };
  const fullLabel = activeFull?.status === 'loading'
    ? 'Loading full resolution…'
    : activeFull?.status === 'ready'
      ? 'Full resolution loaded'
      : activeFull?.status === 'error'
        ? 'Retry full resolution'
        : 'Full resolution';
  return <dialog className="photo-dialog" ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} onKeyDown={(event) => {
    trapFocus(event);
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  }} aria-labelledby="photo-series-title" aria-describedby="photo-series-count">
    <header><span>Ci Song / Photography</span><button type="button" onClick={onClose} aria-label="Close series">Close <X size={20} aria-hidden="true" /></button></header>
    <div className="photo-dialog-body">
      <div className="photo-dialog-title"><div><h2 id="photo-series-title">{item.title}</h2><p>{item.category}</p></div><p id="photo-series-count" aria-live="polite" aria-atomic="true">{number(frame + 1)} / {number(photos.length)}</p></div>
      <div className="photo-dialog-frame" onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = event.touches.length === 1 && touch ? { id: touch.identifier, x: touch.clientX, y: touch.clientY } : null; }} onTouchCancel={() => { touchStart.current = null; }} onTouchEnd={(event) => { const start = touchStart.current; const end = Array.from(event.changedTouches).find((touch) => touch.identifier === start?.id); if (start && end && event.touches.length === 0) { const x = end.clientX - start.x; const y = end.clientY - start.y; if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y) * 1.2) step(x < 0 ? 1 : -1); } touchStart.current = null; }}>
        <ManagedPhoto key={photo.id} photo={photo} sizes="(max-width: 700px) 100vw, 88vw" priority className="photo-dialog-image" />
        {original && activeFull && <OriginalPhoto
          key={`${photo.id}-${activeFull.requestId}`}
          photo={photo}
          requestKey={activeFull.requestId}
          className={`photo-dialog-image photo-dialog-original${activeFull.status === 'ready' ? ' is-ready' : ''}`}
          onReady={() => settleFull(activeFull.requestId, 'ready')}
          onFailure={() => settleFull(activeFull.requestId, 'error')}
        />}
      </div>
      {original && <div className="photo-resolution">
        <button type="button" className="photo-resolution-button" onClick={() => { if (activeFull?.status !== 'loading' && activeFull?.status !== 'ready') requestFull(); }} aria-disabled={activeFull?.status === 'loading' || activeFull?.status === 'ready'}>{fullLabel}</button>
        <div className="photo-resolution-detail">
          {!activeFull && <span>{original.width} × {original.height}{fileSize(original.bytes) ? ` · ${fileSize(original.bytes)}` : ''}</span>}
          {activeFull?.status === 'loading' && <span role="status" aria-live="polite">Loading the original image…</span>}
          {activeFull?.status === 'ready' && <span role="status" aria-live="polite">Full resolution ready.</span>}
          {activeFull?.status === 'error' && <><span role="alert">Couldn’t load full resolution.</span><a href={original.src} target="_blank" rel="noreferrer">Open original file <ArrowUpRight size={14} aria-hidden="true" /></a></>}
        </div>
      </div>}
      {photos.length > 1 && <div className="photo-dialog-controls"><button type="button" onClick={() => step(-1)} aria-label="Previous photograph"><ArrowLeft size={22} aria-hidden="true" /></button><span aria-hidden="true">{number(frame + 1)} / {number(photos.length)}</span><button type="button" onClick={() => step(1)} aria-label="Next photograph"><ArrowRight size={22} aria-hidden="true" /></button></div>}
    </div>
  </dialog>;
}
