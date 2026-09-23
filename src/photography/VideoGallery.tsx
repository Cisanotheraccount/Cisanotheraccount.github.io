import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { PhotographyVideo } from './PhotographyVideo';
import type { PhotographyVideoItem } from './videoCatalog';

type VideoCategory = PhotographyVideoItem['category'];

const groups: readonly { id: VideoCategory; title: string; description: string }[] = [
  { id: 'real-estate', title: 'Real Estate', description: 'Spaces, details, and the way people move through them.' },
  { id: 'interviews', title: 'Interviews', description: 'People, ideas, and the lives behind them.' },
];

function playbackTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function VideoGallery({ items, active }: { items: readonly PhotographyVideoItem[]; active: boolean }) {
  const [opened, setOpened] = useState<{ item: PhotographyVideoItem; opener: HTMLButtonElement } | null>(null);
  const previousActive = useRef(active);

  useLayoutEffect(() => {
    if (previousActive.current && !active) setOpened(null);
    previousActive.current = active;
  }, [active]);

  useEffect(() => {
    const closeForHistory = () => setOpened(null);
    window.addEventListener('hashchange', closeForHistory);
    window.addEventListener('popstate', closeForHistory);
    return () => {
      window.removeEventListener('hashchange', closeForHistory);
      window.removeEventListener('popstate', closeForHistory);
    };
  }, []);

  return <div className="photo-video-gallery" aria-label="Video collections">
    {groups.map((group, groupIndex) => {
      const videos = items.filter(item => item.category === group.id);
      if (!videos.length) return null;
      return <section className="photo-video-group" key={group.id} aria-labelledby={`video-group-${group.id}`}>
        <header className="photo-video-group-heading">
          <span>{String(groupIndex + 1).padStart(2, '0')}</span>
          <div>
            <h2 id={`video-group-${group.id}`}>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          <span>{String(videos.length).padStart(2, '0')} films</span>
        </header>
        <div className="photo-video-grid">
          {videos.map(item => <article className="photo-video-cover-card" key={item.id} data-video-id={item.id}>
            <button
              className="photo-video-cover-button"
              type="button"
              aria-haspopup="dialog"
              aria-label={`Play ${item.title} with sound`}
              onClick={event => setOpened({ item, opener: event.currentTarget })}
            >
              <span className="photo-video-cover" style={{ aspectRatio: `${item.dimensions.width} / ${item.dimensions.height}` }}>
                <img
                  src={item.poster}
                  alt=""
                  width={item.dimensions.width}
                  height={item.dimensions.height}
                  loading="lazy"
                  decoding="async"
                />
                <span className="photo-video-cover-play" aria-hidden="true"><Play fill="currentColor" /></span>
                <span className="photo-video-cover-duration" aria-hidden="true">{playbackTime(item.duration)}</span>
              </span>
              <span className="photo-video-cover-copy">
                <strong>{item.title}</strong>
                <span>{item.postedBy ? `${item.postedBy} · ` : ''}Filmed by Ci Song</span>
              </span>
            </button>
          </article>)}
        </div>
      </section>;
    })}
    {opened && <PhotographyVideo item={opened.item} returnFocus={opened.opener} onClose={() => setOpened(null)} />}
  </div>;
}
