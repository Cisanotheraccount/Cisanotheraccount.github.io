import { ArrowUpRight, Play } from 'lucide-react';
import type { PortfolioProject } from './content/portfolioData';
import './projectVideo.css';
import { t } from '../localization/main';
import { isChinese } from '../localization/locale';

/** Native player: only the active detail owns an iframe, so leaving stops playback. */
export function ProjectVideo({ project, active, requested = true, onRequest }: { project: PortfolioProject; active: boolean; requested?: boolean; onRequest?(): void }) {
  const video = project.video;
  if (!video) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=0&playsinline=1&controls=1&rel=0&hl=${isChinese ? 'zh-CN' : 'en'}`;

  return <figure className="gxc-project-video" aria-label={`${project.title}${t(' project video')}`}>
    <div className="gxc-project-video-frame">
      {active && requested ? <iframe
        key={video.id}
        src={embedUrl}
        title={`${video.title} — ${project.title}${t(' video')}`}
        width="1280"
        height="720"
        loading="lazy"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /> : <img src={project.image} alt={project.imageAlt} width={project.imageWidth} height={project.imageHeight}/>}
      {!requested && onRequest && <button className="gxc-project-video-load" onClick={onRequest}><Play size={22} aria-hidden="true"/><span>{t('Load video')}</span><small>{t('YouTube · plays here')}</small></button>}
    </div>
    <figcaption>
      <span>{video.title}</span>
      <a className="gxc-text-link" href={watchUrl} target="_blank" rel="noopener noreferrer">
        {t('Watch on YouTube')}<ArrowUpRight size={15} aria-hidden="true"/>
      </a>
    </figcaption>
  </figure>;
}
