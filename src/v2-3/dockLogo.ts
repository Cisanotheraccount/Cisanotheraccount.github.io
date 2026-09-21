import * as THREE from 'three';
import { createLogoGeometry } from './logoGeometry';
import type { EntryLogo } from './entryLogo';

export const dockDurationMs = 700;
const easeOut = (t: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(t, 0, 1), 3);
export function createDockLogo(camera: THREE.OrthographicCamera, hero: HTMLElement, host: HTMLElement,
  material: THREE.MeshPhysicalMaterial, targetLights: THREE.Light[]) {
  const geometry = createLogoGeometry(), rest = new Float32Array(geometry.getAttribute('position').array);
  const restNormals = new Float32Array(geometry.getAttribute('normal').array);
  const bounds = geometry.boundingBox!.clone(), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute, normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  positions.setUsage(THREE.DynamicDrawUsage); normals.setUsage(THREE.DynamicDrawUsage);
  let transferred = false;
  const glass = material.clone();
  glass.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'float entryRim=pow(1.0-abs(dot(normal,normalize(vViewPosition))),5.0); outgoingLight+=vec3(0.35,0.44,0.58)*entryRim*0.16;\n#include <opaque_fragment>');
  };
  glass.customProgramCacheKey = () => 'entry-glass-rim-v1';
  const mesh = new THREE.Mesh(geometry, glass); mesh.name = 'persistent-brand-logo'; mesh.matrixAutoUpdate = false; mesh.visible = false;
  const lights = new THREE.Group(); lights.matrixAutoUpdate = false;
  const lightStates = targetLights.map(light => ({ light, intensity: light.intensity }));
  const borrowedLights: { light: THREE.Light; intensity: number }[] = [];
  const frozen = new Float32Array(rest.length), frozenNormals = new Float32Array(rest.length);
  let captured = false, progress = 1, elapsed = dockDurationMs, lastGeometryKey = '', sourceThickness = glass.thickness;
  let slot: HTMLElement | null = null, rect = { left: 0, top: 0, width: 0, height: 0 }, width = 1, height = 1;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), restNormal = new THREE.Vector3(), mapping = new THREE.Matrix4(), normalMapping = new THREE.Matrix3();
  const measure = () => {
    slot = document.querySelector<HTMLElement>('[data-gxc-brand-logo]');
    const box = slot?.getBoundingClientRect(), canvas = hero.getBoundingClientRect();
    if (!box || !box.width || !box.height || !canvas.width || !canvas.height) return false;
    width = canvas.width; height = canvas.height;
    rect = { left: box.left - canvas.left, top: box.top - canvas.top - (!captured ? (window.scrollY || 0) : 0), width: box.width, height: box.height };
    return true;
  };
  const restoreLights = () => {
    for (const item of lightStates) item.light.intensity = item.intensity;
    lights.clear(); borrowedLights.length = 0;
  };
  const capture = (source: EntryLogo['surface']) => {
    transferred = false; measure(); restoreLights();
    source.camera.updateMatrixWorld(); source.mesh.updateWorldMatrix(true, false); camera.updateMatrixWorld();
    const ratio = (camera.top - camera.bottom) / camera.zoom / ((source.camera.top - source.camera.bottom) / source.camera.zoom);
    mapping.multiplyMatrices(source.camera.matrixWorldInverse, source.mesh.matrixWorld);
    normalMapping.getNormalMatrix(mapping);
    geometry.computeBoundingBox();
    const sourceCenter = source.mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(mapping);
    const sourcePositions = source.mesh.geometry.getAttribute('position'), sourceNormals = source.mesh.geometry.getAttribute('normal');
    for (let i = 0; i < positions.count; i++) {
      p.fromBufferAttribute(sourcePositions, i).applyMatrix4(mapping);
      p.set(p.x * ratio, p.y * ratio, -40 + (p.z - sourceCenter.z) * ratio).toArray(frozen, i * 3);
      n.fromBufferAttribute(sourceNormals, i).applyMatrix3(normalMapping).normalize().toArray(frozenNormals, i * 3);
    }
    const sourceMaterial = source.mesh.material as THREE.MeshPhysicalMaterial;
    sourceThickness = sourceMaterial.thickness * source.mesh.getWorldScale(p).x * ratio;
    source.scene.traverse(object => {
      if (!(object instanceof THREE.Light)) return;
      const light = object.clone();
      object.getWorldPosition(light.position);
      if (light instanceof THREE.HemisphereLight) light.position.transformDirection(source.camera.matrixWorldInverse);
      else { light.position.applyMatrix4(source.camera.matrixWorldInverse); light.position.set(light.position.x * ratio, light.position.y * ratio, -40 + (light.position.z - sourceCenter.z) * ratio); }
      const intensity = object.intensity * (light instanceof THREE.PointLight ? ratio * ratio : 1);
      light.intensity = intensity; borrowedLights.push({ light, intensity }); lights.add(light);
    });
    captured = true; progress = 0; elapsed = 0; lastGeometryKey = ''; mesh.visible = true;
    host.dataset.entryDock = 'moving'; host.dataset.entryDockPhase = String(source.wavePhase);
  };
  const update = (milliseconds = elapsed) => {
    elapsed = milliseconds;
    if (!measure()) { mesh.visible = false; return; }
    if (transferred) { mesh.visible = false; return; }
    progress = captured ? THREE.MathUtils.clamp(milliseconds / dockDurationMs, 0, 1) : 1;
    const t = easeOut(progress), units = (camera.top - camera.bottom) / camera.zoom / height;
    const scale = rect.height * units / size.y;
    const tx = (rect.left + rect.width / 2 - width / 2) * units, ty = (height / 2 - rect.top - rect.height / 2) * units;
    const key = [t, tx, ty, scale].join(':');
    if (lastGeometryKey !== key) {
      lastGeometryKey = key;
      for (let i = 0; i < positions.count; i++) {
        const o = i * 3;
        p.set((rest[o] - center.x) * scale + tx, (rest[o + 1] - center.y) * scale + ty, (rest[o + 2] - center.z) * scale - 40);
        if (captured && t < 1) {
          p.set(THREE.MathUtils.lerp(frozen[o], p.x, t), THREE.MathUtils.lerp(frozen[o + 1], p.y, t), THREE.MathUtils.lerp(frozen[o + 2], p.z, t));
          n.set(frozenNormals[o], frozenNormals[o + 1], frozenNormals[o + 2]).lerp(restNormal.set(restNormals[o], restNormals[o + 1], restNormals[o + 2]), t).normalize();
        } else n.fromArray(restNormals, o);
        positions.setXYZ(i, p.x, p.y, p.z); normals.setXYZ(i, n.x, n.y, n.z);
      }
      positions.needsUpdate = true; normals.needsUpdate = true; geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      glass.thickness = THREE.MathUtils.lerp(sourceThickness, material.thickness * scale, captured ? t : 1);
    }
    mesh.matrix.copy(camera.matrixWorld); mesh.matrixWorldNeedsUpdate = true; mesh.updateMatrixWorld(true);
    lights.matrix.copy(camera.matrixWorld); lights.matrixWorldNeedsUpdate = true; lights.updateMatrixWorld(true);
    if (captured) {
      for (const item of lightStates) item.light.intensity = item.intensity * t;
      for (const item of borrowedLights) item.light.intensity = item.intensity * (1 - t);
      if (t === 1) restoreLights();
    }
    mesh.visible = true;
    host.dataset.entryDock = t < 1 ? 'moving' : 'docked'; host.dataset.entryDockProgress = progress.toFixed(5);
  };
  const acknowledge = (source?: HTMLCanvasElement) => {
    if ((!mesh.visible && !transferred) || window.__gxcEntry?.phase === 'preparing') return false;
    const transfer = !!source && !captured && !transferred && !!slot;
    if (transfer) {
      transferred = true; mesh.visible = false;
      host.dataset.brandRenderer = 'live-backdrop';
    }
    if (slot && !transferred) slot.dataset.glassDrawn = 'true';
    if (new URLSearchParams(location.search).get('qa') === '1') {
      const projected = new THREE.Box2();
      for (const x of [geometry.boundingBox!.min.x, geometry.boundingBox!.max.x])
        for (const y of [geometry.boundingBox!.min.y, geometry.boundingBox!.max.y])
          for (const z of [geometry.boundingBox!.min.z, geometry.boundingBox!.max.z]) {
            p.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
            projected.expandByPoint(new THREE.Vector2((p.x + 1) * width / 2, (1 - p.y) * height / 2));
          }
      const dom = slot?.getBoundingClientRect(), frame = hero.getBoundingClientRect();
      const target = dom ? { left: dom.left - frame.left, top: dom.top - frame.top, width: dom.width, height: dom.height } : rect;
      host.dataset.brandLogoRect = JSON.stringify(transferred ? target : { left: projected.min.x, top: projected.min.y, width: projected.max.x - projected.min.x, height: projected.max.y - projected.min.y });
      host.dataset.brandLogoTarget = JSON.stringify(target);
    }
    return transfer;
  };
  return { mesh, lights, capture, update, acknowledge, present: () => { if (slot) delete slot.dataset.glassDrawn; }, get rect() { return rect; }, get settled() { return progress >= 1; },
    finish() { captured = false; progress = 1; elapsed = dockDurationMs; restoreLights(); lastGeometryKey = ''; update(); },
    dispose() { restoreLights(); mesh.removeFromParent(); lights.removeFromParent(); geometry.dispose(); glass.dispose(); if (slot) delete slot.dataset.glassDrawn; }
  };
}
