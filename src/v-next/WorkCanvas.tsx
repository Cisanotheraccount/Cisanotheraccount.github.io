import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { WorkScene } from './workScene';

export function WorkCanvas({ root, scene, disabled, suspended }: {
  root: RefObject<HTMLElement | null>;
  scene: MutableRefObject<WorkScene | null>;
  disabled: boolean;
  suspended: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ disabled, suspended }); state.current = { disabled, suspended };
  useEffect(() => {
    let disposed = false;
    import('./workScene').then(async module => {
      if (disposed || !host.current || !root.current) return;
      const instance = await module.mountWorkScene(host.current, root.current, state.current.disabled);
      if (disposed) { instance.dispose(); return; }
      scene.current = instance;
      instance.setMotion(!state.current.disabled); instance.setSuspended(state.current.suspended);
    }).catch(() => { if (host.current) host.current.dataset.failed = 'initialization'; });
    return () => { disposed = true; scene.current?.dispose(); scene.current = null; };
  }, [root, scene]);
  useEffect(() => { scene.current?.setMotion(!disabled); }, [disabled, scene]);
  useEffect(() => { scene.current?.setSuspended(suspended); }, [suspended, scene]);
  return <div ref={host} className="gxc-work-canvas" aria-hidden="true"/>;
}
