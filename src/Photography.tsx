import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, X, Pause, Play } from 'lucide-react';
import { portfolioContact } from './portfolioData';
import './photography.css';
import { useReducedMotion } from './usePortfolioMotion';
import { useSmoothScroll } from './useSmoothScroll';

const categories = ['All', 'Portraits', 'Restaurants', 'Spaces', 'Live'] as const;
type Category = typeof categories[number];
const series = [
  { id: 'portraits-01', category: 'Portraits', format: 'portrait', number: '01' },
  { id: 'restaurants-01', category: 'Restaurants', format: 'landscape', number: '02' },
  { id: 'spaces-01', category: 'Spaces', format: 'landscape', number: '03' },
  { id: 'live-01', category: 'Live', format: 'portrait', number: '04' },
  { id: 'portraits-02', category: 'Portraits', format: 'landscape', number: '05' },
  { id: 'spaces-02', category: 'Spaces', format: 'portrait', number: '06' },
  { id: 'restaurants-02', category: 'Restaurants', format: 'portrait', number: '07' },
  { id: 'live-02', category: 'Live', format: 'landscape', number: '08' },
];
type Series = typeof series[number];

export function Photography() {
  const [category, setCategory] = useState<Category>('All');
  const [opened, setOpened] = useState<Series | null>(null);
  const reducedMotion = useReducedMotion();
  const [motionPaused, setMotionPaused] = useState(false);
  const motionDisabled = reducedMotion || motionPaused;
  useSmoothScroll(motionDisabled, opened !== null);
  const works = series.filter(item => category === 'All' || category === item.category);
  useEffect(() => {
    document.title = 'Ci Song — Photography & Film';
    document.documentElement.dataset.photography = 'true';
    return () => { delete document.documentElement.dataset.photography; };
  }, []);
  return <div className="photo-site" data-motion-paused={motionDisabled ? "true" : "false"}>
    <div className="photo-atmosphere" aria-hidden="true"><picture><source media="(max-width:700px)" srcSet="/portfolio/cosmic-photograph-960.webp" /><img src="/portfolio/cosmic-photograph-1920.webp" width="1920" height="1281" alt="" /></picture></div>
    <a href="#photo-main" className="skip-link">Skip to content</a>
    <header className="photo-header">
      <a className="wordmark" href="/photography/" aria-label="Gala X Ci Photography home">Gala <span className="brand-x">X</span> Ci<span className="wordmark-dot" aria-hidden="true">.</span></a>
      <nav aria-label="Photography navigation">{[["Work", "#selected"], ["Films", "#films"], ["Contact", "#photo-contact"]].map(([label, href]) => <a key={label} className="nav-link" href={href}><span className="nav-label"><span>{label}</span><span aria-hidden="true">{label}</span></span></a>)}</nav>
      <a className="photo-design-link" href="/">Design portfolio <ArrowUpRight size={15} /></a>
    </header>
    <main id="photo-main" tabIndex={-1}>
      <section className="photo-hero" aria-labelledby="photo-title">
        <div className="photo-hero-line"><span>Ci Song / Photography &amp; Film</span><button className="motion-toggle" disabled={reducedMotion} aria-pressed={motionDisabled} aria-label={motionDisabled ? "Resume motion" : "Pause motion"} onClick={() => setMotionPaused(value => !value)}>{motionDisabled ? <Play size={13} /> : <Pause size={13} />}<span>{motionDisabled ? "Motion paused" : "Pause motion"}</span></button></div>
        <h1 id="photo-title" aria-label="Gala X Ci"><span>Gala</span><span>X</span><span>Ci</span></h1>
        <div className="photo-hero-discipline"><p>People, places,<br />and the moments between.</p><a href="#selected" className="text-link">View photographs <ArrowDown size={19} strokeWidth={1.5} /></a></div>
        <div className="photo-cover">
          <div className="photo-cover-frame" aria-label="Featured photograph placeholder"><span className="photo-corner tl" /><span className="photo-corner tr" /><span className="photo-corner bl" /><span className="photo-corner br" /><span className="photo-cover-no">01 /</span><div className="photo-cover-label"><span>Selected photograph</span><span>Image to come</span></div><span className="photo-cover-signature">Ci Song</span></div>
          <div className="photo-cover-caption"><span>Portfolio in preparation · Layout preview</span><a href="#selected">Explore the work <ArrowDown size={16} /></a></div>
        </div>
      </section>
      <section id="selected" className="photo-selected" aria-labelledby="selected-title">
        <div className="photo-section-intro"><span className="photo-kicker">01 / Photographs</span><h2 id="selected-title">Selected <em>work.</em></h2><p>Portraits, restaurants, spaces<br />and the energy of live performance.</p></div>
        <div className="photo-filters" role="group" aria-label="Filter photography by category">{categories.map(item => <button key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}<span aria-hidden="true">{item === 'All' ? '08' : '02'}</span></button>)}</div>
        <p className="photo-preview-note" role="status">{works.length} reserved series slots · Photographs will be added soon.</p>
        <div className="photo-grid" key={category}>{works.map(item => <button className={'photo-card photo-card-' + item.format} key={item.id} onClick={() => setOpened(item)} aria-label={'Preview ' + item.category + ' series slot ' + item.number}>
          <span className={'photo-placeholder placeholder-' + item.category.toLowerCase()}><span className="photo-slot-index">/{item.number}</span><span className="photo-slot-label">{item.category}<small>Photographs to come</small></span><span className="photo-slot-open"><ArrowUpRight size={22} strokeWidth={1} /></span></span>
          <span className="photo-card-caption"><span>{item.category}</span><span>Series {item.number}</span></span>
        </button>)}</div>
      </section>
      <section id="films" className="photo-films" aria-labelledby="films-title"><div className="photo-section-intro"><span className="photo-kicker">02 / Moving image</span><h2 id="films-title">In <em>motion.</em></h2><p>A space for films<br />and moving-image work.</p></div><div className="photo-film-grid">{['01', '02'].map(n => <div className="photo-film" key={n}><div className="photo-film-frame"><span>Film / {n}</span><span className="photo-film-center">Film to come<span>Poster &amp; video pending</span></span><span>— : —</span></div><div className="photo-card-caption"><span>Film {n}</span><span>In preparation</span></div></div>)}</div></section>
      <section id="photo-contact" className="photo-contact" aria-labelledby="photo-contact-title"><div><span className="photo-kicker">03 / About &amp; inquiries</span><h2 id="photo-contact-title">Let’s make<br /><em>something real.</em></h2></div><div className="photo-contact-info"><p>I’m Ci Song. My photography spans portraits, restaurants, real estate, and live performances.</p><p>For photography and film inquiries, get in touch with a little about your project.</p><a href={'mailto:' + portfolioContact.email + '?subject=Photography%20%26%20Film%20inquiry'}>{portfolioContact.email}<ArrowUpRight size={20} /></a></div></section>
    </main>
    <footer className="photo-footer"><span>© {new Date().getFullYear()} Ci Song</span><a href="/">Gala X Ci / Design <ArrowUpRight size={14} /></a><a href="#photo-main">Back to top ↑</a></footer>
    {opened && <SeriesPreview item={opened} onClose={() => setOpened(null)} />}
  </div>;
}

function SeriesPreview({ item, onClose }: { item: Series; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  const [frame, setFrame] = useState(0);
  const step = (direction: number) => setFrame(value => (value + direction + 3) % 3);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true }); };
  }, []);
  return <dialog className="photo-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); step(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); } }} aria-labelledby="photo-series-title">
    <header><span>Ci Song / Series {item.number}</span><button onClick={onClose} autoFocus aria-label="Close series preview">Close<X size={20} /></button></header>
    <div className="photo-dialog-body"><div className="photo-dialog-title"><h2 id="photo-series-title">{item.category}</h2><p>Series preview · Photographs to come</p></div><div className="photo-dialog-frame" onTouchStart={event => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={event => { if (touchStart.current !== null) { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1); } touchStart.current = null; }}><div className="photo-frame-content" key={frame}><span>Frame 0{frame + 1}</span><span>Photograph to come</span></div></div><div className="photo-dialog-controls"><button onClick={() => step(-1)} aria-label="Previous frame"><ArrowLeft size={22} /></button><span aria-live="polite" aria-atomic="true">0{frame + 1} / 03</span><button onClick={() => step(1)} aria-label="Next frame"><ArrowRight size={22} /></button></div></div>
  </dialog>;
}
