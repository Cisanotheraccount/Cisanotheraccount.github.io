import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Circle, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { nextUnfinishedDemoShot, shotFlowCapture, shotFlowCaptureSize, shotFlowDemoCount, shotFlowDemoShots, shotFlowThreeCapture, shotFlowWalkthrough, type ShotFlowRect } from './shotflowWalkthrough';
import './shotflowDemo.css';

type MediaStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
const rectStyle = ([left, top, width, height]: ShotFlowRect): CSSProperties => ({ left: left + '%', top: top + '%', width: width + '%', height: height + '%' });
const fullFrame: ShotFlowRect = [0, 0, 100, 100];
const timeLabel = (seconds: number) => { const tenths = Math.round(seconds * 10); return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`; };
const playerStep = shotFlowWalkthrough.findIndex(step => step.kind === 'player');
const storyboardStep = shotFlowWalkthrough.findIndex(step => step.kind === 'storyboard');
const content = shotFlowCapture.storyboard.scrollContent;
const contentRect = ([x, y, width, height]: ShotFlowRect): ShotFlowRect => [x / content.width * 100, y / content.height * 100, width / content.width * 100, height / content.height * 100];

/** Native captures provide the screen; the local controls operate only this guided example. */
export default function ShotFlowDemo({ active, preview }: { active: boolean; preview: ReactNode }) {
  const id = useId();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [clipIndex, setClipIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(shotFlowDemoShots[0].shotId);
  const [completed, setCompleted] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageRetry, setImageRetry] = useState(0);
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>('idle');
  const [recordingRequested, setRecordingRequested] = useState(false);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listPosition = useRef(0);
  const startButton = useRef<HTMLButtonElement>(null);
  const primaryButton = useRef<HTMLButtonElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusRequest = useRef<'step' | 'start' | null>(null);
  const autoStart = useRef<string | null>(null);
  const playRequest = useRef(0);
  const wantsPlayback = useRef(false);
  const isActive = useRef(active); isActive.current = active;
  const step = shotFlowWalkthrough[index];
  const isAnalysis = step.kind === 'analysis';
  const isPlayer = step.kind === 'player';
  const isStoryboard = step.kind === 'storyboard';
  const clip = shotFlowDemoShots[clipIndex];
  const selected = shotFlowDemoShots.find(shot => shot.shotId === selectedId)!;
  const capture = shotFlowCapture.states[step.id];
  const screenImage = isPlayer ? clip.playerImage : capture.image;
  const mediaKey = isPlayer ? clip.shotId : step.id;
  const hasVideo = isAnalysis || isPlayer;
  const mediaSource = isAnalysis ? shotFlowCapture.analysis.recording : clip.media;
  const ui = shotFlowThreeCapture.ui;

  const pauseRecording = useCallback(() => {
    playRequest.current += 1; wantsPlayback.current = false; autoStart.current = null;
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
  }, [started, mediaKey]);
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
    const restore = () => { element.scrollTop = listPosition.current * element.clientWidth / content.width; };
    restore(); const observer = new ResizeObserver(restore); observer.observe(element);
    return () => observer.disconnect();
  }, [started, isStoryboard]);

  function showStep(nextIndex: number, startAnalysis = false) {
    if (!isActive.current || nextIndex < 0 || nextIndex >= shotFlowWalkthrough.length) return;
    pauseRecording(); setRecordingRequested(false); setMediaStatus('idle'); setElapsed(0);
    if (!started || nextIndex !== index) { setImageStatus('loading'); setImageRetry(0); setListStatus('loading'); }
    autoStart.current = startAnalysis ? 'analysis' : null;
    focusRequest.current = 'step'; setStarted(true); setIndex(nextIndex);
    if (started && nextIndex === index) {
      focusRequest.current = null; focusStepHeading();
      if (video.current) video.current.currentTime = 0;
    }
  }
  function clearSession() {
    listPosition.current = 0; setMuted(true); setClipIndex(0);
    setCompleted([]); setSelectedId(shotFlowDemoShots[0].shotId); setNotice('');
  }
  function restart() { clearSession(); showStep(0); }
  function exitWalkthrough() {
    pauseRecording(); focusRequest.current = 'start'; clearSession();
    setStarted(false); setIndex(0); setRecordingRequested(false); setMediaStatus('idle');
  }
  function openShot(shotId: string) {
    const next = shotFlowDemoShots.findIndex(shot => shot.shotId === shotId);
    if (!isActive.current || next < 0) return;
    setClipIndex(next); setSelectedId(shotId); showStep(playerStep);
  }
  function switchClip(next: number) {
    if (!isActive.current || document.hidden || next < 0 || next >= shotFlowDemoCount) return;
    pauseRecording(); setRecordingRequested(false); setMediaStatus('idle'); setElapsed(0);
    setImageStatus('loading'); setImageRetry(0);
    autoStart.current = shotFlowDemoShots[next].shotId;
    setClipIndex(next); setSelectedId(shotFlowDemoShots[next].shotId);
    // The destination button may be disabled at an endpoint; keep keyboard focus usable.
    primaryButton.current?.focus({ preventScroll: true });
  }
  function toggleComplete(shotId: string) {
    if (!isActive.current || !isStoryboard) return;
    const wasComplete = completed.includes(shotId);
    const next = wasComplete ? completed.filter(value => value !== shotId) : [...completed, shotId];
    setCompleted(next);
    const shot = shotFlowDemoShots.find(value => value.shotId === shotId)!;
    if (wasComplete) { setNotice(`Shot ${shot.order} marked unfinished.`); return; }
    const nextId = nextUnfinishedDemoShot(next, shotId);
    if (nextId) {
      setSelectedId(nextId);
      setNotice(`Shot ${shot.order} marked complete. Shot ${shotFlowDemoShots.find(value => value.shotId === nextId)!.order} is next.`);
    } else setNotice('3 demo shots completed. The full project still contains 32 shots.');
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
  useLayoutEffect(() => {
    // Commit playback with the explicit click, retaining WebKit's user activation.
    if (started && autoStart.current === mediaKey) { autoStart.current = null; playRecording(); }
  }, [started, mediaKey]);

  const advance = () => showStep(index + 1, shotFlowWalkthrough[index + 1]?.kind === 'analysis');
  const isPlaying = mediaStatus === 'playing';
  const isLoading = mediaStatus === 'loading';
  const action = hasVideo
    ? isLoading ? 'Cancel playback' : isPlaying ? isAnalysis ? 'Pause analysis demo' : 'Pause reference shot'
      : mediaStatus === 'paused' ? isAnalysis ? 'Resume analysis demo' : 'Resume reference shot'
      : mediaStatus === 'ended' ? 'Replay reference shot' : mediaStatus === 'error' ? 'Retry playback'
      : isAnalysis ? 'Play analysis demo' : 'Play reference shot'
    : isStoryboard ? `Open shot ${selected.order}` : step.action;
  const runAction = hasVideo ? isPlaying || isLoading ? pauseRecording : playRecording : isStoryboard ? () => openShot(selectedId) : advance;
  const hotspot = capture.hotspots?.[0]?.rectPercent;
  const backToList = () => showStep(storyboardStep);

  return <div className="gxc-shotflow-demo" role="group" aria-label="ShotFlow guided walkthrough" data-step={started ? step.id : 'intro'} data-started={started ? 'true' : 'false'} data-shot={isPlayer ? clip.order : undefined}>
    <p className="gxc-shotflow-demo-label gxc-mono">Guided walkthrough · Development build · Demo media</p>
    <div className="gxc-shotflow-demo-layout">
      <div className="gxc-shotflow-demo-writing">
        <div className="gxc-shotflow-demo-position gxc-mono" aria-live="polite" aria-atomic="true"><span>{started ? String(index + 1).padStart(2, '0') : '00'} / {shotFlowWalkthrough.length}</span><span>{started ? isPlayer ? `Shot ${clip.order} · ${clipIndex + 1} of 3 demo shots` : step.label : 'Try the workflow'}</span></div>
        <div className="gxc-shotflow-demo-progress" aria-hidden="true"><span style={{ width: started ? (index + 1) / shotFlowWalkthrough.length * 100 + '%' : '0%' }}/></div>
        <h4 id={id + '-step'} ref={stepHeading} tabIndex={-1}>{started ? step.title : 'One video. A whole shot list.'}</h4>
        <p id={id + '-description'} className="gxc-shotflow-demo-description">{started ? step.description : 'Create a project, add the prepared video and explore the shots it becomes. Try playing and checking off three real shots in this guided example.'}</p>
      </div>
      <div className="gxc-shotflow-demo-media">
        <div className="gxc-shotflow-phone" aria-label="Phone-framed app demonstration">
          <div className="gxc-shotflow-phone-keys" aria-hidden="true"><i/><i/><i/><i/></div>
          <div className="gxc-shotflow-phone-display">
            <div className="gxc-shotflow-demo-preview" aria-hidden={started || undefined}>{preview}</div>
            {started && <div className="gxc-shotflow-demo-live">
              <div className="gxc-shotflow-demo-screen" style={{ aspectRatio: `${shotFlowCaptureSize.width} / ${shotFlowCaptureSize.height}` }} aria-label="Captured app screen">
                <img key={mediaKey + '-' + imageRetry} src={screenImage + (imageRetry ? '?retry=' + imageRetry : '')} alt={`ShotFlow native ${isPlayer ? `shot ${clip.order} player` : step.label.toLowerCase()} screen.`} width={shotFlowCaptureSize.width} height={shotFlowCaptureSize.height} onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')}/>
                {isStoryboard && <div ref={list} className="gxc-shotflow-demo-list" data-native-scroll style={rectStyle(shotFlowCapture.storyboard.viewportRectPercent)} tabIndex={0} role="region" aria-label="Generated shots, scroll to explore" onScroll={event => { const element = event.currentTarget; listPosition.current = element.scrollTop * content.width / element.clientWidth; }}>
                  <div className="gxc-shotflow-demo-list-content" style={{ aspectRatio: `${content.width} / ${content.height}` }}>
                    <img key={imageRetry} src={content.image + (imageRetry ? '?retry=' + imageRetry : '')} onLoad={() => setListStatus('ready')} onError={() => setListStatus('error')} width={content.width} height={content.height} alt="All 32 shots generated from the complete reference video."/>
                    {listStatus === 'ready' && shotFlowDemoShots.map(shot => {
                      const row = shotFlowCapture.storyboard.rows.find(value => value.shotId === shot.shotId)!;
                      const done = completed.includes(shot.shotId);
                      const playRect: ShotFlowRect = [row.rectInContent[0], row.rectInContent[1], row.rectInContent[2], Math.min(row.rectInContent[3], shot.checkbox.rectInContent[1] - row.rectInContent[1] - 8)];
                      return <div key={shot.shotId} className="gxc-shotflow-demo-row-controls">
                        <button type="button" className="gxc-shotflow-demo-hotspot gxc-shotflow-demo-shot-target" data-selected={selectedId === shot.shotId} style={rectStyle(contentRect(playRect))} onClick={() => openShot(shot.shotId)} disabled={!active} aria-label={`Open shot ${shot.order}`}><span aria-hidden="true"><Play size={14}/></span></button>
                        <button type="button" className="gxc-shotflow-demo-hotspot gxc-shotflow-demo-check-target" style={rectStyle(contentRect(shot.checkbox.rectInContent))} onClick={() => toggleComplete(shot.shotId)} disabled={!active} aria-pressed={done} aria-label={`Mark shot ${shot.order} ${done ? 'unfinished' : 'complete'}`}><img src={done ? shot.checkbox.checkedImage : shot.checkbox.uncheckedImage} alt=""/><span className="gxc-shotflow-sr-only">{done ? 'Done' : 'Mark done'}</span></button>
                      </div>;
                    })}
                  </div>
                  <div aria-hidden="true" style={{ width: '100%', aspectRatio: `${shotFlowCapture.storyboard.trailingSpace.width} / ${shotFlowCapture.storyboard.trailingSpace.height}`, background: shotFlowCapture.storyboard.trailingSpace.color }}/>
                  <ol className="gxc-shotflow-sr-only">{shotFlowCapture.storyboard.rows.map(shot => <li key={shot.shotId}>Shot {shot.order}, {shot.start.toFixed(2)} to {shot.end.toFixed(2)} seconds.</li>)}</ol>
                </div>}
                {isStoryboard && listStatus !== 'ready' && <div className="gxc-shotflow-demo-load-state" style={rectStyle(shotFlowCapture.storyboard.viewportRectPercent)} role="status"><p>{listStatus === 'error' ? 'The storyboard could not load.' : 'Loading the generated storyboard…'}</p>{listStatus === 'error' && <button type="button" onClick={() => { setListStatus('loading'); setImageRetry(value => value + 1); }}>Retry storyboard</button>}</div>}
                {step.id === 'workspace' && completed.length > 0 && imageStatus === 'ready' && <>
                  <div className="gxc-shotflow-native-counter" style={{ ...rectStyle(ui.workspaceCounter.rectPercent), backgroundImage: ui.workspaceCounter.images?.[completed.length] ? undefined : `url(${ui.workspaceCounter.background})` }}>{ui.workspaceCounter.images?.[completed.length] ? <img src={ui.workspaceCounter.images[completed.length]} alt={`${completed.length}/32 completed`}/> : `${completed.length}/32 completed`}</div>
                  <div className="gxc-shotflow-native-progress" style={{ ...rectStyle(ui.workspaceProgress.rectPercent), backgroundImage: `url(${ui.workspaceProgress.background})` }}><span style={{ width: completed.length / 32 * 100 + '%' }}/></div>
                </>}
                {hasVideo && <video key={mediaKey} ref={video} src={mediaSource} poster={isAnalysis ? screenImage : clip.poster} preload="none" playsInline muted={isAnalysis || muted} style={rectStyle(isAnalysis ? fullFrame : clip.videoRectPercent)} aria-label={isAnalysis ? 'Recorded analysis, condensed demo timing' : `Reference shot ${clip.order}`} data-visible={recordingRequested && mediaStatus !== 'error' ? 'true' : undefined}
                  onTimeUpdate={event => { if (event.currentTarget === video.current) setElapsed(event.currentTarget.currentTime); }}
                  onPlaying={event => { if (!wantsPlayback.current || !isActive.current || document.hidden || event.currentTarget !== video.current) { event.currentTarget.pause(); return; } setMediaStatus('playing'); }}
                  onPause={event => { if (event.currentTarget === video.current) setMediaStatus(status => status === 'playing' || status === 'loading' ? 'paused' : status); }}
                  onEnded={event => {
                    if (!wantsPlayback.current || !isActive.current || document.hidden || event.currentTarget !== video.current) return;
                    wantsPlayback.current = false; event.currentTarget.pause(); setMediaStatus('ended');
                    if (isAnalysis) showStep(index + 1);
                  }}
                  onError={event => { if (event.currentTarget === video.current) { wantsPlayback.current = false; setMediaStatus('error'); setRecordingRequested(false); } }}/>
                }
                {imageStatus !== 'ready' && !recordingRequested && <div className="gxc-shotflow-demo-load-state" role="status"><p>{imageStatus === 'error' ? 'This captured screen could not load.' : 'Loading captured screen…'}</p>{imageStatus === 'error' && <button type="button" onClick={() => { setImageStatus('loading'); setImageRetry(retry => retry + 1); }}>Retry image</button>}</div>}
                {!isStoryboard && !isPlayer && hotspot && imageStatus === 'ready' && !recordingRequested && <button type="button" className="gxc-shotflow-demo-hotspot" style={rectStyle(hotspot)} onClick={isAnalysis ? advance : runAction} disabled={!active} aria-label={isAnalysis ? 'View the prepared project' : action} aria-describedby={id + '-description'}><span aria-hidden="true"><ArrowRight size={14}/></span></button>}
                {isPlayer && imageStatus === 'ready' && <div className="gxc-shotflow-native-player-controls">
                  <div className="gxc-shotflow-native-timeline" style={rectStyle(ui.player.progress)} aria-hidden="true"><div><span style={{ width: Math.min(1, elapsed / (clip.end - clip.start)) * 100 + '%' }}/><i style={{ left: Math.min(1, elapsed / (clip.end - clip.start)) * 100 + '%' }}/></div></div>
                  <div className="gxc-shotflow-native-elapsed" style={rectStyle(ui.player.elapsed)} aria-hidden="true">{timeLabel(elapsed)}</div>
                  <button type="button" style={rectStyle(ui.player.play)} className="gxc-shotflow-demo-hotspot gxc-shotflow-native-play" onClick={runAction} disabled={!active} aria-label={`${action} ${clip.order}`}><span aria-hidden="true">{isPlaying ? <Pause/> : <Play/>}{isLoading ? 'Cancel' : isPlaying ? 'Pause' : 'Play'}</span></button>
                  <button type="button" style={rectStyle(ui.player.previous)} className="gxc-shotflow-demo-hotspot gxc-shotflow-native-nav" onClick={() => switchClip(clipIndex - 1)} disabled={!active || clipIndex === 0} aria-label="Previous shot in phone"><ChevronLeft/> Previous shot</button>
                  <button type="button" style={rectStyle(ui.player.next)} className="gxc-shotflow-demo-hotspot gxc-shotflow-native-nav" onClick={() => switchClip(clipIndex + 1)} disabled={!active || clipIndex === shotFlowDemoCount - 1} aria-label="Next shot in phone">Next shot <ChevronRight/></button>
                  <button type="button" style={rectStyle(ui.player.close)} className="gxc-shotflow-demo-hotspot" onClick={backToList} disabled={!active} aria-label="Back to storyboard in phone"/>
                </div>}
              </div>
            </div>}
            <div className="gxc-shotflow-phone-island" aria-hidden="true"/>
          </div>
        </div>
        <p className="gxc-shotflow-demo-caption">{started ? isAnalysis ? 'Recorded analysis · Demo timing' : `${isPlayer ? `Shot ${clip.order}` : step.label} · Native app capture` : 'Native app capture · Select image to enlarge'}</p>
      </div>
      <div className="gxc-shotflow-demo-actions">
        {started ? <button ref={primaryButton} type="button" className="gxc-shotflow-demo-primary" onClick={runAction} disabled={!active}>{hasVideo ? isLoading ? <X size={17}/> : isPlaying ? <Pause size={17}/> : <Play size={17}/> : <ArrowRight size={17}/>}<span>{action}</span></button> : <button ref={startButton} type="button" className="gxc-shotflow-demo-primary" onClick={restart} disabled={!active}><Play size={17}/>Start walkthrough</button>}
        {started && isPlayer && <div className="gxc-shotflow-demo-clip-navigation">
          <button type="button" onClick={() => switchClip(clipIndex - 1)} disabled={!active || clipIndex === 0} aria-label="Previous shot"><ArrowLeft size={16}/>Previous shot</button>
          <button type="button" onClick={() => switchClip(clipIndex + 1)} disabled={!active || clipIndex === shotFlowDemoCount - 1} data-emphasis={mediaStatus === 'ended' && clipIndex < shotFlowDemoCount - 1} aria-label="Next shot">Next shot<ArrowRight size={16}/></button>
        </div>}
        {started && isStoryboard && <div className="gxc-shotflow-demo-checklist" aria-label="Three-shot demo checklist">
          <p className="gxc-shotflow-demo-completion" aria-live="polite">{completed.length === shotFlowDemoCount ? '3 demo shots completed' : `${completed.length}/3 demo shots completed`}</p>
          <div className="gxc-shotflow-demo-shot-picker" role="group" aria-label="Select a demo shot">{shotFlowDemoShots.map(shot => <button type="button" key={shot.shotId} aria-pressed={shot.shotId === selectedId} disabled={!active} onClick={() => setSelectedId(shot.shotId)} aria-label={`Select shot ${shot.order}`}>{completed.includes(shot.shotId) ? <Check size={14}/> : <span aria-hidden="true">○</span>} Shot {shot.order}</button>)}</div>
          <button type="button" className="gxc-shotflow-demo-complete-action" disabled={!active} aria-pressed={completed.includes(selectedId)} onClick={() => toggleComplete(selectedId)}>{completed.includes(selectedId) ? <Check size={16}/> : <Circle size={16}/>} {completed.includes(selectedId) ? `Mark shot ${selected.order} unfinished` : `Mark shot ${selected.order} complete`}</button>
          <p className="gxc-shotflow-demo-notice" role="status">{notice || 'Try checking off a shot after reviewing its reference.'}</p>
        </div>}
        <div className="gxc-shotflow-demo-helper">
          {started && hasVideo ? <>
            <p role="status">{mediaStatus === 'error' ? 'Playback could not start. Retry, or continue through the captured results.' : isLoading ? 'Loading playback…' : isAnalysis ? 'Recorded beforehand. The waiting time is condensed to about three seconds.' : 'Three original segments, at their real analysis boundaries. Sound starts muted.'}</p>
            <div className="gxc-shotflow-demo-secondary-actions">
              {isPlayer && <button type="button" className="gxc-shotflow-demo-text-action" aria-pressed={!muted} onClick={() => setMuted(value => !value)} disabled={!active}>{muted ? <VolumeX size={16}/> : <Volume2 size={16}/>} {muted ? 'Turn sound on' : 'Mute sound'}</button>}
              <button type="button" className="gxc-shotflow-demo-text-action" data-emphasis={isPlayer && clipIndex === shotFlowDemoCount - 1 && mediaStatus === 'ended'} onClick={isAnalysis ? advance : backToList} disabled={!active}>{isAnalysis ? 'Skip to prepared results' : 'Back to storyboard'}<ArrowRight size={14}/></button>
            </div>
          </> : <p>{started ? isStoryboard ? 'Scroll inside the phone to browse all 32 shots. Play and check off shots 5–7; the other shots are view-only.' : 'Tap the highlighted control, or use the button above.' : 'A guided web example made from real app captures and clips. No upload or live analysis is needed.'}</p>}
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
