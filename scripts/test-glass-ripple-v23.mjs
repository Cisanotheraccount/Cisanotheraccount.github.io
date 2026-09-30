import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import * as THREE from 'three';
const result=await build({entryPoints:[fileURLToPath(new URL('../src/v2-3/glassRipple.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['three']});
const module={exports:{}};runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:n=>{assert.equal(n,'three');return THREE}});
const {createGlassRipple,glassRippleTiming,sampleGlassRipple}=module.exports;
const data=JSON.parse(await readFile(new URL('../public/v-next/galaxci-inflated-mesh.json',import.meta.url)));
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geo.setIndex(data.indices);geo.computeBoundingBox();
const material=new THREE.MeshPhysicalMaterial({transmission:1,thickness:2,ior:1.5});
const original=geo.attributes.position.array.slice(),indices=geo.index.array.slice(),bounds=geo.boundingBox.clone();
let originalDisposed=false;material.addEventListener('dispose',()=>originalDisposed=true);geo.addEventListener('dispose',()=>originalDisposed=true);
for(const hz of [30,60,120]) {
 const r=createGlassRipple(geo,material);assert(!r.active);assert.equal(r.root.children.length,1);assert.equal(r.surface.geometry,geo);assert.equal(r.surface.geometry.index,geo.index);assert(!r.surface.isInstancedMesh);
 assert(r.start(new THREE.Vector3(-4,1,0)));r.advance(.1);const progress=r.progress;assert(!r.start(new THREE.Vector3()));assert.equal(r.progress,progress);r.advance(0);assert.equal(r.progress,progress);
 for(let t=.1;t<glassRippleTiming.duration+1/hz;t+=1/hz)r.advance(1/hz);
 assert(!r.active);assert(!r.root.visible);assert.equal(r.progress,0);assert(r.start(new THREE.Vector3()));r.cancel();assert(!r.active);r.dispose();
 assert.deepEqual(geo.attributes.position.array,original);assert.deepEqual(geo.index.array,indices);assert(geo.boundingBox.equals(bounds));assert(!originalDisposed);
}
// Verify the radial mapping never folds or disconnects, and stays inside crop
// bounds across every time sample and radii through/around the actual wordmark.
let maxDisplacement=0,minRadialScale=1;
for(let t=0;t<=1.7;t+=1/120){const {amount:a,radius:s}=sampleGlassRipple(t);for(let distance=0;distance<35;distance+=.05){const f=a*Math.exp(-distance*distance/(2*s*s));const radialScale=1+f*(1-distance*distance/(s*s));minRadialScale=Math.min(minRadialScale,radialScale);assert(radialScale>.9);maxDisplacement=Math.max(maxDisplacement,Math.hypot(distance*f,glassRippleTiming.depth*f));}}
assert(maxDisplacement<glassRippleTiming.boundsMargin);assert.equal(sampleGlassRipple(0).amount,0);assert.equal(sampleGlassRipple(1.7).amount,0);
console.log('PASS one original indexed surface; no particles; 30/60/120 timing; pause/repeat/cancel; original resources untouched; positive continuous mapping', {maxDisplacement,minRadialScale});
