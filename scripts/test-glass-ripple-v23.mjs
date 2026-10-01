import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import * as THREE from 'three';
const result=await build({entryPoints:[fileURLToPath(new URL('../src/v2-3/glassRipple.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['three']});
const module={exports:{}};runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:n=>{assert.equal(n,'three');return THREE}});
const {createGlassRipple,glassRippleTiming:c,sampleGlassRipple,evaluateGlassRipple}=module.exports;
const data=JSON.parse(await readFile(new URL('../public/v-next/galaxci-inflated-mesh.json',import.meta.url)));
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));geo.setIndex(data.indices);geo.computeBoundingBox();
const material=new THREE.MeshPhysicalMaterial({transmission:1,thickness:2,ior:1.5});
const original=geo.attributes.position.array.slice(),indices=geo.index.array.slice(),bounds=geo.boundingBox.clone();
let originalDisposed=false;material.addEventListener('dispose',()=>originalDisposed=true);geo.addEventListener('dispose',()=>originalDisposed=true);
function shaders(r){
 const shader=()=>({uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:''});
 const surface=shader(),mask=shader();r.physical.onBeforeCompile(surface,{});r.mask.onBeforeCompile(mask,{});
 assert.equal(surface.uniforms.gxcRipples.value,mask.uniforms.gxcRipples.value);assert.equal(surface.vertexShader,mask.vertexShader);
 assert.match(surface.vertexShader,/gxcRipples\[4\]/);assert.match(surface.vertexShader,/sin\(/);
 return surface.uniforms.gxcRipples.value;
}
for(const hz of [30,60,120]){
 const r=createGlassRipple(geo,material),u=shaders(r);assert.equal(r.root.children.length,1);assert.equal(r.surface.geometry,geo);
 assert(r.start(new THREE.Vector3(-4,1,0)));r.advance(.35);const first=u[0].clone();
 assert(r.start(new THREE.Vector3(4,-1,0)));assert.equal(r.count,2);assert.deepEqual(u[0],first,'A new touch begins at zero; older wave must not jump');
 r.advance(.2);assert(u[0].z>first.z);assert(u[1].z<c.softness+4);assert.equal(r.count,2);
 const held=u.map(v=>v.clone());r.advance(0);assert.deepEqual(u,held);
 assert(r.start(new THREE.Vector3(-8,0,0)));assert(r.start(new THREE.Vector3(8,0,0)));assert.equal(r.count,4);
 const full=u.map(v=>v.clone());assert(!r.start(new THREE.Vector3()));assert.deepEqual(u,full);assert.equal(r.count,4);
 for(let t=0;t<c.duration+1/hz;t+=1/hz){r.advance(1/hz);assert(u.reduce((n,v)=>n+v.w,0)<c.amplitudeBudget);}
 assert(!r.active);assert.equal(r.count,0);assert(u.every(v=>v.w===0));
 r.start(new THREE.Vector3());r.advance(.4);r.start(new THREE.Vector3(2,0,0));r.advance(2.01);assert.equal(r.count,1);
 r.start(new THREE.Vector3(-2,0,0));assert.equal(r.count,2);r.cancel();assert.equal(r.count,0);assert(!r.active);r.dispose();
 assert.deepEqual(geo.attributes.position.array,original);assert.deepEqual(geo.index.array,indices);assert(geo.boundingBox.equals(bounds));assert(!originalDisposed);
}
const field=(x,y,waves)=>evaluateGlassRipple(x,y,waves,new Float64Array(8));
// Bound applies to all sums, independent of click phases or positions: the
// energy budget limits sum amplitudes, and each symmetric planar Jacobian has
// operator norm <= planar * amplitude * max(1/softness, k+exp(-.5)/width).
const derivativeBound=Math.max(1/c.softness,2*Math.PI/c.wavelength+Math.exp(-.5)/c.width);
const lowerBound=1-c.planar*c.amplitudeBudget*derivativeBound;
assert(lowerBound>.35);assert(c.amplitudeBudget*Math.hypot(c.planar,c.depth)<c.boundsMargin);
let minScale=1,maxDisplacement=0,maxNormalError=0;
const cases=[];
for(const reach of [12.24,24.47])for(let step=0;step<=144;step++){
 const t=step/60,raw=[0,.13,.32,.51].map((offset,i)=>{const s=sampleGlassRipple(Math.max(0,t-offset),reach);return new THREE.Vector4((i-1.5)*3,(i%2)*2-1,s.front,t>=offset?s.amount:0)});
 const gain=1/Math.hypot(1,raw.reduce((n,v)=>n+v.w,0)/c.amplitudeBudget);raw.forEach(v=>v.w*=gain);
 for(let x=-14;x<=14;x+=.5)for(let y=-6;y<=6;y+=1){
  const f=field(x,y,raw),lambda=(f[3]+f[5]-Math.hypot(f[3]-f[5],2*f[4]))/2;
  minScale=Math.min(minScale,lambda);maxDisplacement=Math.max(maxDisplacement,Math.hypot(f[0],f[1],f[2]));assert(lambda>=lowerBound);assert(Math.hypot(f[0],f[1],f[2])<c.boundsMargin);
 }
 if(step%20===0)cases.push(raw);
}
const n=new THREE.Vector3(.25,-.32,.915).normalize(),u=new THREE.Vector3(1,0,0).cross(n).normalize(),v=n.clone().cross(u).normalize(),h=1e-4;
for(const waves of cases)for(const [x,y]of [[0,0],[.001,.001],[2,1],[-8,3],[10,-4]]){
 const f=field(x,y,waves),qx=n.x-f[6]*n.z,qy=n.y-f[7]*n.z,det=f[3]*f[5]-f[4]*f[4];
 const analytic=new THREE.Vector3((f[5]*qx-f[4]*qy)/det,(f[3]*qy-f[4]*qx)/det,n.z).normalize();
 const map=p=>{const f=field(p.x,p.y,waves);return p.clone().add(new THREE.Vector3(f[0],f[1],f[2]));};const at=new THREE.Vector3(x,y,.2);
 const tangent=d=>map(at.clone().addScaledVector(d,h)).sub(map(at.clone().addScaledVector(d,-h))).divideScalar(2*h);
 const numeric=tangent(u).cross(tangent(v)).normalize();maxNormalError=Math.max(maxNormalError,analytic.distanceTo(numeric));assert(analytic.distanceTo(numeric)<1e-6);
}
// More than one visible oscillation passes a stationary letter.
let changes=0,previous=0;for(let t=0;t<c.duration;t+=.002){const {front,amount}=sampleGlassRipple(t,12.24),f=field(6,0,[new THREE.Vector4(0,0,front,amount)]);if(Math.abs(f[2])>.05){const sign=Math.sign(f[2]);if(previous&&previous!==sign)changes++;previous=sign;}}assert(changes>=3);
// Real indexed-mesh raycasting maps a displaced stroke back to its rest-space
// material point, so a second disturbance can start where the user sees glass.
const r=createGlassRipple(geo,material),uniforms=shaders(r);r.start(new THREE.Vector3(-3,0,0));r.advance(.35);r.start(new THREE.Vector3(4,0,0));r.advance(.25);
let hits=0,maxHitError=0;const began=performance.now();
for(const x of [-9,-5,-1,3,7,10])for(const y of [-1,1]){
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1)),rest=r.hitRestPoint(ray);if(!rest)continue;
 const f=field(rest.x,rest.y,uniforms),error=Math.hypot(rest.x+f[0]-x,rest.y+f[1]-y);maxHitError=Math.max(maxHitError,error);assert(error<.03);hits++;
}
assert(hits>=3);const hitTestMs=performance.now()-began;r.dispose();assert(!originalDisposed);assert.deepEqual(geo.attributes.position.array,original);
for(const t of [0,c.duration,c.duration+1])assert.equal(sampleGlassRipple(t,20).amount,0);
console.log('PASS four independent waves, no restart/jump/queue, budget, 30/60/120 lifecycle, pause/cancel/reuse, shader parity, combined normals, tighter frequency, deformed hit test',{lowerBound,minScale,maxDisplacement,maxNormalError,changes,hits,maxHitError,hitTestMs});
