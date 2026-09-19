import * as THREE from 'three';
import { visual } from './config';
import { photoCover, type LoadedHeroPhoto } from './heroPhoto';
import { getFrameSnapshot, requestFrame, subscribeFrame, subscribeViewportChange } from './runtime';

export interface EntryRing {
  active: boolean;
  setPhoto(photo: LoadedHeroPhoto, texture?: THREE.Texture): void;
  refresh(): void;
  redraw(): void;
  dispose(): void;
  setOnHandoff(fn: () => void): void;
}
type OpeningBridge = { phase: string; subscribe(fn: () => void): () => void };
type EntryWindow = Window & { __gxcEntry?: OpeningBridge; __gxcCaptureEntryRing?: () => string };

// Closed tube around a half-twisted elliptical strip. The final u row joins
// the first at v + PI, so the thin surface has neither an open seam nor end caps.
function mobiusGeometry() {
  const around = 96, across = 12, radius = 3.1, width = .7, thickness = .17;
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i < around; i++) {
    const u = i / around * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    const twist = u / 2, ct = Math.cos(twist), st = Math.sin(twist);
    for (let j = 0; j < across; j++) {
      const v = j / across * Math.PI * 2;
      const radial = width * Math.cos(v) * ct - thickness * Math.sin(v) * st;
      const z = width * Math.cos(v) * st + thickness * Math.sin(v) * ct;
      vertices.push((radius + radial) * cu, (radius + radial) * su, z);
      const next = (j + 1) % across, offset = i === around - 1 ? across / 2 : 0;
      const a = i * across + j, d = i * across + next;
      const b = ((i + 1) % around) * across + (j + offset) % across;
      const c = ((i + 1) % around) * across + (next + offset) % across;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

/** An early scene on the existing hero renderer; its environment is borrowed. */
export function createEntryRing(renderer: THREE.WebGLRenderer, hero: HTMLElement, canvasHost: HTMLElement,
  environment: THREE.Texture, disabled: boolean): EntryRing | undefined {
  const visualElement = document.getElementById('gxc-entry-visual');
  const entryWindow = window as EntryWindow, bridge = entryWindow.__gxcEntry;
  if (!visualElement || !bridge || bridge.phase === 'complete') return undefined;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const qa = new URLSearchParams(location.search).get('qa') === '1';
  const scene = new THREE.Scene(); scene.environment = environment;
  const camera = new THREE.OrthographicCamera(-7, 7, 7, -7, .1, 100);
  camera.position.z = 20;
  const material = new THREE.MeshPhysicalMaterial({
    color: visual.glass.tint, metalness: 0, roughness: .025, transmission: 1,
    thickness: .45, ior: visual.glass.ior, dispersion: visual.glass.dispersion,
    envMapIntensity: 1.7, clearcoat: .65, toneMapped: false, clearcoatRoughness: .035,
    attenuationColor: visual.glass.attenuation, attenuationDistance: 50, side: THREE.FrontSide,
  });
  // A restrained grazing-angle fill defines the rolled edge against the dark
  // photograph. It is surface shading, not a screen-space bloom or photo filter.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float entryRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 5.0);
      outgoingLight += vec3(0.35, 0.44, 0.58) * entryRim * 0.16;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'entry-glass-rim-v1';
  const mesh = new THREE.Mesh(mobiusGeometry(), material);
  const pose = new THREE.Group(); pose.add(mesh); scene.add(pose);
  const key = new THREE.PointLight(0xe7f3ff, 160, 0, 2); key.position.set(-4, 5, 7);
  const warm = new THREE.PointLight(0xffe6c4, 90, 0, 2); warm.position.set(5, -2, 4);
  scene.add(key, warm, new THREE.HemisphereLight(0xf2f7ff, 0x6c7588, 1.25));
  const photoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, depthWrite: false });
  // The signature can update texture.repeat/offset for camera overscan. This
  // scene shares the GPU texture but maps its cover plane with untransformed UVs.
  photoMaterial.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = uv;\n#endif');
  };
  photoMaterial.customProgramCacheKey = () => 'entry-photo-cover-v1';
  const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), photoMaterial);
  photoPlane.position.z = -5; photoPlane.visible = false; scene.add(photoPlane);
  // Transmission receives the opaque photo, while the visible target remains
  // transparent over the unchanged native-resolution DOM photograph.
  let transmissionTarget: THREE.WebGLRenderTarget | null = null;
  photoPlane.onBeforeRender = () => {
    const target = renderer.getRenderTarget();
    photoMaterial.colorWrite = target !== null;
    // Three allocates transmission per scene/camera. Retire this opening-only
    // target on handoff; the signature owns a separate scene and target.
    if (target) transmissionTarget = target;
  };
  let ownsPhotoTexture = false;
  let photoTexture: THREE.Texture | undefined, photo: LoadedHeroPhoto | undefined;
  let width = 1, height = 1, units = 1, layoutDirty = true, dirty = true;
  let angle = 1.5, targetX = 0, targetY = 0, tiltX = 0, tiltY = 0;
  let disposed = false, handingOff = false, handedOff = false, handoffTimer = 0, frameCount = 0;
  let onHandoff: (() => void) | undefined, drag: { id: number; x: number; y: number; tx: number; ty: number } | undefined;
  const touches = new Set<number>(), cleanup: Array<() => void> = [];
  const originalTouchAction = visualElement.style.touchAction;
  visualElement.style.touchAction = 'pinch-zoom';
  canvasHost.dataset.entryRing = 'true';

  const motionEnabled = () => !disabled && !reduced.matches;
  const mark = () => { if (!disposed) { dirty = true; requestFrame(); } };
  const updatePhotoSize = () => {
    if (!photo) return;
    const cover = photoCover(width, height, photo.width, photo.height);
    photoPlane.scale.set(cover.width * units, cover.height * units, 1);
  };
  const measure = () => {
    if (disposed || !layoutDirty) return;
    layoutDirty = false;
    const bounds = hero.getBoundingClientRect(), box = visualElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !box.width || !box.height) return;
    width = bounds.width; height = bounds.height; units = 14 / height;
    camera.left = -width * units / 2; camera.right = width * units / 2;
    camera.top = 7; camera.bottom = -7; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, visual.glass.maxDpr));
    renderer.setSize(width, height, false);
    pose.position.set((box.left - bounds.left + box.width / 2 - width / 2) * units,
      (height / 2 - (box.top - bounds.top + box.height / 2)) * units, 0);
    pose.scale.setScalar(Math.min(box.width / 7.5, box.height / 4.6) * units * .94);
    updatePhotoSize(); dirty = true;
  };
  const refresh = () => { layoutDirty = true; mark(); };
  const applyPose = () => {
    pose.rotation.set(1.05 + tiltY, tiltX, -.06);
    mesh.rotation.z = angle;
    key.position.set(pose.position.x - 4 + tiltX * 12, pose.position.y + 5 + tiltY * 10, 7);
    warm.position.set(pose.position.x + 5, pose.position.y - 2, 4);
    if (qa) canvasHost.dataset.entryPose = [angle, tiltX, tiltY].map(value => value.toFixed(5)).join(',');
  };
  const redraw = () => {
    if (disposed || document.hidden) return;
    measure(); applyPose();
    const target = renderer.getRenderTarget(), color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha(), autoClear = renderer.autoClear;
    const viewport = renderer.getViewport(new THREE.Vector4()), scissor = renderer.getScissor(new THREE.Vector4());
    const scissorTest = renderer.getScissorTest();
    try {
      renderer.setRenderTarget(null); renderer.setViewport(0, 0, width, height); renderer.setScissorTest(false);
      renderer.autoClear = true; renderer.setClearColor(0x000000, 0); renderer.render(scene, camera);
      dirty = false; frameCount++;
      if (qa) canvasHost.dataset.entryFrames = String(frameCount);
    } finally {
      renderer.setRenderTarget(target); renderer.setViewport(viewport); renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest); renderer.autoClear = autoClear; renderer.setClearColor(color, alpha);
    }
  };
  const reset = () => { targetX = 0; targetY = 0; mark(); };
  const releaseDrag = () => {
    const previous = drag;
    drag = undefined;
    if (previous && visualElement.hasPointerCapture(previous.id)) visualElement.releasePointerCapture(previous.id);
  };
  const move = (event: PointerEvent) => {
    if (!motionEnabled() || handingOff || touches.size > 1) return;
    if (drag && drag.id === event.pointerId) {
      const size = Math.max(180, visualElement.getBoundingClientRect().width);
      targetX = THREE.MathUtils.clamp(drag.tx + (event.clientX - drag.x) / size * .8, -.4, .4);
      targetY = THREE.MathUtils.clamp(drag.ty + (event.clientY - drag.y) / size * .6, -.3, .3);
    } else if (event.pointerType === 'mouse') {
      const box = visualElement.getBoundingClientRect();
      targetX = THREE.MathUtils.clamp((event.clientX - box.left) / box.width - .5, -.5, .5) * .55;
      targetY = THREE.MathUtils.clamp((event.clientY - box.top) / box.height - .5, -.5, .5) * .42;
    } else return;
    mark();
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') touches.add(event.pointerId);
    if (touches.size > 1) { releaseDrag(); reset(); return; }
    if (!motionEnabled() || handingOff || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: targetX, ty: targetY };
    visualElement.setPointerCapture(event.pointerId); mark();
  };
  const trackTouch = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    touches.add(event.pointerId);
    // The second finger may start outside the ring. Stop the one-finger drag
    // without preventing default, so the browser can own its pinch gesture.
    if (touches.size > 1) { releaseDrag(); reset(); }
  };
  const up = (event: PointerEvent) => {
    touches.delete(event.pointerId);
    if (drag?.id === event.pointerId) { releaseDrag(); reset(); }
  };
  const leave = () => { if (!drag) reset(); };
  const lostCapture = () => { if (drag) { drag = undefined; reset(); } };
  const loseWindow = () => { touches.clear(); releaseDrag(); reset(); };
  const keydown = (event: KeyboardEvent) => {
    if (!motionEnabled() || handingOff) return;
    if (event.key === 'ArrowLeft') targetX = Math.max(-.4, targetX - .12);
    else if (event.key === 'ArrowRight') targetX = Math.min(.4, targetX + .12);
    else if (event.key === 'ArrowUp') targetY = Math.max(-.3, targetY - .1);
    else if (event.key === 'ArrowDown') targetY = Math.min(.3, targetY + .1);
    else if (event.key === 'Home') { targetX = 0; targetY = 0; }
    else return;
    event.preventDefault(); mark();
  };
  visualElement.addEventListener('pointermove', move);
  visualElement.addEventListener('pointerdown', down);
  visualElement.addEventListener('pointerleave', leave);
  visualElement.addEventListener('lostpointercapture', lostCapture);
  visualElement.addEventListener('keydown', keydown);
  visualElement.addEventListener('blur', reset);
  window.addEventListener('pointerdown', trackTouch, { capture: true, passive: true });
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  window.addEventListener('blur', loseWindow);
  cleanup.push(() => {
    releaseDrag(); visualElement.style.touchAction = originalTouchAction;
    visualElement.removeEventListener('pointermove', move); visualElement.removeEventListener('pointerdown', down);
    visualElement.removeEventListener('pointerleave', leave); visualElement.removeEventListener('keydown', keydown);
    visualElement.removeEventListener('lostpointercapture', lostCapture);
    visualElement.removeEventListener('blur', reset);
    window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    window.removeEventListener('pointerdown', trackTouch, true); window.removeEventListener('blur', loseWindow);
  });
  const observer = new ResizeObserver(refresh); observer.observe(hero); observer.observe(visualElement);
  cleanup.push(() => observer.disconnect(), subscribeViewportChange(refresh));
  reduced.addEventListener('change', mark); document.addEventListener('visibilitychange', mark);
  cleanup.push(() => { reduced.removeEventListener('change', mark); document.removeEventListener('visibilitychange', mark); });
  cleanup.push(subscribeFrame(() => { measure(); }, 'measure'));
  cleanup.push(subscribeFrame((_time, delta) => {
    if (disposed || document.hidden) return false;
    if (motionEnabled() && !handingOff) {
      angle += .15 * Math.min(.1, getFrameSnapshot().elapsed || delta);
      const follow = 1 - Math.exp(-delta / .13);
      tiltX += (targetX - tiltX) * follow; tiltY += (targetY - tiltY) * follow; dirty = true;
    }
    return false;
  }, 'update'));
  cleanup.push(subscribeFrame(() => {
    if (disposed || document.hidden) return false;
    if (dirty) {
      try { redraw(); } catch { canvasHost.dataset.entryRingFailure = 'render'; dispose(); }
    }
    return motionEnabled() && !handingOff;
  }, 'render'));

  const dispose = () => {
    if (disposed) return;
    disposed = true; api.active = false; window.clearTimeout(handoffTimer);
    cleanup.splice(0).forEach(fn => fn());
    mesh.geometry.dispose(); material.dispose(); if (ownsPhotoTexture) photoTexture?.dispose();
    photoPlane.geometry.dispose(); photoMaterial.dispose(); transmissionTarget?.dispose(); scene.clear();
    delete canvasHost.dataset.entryRing;
  };
  const handoff = () => {
    if (handedOff) return;
    handedOff = true; dispose();
    // A manual skip can precede signature readiness. Do not reveal stale ring pixels.
    const target = renderer.getRenderTarget(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(null); renderer.setClearColor(0, 0); renderer.clear();
    renderer.setClearColor(clear, alpha); renderer.setRenderTarget(target);
    onHandoff?.();
    canvasHost.dataset.entryHandoff = 'in'; renderer.domElement.dataset.entryHandoff = 'in';
    requestFrame();
  };
  const phaseChanged = () => {
    if (bridge.phase === 'complete') { handoff(); return; }
    if (bridge.phase === 'revealing' && !handingOff) {
      handingOff = true; releaseDrag();
      canvasHost.dataset.entryHandoff = 'out'; renderer.domElement.dataset.entryHandoff = 'out';
      handoffTimer = window.setTimeout(handoff, reduced.matches ? 0 : 300);
    }
  };
  const api: EntryRing = {
    active: true, refresh, redraw, dispose,
    setOnHandoff(fn) { onHandoff = fn; if (handedOff) fn(); },
    setPhoto(asset, sharedTexture) {
      if (disposed) return;
      const previous = ownsPhotoTexture ? photoTexture : undefined; photo = asset;
      ownsPhotoTexture = !sharedTexture;
      photoTexture = sharedTexture ?? new THREE.Texture(asset.image); photoTexture.colorSpace = THREE.SRGBColorSpace;
      photoTexture.needsUpdate = true; photoTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      photoMaterial.map = photoTexture; photoMaterial.needsUpdate = true; photoPlane.visible = true;
      updatePhotoSize(); previous?.dispose(); mark();
    },
  };
  if (qa) {
    const capture = () => {
      redraw();
      const bounds = renderer.domElement.getBoundingClientRect(), box = visualElement.getBoundingClientRect();
      const source = renderer.domElement, ratioX = source.width / bounds.width, ratioY = source.height / bounds.height;
      const margin = 12;
      const x = Math.max(0, Math.floor((box.left - bounds.left - margin) * ratioX));
      const y = Math.max(0, Math.floor((box.top - bounds.top - margin) * ratioY));
      const w = Math.min(source.width - x, Math.ceil((box.width + margin * 2) * ratioX));
      const h = Math.min(source.height - y, Math.ceil((box.height + margin * 2) * ratioY));
      const output = document.createElement('canvas'); output.width = w; output.height = h;
      const context = output.getContext('2d'); if (!context) throw new Error('Entry capture is unavailable');
      context.drawImage(source, x, y, w, h, 0, 0, w, h);
      return output.toDataURL('image/webp', .92);
    };
    entryWindow.__gxcCaptureEntryRing = capture;
    cleanup.push(() => { if (entryWindow.__gxcCaptureEntryRing === capture) delete entryWindow.__gxcCaptureEntryRing; });
  }
  cleanup.push(bridge.subscribe(phaseChanged));
  try { refresh(); redraw(); phaseChanged(); } catch (error) { dispose(); throw error; }
  return api;
}
