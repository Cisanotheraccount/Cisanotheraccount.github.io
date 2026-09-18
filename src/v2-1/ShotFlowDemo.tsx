import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, Pause, Play, RotateCcw, X } from 'lucide-react';
import { shotFlowCaptureSize, shotFlowWalkthrough } from './shotflowWalkthrough';
import './shotflowDemo.css';

type MediaStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
type ImageStatus = 'loading' | 'ready' | 'error';

/** `active` becomes false as soon as the project closes or image zoom covers it. */
export default function ShotFlowDemo({ active }: { active: boolean }) {
  const id = useId();
  const stepId = id + '-step';
  const descriptionId = id + '-description';
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [imageStatus, setImageStatus] = useState<ImageStatus>('loading');
  const [imageRetry, setImageRetry] = useState(0);
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>('idle');
  const [recordingRequested, setRecordingRequested] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const primaryButton = useRef<HTMLButtonElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusRequest = useRef<'step' | 'start' | null>(null);
  const playRequest = useRef(0);
  const wantsPlayback = useRef(false);
  const isActive = useRef(active); isActive.current = active;
  const step = shotFlowWalkthrough[index];
  const finalStep = index === shotFlowWalkthrough.length - 1;

  const pauseRecording = useCallback(() => {
    playRequest.current += 1;
    wantsPlayback.current = false;
    video.current?.pause();
    setMediaStatus(status => status === 'playing' || status === 'loading' ? 'paused' : status);
  }, []);

  const focusStepHeading = useCallback(() => {
    const heading = stepHeading.current;
    if (matchMedia('(max-width: 760px)').matches) heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    if (!active) pauseRecording();
  }, [active, pauseRecording]);

  useLayoutEffect(() => {
    const element = video.current;
    return () => { playRequest.current += 1; wantsPlayback.current = false; element?.pause(); };
  }, [started, index]);

  useEffect(() => {
    if (!started) return;
    const pauseWhenHidden = () => { if (document.hidden) pauseRecording(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [started, pauseRecording]);

  useLayoutEffect(() => {
    const requested = focusRequest.current;
    focusRequest.current = null;
    if (!active) return;
    if (requested === 'step') focusStepHeading();
    if (requested === 'start') {
      startButton.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      startButton.current?.focus({ preventScroll: true });
    }
  }, [active, index, started, focusStepHeading]);

  function showStep(nextIndex: number) {
    if (!active) return;
    pauseRecording();
    setMediaStatus('idle');
    setRecordingRequested(false);
    if (!started || nextIndex !== index) {
      setImageStatus('loading');
      setImageRetry(0);
    }
    focusRequest.current = 'step';
    setIndex(nextIndex);
    setStarted(true);
    // Restarting on step one does not change the effect dependencies.
    if (started && nextIndex === index) {
      focusRequest.current = null;
      focusStepHeading();
      if (video.current) video.current.currentTime = 0;
    }
  }

  function exitWalkthrough() {
    pauseRecording();
    focusRequest.current = 'start';
    setStarted(false);
    setIndex(0);
    setRecordingRequested(false);
    setMediaStatus('idle');
  }

  function playRecording() {
    const element = video.current;
    if (!active || document.hidden || !element) return;
    if (element.ended) element.currentTime = 0;
    // The screenshot hotspot disappears during playback; keep its keyboard focus usable.
    if (document.activeElement?.classList.contains('gxc-shotflow-demo-hotspot')) {
      primaryButton.current?.focus({ preventScroll: true });
    }
    const request = ++playRequest.current;
    wantsPlayback.current = true;
    setRecordingRequested(true);
    setMediaStatus('loading');
    void element.play().catch(() => {
      if (request === playRequest.current && isActive.current && video.current === element) {
        wantsPlayback.current = false;
        setMediaStatus('error');
        setRecordingRequested(false);
      }
    });
  }

  const advance = () => finalStep ? exitWalkthrough() : showStep(index + 1);
  const isPlaying = mediaStatus === 'playing';
  const isLoading = mediaStatus === 'loading';
  const needsPlayback = !!step.recording && mediaStatus !== 'ended' && mediaStatus !== 'error';
  const action = needsPlayback
    ? isLoading ? 'Cancel playback' : isPlaying ? 'Pause recording' : mediaStatus === 'paused' ? 'Resume recording' : step.recording!.label
    : step.action;
  const runAction = needsPlayback ? isPlaying || isLoading ? pauseRecording : playRecording : advance;
  const hotspot = needsPlayback ? step.recording?.playHotspot : step.hotspot;
  const hotspotStyle: CSSProperties | undefined = hotspot ? {
    left: hotspot.x + '%', top: hotspot.y + '%', width: hotspot.width + '%', height: hotspot.height + '%',
  } : undefined;

  return <div className="gxc-shotflow-demo" role="group" aria-label="ShotFlow guided walkthrough" data-step={started ? step.id : 'intro'} data-started={started ? 'true' : 'false'}>
    <p className="gxc-shotflow-demo-label gxc-mono">Guided walkthrough · Development build · Demo media</p>
    <div className="gxc-shotflow-demo-layout">
      <div className="gxc-shotflow-demo-writing">
        <div className="gxc-shotflow-demo-position gxc-mono" aria-live="polite" aria-atomic="true">
          <span>{started ? String(index + 1).padStart(2, '0') : '00'} / {String(shotFlowWalkthrough.length).padStart(2, '0')}</span>
          <span>{started ? step.label : 'A guided path'}</span>
        </div>
        <div className="gxc-shotflow-demo-progress" aria-hidden="true"><span style={{ width: started ? ((index + 1) / shotFlowWalkthrough.length * 100) + '%' : '0%' }}/></div>
        <h4 id={stepId} ref={stepHeading} tabIndex={-1}>{started ? step.title : 'From reference to next shot.'}</h4>
        <p id={descriptionId} className="gxc-shotflow-demo-description">{started ? step.description : 'Explore nine captured steps. Follow the highlighted action or use the guide controls. Play each recording when you are ready.'}</p>
      </div>
      <div className="gxc-shotflow-demo-media">
        <div className="gxc-shotflow-demo-screen" style={{ aspectRatio: shotFlowCaptureSize.width + ' / ' + shotFlowCaptureSize.height }} aria-label={started ? 'Captured app screen' : 'Walkthrough preview'}>
          {started ? <>
            <img key={step.id + '-' + imageRetry} src={step.image + (imageRetry ? '?retry=' + imageRetry : '')} alt={step.alt} width={shotFlowCaptureSize.width} height={shotFlowCaptureSize.height} onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')}/>
            {step.recording && <video key={step.id} ref={video} src={step.recording.src} poster={step.image} preload="none" playsInline muted aria-label={step.recording.label} data-visible={recordingRequested && mediaStatus !== 'error' ? 'true' : undefined}
              onPlaying={event => {
                if (!wantsPlayback.current || !isActive.current || document.hidden) { event.currentTarget.pause(); return; }
                setMediaStatus('playing');
              }}
              onPause={event => { if (event.currentTarget === video.current) setMediaStatus(status => status === 'playing' || status === 'loading' ? 'paused' : status); }}
              onEnded={() => {
                if (!wantsPlayback.current || !isActive.current || document.hidden) return;
                wantsPlayback.current = false;
                setMediaStatus('ended'); setRecordingRequested(false);
                if (step.recording?.advanceWhenEnded) showStep(index + 1);
              }}
              onError={event => { if (event.currentTarget === video.current) { wantsPlayback.current = false; setMediaStatus('error'); setRecordingRequested(false); } }}/>
            }
            {imageStatus !== 'ready' && !recordingRequested && <div className="gxc-shotflow-demo-load-state" role="status">
              <p>{imageStatus === 'error' ? 'This captured screen could not load.' : 'Loading captured screen…'}</p>
              {imageStatus === 'error' && <button type="button" onClick={() => { setImageStatus('loading'); setImageRetry(retry => retry + 1); }}>Retry image</button>}
            </div>}
            {hotspot && imageStatus === 'ready' && !recordingRequested && <button type="button" className="gxc-shotflow-demo-hotspot" style={hotspotStyle} onClick={runAction} disabled={!active} aria-label={action} aria-describedby={descriptionId}><span aria-hidden="true">{needsPlayback ? <Play size={14}/> : <ArrowRight size={14}/>}</span></button>}
          </> : <div className="gxc-shotflow-demo-placeholder" aria-hidden="true"><span className="gxc-mono">ShotFlow</span><p>Reference.<br/>Review.<br/>Shoot.</p><span className="gxc-mono">Nine captured steps<ArrowRight size={16}/></span></div>}
        </div>
        <p className="gxc-shotflow-demo-caption">{started ? <><span>{finalStep ? <Check size={13} aria-hidden="true"/> : String(index + 1).padStart(2, '0')}</span>{step.label} · Native app capture</> : <>Screens and recordings load after you start.</>}</p>
      </div>
      <div className="gxc-shotflow-demo-actions">
        <div className="gxc-shotflow-demo-primary-row">
          {started ? <button ref={primaryButton} type="button" className="gxc-shotflow-demo-primary" onClick={runAction} disabled={!active}>
            {needsPlayback ? isLoading ? <X size={17} aria-hidden="true"/> : isPlaying ? <Pause size={17} aria-hidden="true"/> : <Play size={17} aria-hidden="true"/> : finalStep ? <Check size={17} aria-hidden="true"/> : <ArrowRight size={17} aria-hidden="true"/>}
            {action}
          </button> : <button ref={startButton} type="button" className="gxc-shotflow-demo-primary" onClick={() => showStep(0)} disabled={!active}><Play size={17} aria-hidden="true"/>Start walkthrough</button>}
        </div>
        <div className="gxc-shotflow-demo-helper" aria-live="polite">
          {started && step.recording
            ? <><p>{mediaStatus === 'error' ? 'Recording unavailable. You can continue through the captured screens.' : isLoading ? 'Loading recording. You can cancel or skip it.' : mediaStatus === 'ended' ? 'Recording complete.' : 'A recording of the development app. Playback is optional.'}</p><button type="button" className="gxc-shotflow-demo-text-action" onClick={mediaStatus === 'ended' ? playRecording : advance} disabled={!active}>{mediaStatus === 'ended' ? 'Replay recording' : 'Skip recording'}<ArrowRight size={14} aria-hidden="true"/></button></>
            : <p>{started ? finalStep ? 'Walkthrough complete. You can revisit any step.' : step.guidance ?? 'Follow the highlighted control, or continue with the button above.' : 'All actions stay inside this guided walkthrough.'}</p>}
        </div>
        <div className="gxc-shotflow-demo-navigation">
          {started && <>
            <button type="button" aria-label="Previous step" onClick={() => showStep(index - 1)} disabled={!active || index === 0}><ArrowLeft size={15} aria-hidden="true"/>Previous</button>
            <button type="button" aria-label="Restart walkthrough" onClick={() => showStep(0)} disabled={!active}><RotateCcw size={15} aria-hidden="true"/>Restart</button>
            <button type="button" aria-label="Exit walkthrough" onClick={exitWalkthrough}><X size={15} aria-hidden="true"/>Exit</button>
          </>}
        </div>
      </div>
    </div>
  </div>;
}
