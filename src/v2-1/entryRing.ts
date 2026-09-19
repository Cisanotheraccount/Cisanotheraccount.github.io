import * as THREE from 'three';
import { visual } from './config';
import type { EntryTransition } from './entry';
import type { HeroPost } from './heroPost';
import { photoCover, type LoadedHeroPhoto } from './heroPhoto';
import { getFrameSnapshot, requestFrame, subscribeFrame, subscribeViewportChange } from './runtime';

export interface EntryRing {
  active: boolean;
  readonly surface: Readonly<{ scene: THREE.Scene; camera: THREE.OrthographicCamera; mesh: THREE.Mesh; backdrop: THREE.Mesh; wavePhase: number }>;
  setPhoto(photo: LoadedHeroPhoto, texture?: THREE.Texture): void;
  setPost(post: HeroPost | undefined): void;
  setOnMorph(fn: (transition: EntryTransition) => void): void;
  freezePose(): void;
  refresh(): void;
  redraw(): void;
  present(): void;
  dispose(): void;
  setOnHandoff(fn: () => void): void;
}
type EntryWindow = Window & { __gxcCaptureEntryRing?: () => string };
const loadingWave = { period: 2.4, amplitude: .30, concentration: 3.5 } as const;

// Closed tube around a half-twisted elliptical strip. The final u row joins
// the first at v + PI, so the thin surface has neither an open seam nor end caps.
function mobiusGeometry() {
  const around = 96, across = 12, radius = 3.1, width = .7, thickness = .17;
  const vertices: number[] = [], indices: number[] = [];
  const centers = new Float32Array(around * 2), offsets = new Float32Array(around * across * 3);
  for (let i = 0; i < around; i++) {
    const u = i / around * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    const twist = u / 2, ct = Math.cos(twist), st = Math.sin(twist);
    centers[i * 2] = radius * cu; centers[i * 2 + 1] = radius * su;
    for (let j = 0; j < across; j++) {
      const v = j / across * Math.PI * 2;
      const radial = width * Math.cos(v) * ct - thickness * Math.sin(v) * st;
      const z = width * Math.cos(v) * st + thickness * Math.sin(v) * ct;
      vertices.push((radius + radial) * cu, (radius + radial) * su, z);
      const component = (i * across + j) * 3;
      offsets[component] = radial * cu; offsets[component + 1] = radial * su; offsets[component + 2] = z;
      const next = (j + 1) % across, offset = i === around - 1 ? across / 2 : 0;
      const a = i * across + j, d = i * across + next;
      const b = ((i + 1) % around) * across + (j + offset) % across;
      const c = ((i + 1) % around) * across + (next + offset) % across;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions); geometry.setIndex(indices);
  // Conservative for every phase, avoiding a per-frame sphere calculation.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + width * (1 + loadingWave.amplitude));
  const setPhase = (phase: number) => {
    for (let i = 0; i < around; i++) {
      const u = i / around * Math.PI * 2;
      // A broad, rounded crest. Its 2π-periodic scalar is identical for v and
      // v + π, preserving the half-twist seam as it crosses the final row.
      const scale = 1 + loadingWave.amplitude * Math.exp(loadingWave.concentration * (Math.cos(u - phase) - 1));
      for (let j = 0; j < across; j++) {
        const vertex = i * across + j, component = vertex * 3;
        positions.setXYZ(vertex, centers[i * 2] + offsets[component] * scale,
          centers[i * 2 + 1] + offsets[component + 1] * scale, offsets[component + 2] * scale);
      }
    }
    // HeroPost observes this version, recalculates the bounds and redraws the
    // mask; the deformation also needs fresh normals for real moving refraction.
    positions.needsUpdate = true; geometry.computeVertexNormals();
  };
  setPhase(0);
  (geometry.getAttribute('normal') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
  geometry.computeBoundingBox();
  return { geometry, setPhase };
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
    color: visual.glass.tint, metalness: 0, roughness: visual.glass.roughness, transmission: 1,
    thickness: visual.glass.thickness, ior: visual.glass.ior, dispersion: visual.glass.dispersion,
    envMapIntensity: visual.glass.environment, clearcoat: visual.glass.clearcoat, toneMapped: true, clearcoatRoughness: .04,
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
  const ringSurface = mobiusGeometry();
  const mesh = new THREE.Mesh(ringSurface.geometry, material);
  const pose = new THREE.Group(); pose.add(mesh); scene.add(pose);
  const key = new THREE.PointLight(0xe7f3ff, visual.lighting.point, 0, 2); key.position.set(-4, 5, 7);
  const warm = new THREE.PointLight(0xffe6c4, 90, 0, 2); warm.position.set(5, -2, 4);
  scene.add(key, warm, new THREE.HemisphereLight(0xf2f7ff, 0x6c7588, visual.lighting.fill));
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
  let post: HeroPost | undefined;
  // An offscreen target is not necessarily Three's transmission buffer: post
  // draws into its own background/color targets. Only a target different from
  // the outer scene render is the nested transmission pass owned by this scene.
  let sceneTarget: THREE.WebGLRenderTarget | null = null;
  const transmissionTargets = new Set<THREE.WebGLRenderTarget>();
  scene.onBeforeRender = () => { sceneTarget = renderer.getRenderTarget(); };
  photoPlane.onBeforeRender = (_renderer, _scene, _camera, _geometry, currentMaterial) => {
    const target = renderer.getRenderTarget();
    currentMaterial.colorWrite = !!post || target !== null;
    if (target && target !== sceneTarget) transmissionTargets.add(target);
  };
  let ownsPhotoTexture = false;
  let photoTexture: THREE.Texture | undefined, photo: LoadedHeroPhoto | undefined;
  let width = 1, height = 1, dpr = 0, units = 1, layoutDirty = true, dirty = true;
  let postWidth = 0, postHeight = 0, postDpr = 0;
  let angle = 1.5, wavePhase = 0, targetX = 0, targetY = 0, tiltX = 0, tiltY = 0;
  let cameraX = 0, cameraY = 0, lightAngle: number = visual.rimLight.angle, targetLightAngle: number = visual.rimLight.angle;
  let disposed = false, handingOff = false, handedOff = false, poseFrozen = false, handoffTimer = 0, frameCount = 0;
  let presentationRequested = false;
  let onHandoff: (() => void) | undefined, onMorph: ((transition: EntryTransition) => void) | undefined;
  let transition: EntryTransition | undefined, notifiedTransition = -1;
  let drag: { id: number; x: number; y: number; tx: number; ty: number } | undefined;
  let pointerId: number | undefined, pointerInside = false, pointerPushes = 0;
  const uv = new THREE.Vector2(), previousUv = new THREE.Vector2(), impulse = new THREE.Vector2();
  const viewDirection = new THREE.Vector3(), lookAt = new THREE.Vector3();
  const touches = new Set<number>(), cleanup: Array<() => void> = [];
  const originalTouchAction = visualElement.style.touchAction;
  visualElement.style.touchAction = 'pinch-zoom';
  canvasHost.dataset.entryRing = 'true';
  delete canvasHost.dataset.entryRingReady;

  const motionEnabled = () => !disabled && !reduced.matches;
  const mark = () => { if (!disposed) { dirty = true; requestFrame(); } };
  const configurePost = () => {
    if (!post) return;
    if (postWidth !== width || postHeight !== height || postDpr !== dpr) {
      post.setSize(width, height, dpr || 1);
      postWidth = width; postHeight = height; postDpr = dpr;
    }
    if (photo && photoTexture) {
      const cover = photoCover(width, height, photo.width, photo.height);
      post.setPhotograph(photoTexture, width / cover.width, height / cover.height);
    }
    post.invalidateBackground(); post.invalidateMask();
  };
  const updatePhotoSize = () => {
    if (!photo) return;
    const cover = photoCover(width, height, photo.width, photo.height);
    photoPlane.scale.set(cover.width * units, cover.height * units, 1);
    configurePost();
  };
  const measure = () => {
    if (disposed || handingOff || !layoutDirty) return;
    layoutDirty = false;
    const bounds = hero.getBoundingClientRect(), box = visualElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !box.width || !box.height) return;
    width = bounds.width; height = bounds.height; units = 14 / height;
    camera.left = -width * units / 2; camera.right = width * units / 2;
    camera.top = 7; camera.bottom = -7; camera.updateProjectionMatrix();
    const nextDpr = Math.min(devicePixelRatio || 1, width < 700 ? visual.glass.mobileDpr : visual.glass.maxDpr);
    const actualSize = renderer.getSize(new THREE.Vector2());
    if (nextDpr !== dpr || actualSize.x !== width || actualSize.y !== height) {
      dpr = nextDpr; renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    }
    pose.position.set((box.left - bounds.left + box.width / 2 - width / 2) * units,
      (height / 2 - (box.top - bounds.top + box.height / 2)) * units, 0);
    pose.scale.setScalar(Math.min(box.width / 7.5, box.height / 4.6) * units * .94);
    updatePhotoSize(); if (!photo) configurePost(); dirty = true;
  };
  const refresh = () => { layoutDirty = true; mark(); };
  const applyPose = () => {
    pose.rotation.set(1.05 + tiltY, tiltX, -.06);
    mesh.rotation.z = angle;
    key.position.set(pose.position.x + Math.cos(lightAngle) * visual.rimLight.radius,
      pose.position.y + Math.sin(lightAngle) * visual.rimLight.radius, visual.rimLight.z);
    warm.position.set(pose.position.x + 5, pose.position.y - 2, 4);
    camera.position.set(cameraX, cameraY, 20);
    lookAt.set(cameraX * visual.cameraMotion.lookAtFactor, cameraY * visual.cameraMotion.lookAtFactor, 0);
    camera.lookAt(lookAt); camera.updateMatrixWorld();
    // Keep the source photograph screen-locked while the ring's viewpoint moves.
    camera.getWorldDirection(viewDirection);
    photoPlane.position.copy(camera.position).addScaledVector(viewDirection, 25);
    photoPlane.quaternion.copy(camera.quaternion); photoPlane.updateMatrixWorld(true);
    pose.updateMatrixWorld(true);
    if (qa) {
      canvasHost.dataset.entryPose = [angle, tiltX, tiltY].map(value => value.toFixed(5)).join(',');
      canvasHost.dataset.entryView = [cameraX, cameraY, lightAngle].map(value => value.toFixed(5)).join(',');
      canvasHost.dataset.entryWavePhase = wavePhase.toFixed(5);
    }
  };
  const redraw = (delta = getFrameSnapshot().delta || 1 / 60) => {
    // Warming can yield between frames. Do not show a transmission surface
    // before both its photograph and the chosen rendering pipeline are ready.
    if (disposed || document.hidden || handingOff || !presentationRequested || !photo || !photoTexture) return;
    measure(); applyPose();
    const target = renderer.getRenderTarget(), color = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha(), autoClear = renderer.autoClear;
    const viewport = renderer.getViewport(new THREE.Vector4()), scissor = renderer.getScissor(new THREE.Vector4());
    const scissorTest = renderer.getScissorTest();
    try {
      renderer.setRenderTarget(null); renderer.setViewport(0, 0, width, height); renderer.setScissorTest(false);
      renderer.autoClear = true; renderer.setClearColor(0x000000, 0);
      if (post) { post.setGlassOnly(true); post.render(scene, camera, mesh, photoPlane, delta, motionEnabled()); }
      else renderer.render(scene, camera);
      dirty = false; frameCount++;
      canvasHost.dataset.entryRingReady = 'true';
      renderer.domElement.dataset.fluid = post?.active ? 'active' : 'rest';
      if (qa) { canvasHost.dataset.entryFrames = String(frameCount); canvasHost.dataset.entryPost = String(!!post); }
    } finally {
      renderer.setRenderTarget(target); renderer.setViewport(viewport); renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest); renderer.autoClear = autoClear; renderer.setClearColor(color, alpha);
    }
  };
  const reset = () => {
    targetX = 0; targetY = 0; targetLightAngle = visual.rimLight.angle;
    pointerInside = false; pointerId = undefined; mark();
  };
  const releaseDrag = () => {
    const previous = drag;
    drag = undefined;
    if (previous && visualElement.hasPointerCapture(previous.id)) {
      try { visualElement.releasePointerCapture(previous.id); } catch { /* A cancelled pointer may already have gone. */ }
    }
  };
  const pushPointer = (event: PointerEvent, fresh = false) => {
    const bounds = hero.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    uv.set((event.clientX - bounds.left) / bounds.width, 1 - (event.clientY - bounds.top) / bounds.height);
    if (fresh || pointerId !== event.pointerId) pointerInside = false;
    if (pointerInside && post) {
      impulse.copy(uv).sub(previousUv);
      if (impulse.lengthSq() > 0) {
        post.push(uv, impulse); pointerPushes++;
        if (qa) canvasHost.dataset.entryPointerPushes = String(pointerPushes);
      }
    }
    previousUv.copy(uv); pointerId = event.pointerId; pointerInside = true;
    if (qa) canvasHost.dataset.entryPointer = `${uv.x.toFixed(5)},${uv.y.toFixed(5)}`;
  };
  const move = (event: PointerEvent) => {
    if (disposed || !motionEnabled() || touches.size > 1 || handingOff && transition?.mode !== 'morph') return;
    const box = visualElement.getBoundingClientRect();
    const captured = drag?.id === event.pointerId;
    const bounds = handingOff ? hero.getBoundingClientRect() : box;
    const mouseInside = event.pointerType === 'mouse'
      && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!captured && !mouseInside) { if (pointerInside && !drag) reset(); return; }
    // Pose freezes at the morph's first frame, but the same velocity field keeps
    // accepting the captured gesture or mouse movement across the hero.
    pushPointer(event);
    if (handingOff) { mark(); return; }
    if (drag && drag.id === event.pointerId) {
      const size = Math.max(180, box.width);
      targetX = THREE.MathUtils.clamp(drag.tx + (event.clientX - drag.x) / size * 2, -1, 1);
      targetY = THREE.MathUtils.clamp(drag.ty + (event.clientY - drag.y) / size * 2, -1, 1);
    } else if (event.pointerType === 'mouse') {
      targetX = THREE.MathUtils.clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1);
      targetY = THREE.MathUtils.clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1);
    }
    const dx = event.clientX - box.left - box.width / 2, dy = box.top + box.height / 2 - event.clientY;
    if (Math.hypot(dx, dy) > Math.min(box.width, box.height) * visual.rimLight.centerDeadZone) targetLightAngle = Math.atan2(dy, dx);
    mark();
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') touches.add(event.pointerId);
    if (touches.size > 1) { releaseDrag(); reset(); return; }
    if (disposed || !motionEnabled() || handingOff || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, tx: targetX, ty: targetY };
    pushPointer(event, true);
    try { visualElement.setPointerCapture(event.pointerId); } catch { releaseDrag(); reset(); return; }
    mark();
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
    if (event.key === 'ArrowLeft') targetX = Math.max(-1, targetX - .25);
    else if (event.key === 'ArrowRight') targetX = Math.min(1, targetX + .25);
    else if (event.key === 'ArrowUp') targetY = Math.max(-1, targetY - .25);
    else if (event.key === 'ArrowDown') targetY = Math.min(1, targetY + .25);
    else if (event.key === 'Home') { targetX = 0; targetY = 0; }
    else return;
    event.preventDefault(); mark();
  };
  window.addEventListener('pointermove', move, { passive: true });
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
    window.removeEventListener('pointermove', move); visualElement.removeEventListener('pointerdown', down);
    visualElement.removeEventListener('pointerleave', leave); visualElement.removeEventListener('keydown', keydown);
    visualElement.removeEventListener('lostpointercapture', lostCapture);
    visualElement.removeEventListener('blur', reset);
    window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    window.removeEventListener('pointerdown', trackTouch, true); window.removeEventListener('blur', loseWindow);
  });
  const observer = new ResizeObserver(refresh); observer.observe(hero); observer.observe(visualElement);
  cleanup.push(() => observer.disconnect(), subscribeViewportChange(refresh));
  const motionChanged = () => {
    loseWindow();
    if (!motionEnabled() && !handingOff && !poseFrozen) { tiltX = 0; tiltY = 0; cameraX = 0; cameraY = 0; lightAngle = visual.rimLight.angle; }
    mark();
  };
  const visibility = () => { if (document.hidden) loseWindow(); else mark(); };
  reduced.addEventListener('change', motionChanged); document.addEventListener('visibilitychange', visibility);
  cleanup.push(() => { reduced.removeEventListener('change', motionChanged); document.removeEventListener('visibilitychange', visibility); });
  cleanup.push(subscribeFrame(() => { measure(); }, 'measure'));
  cleanup.push(subscribeFrame((_time, delta) => {
    if (disposed || document.hidden) return false;
    if (motionEnabled() && !handingOff && !poseFrozen) {
      const elapsed = Math.min(.1, getFrameSnapshot().elapsed || delta);
      angle += .15 * elapsed;
      wavePhase = (wavePhase + Math.PI * 2 * elapsed / loadingWave.period) % (Math.PI * 2);
      ringSurface.setPhase(wavePhase);
      const follow = 1 - Math.exp(-visual.pointer.damping * delta);
      tiltX += (targetX * visual.pointer.rotationY - tiltX) * follow;
      tiltY += (targetY * visual.pointer.rotationX - tiltY) * follow;
      const cameraFollow = 1 - Math.exp(-(pointerInside ? visual.cameraMotion.damping : visual.cameraMotion.leaveDamping) * delta);
      // Match the wordmark camera's displacement relative to its 26-unit view.
      cameraX += (targetX * visual.cameraMotion.offsetX * 14 / 26 - cameraX) * cameraFollow;
      cameraY += (-targetY * visual.cameraMotion.offsetY * 14 / 26 - cameraY) * cameraFollow;
      const difference = Math.atan2(Math.sin(targetLightAngle - lightAngle), Math.cos(targetLightAngle - lightAngle));
      lightAngle += difference * (1 - Math.exp(-visual.rimLight.damping * delta)); dirty = true;
    }
    return false;
  }, 'update'));
  cleanup.push(subscribeFrame((_time, delta) => {
    if (disposed || document.hidden || handingOff) return false;
    if (dirty || post?.active) {
      try { redraw(delta); } catch { canvasHost.dataset.entryRingFailure = 'render'; dispose(); }
    }
    return motionEnabled() && !handingOff && (!poseFrozen || !!post?.active);
  }, 'render'));

  const dispose = () => {
    if (disposed) return;
    disposed = true; api.active = false; window.clearTimeout(handoffTimer);
    cleanup.splice(0).forEach(fn => fn());
    mesh.geometry.dispose(); material.dispose(); if (ownsPhotoTexture) photoTexture?.dispose();
    photoPlane.geometry.dispose(); photoMaterial.dispose();
    for (const target of transmissionTargets) target.dispose();
    transmissionTargets.clear(); scene.clear(); post = undefined;
    delete canvasHost.dataset.entryRing;
    delete canvasHost.dataset.entryRingReady;
  };
  const handoff = () => {
    if (handedOff) return;
    handedOff = true; dispose();
    // The owner draws the signature in this same call. Never clear the shared
    // canvas or dispose/reset its fluid buffers between the two glass surfaces.
    onHandoff?.();
    canvasHost.dataset.entryHandoff = 'in'; renderer.domElement.dataset.entryHandoff = 'in';
    requestFrame();
  };
  const notifyMorph = () => {
    if (!transition || !onMorph || transition.id === notifiedTransition || disposed) return;
    notifiedTransition = transition.id; onMorph(transition);
  };
  const phaseChanged = () => {
    if (bridge.phase === 'complete') { handoff(); return; }
    if (bridge.phase === 'revealing' && bridge.transition && bridge.transition.id !== transition?.id) {
      transition = bridge.transition;
      handingOff = true; dirty = false; window.clearTimeout(handoffTimer);
      const state = transition.mode === 'morph' ? 'morph' : 'out';
      canvasHost.dataset.entryHandoff = state; renderer.domElement.dataset.entryHandoff = state;
      if (qa) canvasHost.dataset.entryTransition = String(transition.id);
      // A captured finger continues to drive the shared post while the parent
      // morphs geometry. Completion, not a 300ms timer, retires this surface.
      if (transition.mode === 'fade') {
        releaseDrag(); reset();
        handoffTimer = window.setTimeout(handoff, reduced.matches ? 0 : Math.min(150, transition.durationMs));
      }
      notifyMorph(); requestFrame();
    }
  };
  const api: EntryRing = {
    active: true, surface: Object.freeze({ scene, camera, mesh, backdrop: photoPlane,
      get wavePhase() { return wavePhase; },
    }), refresh, redraw, dispose,
    present() {
      if (disposed || handingOff) return;
      presentationRequested = true; mark(); redraw();
    },
    freezePose() {
      if (disposed || poseFrozen) return;
      poseFrozen = true; applyPose(); mark();
      if (qa) {
        canvasHost.dataset.entryPoseFrozen = 'true';
        canvasHost.dataset.entryWaveFrozen = 'true';
      }
    },
    setOnHandoff(fn) { onHandoff = fn; if (handedOff) fn(); },
    setOnMorph(fn) { onMorph = fn; notifyMorph(); },
    setPost(sharedPost) {
      if (disposed || post === sharedPost) return;
      post = sharedPost; postWidth = 0; postHeight = 0; postDpr = 0;
      pointerInside = false; pointerId = undefined;
      configurePost(); mark();
    },
    setPhoto(asset, sharedTexture) {
      if (disposed) return;
      const next = sharedTexture ?? new THREE.Texture(asset.image);
      const previous = ownsPhotoTexture && photoTexture !== next ? photoTexture : undefined; photo = asset;
      ownsPhotoTexture = !sharedTexture;
      photoTexture = next;
      if (ownsPhotoTexture) {
        photoTexture.colorSpace = THREE.SRGBColorSpace; photoTexture.needsUpdate = true;
        photoTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      }
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
