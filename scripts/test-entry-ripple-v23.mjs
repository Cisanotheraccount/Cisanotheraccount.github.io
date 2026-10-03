import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import * as THREE from 'three';
async function load(file){const result=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'cjs',external:['three']});const module={exports:{}};runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:()=>THREE});return module.exports;}
const {createEntryRipple}=await load('src/v2-3/entryRipple.ts');
const {createGlassRippleField,evaluateGlassRipple}=await load('src/v2-3/glassRipple.ts');
const {createLogoWave}=await load('src/v2-3/logoWave.ts');
const data=JSON.parse(await readFile('public/v2-3/entry-rounded/logo-mesh.json'));
const edges=new Map();for(let i=0;i<data.indices.length;i+=3)for(let j=0;j<3;j++){const a=data.indices[i+j],b=data.indices[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const edge=edges.get(key)||[0,0];edge[0]++;edge[1]+=a<b?1:-1;edges.set(key,edge);}assert([...edges.values()].every(([count,direction])=>count===2&&direction===0),'Closed consistently wound mesh: every edge is shared in opposite directions');
const make=()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));g.setIndex(data.indices);g.computeBoundingBox();return g;};
let maxNormalError=0,maxDisplacement=0,minOrientation=1,triangles=0,inverted=0;
for(const phase of [0,.7,2.2,4.6]){
 const geo=make(), orbit=createLogoWave(geo), ripple=createEntryRipple(geo);orbit.setPhase(phase);ripple.apply();
 const base=geo.attributes.position.array.slice(),baseNormals=geo.attributes.normal.array.slice();
 const initial=make().boundingBox,scale=(initial.max.x-initial.min.x)/22.33;const packets=createGlassRippleField(new THREE.Box3(initial.min.clone().divideScalar(scale),initial.max.clone().divideScalar(scale)));
 for(const xy of [[-2,0],[0,1],[2,-1],[0,-2]]) packets.start(new THREE.Vector3(...xy,0).divideScalar(scale));
 for(const xy of [[-2,0],[0,1],[2,-1],[0,-2]])assert(ripple.start(new THREE.Vector3(...xy,0)));
 assert.equal(ripple.count,4);assert(!ripple.start(new THREE.Vector3()));
 for(const t of [.15,.35,.7,.95]){
  ripple.advance(t);packets.advance(t);orbit.setPhase(phase);ripple.apply();
  const p=geo.attributes.position.array,n=geo.attributes.normal.array;
  for(let i=0;i<p.length;i+=3){assert(Number.isFinite(p[i]+p[i+1]+p[i+2]));maxNormalError=Math.max(maxNormalError,Math.abs(Math.hypot(n[i],n[i+1],n[i+2])-1));maxDisplacement=Math.max(maxDisplacement,Math.hypot(p[i]-base[i],p[i+1]-base[i+1],p[i+2]-base[i+2]));}
  const v=(array,i)=>new THREE.Vector3().fromArray(array,i*3);
  for(let k=0;k<data.indices.length;k+=3){const [a,b,c]=data.indices.slice(k,k+3);const original=v(base,b).sub(v(base,a)).cross(v(base,c).sub(v(base,a))).normalize();const deformed=v(p,b).sub(v(p,a)).cross(v(p,c).sub(v(p,a))).normalize();const center=v(base,a).add(v(base,b)).add(v(base,c)).multiplyScalar(1/(3*scale));const f=evaluateGlassRipple(center.x,center.y,packets.uniforms,new Float64Array(8));const qx=original.x-f[6]*original.z,qy=original.y-f[7]*original.z,det=f[3]*f[5]-f[4]*f[4];const expected=new THREE.Vector3((f[5]*qx-f[4]*qy)/det,(f[3]*qy-f[4]*qx)/det,original.z).normalize();const orientation=expected.dot(deformed);minOrientation=Math.min(minOrientation,orientation);if(orientation<=0) inverted++;triangles++;}
  const frozen=p.slice(),frozenNormals=n.slice();ripple.advance(0);orbit.setPhase(phase);ripple.apply();assert.deepEqual(p,frozen,'No cumulative displacement or paused jump');assert.deepEqual(n,frozenNormals);
 }
 ripple.cancel();orbit.setPhase(phase);ripple.apply();assert.deepEqual(geo.attributes.position.array,base);assert.deepEqual(geo.attributes.normal.array,baseNormals);assert.equal(ripple.count,0);
 // Picking uses the actual displaced surface, but returns the material point.
 ripple.start(new THREE.Vector3(-2,0,0));ripple.advance(.5);orbit.setPhase(phase);ripple.apply();
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();let hits=0;
 for(let x=-3;x<=3;x+=.5)for(let y=-2;y<=2;y+=.5){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(mesh)[0];if(!hit)continue;assert(ripple.hitPoint(hit));hits++;}assert(hits>10);
 mesh.material.dispose();geo.dispose();
}
assert.equal(inverted,0,`Triangle orientation failures: ${inverted}, minimum ${minOrientation}`);assert(maxNormalError<1e-6);console.log('PASS composed orbital + 4-click waves; real picking, pause, cancel, no accumulated drift, unit normals, no inverted triangles',{triangles,minOrientation,maxDisplacement,maxNormalError});
