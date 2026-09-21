import * as THREE from 'three';
import { getPreparedWritingField } from './liquidWriting';

type Target = { scene: THREE.Scene; camera: THREE.OrthographicCamera; mesh: THREE.Mesh };

export type SignatureWriting = {
  mesh: THREE.Mesh;
  activate(): void;
  setProgress(progress: number): void;
  dispose(): void;
};

const fieldWidth = 256, fieldHeight = 128;

const writingGate = /* glsl */`
uniform sampler2D gxcSignatureArrival;
uniform vec4 gxcSignatureBounds;
uniform float gxcSignatureProgress;
varying vec3 gxcSignatureLocal;
float gxcSignatureTime(vec2 point) {
  vec2 encoded=texture2D(gxcSignatureArrival,(point-gxcSignatureBounds.xy)/gxcSignatureBounds.zw).rg;
  return dot(encoded,vec2(65280.,255.))/65535.;
}
void gxcSignatureClip() {
  if(gxcSignatureProgress<.9999 && gxcSignatureTime(gxcSignatureLocal.xy)>gxcSignatureProgress) discard;
}
`;

function inheritedMaterial(source: THREE.MeshPhysicalMaterial) {
  const result = source.clone(), compile = source.onBeforeCompile, key = source.customProgramCacheKey();
  result.onBeforeCompile = (shader, renderer) => compile.call(result, shader, renderer);
  result.customProgramCacheKey = () => key;
  return result;
}

