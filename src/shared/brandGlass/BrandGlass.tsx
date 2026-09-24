import { useEffect, useRef } from 'react';
import { createBackdropSampler } from './backdrop';
import { brandGlassMaterial as config, createBrandMaterial } from './material';
import './brandGlass.css';

type Frame = (time: number, delta: number) => boolean | void;
export type GlassScheduler = { subscribe(callback: Frame): () => void; wake(): void };
const images = new Map<string, Promise<HTMLImageElement>>();
function decode(src: string) {
  let pending = images.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => { images.delete(src); reject(new Error('Logo optics unavailable')); }; image.src = src;
    }); images.set(src, pending);
  }
  return pending;
}

/** The semantic logo/link stays in its original DOM and native dialog. */
export function BrandGlass({ enabled = true, normal, mask, highlight, scheduler }: { enabled?: boolean | (() => boolean); normal: string; mask: string; highlight: string; scheduler?: GlassScheduler }) {
  const host = useRef<HTMLCanvasElement>(null);
  const enabledRef = useRef(enabled); enabledRef.current = enabled;
  const wakeRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => { wakeRef.current?.(); }, [enabled]);
  useEffect(() => {
    const canvas = host.current, slot = canvas?.parentElement, link = canvas?.closest('a');
    if (!canvas || !slot || !link) return;
    if (new URLSearchParams(location.search).has('no-webgl')) return;
    let disposed = false, lost = false, dirty = true, raf = 0, previous = 0;
    let x = 0, y = 0, targetX = 0, targetY = 0, pressure = 0, targetPressure = 0;
    let material: ReturnType<typeof createBrandMaterial> | undefined;
    let loadedMaps: [HTMLImageElement, HTMLImageElement, HTMLImageElement] | undefined;
    let activeUntil = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motionAllowed = () => !reduced.matches && document.querySelector('.gxc-site')?.getAttribute('data-motion') !== 'reduced';
    const wake = () => { if (disposed || document.hidden) return; if (scheduler) scheduler.wake(); else if (!raf) raf = requestAnimationFrame(tick); };
    const invalidate = () => { dirty = true; wake(); };
    wakeRef.current = invalidate;
    const sampler = createBackdropSampler(canvas, invalidate);
    const hidden = () => document.hidden || (slot.checkVisibility ? !slot.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : getComputedStyle(slot).visibility === 'hidden');
    const draw: Frame = (time, dt) => {
      const active = typeof enabledRef.current === 'function' ? enabledRef.current() : enabledRef.current;
      canvas.dataset.glassEnabled = String(active);
      if (disposed || lost || !active || !material || hidden()) return false;
      // A top-layer menu/viewer blocks this logo; keep its last valid pixels.
      if ([...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].some(dialog => !dialog.contains(slot))) return false;
      if (!motionAllowed()) { x = y = targetX = targetY = pressure = targetPressure = 0; }
      const settling = Math.abs(targetX-x) + Math.abs(targetY-y) + Math.abs(targetPressure-pressure) > .002;
      const running = motionAllowed() && time < activeUntil;
      if (!dirty && !settling && !running) return false;
      const rect = slot.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return false;
      const start = performance.now();
      const k = 1-Math.exp(-Math.min(.05,dt)/(targetPressure ? config.responseSeconds : config.settleSeconds));
      x += (targetX-x)*k; y += (targetY-y)*k; pressure += (targetPressure-pressure)*k;
      const padX=rect.width*config.padding, padY=rect.height*config.padding;
      const dpr=Math.min(devicePixelRatio || 1, config.maxDpr);
      try {
        const source=sampler.sample({left:rect.left-padX,top:rect.top-padY,width:rect.width+padX*2,height:rect.height+padY*2},dpr,running);
        if (material.draw(source,rect.width,rect.height,dpr,x,y,pressure)) {
          delete slot.dataset.glassDrawn;
          slot.dataset.liveGlass='true'; slot.dataset.glassMaterial='live-refraction';
          slot.querySelector('img')?.style.removeProperty('visibility');
          canvas.dataset.ready='true'; canvas.dataset.cpuMs=(performance.now()-start).toFixed(2);
        }
        dirty=false;
      } catch { fallback(); }
      return settling || running;
    };
    function tick(time: number) { raf=0; const active=draw(time,previous ? (time-previous)/1000 : 1/60); previous=time; if(active) wake(); else previous=0; }
    const fallback = () => { lost=true; delete slot.dataset.glassDrawn; delete slot.dataset.liveGlass; slot.dataset.glassMaterial='fallback'; delete canvas.dataset.ready; slot.querySelector('img')?.style.setProperty('visibility','visible','important'); };
    const move = (event: PointerEvent) => {
      if (!motionAllowed()) return;
      const rect=slot.getBoundingClientRect(), dx=(event.clientX-(rect.left+rect.width/2))/100, dy=(event.clientY-(rect.top+rect.height/2))/100;
      // A near-field response also works on touch without capturing or cancelling scrolling.
      if (Math.abs(dx)>2.5 || Math.abs(dy)>2.5) { if (targetPressure) leave(); return; }
      targetX=Math.max(-1,Math.min(1,dx));targetY=Math.max(-1,Math.min(1,dy));targetPressure=1; wake();
    };
    const leave = () => { targetX=targetY=targetPressure=0; wake(); };
    const transition = () => { activeUntil=performance.now()+900; invalidate(); };
    const photoTransition = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.matches('.photo-track')) { activeUntil=performance.now()+(event.type==='transitionrun' ? 650 : 50); invalidate(); }
    };
    const visibility = () => { leave(); if(document.hidden) { cancelAnimationFrame(raf);raf=0; } else invalidate(); };
    const changeMotion = () => { leave(); invalidate(); };
    const observer=new ResizeObserver(invalidate);observer.observe(slot);
    const stateObserver=new MutationObserver(() => { transition(); });
    // Only semantic state/entry changes, not continuously changing CSS transforms.
    const site=document.querySelector('.gxc-site');if(site) stateObserver.observe(site,{attributes:true,attributeFilter:['data-state','data-motion']});
    stateObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-gxc-entry']});
    const scroll = () => { invalidate(); };
    window.addEventListener('scroll',scroll,{passive:true,capture:true});window.addEventListener('resize',invalidate);
    window.addEventListener('pointermove',move,{passive:true}); window.addEventListener('pointerdown',move,{passive:true});
    window.addEventListener('pointerup',leave,{passive:true}); window.addEventListener('pointercancel',leave,{passive:true});
    document.documentElement.addEventListener('pointerleave',leave);window.addEventListener('blur',leave);
    document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',changeMotion);
    document.addEventListener('gxc:brand-layout',transition);
    document.addEventListener('transitionrun',photoTransition);document.addEventListener('transitionend',photoTransition);document.addEventListener('transitioncancel',photoTransition);
    const contextLost=(event:Event)=>{event.preventDefault();fallback();};
    canvas.addEventListener('webglcontextlost',contextLost);
    const contextRestored=()=>{if(disposed || !loadedMaps)return;try{material?.dispose();material=createBrandMaterial(canvas,loadedMaps);lost=false;invalidate();}catch{fallback();}};
    canvas.addEventListener('webglcontextrestored',contextRestored);
    const off=scheduler?.subscribe(draw);
    void Promise.all([decode(normal),decode(mask),decode(highlight)]).then(maps=>{
      if(disposed)return;
      try{loadedMaps=maps as [HTMLImageElement,HTMLImageElement,HTMLImageElement];material=createBrandMaterial(canvas,loadedMaps);invalidate();}catch{fallback();}
    }).catch(fallback);
    return()=>{
      disposed=true;wakeRef.current=undefined;cancelAnimationFrame(raf);off?.();sampler.dispose();observer.disconnect();stateObserver.disconnect();
      window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',invalidate);
      window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',move);window.removeEventListener('pointerup',leave);window.removeEventListener('pointercancel',leave);
      document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);
      document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',changeMotion);
      document.removeEventListener('gxc:brand-layout',transition);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
      document.removeEventListener('transitionrun',photoTransition);document.removeEventListener('transitionend',photoTransition);document.removeEventListener('transitioncancel',photoTransition);
      material?.dispose();slot.querySelector('img')?.style.removeProperty('visibility');delete slot.dataset.liveGlass;delete slot.dataset.glassMaterial;delete canvas.dataset.ready;
    };
  },[normal,mask,highlight,scheduler]);
  return <canvas ref={host} className="gxc-live-brand-canvas" data-glass-enabled={typeof enabled === 'function' ? enabled() : enabled} aria-hidden="true"/>;
}
