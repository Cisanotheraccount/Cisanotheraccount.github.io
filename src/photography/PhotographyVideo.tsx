import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Expand, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import type { PhotographyVideoItem } from './videoCatalog';
import './video.css';

type Phase = 'idle' | 'loading' | 'ready' | 'playing' | 'error' | 'blocked';
type SafariVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitExitFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };
const time = (value: number) => {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
function unload(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause(); video.removeAttribute('src');
  video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
  video.load();
}

export function PhotographyVideo({ item, started, muted, register, onStart, onClose, onMutedChange }: {
  item: PhotographyVideoItem; started: boolean; muted: boolean;
  register: (id: string, video: HTMLVideoElement) => () => void;
  onStart: () => void; onClose: () => void; onMutedChange: (muted: boolean) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null), mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<SafariVideo>(null), sourceRef = useRef<HTMLSourceElement>(null);
  const coverRef = useRef<HTMLButtonElement>(null), fullButtonRef = useRef<HTMLButtonElement>(null);
  const primaryControlRef = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(false), fullscreenRef = useRef(false), fullscreenPending = useRef(false);
  const requestId = useRef(0), restoreTime = useRef(0), lastProgressAt = useRef(0);
  const pausedPosition = useRef<number | null>(null);
  const fullscreenLayout = useRef<{ card: HTMLElement; panel: HTMLElement; height: string; top: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentTime, setCurrentTime] = useState(0), [duration, setDuration] = useState(item.duration);
  const [paused, setPaused] = useState(true), [volume, setVolume] = useState(1);
  const [volumeSupported, setVolumeSupported] = useState(!/iPhone|iPod/.test(navigator.userAgent));
  const [fullscreen, setFullscreen] = useState(false);
  const titleId = `video-title-${item.id}`;
  const restoreInlineLayout = useCallback(() => {
    const layout = fullscreenLayout.current;
    if (!layout) return;
    fullscreenLayout.current = null;
    layout.card.style.minHeight = layout.height;
    if (layout.panel.isConnected && !layout.panel.inert) layout.panel.scrollTop = layout.top;
  }, []);
  const visible = useCallback(() => {
    const media = mediaRef.current, panel = media?.closest('.photo-panel');
    if (!media || !panel || panel.hasAttribute('inert')) return false;
    const a = media.getBoundingClientRect(), b = panel.getBoundingClientRect();
    return Math.min(a.right, b.right, innerWidth) > Math.max(a.left, b.left, 0)
      && Math.min(a.bottom, b.bottom, innerHeight) > Math.max(a.top, b.top, 0);
  }, []);
  const pause = useCallback((preservePosition = false) => {
    const video = videoRef.current;
    if (preservePosition && video && video.readyState >= 1 && pausedPosition.current === null) pausedPosition.current = video.currentTime;
    ++requestId.current; video?.pause(); setPaused(true);
    setPhase(value => value === 'loading' || value === 'playing' ? 'ready' : value);
  }, []);
  const mayPlay = () => activeRef.current && document.visibilityState !== 'hidden'
    && (fullscreenRef.current || fullscreenPending.current || visible());
  const play = () => {
    const video = videoRef.current;
    if (!video || !mayPlay()) return;
    if (pausedPosition.current !== null) {
      if (Math.abs(video.currentTime - pausedPosition.current) > .1) video.currentTime = pausedPosition.current;
      pausedPosition.current = null;
    }
    const request = ++requestId.current;
    lastProgressAt.current = performance.now();
    setPhase(video.readyState < 3 ? 'loading' : 'ready');
    void video.play().catch(error => {
      if (request !== requestId.current || !activeRef.current || (error instanceof DOMException && error.name === 'AbortError')) return;
      setPaused(true); setPhase(error instanceof DOMException && error.name === 'NotSupportedError' ? 'error' : 'blocked');
    });
  };
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const unregister = register(item.id, video);
    if (!/iPhone|iPod/.test(navigator.userAgent)) {
      try { video.volume = .5; setVolumeSupported(video.volume === .5); video.volume = 1; }
      catch { setVolumeSupported(false); }
    }
    return () => { activeRef.current = false; ++requestId.current; unregister(); unload(video); restoreInlineLayout(); };
  }, [item.id, register, restoreInlineLayout]);
  useLayoutEffect(() => {
    if (started) return;
    const video = videoRef.current, wasActive = activeRef.current;
    activeRef.current = false; ++requestId.current;
    if (document.fullscreenElement === shellRef.current) void document.exitFullscreen().catch(() => undefined);
    if (video?.webkitDisplayingFullscreen) video.webkitExitFullscreen?.();
    if (wasActive) unload(video);
    restoreTime.current = 0; pausedPosition.current = null;
    setCurrentTime(0); setDuration(item.duration); setPaused(true); setPhase('idle');
  }, [started, item.duration]);
  useEffect(() => {
    const media = mediaRef.current, video = videoRef.current, shell = shellRef.current;
    if (!media || !video || !shell) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting || entry.intersectionRect.width === 0 || entry.intersectionRect.height === 0)
        && activeRef.current && !fullscreenRef.current && !fullscreenPending.current) pause(true);
      else if (visible() && video.paused && pausedPosition.current !== null && Math.abs(video.currentTime - pausedPosition.current) > .1) video.currentTime = pausedPosition.current;
    }, { root: media.closest('.photo-panel'), threshold: 0 });
    observer.observe(media);
    const onVisibility = () => { if (document.visibilityState === 'hidden') pause(true); };
    let frame = 0;
    const syncFullscreen = (native?: boolean) => {
      const next = native ?? (document.fullscreenElement === shell || !!video.webkitDisplayingFullscreen);
      fullscreenPending.current = false;
      const wasFullscreen = fullscreenRef.current;
      fullscreenRef.current = next; setFullscreen(next);
      if (next && !activeRef.current) {
        if (document.fullscreenElement === shell) void document.exitFullscreen().catch(() => undefined);
        else video.webkitExitFullscreen?.();
      }
      if (!next && wasFullscreen) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          restoreInlineLayout();
          if (!visible()) pause(true);
          if (activeRef.current && !shell.closest('[inert]')) fullButtonRef.current?.focus({ preventScroll: true });
        });
      }
    };
    const standard = () => syncFullscreen(), begin = () => syncFullscreen(true), end = () => syncFullscreen(false);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', standard);
    video.addEventListener('webkitbeginfullscreen', begin); video.addEventListener('webkitendfullscreen', end);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility); document.removeEventListener('fullscreenchange', standard);
      video.removeEventListener('webkitbeginfullscreen', begin); video.removeEventListener('webkitendfullscreen', end);
    };
  }, [pause, visible, restoreInlineLayout]);
  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = window.setInterval(() => {
      if (activeRef.current && performance.now() - lastProgressAt.current > 30_000) { pause(); setPhase('error'); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, pause]);
  const loadAndPlay = (retry = false) => {
    const video = videoRef.current, source = sourceRef.current;
    if (!video || !source) return;
    if (!activeRef.current) { activeRef.current = true; video.muted = true; onMutedChange(true); onStart(); }
    restoreTime.current = retry ? pausedPosition.current ?? video.currentTime : 0;
    pausedPosition.current = null;
    source.setAttribute('src', item.source); source.setAttribute('type', 'video/mp4');
    video.load(); play();
    primaryControlRef.current?.focus({ preventScroll: true });
  };
  const togglePlayback = () => {
    if (!activeRef.current || phase === 'error') loadAndPlay(phase === 'error');
    else if (videoRef.current?.paused) play(); else pause();
  };
  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video || !started) return;
    video.volume = value; setVolume(video.volume); onMutedChange(value === 0);
  };
  const toggleMuted = () => {
    if (!started) return;
    if (muted && volume === 0 && videoRef.current) { videoRef.current.volume = 1; setVolume(1); }
    onMutedChange(!muted);
  };
  const restart = () => {
    if (phase === 'error') { loadAndPlay(true); return; }
    const video = videoRef.current;
    if (!video || !activeRef.current) return;
    pausedPosition.current = null; video.currentTime = 0; setCurrentTime(0); play();
  };
  const close = () => {
    pause(); pausedPosition.current = null; activeRef.current = false; unload(videoRef.current);
    if (document.fullscreenElement === shellRef.current) void document.exitFullscreen().catch(() => undefined);
    if (videoRef.current?.webkitDisplayingFullscreen) videoRef.current.webkitExitFullscreen?.();
    onClose();
    requestAnimationFrame(() => { if (!shellRef.current?.closest('[inert]')) coverRef.current?.focus({ preventScroll: true }); });
  };
  const toggleFullscreen = () => {
    const shell = shellRef.current, video = videoRef.current;
    if (!shell || !video || !activeRef.current) return;
    if (document.fullscreenElement === shell) { void document.exitFullscreen().catch(() => undefined); return; }
    if (video.webkitDisplayingFullscreen) { video.webkitExitFullscreen?.(); return; }
    fullscreenPending.current = true;
    const card = shell.closest<HTMLElement>('.photo-video-cover-card'), panel = shell.closest<HTMLElement>('.photo-panel');
    if (card && panel) {
      fullscreenLayout.current = { card, panel, height: card.style.minHeight, top: panel.scrollTop };
      card.style.minHeight = `${card.getBoundingClientRect().height}px`;
    }
    const fallback = () => {
      if (video.webkitEnterFullscreen) { try { video.webkitEnterFullscreen(); } catch { fullscreenPending.current = false; restoreInlineLayout(); } }
      else { fullscreenPending.current = false; restoreInlineLayout(); }
    };
    if (shell.requestFullscreen) void shell.requestFullscreen().catch(fallback); else fallback();
  };
  const progress = duration > 0 ? Math.min(100, currentTime / duration * 100) : 0;
  const status = !started ? 'Ready to play muted' : phase === 'error' ? 'Video could not be loaded'
    : phase === 'blocked' ? 'Press Play to try again' : phase === 'loading' ? 'Loading video' : paused ? 'Video paused' : 'Video playing';
  return <div ref={shellRef} className="photo-video-player-shell" role="group" aria-labelledby={titleId} data-started={started} data-fullscreen={fullscreen}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).matches('input, a')) return;
      if (event.key.toLowerCase() === 'm' && started) { event.preventDefault(); toggleMuted(); }
      else if (event.key.toLowerCase() === 'f' && started) { event.preventDefault(); toggleFullscreen(); }
      else if (event.key === ' ' && !(event.target as HTMLElement).matches('button')) { event.preventDefault(); togglePlayback(); }
    }}>
    <div ref={mediaRef} className="photo-video-media" style={{ aspectRatio: `${item.dimensions.width} / ${item.dimensions.height}` }}>
      <video ref={videoRef} className="photo-video-player" hidden={!started} width={item.dimensions.width} height={item.dimensions.height}
        muted={muted} playsInline preload="none" aria-label={item.title}
        onLoadedMetadata={event => {
          const video = event.currentTarget; setDuration(Number.isFinite(video.duration) ? video.duration : item.duration);
          if (restoreTime.current > 0) { video.currentTime = Math.min(restoreTime.current, video.duration); restoreTime.current = 0; }
        }}
        onTimeUpdate={event => {
          const video = event.currentTarget, saved = pausedPosition.current;
          // WebKit may rewind an evicted, paused decoder when it returns onscreen.
          if (saved !== null && video.paused) {
            setCurrentTime(saved);
            if (visible() && Math.abs(video.currentTime - saved) > .1) video.currentTime = saved;
          } else setCurrentTime(video.currentTime);
        }} onSeeking={event => setCurrentTime(pausedPosition.current ?? event.currentTarget.currentTime)}
        onPlay={() => { if (!mayPlay()) pause(); else { setPaused(false); setPhase('loading'); } }}
        onPlaying={() => { if (!mayPlay()) pause(); else { setPaused(false); setPhase('playing'); } }}
        onCanPlay={event => {
          const next = event.currentTarget.paused ? 'ready' : 'playing';
          if (activeRef.current) setPhase(value => value === 'error' || value === 'blocked' ? value : next);
        }}
        onProgress={() => { lastProgressAt.current = performance.now(); }}
        onPause={() => { setPaused(true); setPhase(value => value === 'error' || value === 'blocked' || value === 'idle' ? value : 'ready'); }}
        onEnded={() => { setPaused(true); setPhase('ready'); }}
        onWaiting={() => { if (activeRef.current && !videoRef.current?.paused) { lastProgressAt.current = performance.now(); setPhase('loading'); } }}
        onError={() => { if (activeRef.current) { setPaused(true); setPhase('error'); } }}
        onVolumeChange={event => { setVolume(event.currentTarget.volume); if (activeRef.current) onMutedChange(event.currentTarget.muted); }}>
        <source ref={sourceRef} type="video/mp4" onError={() => { if (activeRef.current) { pause(); setPhase('error'); } }} />
      </video>
      {!started && <button ref={coverRef} type="button" className="photo-video-cover-button" aria-label={`Play ${item.title} muted`} onClick={() => loadAndPlay()}>
        <span className="photo-video-cover"><img src={item.poster} alt="" width={item.dimensions.width} height={item.dimensions.height} loading="lazy" decoding="async" />
          <span className="photo-video-cover-play" aria-hidden="true"><Play fill="currentColor" /></span>
          <span className="photo-video-cover-duration" aria-hidden="true">{time(item.duration)}</span></span>
      </button>}
      {started && phase === 'loading' && <div className="photo-video-loading" aria-hidden="true"><span /></div>}
      {started && (phase === 'error' || phase === 'blocked') && <div className="photo-video-error" role="alert">
        <p>{phase === 'error' ? 'Couldn’t load this video.' : 'Playback did not start. Please try again.'}</p>
        <button type="button" onClick={togglePlayback}>{phase === 'error' ? 'Retry video' : 'Play video'}</button>
      </div>}
    </div>
    <div className="photo-video-transport" role="group" aria-label={`Playback controls for ${item.title}`}>
      <button ref={primaryControlRef} type="button" className="photo-video-control photo-video-toggle" onClick={togglePlayback} aria-label={phase === 'error' ? 'Retry video' : paused ? 'Play video' : 'Pause video'}>
        {phase === 'error' ? <RotateCcw aria-hidden="true" /> : paused ? <Play fill="currentColor" aria-hidden="true" /> : <Pause fill="currentColor" aria-hidden="true" />}
      </button>
      <div className="photo-video-timeline"><span aria-hidden="true">{time(currentTime)}</span>
        <input type="range" className="photo-video-seek" min={0} max={duration || 1} step="any" value={Math.min(currentTime, duration)} disabled={!started || phase === 'error'}
          aria-label="Video progress" aria-valuetext={`${time(currentTime)} of ${time(duration)}`}
          style={{ backgroundImage: `linear-gradient(to right, #f2f0eb ${progress}%, #ffffff42 ${progress}%)` }}
          onChange={event => { const video = videoRef.current; if (video && Number.isFinite(video.duration)) { const value = Number(event.currentTarget.value); if (pausedPosition.current !== null) pausedPosition.current = value; video.currentTime = value; setCurrentTime(value); } }} />
        <span aria-hidden="true">{time(duration)}</span></div>
      <div className="photo-video-actions">
        <button className="photo-video-control" type="button" disabled={!started} onClick={toggleMuted} aria-label={muted ? 'Turn sound on' : 'Mute video'} aria-keyshortcuts="M">
          {muted || volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
        {volumeSupported ? <input className="photo-video-volume" type="range" min={0} max={1} step={.05} value={muted ? 0 : volume} disabled={!started}
          aria-label="Volume" aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
          style={{ backgroundImage: `linear-gradient(to right, #f2f0eb ${(muted ? 0 : volume) * 100}%, #ffffff42 ${(muted ? 0 : volume) * 100}%)` }}
          onChange={event => changeVolume(Number(event.currentTarget.value))} /> : <small className="photo-video-system-volume-hint">System volume</small>}
        <button className="photo-video-control" type="button" disabled={!started} onClick={restart} aria-label="Restart video"><RotateCcw aria-hidden="true" /></button>
        <button ref={fullButtonRef} className="photo-video-control" type="button" disabled={!started} onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} aria-keyshortcuts="F"><Expand aria-hidden="true" /></button>
        <button className="photo-video-control photo-video-close" type="button" disabled={!started} onClick={close} aria-label="Close video"><X aria-hidden="true" /></button>
      </div>
    </div>
    <div className="photo-video-cover-copy"><h3 id={titleId}>{item.title}</h3>
      <div className="photo-video-credit"><span>Filmed by <strong>{item.filmmaker}</strong></span>{item.postedBy && <span>Posted by {item.postedBy}</span>}</div>
      <a className="photo-video-original" href={item.originalUrl} target="_blank" rel="noreferrer">View original on REDnote <ArrowUpRight size={15} aria-hidden="true" /></a>
    </div>
    <p className="photo-video-status" aria-live="polite" aria-atomic="true">{status}</p>
  </div>;
}
