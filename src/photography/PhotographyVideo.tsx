import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Expand, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import type { PhotographyVideoItem } from './videoCatalog';
import './video.css';

type PlaybackPhase = 'loading' | 'ready' | 'playing' | 'error';
type WebKitFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

const LOAD_TIMEOUT_MS = 15_000;

function playbackTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function unloadVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
  video.load();
}

export function PhotographyVideo({ item, returnFocus, onClose }: {
  item: PhotographyVideoItem;
  returnFocus: HTMLButtonElement;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);
  const primaryControlRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef(returnFocus);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<PlaybackPhase>('loading');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.duration);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    document.documentElement.dataset.photoVideoOpen = 'true';
    dialog.showModal();
    primaryControlRef.current?.focus({ preventScroll: true });
    return () => {
      unloadVideo(videoRef.current);
      if (dialog.open) dialog.close();
      delete document.documentElement.dataset.photoVideoOpen;
      const target = openerRef.current;
      if (target.isConnected && !target.closest('[inert]')) target.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const source = sourceRef.current;
    if (!video || !source) return;
    setCurrentTime(0);
    setDuration(item.duration);
    setPaused(true);
    setPhase('loading');
    primaryControlRef.current?.focus({ preventScroll: true });
    video.volume = volume;
    video.muted = muted;
    // StrictMode replays layout effects without rebuilding this DOM node. The
    // preceding cleanup intentionally clears the URL, so restore it explicitly.
    source.setAttribute('src', item.source);
    source.setAttribute('type', 'video/mp4');
    video.load();
    void video.play().catch(error => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (videoRef.current === video) setPhase('ready');
    });
    return () => unloadVideo(video);
  }, [attempt, item.duration, item.id]);

  useEffect(() => {
    if (phase !== 'loading') return;
    const timeout = window.setTimeout(() => {
      videoRef.current?.pause();
      setPaused(true);
      setPhase('error');
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [attempt, phase]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') videoRef.current?.pause();
    };
    const onPageHide = () => videoRef.current?.pause();
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (phase === 'error') {
      setAttempt(value => value + 1);
      return;
    }
    if (video.paused) void video.play().catch(() => setPhase('ready'));
    else video.pause();
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Math.min(video.duration, Math.max(0, seconds));
    setCurrentTime(video.currentTime);
  };

  const updateVolume = (nextVolume: number) => {
    const value = Math.min(1, Math.max(0, nextVolume));
    const video = videoRef.current;
    setVolume(value);
    setMuted(value === 0);
    if (video) {
      video.volume = value;
      video.muted = value === 0;
    }
  };

  const toggleMuted = () => {
    const video = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (video) video.muted = nextMuted;
  };

  const restartOrRetry = () => {
    if (phase === 'error') {
      setAttempt(value => value + 1);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    void video.play().catch(() => setPhase('ready'));
  };

  const toggleFullscreen = () => {
    const shell = shellRef.current;
    const video = videoRef.current as WebKitFullscreenVideo | null;
    if (!shell || !video) return;
    if (document.fullscreenElement === shell) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (shell.requestFullscreen) {
      void shell.requestFullscreen().catch(() => video.webkitEnterFullscreen?.());
    } else {
      video.webkitEnterFullscreen?.();
    }
  };

  const progress = duration > 0 ? Math.min(100, currentTime / duration * 100) : 0;
  const status = phase === 'loading'
    ? 'Loading video…'
    : phase === 'error'
      ? 'The video could not be loaded.'
      : phase === 'playing'
        ? 'Video playing'
        : 'Video paused';

  return <dialog
    ref={dialogRef}
    className="photo-video-dialog"
    aria-labelledby="photo-video-title"
    aria-describedby="photo-video-credit photo-video-status"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'))
          .filter(control => control.getClientRects().length > 0);
        if (controls.length) {
          event.preventDefault();
          const current = controls.indexOf(document.activeElement as HTMLElement);
          const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0)
            : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
          controls[next].focus();
        }
        return;
      }
      const target = event.target as HTMLElement;
      if (target.matches('input')) return;
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleMuted();
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key === ' ' && !target.matches('button, a')) {
        event.preventDefault();
        togglePlayback();
      }
    }}
  >
    <div ref={shellRef} className="photo-video-player-shell">
      <header className="photo-video-dialog-header">
        <div>
          <p>{item.category === 'real-estate' ? 'Real Estate' : 'Interviews'}</p>
          <h2 id="photo-video-title">{item.title}</h2>
        </div>
        <button className="photo-video-close" type="button" onClick={onClose} aria-label="Close video">
          <span>Close</span><X aria-hidden="true" />
        </button>
      </header>

      <div className="photo-video-media" style={{ aspectRatio: `${item.dimensions.width} / ${item.dimensions.height}` }}>
        <video
          key={attempt}
          ref={videoRef}
          className="photo-video-player"
          poster={item.poster}
          width={item.dimensions.width}
          height={item.dimensions.height}
          playsInline
          preload="none"
          aria-label={item.title}
          onLoadedMetadata={event => {
            const value = event.currentTarget.duration;
            setDuration(Number.isFinite(value) && value > 0 ? value : item.duration);
          }}
          onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
          onSeeking={event => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => { setPaused(false); setPhase('playing'); }}
          onPlaying={() => { setPaused(false); setPhase('playing'); }}
          onCanPlay={event => setPhase(event.currentTarget.paused ? 'ready' : 'playing')}
          onPause={() => { setPaused(true); setPhase(current => current === 'error' ? current : 'ready'); }}
          onEnded={() => { setPaused(true); setPhase('ready'); }}
          onWaiting={() => setPhase(current => current === 'error' ? current : 'loading')}
          onError={() => { setPaused(true); setPhase('error'); }}
        >
          <source ref={sourceRef} src={item.source} type="video/mp4" />
        </video>
        {phase === 'loading' && <div className="photo-video-loading" aria-hidden="true"><span /></div>}
        {phase === 'error' && <div className="photo-video-error" role="alert">
          <p>Couldn’t load this video.</p>
          <button type="button" onClick={restartOrRetry}><RotateCcw size={17} aria-hidden="true" /> Retry</button>
          <a href={item.originalUrl} target="_blank" rel="noreferrer">View original on REDnote <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>}
      </div>

      <div className="photo-video-transport" role="group" aria-label="Video playback controls">
        <button ref={primaryControlRef} className="photo-video-control photo-video-toggle" type="button" onClick={togglePlayback} aria-label={phase === 'error' ? 'Retry video' : paused ? 'Play video' : 'Pause video'}>
          {phase === 'error' ? <RotateCcw aria-hidden="true" /> : paused ? <Play fill="currentColor" aria-hidden="true" /> : <Pause fill="currentColor" aria-hidden="true" />}
        </button>
        <div className="photo-video-timeline">
          <span aria-hidden="true">{playbackTime(currentTime)}</span>
          <input
            className="photo-video-seek"
            type="range"
            min={0}
            max={duration || 1}
            step="any"
            value={Math.min(currentTime, duration)}
            disabled={duration <= 0 || phase === 'error'}
            aria-label="Video progress"
            aria-valuetext={`${playbackTime(currentTime)} of ${playbackTime(duration)}`}
            style={{ backgroundImage: `linear-gradient(to right, #f2f0eb ${progress}%, #ffffff42 ${progress}%)` }}
            onChange={event => seek(Number(event.currentTarget.value))}
          />
          <span aria-hidden="true">{playbackTime(duration)}</span>
        </div>
        <div className="photo-video-actions">
          <button className="photo-video-control" type="button" onClick={toggleMuted} aria-label={muted ? 'Turn sound on' : 'Mute video'} aria-keyshortcuts="M">
            {muted || volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <input
            className="photo-video-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label="Volume"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
            style={{ backgroundImage: `linear-gradient(to right, #f2f0eb ${(muted ? 0 : volume) * 100}%, #ffffff42 ${(muted ? 0 : volume) * 100}%)` }}
            onChange={event => updateVolume(Number(event.currentTarget.value))}
          />
          <button className="photo-video-control" type="button" onClick={restartOrRetry} aria-label={phase === 'error' ? 'Retry video' : 'Restart video'}>
            <RotateCcw aria-hidden="true" />
          </button>
          <button className="photo-video-control" type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} aria-keyshortcuts="F">
            <Expand aria-hidden="true" />
          </button>
        </div>
      </div>

      <footer className="photo-video-dialog-meta" id="photo-video-credit">
        <span>{item.postedBy ? `Posted by ${item.postedBy} on REDnote` : 'Original post on REDnote'}</span>
        <span>Filmed by <strong>{item.filmmaker}</strong></span>
        <a href={item.originalUrl} target="_blank" rel="noreferrer">View original on REDnote <ArrowUpRight size={15} aria-hidden="true" /></a>
      </footer>
      <p className="photo-video-status" id="photo-video-status" aria-live="polite" aria-atomic="true">{status}</p>
    </div>
  </dialog>;
}
