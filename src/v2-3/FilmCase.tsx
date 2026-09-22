import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowDown, Play } from 'lucide-react';
import type { PortfolioProject } from './content/portfolioData';
import { ProjectVideo } from './ProjectVideo';
import './filmCase.css';
import { t } from '../localization/main';

type Still = { image: string; alt: string; caption: string; width?: number; height?: number };

/** The local artwork is independent of the optional, visitor-loaded video. */
export function FilmCase({ item, heading, slot, active, instant, studies, renderStudy }: {
  item: PortfolioProject;
  heading: RefObject<HTMLHeadingElement | null>;
  slot: RefObject<HTMLDivElement | null>;
  active: boolean;
  instant: boolean;
  studies: Still[];
  renderStudy(study: Still): ReactNode;
}) {
  const [requested, setRequested] = useState(false);
  const screening = useRef<HTMLElement>(null);
  const watch = () => {
    setRequested(true);
    screening.current?.focus({ preventScroll: true });
    screening.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'start' });
  };

  return <div className="fc-case">
    <header className="fc-hero">
      <div className="fc-artwork" ref={slot}>
        <img src={item.image} alt={item.imageAlt} width={item.imageWidth} height={item.imageHeight} fetchPriority="high"/>
      </div>
      <div className="fc-hero-copy">
        <span className="gxc-mono fc-category">{item.category}</span>
        <h2 ref={heading} id="gxc-detail-title" tabIndex={-1}>{item.title}</h2>
        <div className="fc-hero-bottom"><p>{item.summary}</p><button className="fc-watch" onClick={watch} aria-controls="fc-screening"><Play size={17} aria-hidden="true"/>{t('Watch the film')}<ArrowDown size={17} aria-hidden="true"/></button></div>
      </div>
    </header>

    <div className="fc-body">
      <section ref={screening} id="fc-screening" className="fc-screening" tabIndex={-1} aria-labelledby="fc-film-title">
        <div className="fc-section-heading"><span className="gxc-mono">{t('01 / THE FILM')}</span><h3 id="fc-film-title">{item.video?.title}</h3><span className="fc-inline-note">{t('Watch here, in the page.')}</span></div>
        <ProjectVideo project={item} active={active} requested={requested} onRequest={watch}/>
        <p className="fc-network-note">{t('Playback requires access to YouTube. If the player cannot connect, you can still explore this project below.')}</p>
      </section>

      <section className="fc-overview" aria-label={t('Project overview')}>
        <aside><span className="gxc-mono">{t('02 / ABOUT THE WORK')}</span><ul>{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>{item.role && <p>{t('Role — ')}{item.role}</p>}{item.period && <p>{item.period}</p>}</aside>
        <div>{item.overview.map(text => <p key={text}>{text}</p>)}</div>
      </section>
      <div className="fc-highlights">{item.highlights.map((highlight, index) => <section key={highlight.title}><span className="gxc-mono">{String(index + 1).padStart(2, '0')}</span><h3>{highlight.title}</h3><p>{highlight.body}</p></section>)}</div>
      {studies.length > 0 && <section className="fc-stills" aria-labelledby="fc-stills-title"><div className="fc-section-heading"><span className="gxc-mono">{t('03 / SELECTED FRAMES')}</span><h3 id="fc-stills-title">{t('Inside the world.')}</h3></div><div className="fc-stills-grid">{studies.map(study => <div key={study.image}>{renderStudy(study)}</div>)}</div></section>}
    </div>
  </div>;
}
