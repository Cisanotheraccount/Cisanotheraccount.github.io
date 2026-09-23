import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PhotographyVideo } from './PhotographyVideo';
import type { PhotographyVideoItem } from './videoCatalog';
import { browserAllowsVideoPreload, browserConnection, VIDEO_PRELOAD_LIMIT } from './videoPreload';

const groups = [
  { id: 'interviews', title: 'Interviews', description: 'People, ideas, and the lives behind them.' },
  { id: 'real-estate', title: 'Real Estate', description: 'Spaces, details, and the way people move through them.' },
] as const;

export function VideoGallery({ items, active }: { items: readonly PhotographyVideoItem[]; active: boolean }) {
  const [started, setStarted] = useState<ReadonlySet<string>>(() => new Set());
  const [audibleId, setAudibleId] = useState<string | null>(null);
  const [prewarmIds, setPrewarmIds] = useState<ReadonlySet<string>>(() => new Set());
  const galleryRef = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
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
    setPrewarmIds(new Set());
    if (!active) return;
    const hoverQuery = matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = browserConnection();
    let observer: IntersectionObserver | undefined;
    let idleId: number | undefined;
    let fallbackTimer: number | undefined;
    let loadListener: (() => void) | undefined;

    const stop = () => {
      observer?.disconnect(); observer = undefined;
      setPrewarmIds(new Set());
    };
    const start = () => {
      stop();
      if (!browserAllowsVideoPreload() || !galleryRef.current) return;
      const visible = new Map<string, IntersectionObserverEntry>();
      const update = () => {
        const next = [...visible.entries()]
          .filter(([, entry]) => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0)
          .sort(([, first], [, second]) => first.boundingClientRect.top - second.boundingClientRect.top)
          .slice(0, VIDEO_PRELOAD_LIMIT)
          .map(([id]) => id);
        setPrewarmIds(current => current.size === next.length && next.every(id => current.has(id)) ? current : new Set(next));
      };
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.videoId;
          if (id) visible.set(id, entry);
        }
        update();
      }, { root: galleryRef.current.closest('.photo-panel'), threshold: 0 });
      for (const card of cards.current.values()) observer.observe(card);
    };
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(start, { timeout: 2_000 });
      } else fallbackTimer = globalThis.setTimeout(start, 0);
    };
    if (document.readyState === 'complete') schedule();
    else {
      loadListener = schedule;
      window.addEventListener('load', loadListener, { once: true });
    }
    const reconsider = () => { if (browserAllowsVideoPreload()) start(); else stop(); };
    hoverQuery.addEventListener('change', reconsider);
    motionQuery.addEventListener('change', reconsider);
    connection?.addEventListener('change', reconsider);
    document.addEventListener('visibilitychange', reconsider);
    return () => {
      observer?.disconnect();
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (loadListener) window.removeEventListener('load', loadListener);
      hoverQuery.removeEventListener('change', reconsider);
      motionQuery.removeEventListener('change', reconsider);
      connection?.removeEventListener('change', reconsider);
      document.removeEventListener('visibilitychange', reconsider);
    };
  }, [active, items]);
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
  return <div ref={galleryRef} className="photo-video-gallery" aria-label="Video collections">
    {groups.map((group, index) => {
      const videos = items.filter(item => item.category === group.id);
      return videos.length > 0 && <section className="photo-video-group" key={group.id} aria-labelledby={`video-group-${group.id}`}>
        <header className="photo-video-group-heading">
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><h2 id={`video-group-${group.id}`}>{group.title}</h2><p>{group.description}</p></div>
          <span>{String(videos.length).padStart(2, '0')} films</span>
        </header>
        <div className="photo-video-grid">
          {videos.map(item => <article className="photo-video-cover-card" key={item.id} data-video-id={item.id}
            ref={node => { if (node) cards.current.set(item.id, node); else cards.current.delete(item.id); }}>
            <PhotographyVideo item={item} started={active && started.has(item.id)} muted={audibleId !== item.id} prewarm={active && prewarmIds.has(item.id)}
              register={register} onStart={() => start(item.id)} onClose={() => close(item.id)}
              onMutedChange={value => setMuted(item.id, value)} />
          </article>)}
        </div>
      </section>;
    })}
  </div>;
}
