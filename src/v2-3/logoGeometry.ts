import * as THREE from 'three';
import meshSource from '../../public/v2-3/entry-rounded/logo-mesh.json?raw';

/** Authoritative SVG coordinates, including the original 25px centered stroke. */
export const logoViewBox = { x: 500, y: 560, width: 1160, height: 1040 } as const;
export const logoUnits = 8 / logoViewBox.width;
export const logoMeshAssetSha256 = '68e3c3a91837c899b1b5a5e5bb56d6c05a3199a385277d1f5c91864f6909f5a7' as const;

type LogoMesh = {
  version: number;
  sourceSha256: string;
  originalSourceSha256: string;
  viewBox: typeof logoViewBox;
  stroke: number;
  positions: number[];
  normals: number[];
  indices: number[];
  parts: number[];
  metadata: Record<string, unknown> & { parts: number; vertices: number; bounds: number[][] };
};

const mesh = JSON.parse(meshSource) as LogoMesh;
if (mesh.version !== 1
  || mesh.sourceSha256 !== 'f92e7a1374c24d3b33c23a2950cd4726238a641e7ea0ff29fa7e530e2fe0ad92'
  || mesh.originalSourceSha256 !== '22a602ba52c5eb4e2821d64aed5d7a91b2e0330c6971e4dfb1dd24709ee107b3') {
  throw new Error('The reviewed 2.3 repaired logo mesh source changed');
}
if (mesh.metadata.parts !== 3 || mesh.stroke !== 25 || mesh.metadata.vertices > 20000) {
  throw new Error('The reviewed 2.3 logo mesh contract changed');
}

export function createLogoGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  geometry.setAttribute('logoPart', new THREE.Float32BufferAttribute(mesh.parts, 1));
  geometry.setIndex(mesh.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.logo = mesh.metadata;
  geometry.userData.logoMeshAssetSha256 = logoMeshAssetSha256;
  return geometry;
}
