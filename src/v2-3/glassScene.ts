import * as THREE from 'three';
import { visual } from './config';
import { HeroPost } from './heroPost';
import { createSkyBackdrop } from './skyBackdrop';
import { getSky } from './skyState';
import { getTwinkles } from './twinkle';
import { getProjectSky } from './projectSkyState';
import { createProjectAtlas } from './projectAtlas';
import { getFrameSnapshot, getPerformanceSnapshot, reportGpuTime, requestFrame, subscribeFrame } from './runtime';
import { createHeroGpuProfiler } from './gpuTiming';
import { photoCover, subscribeHeroPhoto, type LoadedHeroPhoto } from './heroPhoto';
import { recordTouchEvent, recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';
import { createEntryLogo, type EntryLogo } from './entryLogo';
import { prepareWritingField } from './liquidWriting';
import { createSignatureWriting } from './signatureWriting';
import { createDockLogo } from './dockLogo';
import type { EntryTransition } from './entry';
import { observeHeroLayout, type HeroLayout } from './heroLayout';

declare global { interface Window { __gxcCapturePoster?: () => string } }

type Wordmark = { positions: number[]; normals: number[]; indices: number[] };
export interface GlassScene { setMotion(value: boolean): void; setSuspended(value: boolean): void; dispose(): void }

function createStudio(renderer: THREE.WebGLRenderer) {
  const studio = new THREE.Scene(); studio.background = new THREE.Color(0x111216);
  const panels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    for (const p of visual.lighting.panels) {
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.strength), side: THREE.DoubleSide });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(...p.size), material);
      panel.position.set(p.position[0], p.position[1], p.position[2]); panel.lookAt(0, 0, 0); studio.add(panel); panels.push(panel);
    }
    return pmrem.fromScene(studio, .06);
  } finally {
    for (const panel of panels) { panel.geometry.dispose(); panel.material.dispose(); }
    pmrem.dispose();
  }
}

