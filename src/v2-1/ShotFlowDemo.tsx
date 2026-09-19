import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { shotFlowCapture, shotFlowCaptureSize, shotFlowRepresentative, shotFlowWalkthrough, type ShotFlowRect } from './shotflowWalkthrough';
import './shotflowDemo.css';

type MediaStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
const rectStyle = ([left, top, width, height]: ShotFlowRect): CSSProperties => ({ left: left + '%', top: top + '%', width: width + '%', height: height + '%' });
const fullFrame: ShotFlowRect = [0, 0, 100, 100];

/** The static preview keeps the existing transition/zoom target outside the interactive screen. */
export default function ShotFlowDemo({ active, preview }: { active: boolean; preview: ReactNode }) {
  const id = useId();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageRetry, setImageRetry] = useState(0);
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>('idle');
  const [recordingRequested, setRecordingRequested] = useState(false);
  const [muted, setMuted] = useState(true);
  const video = useRef<HTMLVideoElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listPosition = useRef(0);
  const startButton = useRef<HTMLButtonElement>(null);
  const primaryButton = useRef<HTMLButtonElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusRequest = useRef<'step' | 'start' | null>(null);
  const autoStartAnalysis = useRef(false);
  const playRequest = useRef(0);
  const wantsPlayback = useRef(false);
  const isActive = useRef(active); isActive.current = active;
  const step = shotFlowWalkthrough[index];
  const capture = shotFlowCapture.states[step.id];
  const isAnalysis = step.kind === 'analysis';
  const isPlayer = step.kind === 'player';
  const isStoryboard = step.kind === 'storyboard';
  const hasVideo = isAnalysis || isPlayer;
  const mediaSource = isAnalysis ? shotFlowCapture.analysis.recording : shotFlowCapture.representative.media;

  const pauseRecording = useCallback(() => {
    playRequest.current += 1;
    wantsPlayback.current = false;
    autoStartAnalysis.current = false;
    video.current?.pause();
    setMediaStatus(status => status === 'playing' || status === 'loading' ? 'paused' : status);
  }, []);

  const focusStepHeading = useCallback(() => {
    const heading = stepHeading.current;
    if (matchMedia('(max-width: 760px)').matches) heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => { if (!active) pauseRecording(); }, [active, pauseRecording]);
  useLayoutEffect(() => {
    const element = video.current;
    return () => { playRequest.current += 1; wantsPlayback.current = false; element?.pause(); };
  }, [started, index]);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) pauseRecording(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [pauseRecording]);
  useLayoutEffect(() => {
    const request = focusRequest.current; focusRequest.current = null;
    if (!active) return;
    if (request === 'step') focusStepHeading();
    if (request === 'start') {
      startButton.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      startButton.current?.focus({ preventScroll: true });
    }
  }, [active, index, started, focusStepHeading]);
  useLayoutEffect(() => {
    const element = list.current;
    if (!isStoryboard || !element) return;
    const restore = () => { element.scrollTop = listPosition.current * element.clientWidth / shotFlowCapture.storyboard.scrollContent.width; };
    restore(); const observer = new ResizeObserver(restore); observer.observe(element);
    return () => observer.disconnect();
  }, [started, isStoryboard]);

  function showStep(nextIndex: number, startAnalysis = false) {
    if (!isActive.current) return;
    pauseRecording();
    setRecordingRequested(false); setMediaStatus('idle');
    if (!started || nextIndex !== index) {
      setImageStatus('loading'); setImageRetry(0); setListStatus('loading');
    }
    autoStartAnalysis.current = startAnalysis;
    focusRequest.current = 'step';
    setStarted(true); setIndex(nextIndex);
    if (started && nextIndex === index) {
      focusRequest.current = null; focusStepHeading();
      if (video.current) video.current.currentTime = 0;
    }
  }
  function restart() { listPosition.current = 0; setMuted(true); showStep(0); }
  function exitWalkthrough() {
    pauseRecording(); focusRequest.current = 'start';
    setStarted(false); setIndex(0); setRecordingRequested(false); setMediaStatus('idle');
    setMuted(true); listPosition.current = 0;
  }
  function playRecording() {
    const element = video.current;
    if (!isActive.current || document.hidden || !element) return;
    if (mediaStatus === 'error') element.load();
    if (element.ended) element.currentTime = 0;
    if (document.activeElement?.classList.contains('gxc-shotflow-demo-hotspot')) primaryButton.current?.focus({ preventScroll: true });
    const request = ++playRequest.current;
    wantsPlayback.current = true; setRecordingRequested(true); setMediaStatus('loading');
    void element.play().then(() => {
      if (!wantsPlayback.current || !isActive.current || document.hidden || video.current !== element) element.pause();
    }).catch(() => {
      if (request === playRequest.current && isActive.current && video.current === element) {
        wantsPlayback.current = false; setMediaStatus('error'); setRecordingRequested(false);
      }
    });
  }
  useEffect(() => {
    // Only the visitor's Add action starts analysis; returning to this step never resumes it.
    if (started && isAnalysis && autoStartAnalysis.current) { autoStartAnalysis.current = false; playRecording(); }
  }, [started, index]);

  const advance = () => showStep(index + 1, shotFlowWalkthrough[index + 1]?.kind === 'analysis');
  const isPlaying = mediaStatus === 'playing';
  const isLoading = mediaStatus === 'loading';
  const action = hasVideo
    ? isLoading ? 'Cancel playback' : isPlaying ? isAnalysis ? 'Pause analysis demo' : 'Pause reference shot'
      : mediaStatus === 'paused' ? isAnalysis ? 'Resume analysis demo' : 'Resume reference shot'
      : mediaStatus === 'ended' ? 'Replay reference shot' : mediaStatus === 'error' ? 'Retry playback'
      : isAnalysis ? 'Play analysis demo' : 'Play reference shot'
    : step.action;
  const runAction = hasVideo ? isPlaying || isLoading ? pauseRecording : playRecording : advance;
  const hotspot = capture.hotspots?.[0]?.rectPercent;
  const content = shotFlowCapture.storyboard.scrollContent;
  const row = shotFlowRepresentative;
  const selectedRect: ShotFlowRect = row ? [row.rectInContent[0] / content.width * 100, row.rectInContent[1] / content.height * 100, row.rectInContent[2] / content.width * 100, row.rectInContent[3] / content.height * 100] : fullFrame;

  return <div className="gxc-shotflow-demo" role="group" aria-label="ShotFlow guided walkthrough" data-step={started ? step.id : 'intro'} data-started={started ? 'true' : 'false'}>
    <p className="gxc-shotflow-demo-label gxc-mono">Guided walkthrough · Development build · Demo media</p>
    <div className="gxc-shotflow-demo-layout">
      <div className="gxc-shotflow-demo-writing">
        <div className="gxc-shotflow-demo-position gxc-mono" aria-live="polite" aria-atomic="true"><span>{started ? String(index + 1).padStart(2, '0') : '00'} / {shotFlowWalkthrough.length}</span><span>{started ? step.label : 'Try the workflow'}</span></div>
        <div className="gxc-shotflow-demo-progress" aria-hidden="true"><span style={{ width: started ? (index + 1) / shotFlowWalkthrough.length * 100 + '%' : '0%' }}/></div>
        <h4 id={id + '-step'} ref={stepHeading} tabIndex={-1}>{started ? step.title : 'One video. A whole shot list.'}</h4>
        <p id={id + '-description'} className="gxc-shotflow-demo-description">{started ? step.description : 'Create a project, add the prepared video from Photos and explore the shots it becomes. Follow the highlighted controls or the buttons below.'}</p>
      </div>
      <div className="gxc-shotflow-demo-media">
        <div className="gxc-shotflow-demo-preview" aria-hidden={started || undefined}>{preview}</div>
        {started && <div className="gxc-shotflow-demo-live">
          <div className="gxc-shotflow-demo-screen" style={{ aspectRatio: `${shotFlowCaptureSize.width} / ${shotFlowCaptureSize.height}` }} aria-label="Captured app screen">
            <img key={step.id + '-' + imageRetry} src={capture.image + (imageRetry ? '?retry=' + imageRetry : '')} alt={`ShotFlow native ${step.label.toLowerCase()} screen.`} width={shotFlowCaptureSize.width} height={shotFlowCaptureSize.height} onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')}/>
            {isStoryboard && <div ref={list} className="gxc-shotflow-demo-list" data-native-scroll style={rectStyle(shotFlowCapture.storyboard.viewportRectPercent)} tabIndex={0} role="region" aria-label="Generated shots, scroll to explore" onScroll={event => { const element = event.currentTarget; listPosition.current = element.scrollTop * content.width / element.clientWidth; }}>
              <div className="gxc-shotflow-demo-list-content" style={{ aspectRatio: `${content.width} / ${content.height}` }}>
                <img key={imageRetry} src={content.image + (imageRetry ? '?retry=' + imageRetry : '')} onLoad={() => setListStatus('ready')} onError={() => setListStatus('error')} width={content.width} height={content.height} alt={`All ${shotFlowCapture.storyboard.rows.length} shots generated from the complete reference video.`}/>
                {row && listStatus === 'ready' && <button type="button" className="gxc-shotflow-demo-hotspot" style={rectStyle(selectedRect)} onClick={advance} disabled={!active} aria-label={`Open shot ${row.order}`}><span aria-hidden="true"><Play size={14}/></span></button>}
              </div>
              <div aria-hidden="true" style={{ width: '100%', aspectRatio: `${shotFlowCapture.storyboard.trailingSpace.width} / ${shotFlowCapture.storyboard.trailingSpace.height}`, background: shotFlowCapture.storyboard.trailingSpace.color }}/>
              <ol className="gxc-shotflow-sr-only">{shotFlowCapture.storyboard.rows.map(shot => <li key={shot.shotId}>Shot {shot.order}, {shot.start.toFixed(2)} to {shot.end.toFixed(2)} seconds.</li>)}</ol>
            </div>}
            {isStoryboard && listStatus !== 'ready' && <div className="gxc-shotflow-demo-load-state" style={rectStyle(shotFlowCapture.storyboard.viewportRectPercent)} role="status"><p>{listStatus === 'error' ? 'The storyboard could not load.' : 'Loading the generated storyboard…'}</p>{listStatus === 'error' && <button type="button" onClick={() => { setListStatus('loading'); setImageRetry(value => value + 1); }}>Retry storyboard</button>}</div>}
            {hasVideo && <video key={step.id} ref={video} src={mediaSource} poster={isAnalysis ? capture.image : shotFlowCapture.representative.poster} preload="none" playsInline muted={isAnalysis || muted} style={rectStyle(isAnalysis ? fullFrame : shotFlowCapture.representative.playerVideoRectPercent)} aria-label={isAnalysis ? 'Recorded analysis, condensed demo timing' : 'Representative reference shot'} data-visible={recordingRequested && mediaStatus !== 'error' ? 'true' : undefined}
              onPlaying={event => { if (!wantsPlayback.current || !isActive.current || document.hidden || event.currentTarget !== video.current) { event.currentTarget.pause(); return; } setMediaStatus('playing'); }}
              onPause={event => { if (event.currentTarget === video.current) setMediaStatus(status => status === 'playing' || status === 'loading' ? 'paused' : status); }}
              onEnded={event => {
                if (!wantsPlayback.current || !isActive.current || document.hidden || event.currentTarget !== video.current) return;
                wantsPlayback.current = false; setMediaStatus('ended');
                if (isAnalysis) showStep(index + 1);
              }}
              onError={event => { if (event.currentTarget === video.current) { wantsPlayback.current = false; setMediaStatus('error'); setRecordingRequested(false); } }}/>
            }
            {imageStatus !== 'ready' && !recordingRequested && <div className="gxc-shotflow-demo-load-state" role="status"><p>{imageStatus === 'error' ? 'This captured screen could not load.' : 'Loading captured screen…'}</p>{imageStatus === 'error' && <button type="button" onClick={() => { setImageStatus('loading'); setImageRetry(retry => retry + 1); }}>Retry image</button>}</div>}
            {!isStoryboard && hotspot && imageStatus === 'ready' && !recordingRequested && <button type="button" className="gxc-shotflow-demo-hotspot" style={rectStyle(hotspot)} onClick={isAnalysis ? advance : runAction} disabled={!active} aria-label={isAnalysis ? 'View the prepared project' : action} aria-describedby={id + '-description'}><span aria-hidden="true">{isPlayer ? <Play size={14}/> : <ArrowRight size={14}/>}</span></button>}
          </div>
          <p className="gxc-shotflow-demo-caption">{isAnalysis ? 'Recorded analysis · Demo timing' : `${step.label} · Native app capture`}</p>
        </div>}
      </div>
      <div className="gxc-shotflow-demo-actions">
        {started ? <button ref={primaryButton} type="button" className="gxc-shotflow-demo-primary" onClick={runAction} disabled={!active}>{hasVideo ? isLoading ? <X size={17}/> : isPlaying ? <Pause size={17}/> : <Play size={17}/> : <ArrowRight size={17}/>}<span>{action}</span></button> : <button ref={startButton} type="button" className="gxc-shotflow-demo-primary" onClick={restart} disabled={!active}><Play size={17}/>Start walkthrough</button>}
        <div className="gxc-shotflow-demo-helper" aria-live="polite">
          {started && hasVideo ? <>
            <p>{mediaStatus === 'error' ? 'Playback could not start. Retry, or continue through the captured results.' : isLoading ? 'Loading playback…' : isAnalysis ? 'Recorded beforehand. The waiting time is condensed to about three seconds.' : 'The reference starts muted. Turn on sound if you would like to hear the original audio.'}</p>
            <div className="gxc-shotflow-demo-secondary-actions">
              {isPlayer && <button type="button" className="gxc-shotflow-demo-text-action" aria-pressed={!muted} onClick={() => setMuted(value => !value)} disabled={!active}>{muted ? <VolumeX size={16}/> : <Volume2 size={16}/>} {muted ? 'Turn sound on' : 'Mute sound'}</button>}
              <button type="button" className="gxc-shotflow-demo-text-action" onClick={isAnalysis ? advance : () => showStep(index - 1)} disabled={!active}>{isAnalysis ? 'Skip to prepared results' : 'Back to storyboard'}<ArrowRight size={14}/></button>
            </div>
          </> : <p>{started ? isStoryboard ? 'Scroll inside the phone to browse. Only the highlighted shot is playable in this walkthrough.' : 'Tap the highlighted control, or use the button above.' : 'A fixed example using real app captures and analysis results. No upload is needed.'}</p>}
        </div>
        <div className="gxc-shotflow-demo-navigation">{started && <>
          <button type="button" aria-label="Previous step" onClick={() => showStep(index - 1)} disabled={!active || index === 0}><ArrowLeft size={15}/>Previous</button>
          <button type="button" aria-label="Restart walkthrough" onClick={restart} disabled={!active}><RotateCcw size={15}/>Restart</button>
          <button type="button" aria-label="Exit walkthrough" onClick={exitWalkthrough}><X size={15}/>Exit</button>
        </>}</div>
      </div>
    </div>
  </div>;
}
