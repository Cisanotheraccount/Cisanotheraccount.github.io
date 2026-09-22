import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowUpRight, Minus, Plus } from 'lucide-react';
import type { PhotographyPhoto } from './catalog.types';
import { ManagedPhoto, OriginalPhoto } from './media';
import { photographyText as t } from '../localization/photography';
import './viewerZoom.css';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SWIPE_DISTANCE = 48;

type View = { scale: number; x: number; y: number };
type Layout = { viewportWidth: number; viewportHeight: number; imageWidth: number; imageHeight: number };
type TrackedPointer = { x: number; y: number; startX: number; startY: number; startScale: number; pointerType: string };
type Pinch = { distance: number; scale: number; centerX: number; centerY: number; x: number; y: number };

const FIT_VIEW: View = { scale: 1, x: 0, y: 0 };

function limit(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function clampView(view: View, layout: Layout | null): View {
  const scale = limit(view.scale, MIN_SCALE, MAX_SCALE);
  if (!layout || scale === MIN_SCALE) return { scale, x: 0, y: 0 };
  const maxX = Math.max(0, (layout.imageWidth * scale - layout.viewportWidth) / 2);
  const maxY = Math.max(0, (layout.imageHeight * scale - layout.viewportHeight) / 2);
  return { scale, x: limit(view.x, -maxX, maxX), y: limit(view.y, -maxY, maxY) };
}

function pointerCenter(a: TrackedPointer, b: TrackedPointer) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointerDistance(a: TrackedPointer, b: TrackedPointer) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function PhotoViewerImage({ photo, onStep }: { photo: PhotographyPhoto; onStep: (direction: number) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const layout = useRef<Layout | null>(null);
  const viewRef = useRef<View>(FIT_VIEW);
  const pointers = useRef(new Map<number, TrackedPointer>());
  const pinch = useRef<Pinch | null>(null);
  const hadMultiplePointers = useRef(false);
  const [view, setViewState] = useState<View>(FIT_VIEW);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [request, setRequest] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);

  const setView = useCallback((next: View | ((current: View) => View)) => {
    const proposed = typeof next === 'function' ? next(viewRef.current) : next;
    const clamped = clampView(proposed, layout.current);
    viewRef.current = clamped;
    setViewState(clamped);
  }, []);

  const resetFit = useCallback(() => setView(FIT_VIEW), [setView]);

  const zoomAt = useCallback((nextScale: number, anchorX: number, anchorY: number) => {
    setView(current => {
      const scale = limit(nextScale, MIN_SCALE, MAX_SCALE);
      if (scale === MIN_SCALE) return FIT_VIEW;
      const ratio = scale / current.scale;
      return {
        scale,
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
      };
    });
  }, [setView]);

  const viewportPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = viewport.current?.getBoundingClientRect();
    return bounds
      ? { x: clientX - bounds.left - bounds.width / 2, y: clientY - bounds.top - bounds.height / 2 }
      : { x: 0, y: 0 };
  }, []);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      const previous = layout.current;
      if (previous && previous.viewportWidth === width && previous.viewportHeight === height) return;
      const fit = Math.min(width / photo.width, height / photo.height);
      layout.current = {
        viewportWidth: width,
        viewportHeight: height,
        imageWidth: photo.width * fit,
        imageHeight: photo.height * fit,
      };
      for (const id of pointers.current.keys()) {
        try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* Capture may be absent in synthetic streams. */ }
      }
      pointers.current.clear();
      pinch.current = null;
      hadMultiplePointers.current = false;
      setDragging(false);
      resetFit();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [photo.height, photo.id, photo.width, resetFit]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = viewportPoint(event.clientX, event.clientY);
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? event.deltaY * element.clientHeight : event.deltaY;
      zoomAt(viewRef.current.scale * Math.exp(-delta * 0.002), point.x, point.y);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [viewportPoint, zoomAt]);

  const beginPinch = useCallback(() => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    const center = pointerCenter(a, b);
    pinch.current = {
      distance: Math.max(1, pointerDistance(a, b)),
      scale: viewRef.current.scale,
      centerX: center.x,
      centerY: center.y,
      x: viewRef.current.x,
      y: viewRef.current.y,
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && event.button !== 0) return;
    const point = viewportPoint(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, { ...point, startX: point.x, startY: point.y, startScale: viewRef.current.scale, pointerType: event.pointerType });
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Synthetic pointer streams may not implement capture. */ }
    if (pointers.current.size > 1) {
      hadMultiplePointers.current = true;
      beginPinch();
    }
    if (viewRef.current.scale > MIN_SCALE || pointers.current.size > 1) setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current.get(event.pointerId);
    if (!tracked) return;
    const next = viewportPoint(event.clientX, event.clientY);
    const dx = next.x - tracked.x;
    const dy = next.y - tracked.y;
    tracked.x = next.x;
    tracked.y = next.y;

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      if (!pinch.current) beginPinch();
      const origin = pinch.current;
      if (!origin) return;
      const center = pointerCenter(a, b);
      const scale = limit(origin.scale * pointerDistance(a, b) / origin.distance, MIN_SCALE, MAX_SCALE);
      const ratio = scale / origin.scale;
      setView({
        scale,
        x: center.x - (origin.centerX - origin.x) * ratio,
        y: center.y - (origin.centerY - origin.y) * ratio,
      });
      return;
    }

    if (viewRef.current.scale > MIN_SCALE) setView(current => ({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const tracked = pointers.current.get(event.pointerId);
    const wasOnlyPointer = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch { /* Pointer capture is optional in synthetic and older implementations. */ }

    if (!cancelled && tracked && wasOnlyPointer && !hadMultiplePointers.current && tracked.pointerType === 'touch' && tracked.startScale === MIN_SCALE && viewRef.current.scale === MIN_SCALE) {
      const end = viewportPoint(event.clientX, event.clientY);
      const dx = end.x - tracked.startX;
      const dy = end.y - tracked.startY;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) onStep(dx < 0 ? 1 : -1);
    }

    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.values()][0];
      if (remaining) {
        remaining.startX = remaining.x;
        remaining.startY = remaining.y;
      }
      pinch.current = null;
      setDragging(viewRef.current.scale > MIN_SCALE);
    } else if (pointers.current.size === 0) {
      pinch.current = null;
      hadMultiplePointers.current = false;
      setDragging(false);
    } else {
      beginPinch();
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      event.stopPropagation();
      zoomAt(viewRef.current.scale * 1.25, 0, 0);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      event.stopPropagation();
      zoomAt(viewRef.current.scale / 1.25, 0, 0);
    } else if (event.key === '0') {
      event.preventDefault();
      event.stopPropagation();
      resetFit();
    }
  };

  const fitted = layout.current;
  const zoomLabel = `${Math.round(view.scale * 100) / 100}×`;

  useEffect(() => {
    if (status !== 'ready') return;
    // WebKit can retain a JPEG decode sized for the earlier, smaller layout.
    // Once zoom settles, refresh that decode at the new size without changing
    // src or remounting the image (both could start another network request).
    const timer = window.setTimeout(() => {
      const image = viewport.current?.querySelector<HTMLImageElement>('.photo-dialog-original');
      if (image?.isConnected && typeof image.decode === 'function') {
        void image.decode().catch(() => { /* Keep the already displayed image if a refinement is cancelled. */ });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [view.scale, fitted?.imageWidth, fitted?.imageHeight, status, request]);

  return <>
    <div
      ref={viewport}
      className={`photo-zoom-viewport${view.scale > MIN_SCALE ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
      role="region"
      aria-label={`${t('Zoomable photograph: ')}${t(photo.alt)}`}
      tabIndex={0}
      data-zoom-scale={view.scale.toFixed(3)}
      data-zoom-x={view.x.toFixed(2)}
      data-zoom-y={view.y.toFixed(2)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={event => finishPointer(event, false)}
      onPointerCancel={event => finishPointer(event, true)}
      onLostPointerCapture={event => { if (pointers.current.has(event.pointerId)) finishPointer(event, true); }}
      onDoubleClick={event => {
        event.preventDefault();
        const point = viewportPoint(event.clientX, event.clientY);
        if (viewRef.current.scale > MIN_SCALE) resetFit();
        else zoomAt(2, point.x, point.y);
      }}
    >
      {fitted && <div
        className="photo-dialog-frame photo-zoom-plane"
        style={{
          // Rasterize the native JPEG at the displayed size. Scaling a promoted
          // fit-sized layer can keep its low-resolution backing store when zoomed.
          width: fitted.imageWidth * view.scale,
          height: fitted.imageHeight * view.scale,
          left: (fitted.viewportWidth - fitted.imageWidth * view.scale) / 2 + view.x,
          top: (fitted.viewportHeight - fitted.imageHeight * view.scale) / 2 + view.y,
        }}
      >
        <ManagedPhoto photo={photo} sizes="100vw" priority className="photo-dialog-image" draggable={false} onFailure={() => setPreviewFailed(true)} />
        {previewFailed && status !== 'ready' && <span className="photo-media-loading">{status === 'error' ? t('Image unavailable') : t('Loading photograph…')}</span>}
        {photo.original && <OriginalPhoto key={request} photo={photo} requestKey={request} className={`photo-dialog-image photo-dialog-original${status === 'ready' ? ' is-ready' : ''}`} onReady={() => setStatus('ready')} onFailure={() => setStatus('error')} />}
      </div>}
    </div>
    <div className="photo-viewer-meta">
      <div className="photo-zoom-toolbar" role="toolbar" aria-label={t('Photograph zoom controls')}>
        <button type="button" onClick={() => zoomAt(viewRef.current.scale / 1.25, 0, 0)} aria-label={t('Zoom out')} aria-keyshortcuts="-"><Minus size={16} aria-hidden="true" /></button>
        <output aria-live="polite" aria-label={`${t('Zoom ')}${zoomLabel}`}>{zoomLabel}</output>
        <button type="button" onClick={() => zoomAt(viewRef.current.scale * 1.25, 0, 0)} aria-label={t('Zoom in')} aria-keyshortcuts="+"><Plus size={16} aria-hidden="true" /></button>
        <button type="button" onClick={resetFit} aria-label={t('Fit image')} aria-keyshortcuts="0">{t('Fit')}</button>
      </div>
      <div className="photo-resolution">
        {photo.original && <>
          <span role="status" aria-live="polite">{status === 'loading' ? t('Loading full resolution…') : status === 'ready' ? `${t('Full resolution')} · ${photo.original.width} × ${photo.original.height}${photo.original.hdr ? ` · ${t('HDR')}` : ''}` : previewFailed ? t('Couldn’t load photograph.') : t('Showing preview.')}</span>
          {(status === 'error' || request > 0) && <button type="button" aria-disabled={status !== 'error'} onClick={() => { if (status === 'error') { setStatus('loading'); setRequest(value => value + 1); } }}>{status === 'ready' ? t('Full resolution loaded') : status === 'loading' ? t('Loading…') : t('Retry full resolution')}</button>}
          {status === 'error' && <a href={photo.original.src} target="_blank" rel="noreferrer">{t('Open original')} <ArrowUpRight size={14} aria-hidden="true" /></a>}
        </>}
      </div>
    </div>
  </>;
}
