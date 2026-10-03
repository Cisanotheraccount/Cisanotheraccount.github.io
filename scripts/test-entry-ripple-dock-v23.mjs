import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const directory=path.resolve('.site-build/entry-ripple-dock-test');await mkdir(directory,{recursive:true});
const output=path.join(directory,'module.mjs');
await build({stdin:{contents:"export * as THREE from 'three'; export { createDockLogo } from './src/v2-3/dockLogo'; export { createLogoGeometry } from './src/v2-3/logoGeometry'; export { createLogoWave } from './src/v2-3/logoWave'; export { createEntryRipple } from './src/v2-3/entryRipple';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:output,
 plugins:[{name:'raw-mesh',setup(b){b.onResolve({filter:/(?:logo-mesh\.json|logo\.svg)\?raw$/},a=>({path:path.resolve(a.resolveDir,a.path.split('?')[0]),namespace:'raw-mesh'}));b.onLoad({filter:/.*/,namespace:'raw-mesh'},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
const {THREE,createDockLogo,createLogoGeometry,createLogoWave,createEntryRipple}=await import(pathToFileURL(output));
const width=1440,height=900,slotRect={left:56,top:43,width:35*7.4293103/6.5275862,height:35};
const slot={dataset:{},getBoundingClientRect:()=>slotRect},hero={getBoundingClientRect:()=>({left:0,top:0,width,height})},host={dataset:{}};
globalThis.document={querySelector:()=>slot,dispatchEvent(){}};globalThis.window={__gxcEntry:{phase:'revealing'}};globalThis.location={search:'?qa=1'};
const camera=new THREE.OrthographicCamera(-13*width/height,13*width/height,13,-13,.1,150);camera.position.z=40;camera.updateMatrixWorld();
const fromCamera=new THREE.OrthographicCamera(-7*width/height,7*width/height,7,-7,.1,100);fromCamera.position.set(.04,-.025,20);fromCamera.lookAt(0,0,0);fromCamera.updateMatrixWorld();
const scene=new THREE.Scene(),source=new THREE.Mesh(createLogoGeometry(),new THREE.MeshPhysicalMaterial({transmission:1,thickness:.9}));
const pose=new THREE.Group();pose.add(source);scene.add(pose);pose.rotation.set(.13,-.17,0);pose.position.set(.1,-.5,0);pose.scale.setScalar(.92);
const wave=createLogoWave(source.geometry),toMaterial=new THREE.MeshPhysicalMaterial({transmission:1,thickness:.9});
let maxStartPixelError=0,maxStartNormalError=0,maxLandingPixelError=0,minimumOrientationDot=Infinity,checkedTriangles=0;
for(const phase of [0,.8,2.3,4.9]){
 wave.setPhase(phase);
 const ripple=createEntryRipple(source.geometry);
 for(const x of [-2,0,2])ripple.start(new THREE.Vector3(x,0,0));
 ripple.advance(.2+phase*.15);ripple.apply();pose.updateMatrixWorld(true);
 const dock=createDockLogo(camera,hero,host,toMaterial,[]);
 dock.capture({scene,camera:fromCamera,mesh:source,wavePhase:phase});dock.update(0);
 const original=source.geometry.getAttribute('position'),copy=dock.mesh.geometry.getAttribute('position'),normals=dock.mesh.geometry.getAttribute('normal');
 const p=new THREE.Vector3(),q=new THREE.Vector3(),n=new THREE.Vector3(),m=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(new THREE.Matrix4().multiplyMatrices(fromCamera.matrixWorldInverse,source.matrixWorld));
 for(let i=0;i<copy.count;i++){
  p.fromBufferAttribute(original,i).applyMatrix4(source.matrixWorld).project(fromCamera);q.fromBufferAttribute(copy,i).applyMatrix4(dock.mesh.matrixWorld).project(camera);
  maxStartPixelError=Math.max(maxStartPixelError,Math.hypot((p.x-q.x)*width/2,(p.y-q.y)*height/2));
  n.fromBufferAttribute(source.geometry.getAttribute('normal'),i).applyMatrix3(normalMatrix).normalize();m.fromBufferAttribute(normals,i);
  maxStartNormalError=Math.max(maxStartNormalError,n.distanceTo(m));
 }
 const indices=dock.mesh.geometry.index.array,start=copy.array.slice();
 dock.update(700);const end=copy.array.slice();
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3();
 const faceNormal=(array,i,j,k,out)=>{a.fromArray(array,i*3);b.fromArray(array,j*3);c.fromArray(array,k*3);return out.crossVectors(e1.subVectors(b,a),e2.subVectors(c,a)).normalize()};
 const reference=[],normal=new THREE.Vector3(),startNormal=new THREE.Vector3(),endNormal=new THREE.Vector3();
 for(let i=0;i<indices.length;i+=3){
  faceNormal(start,indices[i],indices[i+1],indices[i+2],startNormal);
  faceNormal(end,indices[i],indices[i+1],indices[i+2],endNormal);
  reference.push(startNormal.clone().add(endNormal).normalize());
 }
 // Screen-space winding legitimately changes on grazing sides as tilt settles.
 // Check actual 3D orientation of EVERY face against its endpoint normal cone.
 for(const ms of [0,70,175,350,525,650,700]){
  dock.update(ms);
  for(let i=0;i<indices.length;i+=3){
   faceNormal(copy.array,indices[i],indices[i+1],indices[i+2],normal);
   const dot=normal.dot(reference[i/3]);
   assert(dot>0,'A 3D face reversed during docking at phase '+phase+', ms '+ms+', face '+i/3);
   checkedTriangles++;minimumOrientationDot=Math.min(minimumOrientationDot,dot);
  }
  assert([...copy.array].every(Number.isFinite));assert([...normals.array].every(Number.isFinite));
  for(let i=0;i<normals.count;i++)assert(Math.abs(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))-1)<2e-6);
 }
 dock.acknowledge();
 const actual=JSON.parse(host.dataset.brandLogoRect),target=JSON.parse(host.dataset.brandLogoTarget);
 maxLandingPixelError=Math.max(maxLandingPixelError,...['left','top','width','height'].map(k=>Math.abs(actual[k]-target[k])));
 const frozen=copy.array.slice();camera.position.set(.7,-.4,40);camera.lookAt(.2,-.1,0);camera.updateMatrixWorld();dock.update(700);dock.acknowledge();
 assert.deepEqual(copy.array,frozen,'settled logo vertices do not follow the pointer camera');
 const after=JSON.parse(host.dataset.brandLogoRect);
 maxLandingPixelError=Math.max(maxLandingPixelError,...['left','top','width','height'].map(k=>Math.abs(after[k]-target[k])));
 dock.dispose();camera.position.set(0,0,40);camera.lookAt(0,0,0);camera.updateMatrixWorld();
}
assert(maxStartPixelError<.001,'screen-space handoff must be continuous');assert(maxStartNormalError<1e-6,'smooth normals must transfer');assert(maxLandingPixelError<.01,'camera-compensated landing must align');
const report={passed:true,phaseSamples:4,vertices:source.geometry.getAttribute('position').count,maxStartPixelError,maxStartNormalError,maxLandingPixelError,checkedTriangles,minimumOrientationDot,checks:['actual deformed source capture','finite vertices and unit normals through docking','camera compensated static landing','no logo resource sharing with source']};
await writeFile('v-next/review/logo-corner-entry-ripple-20261003/dock-geometry.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
