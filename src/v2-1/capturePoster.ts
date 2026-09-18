import * as THREE from 'three';

// Development-only export of this original scene. The photograph stays refracted
// inside the lettering; the exterior is transparent for the DOM fallback.
export function capturePoster(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, mesh: THREE.Mesh, backdrop: THREE.Mesh) {
  renderer.render(scene, camera);
  const output = document.createElement('canvas');
  output.width = renderer.domElement.width; output.height = renderer.domElement.height;
  const context = output.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(renderer.domElement, 0, 0);
  const saved = mesh.material;
  const mask = new THREE.MeshBasicMaterial({ color: 0xffffff });
  mesh.material = mask; backdrop.visible = false;
  renderer.setClearAlpha(0); renderer.render(scene, camera);
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(renderer.domElement, 0, 0);
  mesh.material = saved; backdrop.visible = true; renderer.setClearAlpha(1);
  renderer.render(scene, camera); mask.dispose();
  const pixels = context.getImageData(0, 0, output.width, output.height).data;
  let minX = output.width, minY = output.height, maxX = 0, maxY = 0;
  for (let y = 0; y < output.height; y++) for (let x = 0; x < output.width; x++) {
    if (pixels[(y * output.width + x) * 4 + 3] > 4) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  const crop = document.createElement('canvas'); crop.width = maxX - minX + 5; crop.height = maxY - minY + 5;
  crop.getContext('2d')!.drawImage(output, minX - 2, minY - 2, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return crop.toDataURL('image/webp', .94);
}
