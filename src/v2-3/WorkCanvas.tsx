import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { WorkScene } from './workScene';
import { registerPerformanceScene, setPerformanceReady } from './runtime';
import { useDeferredWork } from './useDeferredWork';

export function WorkCanvas({ root, scene, disabled, suspended, enabled = true }: {
  root: RefObject<HTMLElement | null>;
  scene: MutableRefObject<WorkScene | null>;
  disabled: boolean;
  suspended: boolean;
  enabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canInitialize = useDeferredWork(root, enabled);
  const state = useRef({ disabled, suspended }); state.current = { disabled, suspended };
  useEffect(() => canInitialize && root.current ? registerPerformanceScene('work', root.current) : undefined, [canInitialize, root]);
  useEffect(() => {
    if (!canInitialize || !host.current || !root.current) return;
    const element = host.current, section = root.current;
    let disposed = false;
    let owned: WorkScene | null = null;
    import('./workScene').then(async module => {
      if (disposed) return;
      const instance = await module.mountWorkScene(element, section, state.current.disabled);
      if (disposed) { instance.dispose(); return; }
      owned = instance; scene.current = instance;
      instance.setMotion(!state.current.disabled); instance.setSuspended(state.current.suspended);
    }).catch(() => {
      if (disposed) return;
      element.dataset.failed = 'initialization'; setPerformanceReady('work', true);
    });
    return () => {
      disposed = true; owned?.dispose();
      if (scene.current === owned) scene.current = null;
    };
  }, [canInitialize, root, scene]);
  useEffect(() => { scene.current?.setMotion(!disabled); }, [disabled, scene]);
  useEffect(() => { scene.current?.setSuspended(suspended); }, [suspended, scene]);
  return <div ref={host} className="gxc-work-canvas" data-init-gate={!enabled ? 'entry' : canInitialize ? 'open' : 'nearby'} aria-hidden="true"/>;
}
