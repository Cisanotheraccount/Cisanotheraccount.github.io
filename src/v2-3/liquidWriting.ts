import * as THREE from 'three';
import { writingPath } from './writingPath';

type Endpoint = { scene: THREE.Scene; camera: THREE.OrthographicCamera; mesh: THREE.Mesh };
export type WritingFieldSample = Readonly<{ x: number; y: number; radius: number; at: number; stroke: number }>;
export type PreparedWritingField = Readonly<{
  pixels: Uint8Array;
  samples: readonly WritingFieldSample[];
  bounds: THREE.Vector4;
}>;
type Sample = { x: number; y: number; radius: number; at: number; stroke: number };
export type LiquidWriting = {
  mesh: THREE.Mesh; camera: THREE.OrthographicCamera;
  /** Refresh the precompiled surfaces from the now-frozen live logo. */
  activate(): void;
  setProgress(progress: number): void;
  dispose(): void;
};

// Shared across resizes. This is a stroke-arrival field, not a picture of glass:
// the approved 3D mesh still determines every surface and the final silhouette.
const fieldWidth = 256, fieldHeight = 128;
let prepared: PreparedWritingField | undefined;
let preparation: Promise<void> | undefined;
export function prepareWritingField(): Promise<void> {
  if (prepared) return Promise.resolve();
  if (preparation) return preparation;
  preparation = (async () => {
    const samples: Sample[] = [];
    let distance = 0;
    writingPath.strokes.forEach((stroke, index) => {
      const points = stroke.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      if (index && stroke.penLiftBefore) distance += 1.3;
      if (points.length === 1) {
        distance += .8; samples.push({ x: points[0].x, y: points[0].y, radius: points[0].z, at: distance, stroke: index });
        return;
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const count = Math.max(12, Math.ceil(curve.getLength() / .11));
      let previous: THREE.Vector3 | undefined, previousDirection = new THREE.Vector2();
      for (let i = 0; i <= count; i++) {
        const point = curve.getPointAt(i / count);
        if (previous) {
          const delta = new THREE.Vector2(point.x - previous.x, point.y - previous.y), length = delta.length();
          delta.normalize();
          // A modest increase in travel time around tight turns keeps loops legible.
          distance += length * (1 + .35 * (1 - Math.max(0, delta.dot(previousDirection))));
          previousDirection.copy(delta);
        }
        samples.push({ x: point.x, y: point.y, radius: Math.max(.1, point.z), at: distance, stroke: index });
        previous = point;
      }
    });
    for (const point of samples) point.at /= Math.max(.001, distance);
    // Coordinates follow the unchanged model, whose bounding box is symmetric.
    const bounds = new THREE.Vector4(-11.16517, -5, 22.33034, 10);
    const pixels = new Uint8Array(fieldWidth * fieldHeight * 4);
    for (let y = 0; y < fieldHeight; y++) {
      const py = bounds.y + (y + .5) / fieldHeight * bounds.w;
      for (let x = 0; x < fieldWidth; x++) {
        const px = bounds.x + (x + .5) / fieldWidth * bounds.z;
        let nearest = Infinity, arrival = 1;
        for (const sample of samples) {
          const dx = sample.x - px, dy = sample.y - py;
          const score = (dx * dx + dy * dy) / (sample.radius * sample.radius);
          // At intersections, the first stroke lays down the shared glass.
          if (score < .75) { if (nearest >= .75 || sample.at < arrival) { nearest = score; arrival = sample.at; } }
          else if (nearest >= .75 && score < nearest) { nearest = score; arrival = sample.at; }
        }
        const encoded = Math.round(THREE.MathUtils.clamp(arrival, 0, 1) * 65535), offset = (y * fieldWidth + x) * 4;
        pixels[offset] = encoded >> 8; pixels[offset + 1] = encoded & 255; pixels[offset + 2] = 0; pixels[offset + 3] = 255;
      }
      // Yield small batches: do not block the logo's input/render loop with a
      // synchronous readback/distance transform as the old contour morph did.
      if (y % 4 === 3) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    prepared = { pixels, samples, bounds };
  })();
  return preparation;
}

/** Returns the shared, already-prepared arrival field without allocating or mutating it. */
export function getPreparedWritingField(): PreparedWritingField | undefined { return prepared; }

const gate = /* glsl */`
uniform sampler2D gxcWritingArrival;
uniform vec4 gxcWritingBounds;
uniform float gxcWritingProgress;
varying vec3 gxcWritingLocal;
float gxcWritingTime(vec2 point) {
  vec2 encoded=texture2D(gxcWritingArrival,(point-gxcWritingBounds.xy)/gxcWritingBounds.zw).rg;
  return dot(encoded,vec2(65280.,255.))/65535.;
}
void gxcWritingClip() {
  if(gxcWritingProgress<.9999 && gxcWritingTime(gxcWritingLocal.xy)>gxcWritingProgress) discard;
}
`;

function inheritedMaterial(source: THREE.MeshPhysicalMaterial) {
  const result = source.clone(), compile = source.onBeforeCompile, key = source.customProgramCacheKey();
  result.onBeforeCompile = (shader, renderer) => compile.call(result, shader, renderer);
  result.customProgramCacheKey = () => key;
  return result;
}

/** Real SVG glass → guided liquid pen → the exact existing 3D signature. */
export function createLiquidWriting(_renderer: THREE.WebGLRenderer, from: Endpoint, to: Endpoint,
  _width: number, _height: number, material: THREE.MeshPhysicalMaterial): LiquidWriting {
  if (!prepared) throw new Error('Writing field has not finished preparing');
  const allocated: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(resource: T): T => { allocated.push(resource); return resource; };
  let owner: THREE.Mesh | undefined, restoreLights = () => {};
  const release = () => {
    restoreLights(); owner?.removeFromParent(); owner?.clear();
    for (const resource of allocated.splice(0).reverse()) resource.dispose();
  };
  try {
    const { pixels, samples, bounds } = prepared;
    const texture = own(new THREE.DataTexture(pixels, fieldWidth, fieldHeight, THREE.RGBAFormat, THREE.UnsignedByteType));
    texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = false;
    texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
    const ink = { value: -1 }, uniforms = { gxcWritingArrival: { value: texture }, gxcWritingBounds: { value: bounds }, gxcWritingProgress: ink };
    const wordMaterial = own(inheritedMaterial(material)), baseCompile = wordMaterial.onBeforeCompile;
    wordMaterial.onBeforeCompile = (shader, renderer) => {
      baseCompile.call(wordMaterial, shader, renderer); Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 gxcWritingLocal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngxcWritingLocal=position;');
      shader.fragmentShader = gate + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\ngxcWritingClip();');
    };
    wordMaterial.customProgramCacheKey = () => `${material.customProgramCacheKey()}|writing-arrival-v1`;
    const mask = own(new THREE.ShaderMaterial({ uniforms,
      vertexShader: 'varying vec3 gxcWritingLocal;void main(){gxcWritingLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: gate + '\nvoid main(){gxcWritingClip();gl_FragColor=vec4(1.);}',
      toneMapped: false,
    }));
    const rootGeometry = own(new THREE.BufferGeometry()); rootGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    rootGeometry.boundingBox = new THREE.Box3(); rootGeometry.boundingSphere = new THREE.Sphere();
    const rootMaterial = own(new THREE.MeshBasicMaterial());
    const root = owner = new THREE.Mesh(rootGeometry, rootMaterial); root.name = 'liquid-writing-surfaces'; root.frustumCulled = false;
    to.mesh.updateWorldMatrix(true, false); from.mesh.updateWorldMatrix(true, false);
    to.camera.updateWorldMatrix(true, false); from.camera.updateWorldMatrix(true, false);
    const frame = new THREE.Group(); frame.matrixAutoUpdate = false; frame.matrix.copy(to.mesh.matrixWorld); root.add(frame);
    const word = new THREE.Mesh(to.mesh.geometry, wordMaterial); word.userData.heroMaskMaterial = mask; frame.add(word);

    // Transfer the frozen logo between orthographic cameras without changing its
    // screen silhouette; retain full depth rather than projecting onto a plane.
    let viewScale = 1;
    const fromCenter = new THREE.Vector3(), toCenter = new THREE.Vector3(), captureBox = new THREE.Box3();
    const mapping = new THREE.Matrix4(), geometryMapping = new THREE.Matrix4();
    const logoGeometry = own(from.mesh.geometry.clone());
    const original = new Float32Array(logoGeometry.getAttribute('position').array), positions = logoGeometry.getAttribute('position') as THREE.BufferAttribute;
    const normals = logoGeometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (!normals || normals.count !== positions.count) throw new Error('Opening logo requires precomputed smooth normals');
    const originalNormals = new Float32Array(normals.array), lastFiniteNormals = new Float32Array(normals.array);
    const delayGradients = new Float32Array(positions.count * 3);
    const fromMaterial = (Array.isArray(from.mesh.material) ? from.mesh.material[0] : from.mesh.material) as THREE.MeshPhysicalMaterial;
    const logoMaterial = own(inheritedMaterial(fromMaterial));
    const logo = new THREE.Mesh(logoGeometry, logoMaterial); root.add(logo);
    const beadGeometry = own(new THREE.SphereGeometry(1, 24, 16)), beadMaterial = own(inheritedMaterial(material));
    const bead = new THREE.Mesh(beadGeometry, beadMaterial); frame.add(bead);
    const transferMaterial = own(inheritedMaterial(material)), transfer = new THREE.Mesh(beadGeometry, transferMaterial); root.add(transfer);
    const box = to.mesh.geometry.boundingBox!;
    const depth = Math.max(.08, box.max.z - box.min.z);
    const start = new THREE.Vector3(), source = new THREE.Vector3(), control = new THREE.Vector3();
    let wordScale = 1;
    // The gather field belongs to SVG coordinates, not vertex ordering or a
    // particular triangulation. Equal XY coordinates (front/back/bevel) share
    // the same arrival, keeping the glass slab coherent as it softens.
    const gatherOrder = new Float32Array(positions.count);
    const localCenter = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    const travel = new THREE.QuadraticBezierCurve3(source, control, start);

    // Match the logo's source lighting at the first frame, then gently hand light
    // energy to the word scene. No extra renderer, render target or animation loop.
    const targetLights: { light: THREE.Light; intensity: number }[] = [];
    const sourceLights: { source: THREE.Light; light: THREE.Light; intensity: number }[] = [];
    to.scene.traverse(object => { if (object instanceof THREE.Light) targetLights.push({ light: object, intensity: object.intensity }); });
    restoreLights = () => { for (const item of targetLights) item.light.intensity = item.intensity; };
    from.scene.traverse(object => {
      if (!(object instanceof THREE.Light)) return;
      const light = object.clone();
      sourceLights.push({ source: object, light, intensity: light.intensity }); root.add(light);
    });
    const snapshotSource = () => {
      const sourcePositions = from.mesh.geometry.getAttribute('position');
      const sourceNormals = from.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
      if (sourcePositions.count !== positions.count || !sourceNormals || sourceNormals.count !== positions.count) throw new Error('Opening logo geometry changed during preparation');
      // The wave stays live while the prewarmed surface waits. Rebuild this
      // ordering from the actual frozen source, so progress zero begins at the
      // visible deformed pose instead of the earlier preparation pose.
      from.mesh.geometry.computeBoundingBox();
      from.mesh.geometry.boundingBox!.getCenter(localCenter);
      let maximumDistance = 0;
      for (let i = 0; i < positions.count; i++) {
        const distance = Math.hypot(sourcePositions.getX(i) - localCenter.x, sourcePositions.getY(i) - localCenter.y);
        gatherOrder[i] = distance; maximumDistance = Math.max(maximumDistance, distance);
      }
      for (let i = 0; i < positions.count; i++) gatherOrder[i] /= Math.max(.001, maximumDistance);
      to.mesh.updateWorldMatrix(true, false); from.mesh.updateWorldMatrix(true, false);
      to.camera.updateWorldMatrix(true, false); from.camera.updateWorldMatrix(true, false);
      frame.matrix.copy(to.mesh.matrixWorld); frame.matrixWorldNeedsUpdate = true;
      viewScale = ((to.camera.top - to.camera.bottom) / to.camera.zoom) / ((from.camera.top - from.camera.bottom) / from.camera.zoom);
      captureBox.setFromObject(from.mesh, true).getCenter(fromCenter).applyMatrix4(from.camera.matrixWorldInverse);
      captureBox.setFromObject(to.mesh).getCenter(toCenter).applyMatrix4(to.camera.matrixWorldInverse);
      mapping.copy(to.camera.matrixWorld)
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, toCenter.z - fromCenter.z * viewScale))
        .multiply(new THREE.Matrix4().makeScale(viewScale, viewScale, viewScale)).multiply(from.camera.matrixWorldInverse);
      geometryMapping.multiplyMatrices(mapping, from.mesh.matrixWorld);
      normalMatrix.getNormalMatrix(geometryMapping);
      const point = new THREE.Vector3(), normal = new THREE.Vector3(), gradient = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        const offset = i * 3, dx = sourcePositions.getX(i) - localCenter.x, dy = sourcePositions.getY(i) - localCenter.y;
        const radius = Math.hypot(dx, dy);
        point.set(sourcePositions.getX(i), sourcePositions.getY(i), sourcePositions.getZ(i)).applyMatrix4(geometryMapping);
        positions.setXYZ(i, point.x, point.y, point.z); point.toArray(original, i * 3);
        // Both vectors and the delay covector cross the camera-space mapping
        // with inverse-transpose. This preserves the supplied FEM/analytic
        // normals at t0 even under the live pointer pose's non-uniform scale.
        normal.fromBufferAttribute(sourceNormals, i).applyMatrix3(normalMatrix).normalize();
        normals.setXYZ(i, normal.x, normal.y, normal.z); normal.toArray(originalNormals, offset); normal.toArray(lastFiniteNormals, offset);
        gradient.set(radius > 1e-7 ? dx / radius * .18 / Math.max(.001, maximumDistance) : 0,
          radius > 1e-7 ? dy / radius * .18 / Math.max(.001, maximumDistance) : 0, 0).applyMatrix3(normalMatrix);
        gradient.toArray(delayGradients, offset);
      }
      positions.needsUpdate = true; normals.needsUpdate = true; logoGeometry.computeBoundingBox(); logoGeometry.computeBoundingSphere();
      logoMaterial.thickness = fromMaterial.thickness * from.mesh.getWorldScale(point).x * viewScale;
      wordScale = to.mesh.getWorldScale(point).x;
      start.set(samples[0].x, samples[0].y, box.min.z + depth * .45).applyMatrix4(to.mesh.matrixWorld);
      // Start at the whole logo's center; never separately center or re-scale
      // its three authored pieces. Snapshot captures the latest pointer pose.
      source.copy(localCenter).applyMatrix4(geometryMapping);
      control.copy(source).lerp(start, .55); control.y += .65 * wordScale;
      for (const item of sourceLights) {
        item.source.getWorldPosition(item.light.position);
        if (item.light instanceof THREE.HemisphereLight) item.light.position.transformDirection(mapping);
        else item.light.position.applyMatrix4(mapping);
        item.intensity = item.source.intensity * (item.light instanceof THREE.PointLight ? viewScale * viewScale : 1);
        item.light.intensity = item.intensity;
      }
    };
    snapshotSource();
    const parts = [logo, word, bead, transfer]; root.userData.heroGlassParts = parts; root.userData.heroMaskRevision = 0;
    root.userData.liquidWriting = { mode: 'svg-logo-to-3d-stroke-arrival', sampleCount: samples.length, strokes: writingPath.strokes.length, field: [fieldWidth, fieldHeight] };
    let disposed = false;
    const current = new THREE.Vector3(), fullBox = new THREE.Box3(), partBox = new THREE.Box3();
    const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
    const setProgress = (value: number) => {
      if (disposed) return;
      const t = THREE.MathUtils.clamp(value, 0, 1), milliseconds = t * 2200;
      const consume = smooth(0, 620, milliseconds);
      // The collecting glass reaches the first g before handwriting starts at
      // 400ms. The source finishes gathering at 620ms, with a short overlap.
      const flow = travel.getPoint(smooth(0, 400, milliseconds));
      if (milliseconds <= 620) {
        let normalFallbacks = 0;
        for (let i = 0; i < positions.count; i++) {
          const offset = i * 3, delay = gatherOrder[i] * .18, denominator = 1 - delay;
          const unclamped = (consume - delay) / denominator, u = THREE.MathUtils.clamp(unclamped, 0, 1);
          const local = u * u * (3 - 2 * u);
          current.fromArray(original, i * 3).lerp(flow, local);
          // A restrained depth arc adds volume during collection while the
          // original outline and all three gaps are exact at progress zero.
          current.z += Math.sin(Math.PI * local) * .12 * wordScale;
          positions.setXYZ(i, current.x, current.y, current.z);
          // F(p)=(1-l)p+l*flow+z*arc*sin(πl). Its rank-one Jacobian
          // transports the frozen smooth normal without triangle faceting.
          const derivative = unclamped > 0 && unclamped < 1 ? 6 * u * (1 - u) * (consume - 1) / (denominator * denominator) : 0;
          const gx = delayGradients[offset] * derivative, gy = delayGradients[offset + 1] * derivative, gz = delayGradients[offset + 2] * derivative;
          const px = original[offset], py = original[offset + 1], pz = original[offset + 2];
          const vx = flow.x - px, vy = flow.y - py, vz = flow.z - pz + .12 * wordScale * Math.PI * Math.cos(Math.PI * local);
          const scale = 1 - local, rankOne = scale + gx * vx + gy * vy + gz * vz;
          let nx = originalNormals[offset], ny = originalNormals[offset + 1], nz = originalNormals[offset + 2];
          if (scale > 1e-5 && rankOne > 1e-5) {
            const correction = (vx * nx + vy * ny + vz * nz) / (scale * rankOne);
            nx = nx / scale - gx * correction; ny = ny / scale - gy * correction; nz = nz / scale - gz * correction;
            const length = Math.hypot(nx, ny, nz);
            if (Number.isFinite(length) && length > 1e-7) {
              nx /= length; ny /= length; nz /= length;
              lastFiniteNormals[offset] = nx; lastFiniteNormals[offset + 1] = ny; lastFiniteNormals[offset + 2] = nz;
            } else { nx = lastFiniteNormals[offset]; ny = lastFiniteNormals[offset + 1]; nz = lastFiniteNormals[offset + 2]; normalFallbacks++; }
          } else { nx = lastFiniteNormals[offset]; ny = lastFiniteNormals[offset + 1]; nz = lastFiniteNormals[offset + 2]; normalFallbacks++; }
          normals.setXYZ(i, nx, ny, nz);
        }
        positions.needsUpdate = true; normals.needsUpdate = true; logoGeometry.computeBoundingBox();
        root.userData.logoNormalTransportFallbacks = normalFallbacks;
      }
      logo.visible = milliseconds < 620;
      transfer.visible = milliseconds < 620;
      transfer.position.copy(flow);
      const transferRadius = samples[0].radius * wordScale * smooth(0, 110, milliseconds) * (1 - smooth(400, 620, milliseconds));
      transfer.scale.setScalar(Math.max(.00001, transferRadius));
      const travelProgress = THREE.MathUtils.clamp((milliseconds - 400) / (2090 - 400), 0, 1);
      // Short acceleration/deceleration only; most of the stroke has an even pen speed.
      const edge = .08, progress = travelProgress < edge ? travelProgress * travelProgress / (2 * edge * (1 - edge))
        : travelProgress > 1 - edge ? 1 - (1 - travelProgress) ** 2 / (2 * edge * (1 - edge))
        : (travelProgress - edge / 2) / (1 - edge);
      ink.value = milliseconds < 400 ? -1 : milliseconds >= 2090 ? 1 : progress;
      let i = 0; while (i < samples.length - 1 && samples[i + 1].at < progress) i++;
      const a = samples[i], b = samples[Math.min(i + 1, samples.length - 1)];
      const mix = THREE.MathUtils.clamp((progress - a.at) / Math.max(.00001, b.at - a.at), 0, 1);
      const penDown = a.stroke === b.stroke || mix < .1 || mix > .9;
      const radius = THREE.MathUtils.lerp(a.radius, b.radius, mix);
      const settle = (1 - smooth(2090, 2200, milliseconds)) * smooth(350, 400, milliseconds);
      bead.visible = milliseconds >= 350 && t < 1 && penDown;
      bead.position.set(THREE.MathUtils.lerp(a.x, b.x, mix), THREE.MathUtils.lerp(a.y, b.y, mix), box.min.z + depth * .45);
      bead.scale.set(radius * 1.04 * settle, radius * 1.04 * settle, depth * .52 * settle);
      const lights = smooth(0, 620, milliseconds);
      for (const item of targetLights) item.light.intensity = item.intensity * lights;
      for (const item of sourceLights) item.light.intensity = item.intensity * (1 - lights);
      root.updateMatrixWorld(true); fullBox.makeEmpty();
      for (const part of parts) {
        if (!part.visible) continue;
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        partBox.copy(part.geometry.boundingBox!).applyMatrix4(part.matrixWorld); fullBox.union(partBox);
      }
      rootGeometry.boundingBox!.copy(fullBox); fullBox.getBoundingSphere(rootGeometry.boundingSphere!);
      root.userData.heroMaskRevision++; root.userData.writingProgress = progress;
      root.userData.logoGatherProgress = consume;
    };
    // Do not alter scene light energy during precompilation; setProgress starts
    // only on the first real transition frame.
    root.updateMatrixWorld(true); fullBox.setFromObject(root); rootGeometry.boundingBox.copy(fullBox);
    fullBox.getBoundingSphere(rootGeometry.boundingSphere);
    return { mesh: root, camera: to.camera, setProgress,
      activate() {
        if (disposed) return;
        snapshotSource(); setProgress(0);
      },
      dispose() {
        if (disposed) return; disposed = true;
        release();
      },
    };
  } catch (error) { release(); throw error; }
}