/** Writes the existing centre wordmark without taking part in the opening handoff. */
export function createSignatureWriting(target: Target, material: THREE.MeshPhysicalMaterial): SignatureWriting {
  const field = getPreparedWritingField();
  if (!field) throw new Error('Writing field has not finished preparing');
  const allocated: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(resource: T): T => { allocated.push(resource); return resource; };
  const originalVisibility = target.mesh.visible, originalMaterial = target.mesh.material;
  let root: THREE.Mesh | undefined;
  let disposed = false, activated = false;
  const release = () => {
    target.mesh.visible = originalVisibility;
    target.mesh.material = originalMaterial;
    root?.removeFromParent(); root?.clear();
    for (const resource of allocated.splice(0).reverse()) resource.dispose();
  };

  try {
    const texture = own(new THREE.DataTexture(field.pixels, fieldWidth, fieldHeight, THREE.RGBAFormat, THREE.UnsignedByteType));
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
    const progress = { value: 0 };
    const uniforms = {
      gxcSignatureArrival: { value: texture },
      gxcSignatureBounds: { value: field.bounds },
      gxcSignatureProgress: progress,
    };
    const wordMaterial = own(inheritedMaterial(material)), baseCompile = wordMaterial.onBeforeCompile;
    wordMaterial.onBeforeCompile = (shader, renderer) => {
      baseCompile.call(wordMaterial, shader, renderer); Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 gxcSignatureLocal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngxcSignatureLocal=position;');
      shader.fragmentShader = writingGate + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\ngxcSignatureClip();');
    };
    wordMaterial.customProgramCacheKey = () => `${material.customProgramCacheKey()}|signature-writing-arrival-v1`;
    const wordMask = own(new THREE.ShaderMaterial({ uniforms,
      vertexShader: 'varying vec3 gxcSignatureLocal;void main(){gxcSignatureLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: writingGate + '\nvoid main(){gxcSignatureClip();gl_FragColor=vec4(1.);}',
      toneMapped: false,
    }));
    const rootGeometry = own(new THREE.BufferGeometry());
    rootGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    rootGeometry.boundingBox = new THREE.Box3(); rootGeometry.boundingSphere = new THREE.Sphere();
    const owner = root = new THREE.Mesh(rootGeometry, own(new THREE.MeshBasicMaterial()));
    owner.name = 'signature-writing-surfaces'; owner.frustumCulled = false; owner.visible = false;
    const frame = new THREE.Group(); frame.matrixAutoUpdate = false; owner.add(frame);
    const word = new THREE.Mesh(target.mesh.geometry, wordMaterial);
    word.name = 'signature-written-word'; word.userData.heroMaskMaterial = wordMask; frame.add(word);
    const nibGeometry = own(new THREE.SphereGeometry(1, 24, 16));
    const nib = new THREE.Mesh(nibGeometry, own(inheritedMaterial(material)));
    nib.name = 'signature-writing-nib'; nib.visible = false;
    nib.userData.heroMaskMaterial = own(new THREE.MeshBasicMaterial({ color: 0xffffff })); frame.add(nib);
    const parts = [word, nib];
    owner.userData.heroGlassParts = parts; owner.userData.heroMaskRevision = 0;
    owner.userData.signatureWriting = { mode: 'independent-word-stroke-arrival', sampleCount: field.samples.length, field: [fieldWidth, fieldHeight] };

    if (!target.mesh.geometry.boundingBox) target.mesh.geometry.computeBoundingBox();
    const localBox = target.mesh.geometry.boundingBox!;
    const depth = Math.max(.08, localBox.max.z - localBox.min.z);
    const bounds = new THREE.Box3(), partBounds = new THREE.Box3();
    const smooth = (a: number, b: number, value: number) => THREE.MathUtils.smoothstep(value, a, b);
    const refreshBounds = () => {
      owner.updateMatrixWorld(true); bounds.makeEmpty();
      for (const part of parts) {
        if (!part.visible) continue;
        if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
        partBounds.copy(part.geometry.boundingBox!).applyMatrix4(part.matrixWorld); bounds.union(partBounds);
      }
      rootGeometry.boundingBox!.copy(bounds); bounds.getBoundingSphere(rootGeometry.boundingSphere!);
      owner.userData.heroMaskRevision++;
    };
    const setProgress = (value: number) => {
      if (disposed || !activated) return;
      const normalized = THREE.MathUtils.clamp(value, 0, 1), milliseconds = normalized * 2200;
      const writingProgress = milliseconds >= 2090 ? 1 : THREE.MathUtils.clamp(milliseconds / 2090, 0, 1);
      progress.value = writingProgress;
      let index = 0;
      while (index < field.samples.length - 1 && field.samples[index + 1].at < writingProgress) index++;
      const a = field.samples[index], b = field.samples[Math.min(index + 1, field.samples.length - 1)];
      const mix = THREE.MathUtils.clamp((writingProgress - a.at) / Math.max(.00001, b.at - a.at), 0, 1);
      const penDown = a.stroke === b.stroke || mix < .1 || mix > .9;
      const radius = THREE.MathUtils.lerp(a.radius, b.radius, mix);
      const fade = smooth(0, 80, milliseconds), settle = 1 - smooth(2090, 2200, milliseconds);
      nib.visible = milliseconds < 2200 && penDown;
      nib.position.set(THREE.MathUtils.lerp(a.x, b.x, mix), THREE.MathUtils.lerp(a.y, b.y, mix), localBox.min.z + depth * .45);
      nib.scale.set(radius * 1.04 * fade * settle, radius * 1.04 * fade * settle, depth * .52 * fade * settle);
      word.visible = milliseconds > 0;
      owner.userData.writingProgress = writingProgress;
      owner.userData.writingMilliseconds = milliseconds;
      refreshBounds();
    };

    return {
      mesh: owner,
      activate() {
        if (disposed) return;
        target.mesh.updateWorldMatrix(true, false);
        frame.matrix.copy(target.mesh.matrixWorld); frame.matrixWorldNeedsUpdate = true;
        owner.visible = true; target.mesh.visible = false; activated = true;
        setProgress(0);
      },
      setProgress,
      dispose() {
        if (disposed) return;
        disposed = true; release();
      },
    };
  } catch (error) {
    release(); throw error;
  }
}