export async function mountGlass(host: HTMLElement, area: HTMLElement, disabled: boolean, onLost: () => void): Promise<GlassScene> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV });
  const cleanup: (() => void)[] = [];
  let disposed = false, contextLost = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (import.meta.env.DEV) delete window.__gxcCapturePoster;
    for (const release of cleanup.reverse()) release();
    renderer.dispose(); renderer.domElement.remove();
  };
  try {
    renderer.setClearColor(0x090a0c, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = visual.lighting.exposure;
    renderer.debug.onShaderError = () => { throw new Error('Glass shader could not compile'); };
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    const contextUnavailable = (event: Event) => {
      event.preventDefault(); contextLost = true; host.dataset.failed = 'context-lost'; onLost(); dispose();
    };
    renderer.domElement.addEventListener('webglcontextlost', contextUnavailable);
    cleanup.push(() => renderer.domElement.removeEventListener('webglcontextlost', contextUnavailable));
    const diagnostics = new URLSearchParams(location.search);
    const nativePhoto = !(diagnostics.get('qa') === '1' && diagnostics.has('opaque-photo'));
    host.dataset.photoPresentation = nativePhoto ? 'native' : 'opaque-control';
    const gpu = createHeroGpuProfiler(renderer.getContext() as WebGL2RenderingContext,
      ms => reportGpuTime('hero', ms), diagnostics.get('perf') === '1' && diagnostics.get('passes') === '1');
    cleanup.push(() => gpu.dispose());
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-20, 20, 10, -10, .1, 150);
    camera.position.set(0, 0, 40);

    const hero = host.closest<HTMLElement>('.gxc-hero') ?? host;
    let currentPhoto: LoadedHeroPhoto | undefined;
    // One GPU photograph belongs to this renderer. The opening borrows it;
    // its identity UVs stay separate from the signature's texture crop.
    let photo!: THREE.Texture;
    const makePhotoTexture = (asset: LoadedHeroPhoto) => {
      const texture = new THREE.Texture(asset.image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      return texture;
    };
    cleanup.push(() => photo?.dispose());
    let entryLogo: EntryLogo | undefined;
    let replacePhoto: ((asset: LoadedHeroPhoto, texture: THREE.Texture) => void) | undefined;
    let resolvePhoto!: (asset: LoadedHeroPhoto) => void;
    let rejectPhoto!: (reason: Error) => void;
    const photoReady = new Promise<LoadedHeroPhoto>((resolve, reject) => { resolvePhoto = resolve; rejectPhoto = reject; });
    cleanup.push(() => rejectPhoto(new Error('Glass initialization cancelled')));
    cleanup.push(subscribeHeroPhoto(hero, asset => {
      if (disposed || contextLost) return;
      if (currentPhoto?.image === asset.image && currentPhoto.url === asset.url && photo) { resolvePhoto(asset); return; }
      const previous = photo;
      photo = makePhotoTexture(asset); currentPhoto = asset;
      // Switch both borrowers before retiring the old texture. The same image
      // must never be uploaded independently by the logo and signature.
      entryLogo?.setPhoto(asset, photo); replacePhoto?.(asset, photo);
      previous?.dispose(); resolvePhoto(asset);
    }, () => rejectPhoto(new Error('Background photograph could not load'))));
    // Share the responsive decoded resource with the DOM rather than independently
    // loading a fixed low-resolution backdrop after the wordmark module arrives.
    const wordAbort = new AbortController(); cleanup.push(() => wordAbort.abort());
    const wordReady = fetch('/v-next/galaxci-inflated-mesh.json', { signal: wordAbort.signal }).then(response => {
        if (!response.ok) throw new Error('Wordmark could not load');
        return response.json() as Promise<Wordmark>;
      });
    // Attach rejection handlers before studio/logo creation can throw. A lost
    // context also cancels both pending initialization resources through cleanup.
    const assetsReady = Promise.allSettled([wordReady, photoReady]);
    // The opening and signature share one context, environment and transmission
    // pipeline. The SVG-derived logo can draw while the signature downloads.
    const environment = createStudio(renderer);
    cleanup.push(() => environment.dispose()); scene.environment = environment.texture;
    try { entryLogo = createEntryLogo(renderer, hero, host, environment.texture, disabled); }
    catch (error) { host.dataset.entryLogoFailure = error instanceof Error ? error.message : 'initialization'; }
    cleanup.push(() => entryLogo?.dispose());
    if (currentPhoto) entryLogo?.setPhoto(currentPhoto, photo);
    const [wordResult, photoResult] = await assetsReady;
    if (disposed || contextLost) throw new Error('Glass context unavailable');
    if (wordResult.status === 'rejected') throw wordResult.reason;
    if (photoResult.status === 'rejected') throw photoResult.reason;
    const data = wordResult.value;
    currentPhoto = currentPhoto ?? photoResult.value;
    const backdropGeometry = new THREE.PlaneGeometry(1, 1);
    const backdropMaterial = new THREE.MeshBasicMaterial({ map: photo, color: visual.lighting.backdropTint, toneMapped: false });
    cleanup.push(() => backdropGeometry.dispose(), () => backdropMaterial.dispose());
    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.z = -6; scene.add(backdrop);
    const skyBackdrop = createSkyBackdrop(backdropMaterial, nativePhoto);
    backdrop.onBeforeRender = currentRenderer => skyBackdrop.beforeDraw(currentRenderer);
    let skyRevision = -1, twinkleRevision = -1, projectRevision = -1;
    let projectAtlas: THREE.CanvasTexture | undefined;
    let invalidateProjects = () => {};
    // Atlas failures leave the DOM icons intact, and never prevent the glass
    // or photograph from loading. The immutable atlas has no animation loop.
    if (new URLSearchParams(location.search).has('no-project-atlas')) host.dataset.projectAtlas = 'disabled';
    else void createProjectAtlas().then(texture => {
      if (disposed || contextLost) { texture.dispose(); return; }
      projectAtlas = texture; skyBackdrop.setProjectAtlas(texture);
      host.dataset.projectAtlas = 'ready'; invalidateProjects();
    }).catch(() => { if (!disposed) host.dataset.projectAtlas = 'failed'; });
    cleanup.push(() => {
      skyBackdrop.dispose(); projectAtlas?.dispose();
      delete hero.dataset.skyReady; delete hero.dataset.projectSkyReady;
    });

    // Keep the existing signature material and lighting unchanged.
    const material = new THREE.MeshPhysicalMaterial({
      color: visual.glass.tint, metalness: 0, roughness: visual.glass.roughness,
      transmission: 1, thickness: visual.glass.thickness, ior: visual.glass.ior,
      dispersion: visual.glass.dispersion, envMapIntensity: visual.glass.environment,
      clearcoat: visual.glass.clearcoat, clearcoatRoughness: .04, attenuationColor: visual.glass.attenuation, attenuationDistance: 50,
      side: THREE.FrontSide,
    });
    cleanup.push(() => material.dispose());
    material.onBeforeCompile = shader => {
      shader.uniforms.gxcScatterStrength = { value: new URLSearchParams(location.search).has('no-scattering') ? 0 : visual.scattering.strength };
      shader.fragmentShader = 'uniform float gxcScatterStrength;\n' + shader.fragmentShader;
      // Expose the photographed stars inside the glass without brightening the page.
      const transmission = THREE.ShaderChunk.transmission_fragment.replace('transmitted.rgb, material.transmission', `transmitted.rgb * ${visual.glass.starExposure.toFixed(1)}, material.transmission`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', transmission + `
        #if defined(USE_TRANSMISSION) && NUM_POINT_LIGHTS > 0
          // A faint material-space light diffusion approximation, confined to the glass.
          // Three's geometry and point lights share view space, including orthographic views.
          IncidentLight gxcScatterLight;
          getPointLightInfo(pointLights[0], geometryPosition, gxcScatterLight);
          float gxcFacing = saturate(dot(geometryNormal, geometryViewDir));
          float gxcWrapped = saturate((dot(geometryNormal, gxcScatterLight.direction) + ${visual.scattering.wrap}) / ${(1 + visual.scattering.wrap).toFixed(2)});
          float gxcPath = 1. - exp(-${visual.scattering.density} * material.thickness / max(gxcFacing, .3));
          float gxcShoulder = .3 + .7 * pow(1. - gxcFacing, 1.5);
          totalDiffuse += gxcScatterLight.color * pow(gxcWrapped, 1.5) * gxcPath * gxcShoulder * gxcScatterStrength;
        #endif
      `);
    };
    const geometry = new THREE.BufferGeometry(); cleanup.push(() => geometry.dispose());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setIndex(data.indices); geometry.computeBoundingBox();
    const wordSize = geometry.boundingBox!.getSize(new THREE.Vector3());
    const wordCenter = geometry.boundingBox!.getCenter(new THREE.Vector3());
    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group(); group.add(mesh); scene.add(group);
    const light = new THREE.PointLight(0xeaf2ff, visual.lighting.point, 90, 2); scene.add(light);
    const fill = new THREE.DirectionalLight(0xffffff, visual.lighting.fill); fill.position.set(-5, 9, 6); scene.add(fill);
    // Every visible glass part belongs to one owner, so the photograph cache
    // excludes BOTH the signature and the persistent header logo.
    const glassGeometry = new THREE.BufferGeometry(); glassGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    glassGeometry.boundingBox = new THREE.Box3(); glassGeometry.boundingSphere = new THREE.Sphere();
    const glassOwnerMaterial = new THREE.MeshBasicMaterial();
    const glassOwner = new THREE.Mesh(glassGeometry, glassOwnerMaterial); glassOwner.frustumCulled = false;
    scene.add(glassOwner); glassOwner.add(group);
    const dock = createDockLogo(camera, hero, host, material, [light, fill]);
    glassOwner.add(dock.mesh, dock.lights);
    const partBox = new THREE.Box3();
    const syncGlass = () => {
      glassOwner.updateMatrixWorld(true);
      const parts: THREE.Mesh[] = [];
      glassOwner.traverseVisible(object => { if (object instanceof THREE.Mesh && object !== glassOwner && object.geometry.getAttribute('position')?.count) parts.push(object); });
      glassOwner.userData.heroGlassParts = parts;
      glassOwner.geometry.boundingBox!.makeEmpty();
      for (const part of parts) {
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        partBox.copy(part.geometry.boundingBox!).applyMatrix4(part.matrixWorld);
        glassOwner.geometry.boundingBox!.union(partBox);
      }
      glassOwner.userData.heroMaskRevision = (glassOwner.userData.heroMaskRevision ?? 0) + 1;
    };
    cleanup.push(() => { dock.dispose(); glassGeometry.dispose(); glassOwnerMaterial.dispose(); glassOwner.removeFromParent(); });


    const flags = new URLSearchParams(location.search);
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const noPost = flags.has('no-postfx'), noFluid = flags.has('no-fluid'), noFlare = flags.has('no-flare');
    let post: HeroPost | undefined;
    let touchInteracting = false, postDrawing = false, previousContact: number | null = null;
    let postFailed = !renderer.extensions.has('EXT_color_buffer_float');
    let enabled = !disabled, visible = true, dirty = true, inside = false, suspended = false;
    let pointerX = 0, pointerY = 0, angle: number = visual.rimLight.angle, targetAngle: number = visual.rimLight.angle;
    let rx = .07, ry = -.07, cameraX = 0, cameraY = 0;
    let lastWidth = 0, lastHeight = 0, lastDpr = 0, documentTop = 0, left = 0;
    let lastWordTop = NaN, lastWordHeight = NaN;
    let lastPointerTime = -1, frames = 0, lastDrawAt = 0;
    let invalidateOpeningLayout: (() => void) | undefined;
    invalidateProjects = () => {
      projectRevision = -1; dirty = true; post?.invalidateBackground(); requestFrame();
    };
    const previousUv = new THREE.Vector2(), uv = new THREE.Vector2(), impulse = new THREE.Vector2();
    const center = new THREE.Vector3(), hit = new THREE.Vector3(), lookAt = new THREE.Vector3(), viewDirection = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(), rayNdc = new THREE.Vector2();
    const wordPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const parent = host.parentElement?.parentElement ?? host;
    const reset = (immediate = false) => {
      pointerX = 0; pointerY = 0; targetAngle = visual.rimLight.angle; inside = false; lastPointerTime = -1;
      touchInteracting = false; previousContact = null;
      if (immediate) { rx = .07; ry = -.07; angle = visual.rimLight.angle; cameraX = 0; cameraY = 0; post?.reset(); lastDrawAt = 0; }
      dirty = true; requestFrame();
    };
    const updatePost = () => {
      const wanted = enabled && (finePointer.matches || touchInteracting || entryLogo?.active) && !noPost && !(noFluid && noFlare) && !postFailed;
      // A phone pays for these buffers only after its first glass gesture. Keep
      // them for the next contact, but bypass the post pipeline once its tail ends.
      if (wanted && !post) {
        const started = performance.now();
        try {
          post = new HeroPost(renderer, nativePhoto); post.setFlare(!noFlare); post.setSize(lastWidth || 1, lastHeight || 1, lastDpr || 1);
          const cover = photoCover(lastWidth || 1, lastHeight || 1, currentPhoto!.width, currentPhoto!.height);
          post.setPhotograph(photo, (lastWidth || 1) / cover.width, (lastHeight || 1) / cover.height);
          entryLogo?.setPost(post);
          recordTouchMetric('heroPostAllocations');
          sampleTouchMetric('heroPostCreateMs', performance.now() - started);
          recordTouchEvent('hero-post-created', { input: touchInteracting ? 'touch' : 'fine-pointer' });
        } catch { entryLogo?.setPost(undefined); post?.dispose(); post = undefined; postFailed = true; }
      }
      renderer.domElement.dataset.postfx = post ? 'ready' : postFailed ? 'unsupported' : 'disabled';
    };
    const usePost = () => !!post && enabled && !noPost && (finePointer.matches || touchInteracting || post.active);
    cleanup.push(() => post?.dispose());
    const resize = ({ canvas: rect, word, documentTop: measuredTop, dpr: deviceDpr }: HeroLayout) => {
      if (disposed || contextLost) return;
      const width = rect.width, height = rect.height; if (!width || !height) return;
      left = rect.left; documentTop = measuredTop;
      const dpr = Math.min(deviceDpr, width < 700 ? visual.glass.mobileDpr : visual.glass.maxDpr);
      const wordTop = word.top - rect.top;
      const openingLayoutChanged = width !== lastWidth || height !== lastHeight || dpr !== lastDpr
        || wordTop !== lastWordTop || word.height !== lastWordHeight;
      lastWordTop = wordTop; lastWordHeight = word.height;
      if (width !== lastWidth || height !== lastHeight || dpr !== lastDpr) {
        renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
        lastWidth = width; lastHeight = height; lastDpr = dpr; post?.setSize(width, height, dpr);
      }
      const viewHeight = 26, viewWidth = viewHeight * width / height;
      camera.left = -viewWidth / 2; camera.right = viewWidth / 2; camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2; camera.updateProjectionMatrix();
      const pad = width < 700 ? 22 : 80;
      group.scale.setScalar(Math.min((width - pad * 2) / wordSize.x, word.height * .88 / wordSize.y) * viewHeight / height);
      group.position.y = (height / 2 - (wordTop + word.height / 2)) * viewHeight / height;
      // Overscan covers the small camera movement; UV compensation preserves the original crop.
      const overscan = visual.cameraMotion.overscan;
      backdrop.scale.set(viewWidth * overscan, viewHeight * overscan, 1);
      const cover = photoCover(width, height, currentPhoto!.width, currentPhoto!.height);
      post?.setPhotograph(photo, width / cover.width, height / cover.height);
      photo.repeat.set(width / cover.width, height / cover.height);
      photo.repeat.multiplyScalar(overscan); photo.offset.set((1 - photo.repeat.x) / 2, (1 - photo.repeat.y) / 2);
      skyBackdrop.update(getSky(hero), width, height, overscan);
      post?.invalidateBackground();
      applyPose(); publishWordRect();
      // Commit the new endpoint before retiring a cached/active handwriting
      // surface, including row reflow that leaves the renderer size unchanged.
      if (openingLayoutChanged) invalidateOpeningLayout?.();
      dirty = true; requestFrame();
    };
    const applyPose = () => {
      group.rotation.set(rx, ry, -.018); group.updateMatrixWorld(true);
      center.copy(wordCenter).applyMatrix4(mesh.matrixWorld);
      light.position.set(center.x + Math.cos(angle) * visual.rimLight.radius, center.y + Math.sin(angle) * visual.rimLight.radius, visual.rimLight.z);
      camera.position.set(cameraX, cameraY, 40);
      lookAt.set(cameraX * visual.cameraMotion.lookAtFactor, cameraY * visual.cameraMotion.lookAtFactor, 0);
      camera.lookAt(lookAt); camera.updateMatrixWorld();
      // The photograph is a screen-locked backdrop. Only the glass changes viewpoint.
      camera.getWorldDirection(viewDirection);
      backdrop.position.copy(camera.position).addScaledVector(viewDirection, 46);
      backdrop.quaternion.copy(camera.quaternion);
      backdrop.updateMatrixWorld(true);
    };
    const publishWordRect = (layoutChanged = true) => {
      const bounds = geometry.boundingBox!, point = new THREE.Vector3();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        point.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
        const px = (point.x + 1) * lastWidth / 2, py = (1 - point.y) * lastHeight / 2;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      // Include the small pointer parallax and liquid perimeter when reserving space.
      const margin = 18;
      const next = JSON.stringify({ left: minX - margin, top: minY - margin, width: maxX - minX + margin * 2, height: maxY - minY + margin * 2 });
      if (layoutChanged && host.dataset.wordRect !== next) host.dataset.wordRect = next;
      // Interaction follows the current pose without forcing the meteor layout
      // to recompute its reserved wordmark area on every pointer movement.
      if (host.dataset.touchRect !== next) host.dataset.touchRect = next;
    };
    replacePhoto = (asset, texture) => {
      if (disposed || contextLost) return;
      backdropMaterial.map = texture;
      skyBackdrop.updateTwinkles(asset.fallback ? [] : getTwinkles(hero).points);
      renderer.domElement.dataset.photoSource = asset.url;
      layout.invalidate();
    };
    renderer.domElement.dataset.photoSource = currentPhoto.url;
    // Both normal glass and handwriting consume the update-phase sky snapshot.
    // Refresh one shared background texture for color and transmission together.
    const syncBackdrop = () => {
      const sky = getSky(hero);
      const twinkles = getTwinkles(hero);
      const projects = getProjectSky(hero);
      if (projects.revision !== projectRevision) {
        projectRevision = projects.revision;
        skyBackdrop.updateProjects(projects);
        post?.invalidateBackground();
      }
      if (twinkles.revision !== twinkleRevision) {
        twinkleRevision = twinkles.revision;
        skyBackdrop.updateTwinkles(currentPhoto?.fallback ? [] : twinkles.points);
        post?.invalidateBackground();
      }
      if (sky.revision !== skyRevision) {
        skyRevision = sky.revision;
        skyBackdrop.update(sky, lastWidth, lastHeight, visual.cameraMotion.overscan);
        post?.invalidateBackground();
      }
      return { sky, twinkles, projects };
    };
    const publishBackdrop = ({ sky, twinkles, projects }: ReturnType<typeof syncBackdrop>) => {
      if (hero.dataset.skyReady !== 'true') hero.dataset.skyReady = 'true';
      if (projectAtlas && projects.points.length) hero.dataset.projectSkyReady = 'true';
      else delete hero.dataset.projectSkyReady;
      renderer.domElement.dataset.skyCount = String(sky.streaks.length);
      renderer.domElement.dataset.twinkleCount = String(twinkles.points.length);
      renderer.domElement.dataset.projectCount = String(projectAtlas ? projects.points.length : 0);
      if (import.meta.env.DEV || diagnostics.get('perf') === '1' || diagnostics.get('qa') === '1') {
        renderer.domElement.dataset.skyRevision = String(sky.revision);
        renderer.domElement.dataset.twinkleRevision = String(twinkles.revision);
        renderer.domElement.dataset.projectRevision = String(projects.revision);
      }
    };
    const render = (dt: number) => {
      if (!(entryLogo?.active && window.__gxcEntry?.phase === 'preparing')) dock.update();
      syncGlass();
      post?.setStaticGlassRect(dock.settled && dock.mesh.visible ? dock.rect : undefined, lastWidth, lastHeight);
      post?.setGlassOnly(false);
      renderer.setClearColor(0x090a0c, 1);
      const renderStarted = performance.now();
      if (lastDrawAt) {
        sampleTouchMetric('heroFrameIntervalMs', renderStarted - lastDrawAt);
        if (touchInteracting || post?.active) sampleTouchMetric('heroTouchFrameIntervalMs', renderStarted - lastDrawAt);
      }
      lastDrawAt = renderStarted;
      const background = syncBackdrop();
      const quality = getPerformanceSnapshot('hero').quality;
      renderer.transmissionResolutionScale = visual.renderQuality[quality].transmissionScale;
      post?.setQuality(quality);
      postDrawing = usePost();
      gpu.begin();
      try { if (post && postDrawing) {
        try { post.render(scene, camera, glassOwner, backdrop, dt, enabled && !noFluid, gpu.measure); }
        catch {
          entryLogo?.setPost(undefined); post.dispose(); post = undefined; postFailed = true; postDrawing = false; renderer.domElement.dataset.postfx = 'failed';
          recordTouchEvent('hero-post-failed');
          renderer.setRenderTarget(null); renderer.render(scene, camera);
        }
      } else renderer.render(scene, camera); } finally { gpu.end(); }
      if (dock.acknowledge(renderer.domElement)) {
        // Clear the 3D header copy before the completed entry exposes live DOM optics.
        post?.invalidateMask(); post?.invalidateBackground();
        render(0); dock.present();
        return;
      }
      recordTouchMetric(postDrawing ? 'heroPostFrames' : 'heroBaseFrames');
      sampleTouchMetric('heroDrawCpuMs', performance.now() - renderStarted);
      if (touchInteracting || post?.active) {
        recordTouchMetric('heroTouchFrames');
        sampleTouchMetric('heroTouchDrawCpuMs', performance.now() - renderStarted);
      }
      renderer.domElement.dataset.postfx = postFailed ? 'unsupported' : postDrawing ? 'enabled' : post ? 'idle' : 'disabled';
      renderer.domElement.dataset.frames = String(++frames);
      publishBackdrop(background);
      renderer.domElement.dataset.fluid = post?.active ? 'active' : 'rest';
      renderer.domElement.dataset.quality = quality;
      if (import.meta.env.DEV || diagnostics.get('perf') === '1' || diagnostics.get('qa') === '1') {
        renderer.domElement.dataset.camera = `${cameraX.toFixed(4)},${cameraY.toFixed(4)}`;
        renderer.domElement.dataset.rim = `${angle.toFixed(4)},${visual.rimLight.radius.toFixed(4)}`;
        renderer.domElement.dataset.touchInteraction = String(touchInteracting);
      }
      dirty = false;
    };
    const blur = () => reset();
    const visibility = () => { if (document.hidden) { if (window.__gxcEntry?.phase === 'complete') reset(true); } else { dirty = true; requestFrame(); } };
    const pointerMode = () => { reset(true); updatePost(); };
    const leave = () => { if (!getFrameSnapshot().pointer.glassTouch) reset(); };
    parent.addEventListener('pointerleave', leave); window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility); finePointer.addEventListener('change', pointerMode);
    cleanup.push(() => {
      parent.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); finePointer.removeEventListener('change', pointerMode);
    });
    const layout = observeHeroLayout(host, area, resize);
    cleanup.push(() => layout.dispose());
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      reset(true);
    }); io.observe(parent); cleanup.push(() => io.disconnect());
    layout.measure(); updatePost(); applyPose();
    await renderer.compileAsync(scene, camera);
    if (post) {
      try { await post.warm(); }
      catch { entryLogo?.setPost(undefined); post.dispose(); post = undefined; postFailed = true; renderer.domElement.dataset.postfx = 'failed'; }
    }
    if (disposed || contextLost) throw new Error('Glass context unavailable');
    render(1 / 60);
    if (entryLogo?.active && post) await prepareWritingField();
    if (disposed || contextLost) throw new Error('Writing preparation cancelled');
    // The opening hands one actual logo to the header while a source-free
    // pen writes the central signature. Both share the SAME post simulation.
    let morph: { surface: ReturnType<typeof createSignatureWriting>; transition: EntryTransition } | undefined;
    let preparedMorph: ReturnType<typeof createSignatureWriting> | undefined, prepareTimer = 0;
    let committingFinal = false;
    const discardPrepared = () => { preparedMorph?.dispose(); preparedMorph = undefined; if (!morph) mesh.visible = true; post?.invalidateMask(); };
    cleanup.push(() => { window.clearTimeout(prepareTimer); discardPrepared(); });
    const retireMorph = () => {
      if (!morph) return;
      morph.surface.mesh.removeFromParent(); morph.surface.dispose(); morph = undefined;
      mesh.visible = true; post?.invalidateMask(); post?.invalidateBackground(); delete host.dataset.entryMorph;
    };
    cleanup.push(retireMorph);
    const showWordAfterOpening = (dt: number) => {
      if (disposed || contextLost || committingFinal) return;
      window.clearTimeout(prepareTimer); discardPrepared(); retireMorph(); dock.finish();
      post?.invalidateBackground(); post?.invalidateMask(); layout.measure(); render(dt); requestFrame();
    };
    const finishOpening = (id: number, dt: number) => {
      if (committingFinal) return;
      committingFinal = true;
      try {
        window.clearTimeout(prepareTimer); discardPrepared(); retireMorph(); dock.finish();
        layout.measure(); render(dt);
        // Acknowledge only after the persistent logo AND real wordmark draw.
        window.__gxcEntry?.finishReveal(id);
      } finally { committingFinal = false; }
      requestFrame();
    };
    const beginMorph = (transition: EntryTransition) => {
      if (disposed || contextLost || !entryLogo || transition.mode !== 'morph') return;
      try {
        const started = performance.now(); entryLogo.freezePose();
        const surface = preparedMorph ?? createSignatureWriting({ scene, camera, mesh }, material);
        preparedMorph = undefined; window.clearTimeout(prepareTimer);
        try { surface.activate(); dock.capture(entryLogo.surface); } catch (error) { surface.dispose(); throw error; }
        morph = { surface, transition };
        mesh.visible = false; glassOwner.add(surface.mesh);
        host.dataset.entryMorphPrepareMs = (performance.now() - started).toFixed(1);
        host.dataset.entryMorph = 'active'; host.dataset.entryWriting = 'independent-signature';
        requestFrame();
      } catch (error) {
        host.dataset.entryMorphFailure = error instanceof Error ? error.message : String(error);
        finishOpening(transition.id, 1 / 60);
      }
    };
    entryLogo?.setOnHandoff(() => showWordAfterOpening(1 / 60));
    entryLogo?.setOnMorph(beginMorph);
    const prepareOpening = async () => {
      const bridge = window.__gxcEntry;
      if (!entryLogo?.active || !post || disposed || contextLost || document.hidden || bridge?.phase !== 'preparing') return;
      const readyAt = bridge.milestones.previewReady;
      const remaining = readyAt === undefined ? 100 : 4400 - (performance.now() - bridge.startedAt - readyAt);
      if (remaining > 0) { prepareTimer = window.setTimeout(() => void prepareOpening(), remaining); return; }
      const started = performance.now(); let surface: ReturnType<typeof createSignatureWriting> | undefined;
      try {
        surface = createSignatureWriting({ scene, camera, mesh }, material);
        preparedMorph = surface; surface.activate(); surface.setProgress(.5); glassOwner.add(surface.mesh); dock.update(); syncGlass();
        await post.compileGlass(scene, camera, glassOwner, backdrop);
        if (!disposed && !contextLost && preparedMorph === surface) host.dataset.entryMorphWarmed = 'true';
        host.dataset.entryMorphWarmMs = (performance.now() - started).toFixed(1);
      } catch { if (preparedMorph === surface) discardPrepared(); }
      finally {
        if (!morph && surface) { surface.mesh.removeFromParent(); mesh.visible = true; dock.mesh.visible = false; }
      }
    };
    invalidateOpeningLayout = () => {
      discardPrepared();
      if (morph) finishOpening(morph.transition.id, 0);
    };
    const brandLayout = () => { dirty = true; post?.invalidateMask(); requestFrame(); };
    document.addEventListener('gxc:brand-layout', brandLayout);
    cleanup.push(() => document.removeEventListener('gxc:brand-layout', brandLayout));
    if (entryLogo?.active && post) {
      window.__gxcEntry?.setMorphReady();
      prepareTimer = window.setTimeout(() => void prepareOpening(), 4400);
    }
    const renderMorph = (dt: number) => {
      if (!morph || disposed || contextLost || document.hidden) return false;
      const { surface, transition } = morph;
      if (window.__gxcEntry?.transition?.id !== transition.id || transition.mode !== 'morph') {
        showWordAfterOpening(dt); return false;
      }
      const heldProgress = diagnostics.get('qa') === '1' ? diagnostics.get('morph-hold') : null;
      const progress = heldProgress !== null ? THREE.MathUtils.clamp(Number(heldProgress), 0, 1) : THREE.MathUtils.clamp((performance.now() - transition.startedAt) / transition.durationMs, 0, 1);
      host.dataset.entryMorphProgress = progress.toFixed(4);
      if (progress >= 1) { finishOpening(transition.id, dt); return false; }
      surface.setProgress(progress); dock.update(progress * transition.durationMs); syncGlass();
      post?.setStaticGlassRect(dock.settled ? dock.rect : undefined, lastWidth, lastHeight);
      post?.invalidateMask(); post?.setGlassOnly(false);
      if (diagnostics.get('qa') === '1') host.dataset.entryWritingProgress = String(surface.mesh.userData.writingProgress ?? progress);
      const background = syncBackdrop(); renderer.setClearColor(0x090a0c, 1);
      if (post) post.render(scene, camera, glassOwner, backdrop, dt, enabled && !noFluid);
      else renderer.render(scene, camera);
      dock.acknowledge(); publishBackdrop(background);
      renderer.domElement.dataset.fluid = post?.active ? 'active' : 'rest';
      return true;
    };
    if (entryLogo?.active) { post?.invalidateBackground(); entryLogo.present(); }
    let pendingRender = false;
    const offUpdate = subscribeFrame((_time, dt) => {
      if (entryLogo?.active) return false;
      if (!visible || disposed || contextLost || document.hidden || suspended) return false;
      if (getPerformanceSnapshot('hero').staticFallback) { host.dataset.failed = 'performance'; onLost(); dispose(); return false; }
      const snapshot = getFrameSnapshot(), pointer = snapshot.pointer;
      const top = documentTop - snapshot.scrollY;
      const touchPoint = enabled && pointer.kind === 'touch' && pointer.glassTouch && pointer.pressed && pointer.contacts === 1;
      const mousePoint = enabled && finePointer.matches && pointer.kind !== 'touch' && pointer.inside
        && pointer.x >= left && pointer.x <= left + lastWidth && pointer.y >= top && pointer.y <= top + lastHeight;
      const canPoint = touchPoint || mousePoint;
      if (touchPoint !== touchInteracting) { touchInteracting = touchPoint; updatePost(); }
      // Pointer capture follows the original contact even outside the rectangle.
      // A new finger starts with no inherited fluid impulse from a former gesture.
      if (touchPoint && pointer.pointerId !== previousContact) {
        inside = false; lastPointerTime = -1; previousContact = pointer.pointerId;
      }
      if (canPoint) {
        uv.set((pointer.x - left) / lastWidth, 1 - (pointer.y - top) / lastHeight);
        pointerX = THREE.MathUtils.clamp(uv.x * 2 - 1, -1, 1); pointerY = THREE.MathUtils.clamp(1 - uv.y * 2, -1, 1);
        rayNdc.set(pointerX, -pointerY); raycaster.setFromCamera(rayNdc, camera);
        wordPlane.constant = -center.z;
        if (raycaster.ray.intersectPlane(wordPlane, hit)) {
          hit.sub(center);
          // At the center, retain the last angle instead of flipping an undefined direction.
          if (Math.hypot(hit.x, hit.y) > 26 * visual.rimLight.centerDeadZone) targetAngle = Math.atan2(hit.y, hit.x);
        }
        if (pointer.lastMoved !== lastPointerTime) {
          if (inside && post && !noFluid) { impulse.copy(uv).sub(previousUv); post.push(uv, impulse); }
          previousUv.copy(uv); lastPointerTime = pointer.lastMoved;
        }
        inside = true;
      } else if (inside) reset();
      const targetX = .07 + pointerY * visual.pointer.rotationX, targetY = -.07 + pointerX * visual.pointer.rotationY;
      const targetCameraX = pointerX * visual.cameraMotion.offsetX, targetCameraY = -pointerY * visual.cameraMotion.offsetY;
      const alpha = 1 - Math.exp(-visual.pointer.damping * dt);
      const cameraAlpha = 1 - Math.exp(-(inside ? visual.cameraMotion.damping : visual.cameraMotion.leaveDamping) * dt);
      rx += (targetX - rx) * alpha; ry += (targetY - ry) * alpha;
      cameraX += (targetCameraX - cameraX) * cameraAlpha; cameraY += (targetCameraY - cameraY) * cameraAlpha;
      const diff = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
      angle += diff * (1 - Math.exp(-visual.rimLight.damping * dt));
      const moving = Math.abs(targetX - rx) + Math.abs(targetY - ry) + Math.abs(diff)
        + Math.abs(targetCameraX - cameraX) + Math.abs(targetCameraY - cameraY) > .0002;
      if (dirty || moving || post?.active || postDrawing !== usePost()) {
        applyPose();
        if (moving) publishWordRect(false);
        pendingRender = true;
      }
      return moving || !!post?.active;
    }, 'update');
    const offRender = subscribeFrame((_time, dt) => {
      if (morph) {
        const id = morph.transition.id;
        try { return renderMorph(dt); }
        catch (error) {
          host.dataset.entryMorphFailure = error instanceof Error ? error.message : String(error);
          // A failed post draw may already have consumed this frame's liquid
          // impulse. Restore the real mesh without advancing elapsed time twice.
          try { finishOpening(id, 0); } catch { host.dataset.failed = 'opening-render'; onLost(); dispose(); }
          return false;
        }
      }
      if (entryLogo?.active) return false;
      if (!visible || disposed || contextLost || document.hidden || suspended) { pendingRender = false; return false; }
      // The meteor scheduler runs in update; read it here after all updates so
      // the photographed sky and the glass transmission share the same instant.
      if (getSky(hero).revision !== skyRevision || getTwinkles(hero).revision !== twinkleRevision
        || getProjectSky(hero).revision !== projectRevision) pendingRender = true;
      if (pendingRender) { render(dt); pendingRender = false; }
      return !!post?.active;
    }, 'render');
    cleanup.push(offUpdate, offRender);
    if (import.meta.env.DEV) import('./capturePoster').then(({ capturePoster }) => {
      if (!disposed) window.__gxcCapturePoster = () => capturePoster(renderer, scene, camera, mesh, backdrop);
    });
    return {
      setMotion(value) { if (disposed || contextLost) return; enabled = value; reset(true); updatePost(); },
      setSuspended(value) { suspended = value; if (value) reset(true); else { dirty = true; requestFrame(); } },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
