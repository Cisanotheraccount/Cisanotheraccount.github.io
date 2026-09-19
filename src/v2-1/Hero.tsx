import { useEffect, useRef, useState } from 'react';
import type { GlassScene } from './glassScene';
import { heroPhoto, subscribeHeroPhoto } from './heroPhoto';
import { registerPerformanceScene, setPerformanceReady } from './runtime';
import { bindHeroTouch } from './heroTouch';
import { settleEntryPart } from './entry';
import { observeHeroLayout } from './heroLayout';

export function HeroPhoto() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current, hero = element?.closest<HTMLElement>('.gxc-hero');
    if (!element || !hero) return;
    const unregister = registerPerformanceScene('hero', hero);
    const unsubscribe = subscribeHeroPhoto(hero, photo => {
      // Same URL and decoded browser resource; keep the GPU image out of DOM layout.
      const image = photo.image.cloneNode() as HTMLImageElement;
      image.alt = ''; image.width = photo.width; image.height = photo.height;
      element.replaceChildren(image);
      element.dataset.source = photo.url;
      settleEntryPart('photo', photo.fallback ? 'fallback' : 'ready');
    }, () => settleEntryPart('photo', 'fallback'));
    return () => { unsubscribe(); unregister(); };
  }, []);
  return <div ref={host} className="gxc-hero-image" aria-hidden="true" data-original-size={`${heroPhoto.width}×${heroPhoto.height}`} />;
}

export function GlassHero({ disabled, suspended }: { disabled: boolean; suspended: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const touch = useRef<HTMLDivElement>(null);
  const scene = useRef<GlassScene | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const disabledRef = useRef(disabled); disabledRef.current = disabled;
  const suspendedRef = useRef(suspended); suspendedRef.current = suspended;
  useEffect(() => {
    if (ready || !host.current || !area.current) return;
    const canvas = host.current;
    const layout = observeHeroLayout(canvas, area.current, ({ word: rect, canvas: hero }) => {
      const width = rect.width - (rect.width < 700 ? 44 : 160);
      const height = rect.height * .88;
      const scale = Math.min(width / 2133, height / 933);
      const w = scale * 2133, h = scale * 933;
      const next = JSON.stringify({ left: rect.left - hero.left + (rect.width - w) / 2, top: rect.top - hero.top + (rect.height - h) / 2, width: w, height: h });
      if (canvas.dataset.wordRect !== next) canvas.dataset.wordRect = next;
    });
    return () => layout.dispose();
  }, [ready]);
  useEffect(() => {
    let disposed = false; setReady(false);
    const fallback = async () => {
      const poster = new Image(); poster.src = '/v-next/galaxci-glass-poster.webp';
      try { await poster.decode(); } catch { /* The accessible DOM signature remains available. */ }
      if (!disposed) settleEntryPart('glass', 'fallback');
    };
    if (new URLSearchParams(location.search).has('no-webgl')) { setPerformanceReady('hero', true); void fallback(); return () => { disposed = true; }; }
    import('./glassScene').then(async module => {
      if (disposed || !host.current || !area.current) return;
      const instance = await module.mountGlass(host.current, area.current, disabledRef.current, () => { if (!disposed) { setReady(false); void fallback(); } });
      if (disposed) { instance.dispose(); return; }
      instance.setMotion(!disabledRef.current); instance.setSuspended(suspendedRef.current); scene.current = instance; setReady(true);
      setPerformanceReady('hero', true);
      settleEntryPart('glass', 'ready');
    }).catch(error => {
      if (!disposed) {
        setReady(false);
        setPerformanceReady('hero', true);
        if (host.current) host.current.dataset.failed = 'initialization';
        void fallback();
        if (import.meta.env.DEV) console.error('Glass initialization failed', error);
      }
    });
    return () => { disposed = true; scene.current?.dispose(); scene.current = undefined; };
  }, []);
  useEffect(() => { scene.current?.setMotion(!disabled); }, [disabled]);
  useEffect(() => { scene.current?.setSuspended(suspended); }, [suspended]);
  useEffect(() => {
    if (!ready || disabled || suspended || !host.current || !touch.current) return;
    return bindHeroTouch(touch.current, host.current);
  }, [ready, disabled, suspended]);
  return <div ref={area} className="gxc-wordmark-space" role="img" aria-label="galaxci, a connected glass signature against a starry sky">
    {!ready && <div className="gxc-wordmark-fallback"><img src="/v-next/galaxci-glass-poster.webp" alt="" width="2133" height="933"/></div>}
    <div ref={host} className="gxc-canvas" data-ready={ready ? 'true' : 'false'} aria-hidden="true"/>
    <div ref={touch} className="gxc-glass-touch" data-touch-available="false" data-touch-state="inactive" aria-hidden="true"/>
  </div>;
}
