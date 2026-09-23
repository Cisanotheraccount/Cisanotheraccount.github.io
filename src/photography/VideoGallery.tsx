import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PhotographyVideo } from './PhotographyVideo';
import type { PhotographyVideoItem } from './videoCatalog';

const groups = [
  { id: 'real-estate', title: 'Real Estate', description: 'Spaces, details, and the way people move through them.' },
  { id: 'interviews', title: 'Interviews', description: 'People, ideas, and the lives behind them.' },
] as const;

export function VideoGallery({ items, active }: { items: readonly PhotographyVideoItem[]; active: boolean }) {
  const [started, setStarted] = useState<ReadonlySet<string>>(() => new Set());
  const [audibleId, setAudibleId] = useState<string | null>(null);
  const players = useRef(new Map<string, HTMLVideoElement>());
  const register = useCallback((id: string, video: HTMLVideoElement) => {
    players.current.set(id, video);
    return () => { if (players.current.get(id) === video) players.current.delete(id); };
  }, []);
  // Set actual media properties during the gesture, before React commits.
  const setMuted = useCallback((id: string, muted: boolean) => {
    if (!muted) {
      for (const [otherId, video] of players.current) {
        const next = otherId !== id;
        if (video.muted !== next) video.muted = next;
      }
      setAudibleId(id);
    } else {
      const video = players.current.get(id);
      if (video && !video.muted) video.muted = true;
      setAudibleId(current => current === id ? null : current);
    }
  }, []);
  const closeAll = useCallback(() => {
    for (const video of players.current.values()) {
      video.pause(); video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      video.load();
    }
    setStarted(new Set()); setAudibleId(null);
  }, []);
  useLayoutEffect(() => { if (!active) closeAll(); }, [active, closeAll]);
  useEffect(() => {
    window.addEventListener('hashchange', closeAll);
    window.addEventListener('popstate', closeAll);
    window.addEventListener('pagehide', closeAll);
    return () => {
      window.removeEventListener('hashchange', closeAll);
      window.removeEventListener('popstate', closeAll);
      window.removeEventListener('pagehide', closeAll);
    };
  }, [closeAll]);
  const start = (id: string) => setStarted(current => new Set([...current, id]));
  const close = (id: string) => {
    setStarted(current => { const next = new Set(current); next.delete(id); return next; });
    setMuted(id, true);
  };
  return <div className="photo-video-gallery" aria-label="Video collections">
    {groups.map((group, index) => {
      const videos = items.filter(item => item.category === group.id);
      return videos.length > 0 && <section className="photo-video-group" key={group.id} aria-labelledby={`video-group-${group.id}`}>
        <header className="photo-video-group-heading">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><h2 id={`video-group-${group.id}`}>{group.title}</h2><p>{group.description}</p></div>
          <span>{String(videos.length).padStart(2, '0')} films</span>
        </header>
        <div className="photo-video-grid">
          {videos.map(item => <article className="photo-video-cover-card" key={item.id} data-video-id={item.id}>
            <PhotographyVideo item={item} started={active && started.has(item.id)} muted={audibleId !== item.id}
              register={register} onStart={() => start(item.id)} onClose={() => close(item.id)}
              onMutedChange={value => setMuted(item.id, value)} />
          </article>)}
        </div>
      </section>;
    })}
  </div>;
}
