var It=Object.defineProperty;var Vt=(r,a,n)=>a in r?It(r,a,{enumerable:!0,configurable:!0,writable:!0,value:n}):r[a]=n;var v=(r,a,n)=>Vt(r,typeof a!="symbol"?a+"":a,n);import{S as He,C as qt,M as je,P as Ke,V,a as Je,b as Ze,c as _t,W as Gt,L as Qe,H as Ot,d as Wt,e as et,f as Nt,g as Yt,h as xe,i as q,D as Xt,R as Ht,U as Kt,N as Jt,j as Zt,k as Qt,A as ea,l as ta,O as aa,T as oa,m as ra,n as ia,o as sa,F as na,p as la,B as ca,q as Ct,G as ua,r as da,s as ha,t as pa,u as va}from"./gpuTiming-BVCjalbk.js";import{v as e,g as At,h as tt,p as We,a as ne,s as ma,b as B,c as De,r as fa,d as ga,e as ye,f as xa,i as Ne,j as Ye,k as Ft,l as ya,m as Dt,n as wa}from"./next-OymXH1NK.js";import"./lenis-CH_BOYM6.js";const Sa=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Tt="#include <tonemapping_pars_fragment>",W=(r=!1,a=0)=>new Gt(1,1,{type:Ot,minFilter:Qe,magFilter:Qe,depthBuffer:r,stencilBuffer:!1,samples:a}),ie=(r,a)=>new _t({vertexShader:Sa,fragmentShader:r,uniforms:a,depthTest:!1,depthWrite:!1,toneMapped:!1});class ba{constructor(a){v(this,"quadScene",new He);v(this,"quadCamera",new qt);v(this,"quad",new je(new Ke(2,2)));v(this,"color",W(!0,4));v(this,"mask",W(!0,4));v(this,"background",W());v(this,"flare",W());v(this,"velocity",W());v(this,"velocitySwap",W());v(this,"pressure",W());v(this,"pressureSwap",W());v(this,"divergence",W());v(this,"texel",new V(1,1));v(this,"pointer",new V(-1,-1));v(this,"pointerFrom",new V(-1,-1));v(this,"impulse",new V);v(this,"pixel",new V(1,1));v(this,"aspect",{value:1});v(this,"dt",{value:1/60});v(this,"maskMaterial",new Je({color:16777215,toneMapped:!1}));v(this,"advect");v(this,"diverge");v(this,"solve");v(this,"project");v(this,"star");v(this,"composite");v(this,"energy",0);v(this,"stale",!0);v(this,"backgroundDirty",!0);v(this,"nextFlareAt",-1/0);v(this,"flareAllowed",!0);v(this,"disposed",!1);v(this,"width",1);v(this,"height",1);this.renderer=a,this.quad.material.dispose(),this.color.samples=this.mask.samples=Math.min(4,a.capabilities.maxSamples),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=ie(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform float uDt, uAspect;
      uniform vec2 uPointer, uFrom, uImpulse;
      void main() {
        vec2 old = texture2D(uVelocity, vUv).xy;
        vec2 velocity = texture2D(uVelocity, clamp(vUv - old * uDt, .001, .999)).xy;
        velocity *= exp(-${e.fluid.dissipation.toFixed(2)} * uDt);
        // Splat along the actual pointer segment, avoiding disconnected dents on fast passes.
        vec2 metric=vec2(uAspect,1.);
        vec2 segment=(uPointer-uFrom)*metric;
        vec2 relative=(vUv-uFrom)*metric;
        float along=clamp(dot(relative,segment)/max(dot(segment,segment),.000001),0.,1.);
        vec2 d=relative-segment*along;
        float splat = exp(-dot(d,d) / ${(e.fluid.radius**2).toFixed(6)});
        velocity += uImpulse * splat * ${e.fluid.force.toFixed(2)};
        float speed = length(velocity*metric);
        if (speed > ${e.fluid.velocityLimit}) velocity *= ${e.fluid.velocityLimit} / speed;
        gl_FragColor = vec4(velocity, 0., 1.);
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=ie(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=ie(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=ie(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=ie(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${Tt}
      vec3 bright(vec2 uv) {
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,clamp(uv,0.,1.)).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${e.flare.threshold})/${1-e.flare.threshold},0.,1.),${e.flare.power.toFixed(1)});
        return c*b*texture2D(uMask,clamp(uv,0.,1.)).r;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        for(int i=1;i<=8;i++) {
          float t=float(i)/8.; vec2 d=axis*uPixel*${e.flare.length.toFixed(1)}*t;
          float weight=pow(1.-t,2.);
          sum+=(bright(vUv+d)+bright(vUv-d))*weight;
        }
        return sum;
      }
      void main() {
        vec3 glow=ray(vec2(0.,1.))+ray(vec2(.8660254,.5))+ray(vec2(.8660254,-.5));
        gl_FragColor=vec4(glow*${(e.flare.intensity/5).toFixed(5)},1.);
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new V(1,1)},toneMappingExposure:{value:e.lighting.exposure}}),this.composite=ie(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Tt}
      vec3 glassAt(vec2 uv,float coverage) {
        vec3 c=texture2D(uColor,uv).rgb;
        // Unmix edge coverage before tone mapping; do not bake the backdrop into the matte.
        vec3 bg=texture2D(uBackground,uv).rgb;
        c=max(c-bg*(1.-coverage),0.)/max(coverage,.0001);
        return ACESFilmicToneMapping(c);
      }
      void main() {
        // Background always samples the undisplaced screen coordinate, including vacated edges.
        vec3 bg=texture2D(uBackground,vUv).rgb;
        vec2 d=texture2D(uVelocity,vUv).xy*${e.fluid.displacement}*uFluid;
        float pixels=length(d/uPixel);
        // A soft limit keeps large pushes rounded instead of clipping them into a flat dent.
        d /= sqrt(1. + pow(pixels / uMaxDisplacement, 2.));
        vec2 uv=clamp(vUv-d,.0001,.9999);
        float coverage=texture2D(uMask,uv).r;
        vec3 glass=glassAt(uv,coverage);
        // Dispersion remains inside a single coherent silhouette, never three displaced outlines.
        vec2 redUv=uv-d*${e.fluid.chroma}, blueUv=uv+d*${e.fluid.chroma};
        float redMask=texture2D(uMask,redUv).r, blueMask=texture2D(uMask,blueUv).r;
        glass.r=mix(glass.r,glassAt(redUv,redMask).r,smoothstep(.2,.95,redMask));
        glass.b=mix(glass.b,glassAt(blueUv,blueMask).b,smoothstep(.2,.95,blueMask));
        if(uFlareEnabled>.5) glass+=texture2D(uFlare,uv).rgb;
        gl_FragColor=vec4(mix(bg,glass,coverage),1.);
        #include <colorspace_fragment>
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:e.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:e.lighting.exposure}})}setSize(a,n,g){this.width=Math.max(1,Math.round(a*g)),this.height=Math.max(1,Math.round(n*g)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.flare.setSize(Math.ceil(this.width*e.flare.resolutionScale),Math.ceil(this.height*e.flare.resolutionScale));const i=a/n,l=Math.round(e.fluid.resolution*Math.max(1,i)),m=Math.round(e.fluid.resolution*Math.max(1,1/i));for(const h of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])h.setSize(l,m);this.texel.set(1/l,1/m),this.aspect.value=i,this.pixel.set(1/a,1/n),this.composite.uniforms.uMaxDisplacement.value=Math.min(e.fluid.maxPixels,a*e.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/a,1/n),this.reset(),this.nextFlareAt=-1/0}setFlare(a){this.flareAllowed=a,this.composite.uniforms.uFlareEnabled.value=+a}invalidateBackground(){this.backgroundDirty=!0}async warm(){const a=this.renderer.getRenderTarget(),n=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.composite,null]];try{for(const[g,i]of n){if(this.disposed)return;this.quad.material=g,this.renderer.setRenderTarget(i),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(a)}}push(a,n){this.pointerFrom.copy(a).sub(n),this.pointer.copy(a),this.impulse.add(n).clampLength(0,e.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,n.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>e.fluid.settle||this.impulse.lengthSq()>1e-9}draw(a,n){this.quad.material=a,this.renderer.setRenderTarget(n),this.renderer.render(this.quadScene,this.quadCamera)}clear(a){this.renderer.setRenderTarget(a),this.renderer.clear()}render(a,n,g,i,l,m){const h=this.renderer,u=h.getRenderTarget(),C=h.getClearColor(new Ze),w=h.getClearAlpha(),M=g.material,s=i.visible,d=g.visible;try{if(h.setClearColor(0,1),(this.stale||!m)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,m||(this.energy=0,this.impulse.set(0,0))),m&&this.active){this.dt.value=Math.min(l,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let U=0;U<e.fluid.pressureIterations;U++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-e.fluid.dissipation*l),this.impulse.set(0,0)}h.setClearColor(C,w),this.backgroundDirty&&(g.visible=!1,h.setRenderTarget(this.background),h.render(a,n),g.visible=d,this.backgroundDirty=!1),h.setRenderTarget(this.color),h.render(a,n),g.material=this.maskMaterial,i.visible=!1,h.setClearColor(0,1),h.setRenderTarget(this.mask),h.render(a,n),g.material=M,i.visible=s;const b=performance.now();if(this.flareAllowed&&b+.5>=this.nextFlareAt){this.draw(this.star,this.flare);const S=1e3/(At().targetFps>60?e.flare.highRefreshFps:e.flare.standardFps),T=Number.isFinite(this.nextFlareAt)?Math.max(0,b-this.nextFlareAt)%S:0;this.nextFlareAt=b+S-T}this.composite.uniforms.uVelocity.value=this.velocity.texture;const j=Math.min(1,this.energy/e.fluid.tailThreshold);this.composite.uniforms.uFluid.value=m&&this.active?j*j*(3-2*j):0,this.draw(this.composite,u)}finally{g.material=M,i.visible=s,g.visible=d,h.setClearColor(C,w),h.setRenderTarget(u)}}dispose(){if(!this.disposed){this.disposed=!0;for(const a of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])a.dispose();for(const a of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial])a.dispose();this.quad.geometry.dispose()}}}const y={columns:4,rows:4,cell:304,padding:8,image:128,capacity:tt.length,labelStart:tt.length,labelImage:ne.canvasSize*ne.scale},Ue=tt,jt=Object.fromEntries(Ue.map((r,a)=>[r,a]));let Xe;function Ut(r){return new Promise((a,n)=>{const g=new Image,i=window.setTimeout(()=>l(new Error(`Project mark timed out: ${r}`)),1e4),l=m=>{clearTimeout(i),g.onload=null,g.onerror=null,m?n(m):a(g)};g.onload=()=>l(),g.onerror=()=>l(new Error(`Project mark could not load: ${r}`)),g.src=`/v-next/project-marks/${r}`})}async function ka(){Xe||(Xe=Promise.all([Promise.all(Ue.map(a=>{const n=We[a];return Ut(n.file).catch(g=>{if(n.file===n.fallbackFile)throw g;return Ut(n.fallbackFile)})})),document.fonts.load(ne.font,Ue.map(a=>We[a].shortName).join(" "))]).then(([a])=>{const{columns:n,rows:g,cell:i,padding:l,image:m}=y,h=document.createElement("canvas");h.width=n*i,h.height=g*i;const u=h.getContext("2d");if(!u)throw new Error("Project atlas canvas is unavailable");return a.forEach((C,w)=>{const M=m/Math.max(C.naturalWidth,C.naturalHeight),s=C.naturalWidth*M,d=C.naturalHeight*M;u.drawImage(C,w%n*i+l+(m-s)/2,Math.floor(w/n)*i+l+(m-d)/2,s,d)}),Ue.forEach((C,w)=>{const M=w+y.labelStart,s=ne,d=s.canvasSize/2;u.save(),u.translate(M%n*i+l,Math.floor(M/n)*i+l),u.scale(s.scale,s.scale),u.font=s.font,"letterSpacing"in u&&(u.letterSpacing=`${s.letterSpacing}px`);const f=We[C].shortName,b=u.measureText(f),j=Math.min(s.maxWidth,Math.ceil(b.width)+s.paddingX*2);u.beginPath(),u.roundRect(d-j/2,d-s.height/2,j,s.height,s.radius),u.fillStyle=s.background,u.shadowColor="#0002",u.shadowBlur=8*s.scale,u.shadowOffsetY=2*s.scale,u.fill(),u.shadowColor="transparent",u.shadowBlur=0,u.shadowOffsetY=0,u.fillStyle=s.foreground,u.textAlign="center",u.textBaseline="alphabetic";const U=b.fontBoundingBoxAscent??b.actualBoundingBoxAscent,S=b.fontBoundingBoxDescent??b.actualBoundingBoxDescent;u.fillText(f,d,d+(U-S)/2,j-s.paddingX*2),u.restore()}),h}));const r=new Wt(await Xe);return r.colorSpace=et,r.minFilter=Nt,r.magFilter=Qe,r.wrapS=r.wrapT=Yt,r.name="galaxci-project-marks-and-labels",r}const _={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},Te={width:_.columns*_.texelsPerCell,height:_.rows};function Ma(r,a,n,g,i){const{columns:l,rows:m,slots:h,texelsPerCell:u,overflow:C}=_;if(r.length!==l*m*u*4)throw new Error("Incorrect star index buffer size");if(a.length>=C)throw new Error("Star index supports at most 254 points");r.fill(0);let w=0,M=0;for(let s=0;s<a.length;s++){const d=a[s],f=d.radiusPx*i;if(!Number.isFinite(d.u+d.v+f)||f<=0)continue;const b=f+.01,j=d.u-b/n,U=d.u+b/n,S=d.v-b/g,T=d.v+b/g;if(U<0||j>1||T<0||S>1)continue;const A=Math.max(0,Math.min(l-1,Math.floor(j*l))),F=Math.max(0,Math.min(l-1,Math.floor(U*l))),P=Math.max(0,Math.min(m-1,Math.floor(S*m))),x=Math.max(0,Math.min(m-1,Math.floor(T*m)));for(let D=P;D<=x;D++)for(let R=A;R<=F;R++){const $=(D*l+R)*u*4,L=r[$];if(L!==C){if(L===h){r[$]=C,M++;continue}L===0&&w++,r[$]=L+1,r[$+L+1]=s+1}}}return{occupiedCells:w,overflowCells:M}}const se=ma.capacity;function Pa(r){const a=r.onBeforeCompile,n=r.customProgramCacheKey,g=n.call(r),i=new q(1,1,1),l=Array.from({length:se},()=>new xe),m=Array.from({length:se},()=>new xe(1,0,1,0)),h=Array.from({length:B.capacity},()=>new xe),u=Array.from({length:B.capacity},()=>new q(1,1,1)),C=new Uint8Array(Te.width*Te.height*4),w=new Xt(C,Te.width,Te.height,Ht,Kt);w.minFilter=w.magFilter=Jt,w.generateMipmaps=!1,w.flipY=!1,w.colorSpace=Zt,w.needsUpdate=!0;const M=Array.from({length:y.capacity},()=>new xe),s=Array.from({length:y.capacity},()=>new xe),d=Array.from({length:y.capacity},()=>0),f={uSkyViewport:{value:i},uSkyCount:{value:0},uSkyHeads:{value:l},uSkyDirections:{value:m},uPhotoStarSize:{value:new V(De.source.width,De.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:h},uPhotoStarColors:{value:u},uPhotoStarIndex:{value:w},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:M},uProjectCells:{value:d},uProjectTails:{value:s}};let b=!1;const j=function(S,T){a.call(r,S,T),Object.assign(S.uniforms,f),S.vertexShader=S.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),S.fragmentShader=S.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${se}];
uniform vec4 uSkyDirections[${se}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${B.capacity}];
uniform vec3 uPhotoStarColors[${B.capacity}];
uniform sampler2D uPhotoStarIndex;
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${y.capacity}];
uniform float uProjectCells[${y.capacity}];
uniform vec4 uProjectTails[${y.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${y.capacity}; i++) {
    if (i >= uProjectCount) break;
    vec4 project = uProjects[i];
    vec4 tail = uProjectTails[i];
    vec2 offset = screen - project.xy;
    float along = dot(offset, tail.xy) - project.z * 0.35;
    float across = dot(offset, vec2(-tail.y, tail.x));
    if (along > 0.0 && along < tail.z) {
      float progress = along / max(tail.z, 1.0);
      float thread = exp(-0.5 * across * across / 0.49);
      float softness = exp(-0.5 * across * across / 4.0);
      float taper = pow(1.0 - progress, 1.8) * smoothstep(0.0, 4.0, along);
      result += vec3(0.82, 0.90, 1.0) * (thread * 0.13 + softness * 0.025) * taper * project.w;
    }
    vec2 local = offset / max(project.z, 1.0) + 0.5;
    float cell = uProjectCells[i];
    vec2 origin = vec2(mod(cell, ${y.columns.toFixed(1)}), floor(cell / ${y.columns.toFixed(1)})) * ${y.cell.toFixed(1)};
    vec2 uv = (origin + ${y.padding.toFixed(1)} + local * ${y.image.toFixed(1)})
      / vec2(${(y.columns*y.cell).toFixed(1)}, ${(y.rows*y.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${ne.offsetY.toFixed(1)})) / ${ne.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${y.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${y.columns.toFixed(1)}), floor(labelCell / ${y.columns.toFixed(1)})) * ${y.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${y.padding.toFixed(1)} + labelLocal * ${y.labelImage.toFixed(1)})
      / vec2(${(y.columns*y.cell).toFixed(1)}, ${(y.rows*y.cell).toFixed(1)});
    labelUv.y = 1.0 - labelUv.y;
    // Implicit texture LOD inside a clipped quad can sample a coarse atlas mip
    // at its boundary and expose a faint square. Derivatives must be evaluated
    // before divergence, then passed explicitly to the WebGL 2 sampler.
    vec2 atlasDx = dFdx(uv), atlasDy = dFdy(uv);
    vec2 labelDx = dFdx(labelUv), labelDy = dFdy(labelUv);
    if (local.x >= 0.0 && local.x <= 1.0 && local.y >= 0.0 && local.y <= 1.0) {
      vec4 mark = textureGrad(uProjectAtlas, uv, atlasDx, atlasDy);
      // The atlas sampler's SRGB texture format already returns linear RGB.
      result = mix(result, mark.rgb, mark.a * project.w);
    }
    // The name is composed in exactly the same opaque background as its icon,
    // so transmission refracts/occludes them together instead of a DOM caption
    // floating above the wordmark. Both quads derive from the same frame center.
    if (tail.w > 0.0 && labelLocal.x >= 0.0 && labelLocal.x <= 1.0 && labelLocal.y >= 0.0 && labelLocal.y <= 1.0) {
      vec4 label = textureGrad(uProjectAtlas, labelUv, labelDx, labelDy);
      result = mix(result, label.rgb, label.a * tail.w * project.w);
    }
  }
  return result;
}

vec3 twinkleToSRGB(vec3 value) {
  return mix(1.055 * pow(max(value, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, value * 12.92, lessThanEqual(value, vec3(0.0031308)));
}
vec3 twinkleToLinear(vec3 value) {
  return mix(pow((value + 0.055) / 1.055, vec3(2.4)), value / 12.92, lessThanEqual(value, vec3(0.04045)));
}
int photoStarIndexAt(ivec2 cell, int slot) {
  ivec2 address = ivec2(cell.x * ${_.texelsPerCell} + slot / 4, cell.y);
  vec4 packedIndices = texelFetch(uPhotoStarIndex, address, 0);
  return int(floor(packedIndices[slot % 4] * 255.0 + 0.5));
}
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  // Lookup uses top-left original-photo UV, independent of viewport/DPR/crop.
  ivec2 cell = ivec2(clamp(floor(vec2(photoUv.x, 1.0 - photoUv.y)
    * vec2(${_.columns.toFixed(1)}, ${_.rows.toFixed(1)})), vec2(0.0),
    vec2(${(_.columns-1).toFixed(1)}, ${(_.rows-1).toFixed(1)})));
  int storedCount = photoStarIndexAt(cell, 0);
  bool overflow = storedCount == ${_.overflow};
  int count = overflow ? uPhotoStarCount : storedCount;
  if (count == 0) return light;
  for (int entry = 0; entry < ${B.capacity}; entry++) {
    if (entry >= count) break;
    int i = overflow ? entry : photoStarIndexAt(cell, entry + 1) - 1;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${(B.supportSigma**2).toFixed(1)}) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2*B.haloSigma**2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${(B.supportSigma**2).toFixed(1)}, q);
    float alpha = clamp(core * ${B.coreOpacity.toFixed(4)} + halo * ${B.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
    // An independent screen-blended sRGB light layer, matching the DOM fallback.
    // Only its local contribution is added; the decoded photograph stays intact.
    vec3 base = clamp(twinkleToSRGB(photoColor), 0.0, 1.0);
    vec3 composed = base + (1.0 - base) * uPhotoStarColors[i] * alpha;
    light += max(vec3(0.0), twinkleToLinear(composed) - photoColor);
  }
  #endif
  return light;
}

vec3 skyMeteorLight() {
  vec2 screen = skyScreenPosition();
  vec3 light = vec3(0.0);
  for (int i = 0; i < ${se}; i++) {
    if (i >= uSkyCount) break;
    vec4 head = uSkyHeads[i];
    vec4 direction = uSkyDirections[i];
    vec2 offset = screen - head.xy;
    float along = dot(offset, direction.xy);
    float across = dot(offset, vec2(-direction.y, direction.x));
    float width = max(direction.z, 0.35);
    float length = max(head.z, 1.0);
    if (along < -width * 9.0 || along > length) continue;

    float progress = clamp(along / length, 0.0, 1.0);
    float taper = width * mix(1.0, 0.3, progress);
    float core = exp(-0.5 * across * across / (taper * taper));
    float haloWidth = width * 4.0 + 1.5;
    float halo = exp(-0.5 * across * across / (haloWidth * haloWidth));
    float tail = pow(1.0 - progress, 1.4)
      * (1.0 - smoothstep(0.88, 1.0, progress))
      * smoothstep(-width * 1.5, width * 0.5, along);
    float headRadius = width * 1.7;
    float tip = exp(-0.5 * dot(offset, offset) / (headRadius * headRadius));

    // Linear additive light, with a restrained cool-silver halo. The source
    // photograph remains exactly unchanged wherever this contribution is zero.
    light += head.w * (
      vec3(1.0) * (core * tail * 1.05 + tip * 0.58)
      + vec3(0.92, 0.96, 1.0) * halo * tail * 0.065
    );
  }
  return light;
}`).replace("#include <opaque_fragment>",`#ifdef USE_MAP
outgoingLight += photoTwinkleLight(diffuseColor.rgb, vMapUv);
#endif
outgoingLight += skyMeteorLight();
outgoingLight = projectSkyColor(outgoingLight);
#include <opaque_fragment>`)},U=()=>`${g}:gxc-sky-backdrop-v10-layered-stars`;return r.onBeforeCompile=j,r.customProgramCacheKey=U,r.needsUpdate=!0,{setProjectAtlas(S){b||(f.uProjectAtlas.value=S,S||(f.uProjectCount.value=0))},updateProjects(S){if(b)return;const T=S.points.filter(F=>Number.isInteger(jt[F.slug])),A=f.uProjectAtlas.value?Math.min(T.length,y.capacity):0;f.uProjectCount.value=A;for(let F=0;F<A;F++){const P=T[F],x=P.angle*Math.PI/180;M[F].set(P.x,P.y,P.size,Math.max(0,Math.min(1,P.opacity))),s[F].set(Math.cos(x),Math.sin(x),P.tailLength,Math.max(0,Math.min(1,P.labelOpacity))),d[F]=jt[P.slug]}},updateTwinkles(S){var F;const T=f.uPhotoStarCount.value;f.uPhotoStarCount.value=b?0:Math.min(S.length,B.capacity);let A=T!==f.uPhotoStarCount.value;for(let P=0;P<f.uPhotoStarCount.value;P++){const x=S[P],D=h[P];(D.x!==x.u||D.y!==x.v||D.z!==x.radiusPx)&&(A=!0),D.set(x.u,x.v,x.radiusPx,x.amplitude),u[P].fromArray(((F=x.overlay)==null?void 0:F.color)??[1,1,1])}!b&&A&&(Ma(C,S.slice(0,f.uPhotoStarCount.value),De.source.width,De.source.height,B.supportSigma),w.needsUpdate=!0)},update(S,T,A,F){if(b)return;i.set(Math.max(T,1),Math.max(A,1),F);const P=Math.min(S.streaks.length,se);f.uSkyCount.value=P;for(let x=0;x<P;x++){const D=S.streaks[x],R=D.angle*Math.PI/180;l[x].set(D.x,D.y,D.length,Math.max(0,D.opacity)),m[x].set(Math.cos(R),Math.sin(R),D.width,0)}},dispose(){b||(b=!0,f.uSkyCount.value=0,f.uProjectCount.value=0,f.uProjectAtlas.value=null,f.uPhotoStarCount.value=0,w.dispose(),r.onBeforeCompile===j&&(r.onBeforeCompile=a),r.customProgramCacheKey===U&&(r.customProgramCacheKey=n),r.needsUpdate=!0)}}}async function ja(r,a,n,g){var C;const i=new Qt({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),l=[];let m=!1,h=!1;const u=()=>{if(!m){m=!0;for(const w of l.reverse())w();i.dispose(),i.domElement.remove()}};try{i.setClearColor(592396,1),i.outputColorSpace=et,i.toneMapping=ea,i.toneMappingExposure=e.lighting.exposure,i.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},i.domElement.setAttribute("aria-hidden","true"),r.appendChild(i.domElement);const w=ta(i.getContext(),t=>fa("hero",t));l.push(()=>w.dispose());const M=new He,s=new aa(-20,20,10,-10,.1,150);s.position.set(0,0,40);const d=r.closest(".gxc-hero")??r;let f,b,j,U;const S=new Promise((t,p)=>{j=t,U=p});l.push(ga(d,t=>{f=t,j(t),b==null||b(t)},()=>U(new Error("Background photograph could not load"))));const[T,A]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(t=>{if(!t.ok)throw new Error("Wordmark could not load");return t.json()}),S]);if(T.status==="rejected")throw T.reason;if(A.status==="rejected")throw A.reason;const F=T.value;f=f??A.value;const P=t=>{const p=new oa(t.image);return p.colorSpace=et,p.needsUpdate=!0,p};let x=P(f);l.push(()=>x.dispose());const D=new Ke(1,1),R=new Je({map:x,color:e.lighting.backdropTint,toneMapped:!1});l.push(()=>D.dispose(),()=>R.dispose());const $=new je(D,R);$.position.z=-6,M.add($);const L=Pa(R);let Ae=-1,Le=-1,we=-1,J,at=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?r.dataset.projectAtlas="disabled":ka().then(t=>{if(m||h){t.dispose();return}J=t,L.setProjectAtlas(t),r.dataset.projectAtlas="ready",at()}).catch(()=>{m||(r.dataset.projectAtlas="failed")}),l.push(()=>{L.dispose(),J==null||J.dispose(),delete d.dataset.skyReady,delete d.dataset.projectSkyReady});const $e=new He;$e.background=new Ze(1118742);const ot=[],rt=new ra(i);try{for(const p of e.lighting.panels){const k=new Je({color:new Ze(p.color).multiplyScalar(p.strength),side:ia}),c=new je(new Ke(...p.size),k);c.position.set(p.position[0],p.position[1],p.position[2]),c.lookAt(0,0,0),$e.add(c),ot.push(c)}const t=rt.fromScene($e,.06);l.push(()=>t.dispose()),M.environment=t.texture}finally{for(const t of ot)t.geometry.dispose(),t.material.dispose();rt.dispose()}const Ee=new sa({color:e.glass.tint,metalness:0,roughness:e.glass.roughness,transmission:1,thickness:e.glass.thickness,ior:e.glass.ior,dispersion:e.glass.dispersion,envMapIntensity:e.glass.environment,clearcoat:e.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:e.glass.attenuation,attenuationDistance:50,side:na});l.push(()=>Ee.dispose()),Ee.onBeforeCompile=t=>{t.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:e.scattering.strength},t.fragmentShader=`uniform float gxcScatterStrength;
`+t.fragmentShader;const p=la.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${e.glass.starExposure.toFixed(1)}, material.transmission`);t.fragmentShader=t.fragmentShader.replace("#include <transmission_fragment>",p+`
        #if defined(USE_TRANSMISSION) && NUM_POINT_LIGHTS > 0
          // A faint material-space light diffusion approximation, confined to the glass.
          // Three's geometry and point lights share view space, including orthographic views.
          IncidentLight gxcScatterLight;
          getPointLightInfo(pointLights[0], geometryPosition, gxcScatterLight);
          float gxcFacing = saturate(dot(geometryNormal, geometryViewDir));
          float gxcWrapped = saturate((dot(geometryNormal, gxcScatterLight.direction) + ${e.scattering.wrap}) / ${(1+e.scattering.wrap).toFixed(2)});
          float gxcPath = 1. - exp(-${e.scattering.density} * material.thickness / max(gxcFacing, .3));
          float gxcShoulder = .3 + .7 * pow(1. - gxcFacing, 1.5);
          totalDiffuse += gxcScatterLight.color * pow(gxcWrapped, 1.5) * gxcPath * gxcShoulder * gxcScatterStrength;
        #endif
      `)};const G=new ca;l.push(()=>G.dispose()),G.setAttribute("position",new Ct(F.positions,3)),G.setAttribute("normal",new Ct(F.normals,3)),G.setIndex(F.indices),G.computeBoundingBox();const it=G.boundingBox.getSize(new q),Lt=G.boundingBox.getCenter(new q),Se=new je(G,Ee),Z=new ua;Z.add(Se),M.add(Z);const st=new da(15397631,e.lighting.point,90,2);M.add(st);const nt=new ha(16777215,e.lighting.fill);nt.position.set(-5,9,6),M.add(nt);const Be=new URLSearchParams(location.search),be=matchMedia("(hover: hover) and (pointer: fine)"),$t=Be.has("no-postfx"),Re=Be.has("no-fluid"),lt=Be.has("no-flare");let o,le=!i.extensions.has("EXT_color_buffer_float"),ke=!n,Me=!0,N=!0,ce=!1,ze=!1,ue=0,de=0,Q=e.rimLight.angle,Pe=e.rimLight.angle,he=.07,pe=-.07,ee=0,te=0,Y=0,X=0,Ie=0,ct=0,Ce=0,Ve=-1,Et=0;at=()=>{we=-1,N=!0,o==null||o.invalidateBackground(),ye()};const ut=new V,ae=new V,dt=new V,ve=new q,oe=new q,ht=new q,pt=new q,vt=new pa,mt=new V,ft=new va(new q(0,0,1),0),qe=((C=r.parentElement)==null?void 0:C.parentElement)??r,H=(t=!1)=>{ue=0,de=0,Pe=e.rimLight.angle,ce=!1,Ve=-1,t&&(he=.07,pe=-.07,Q=e.rimLight.angle,ee=0,te=0,o==null||o.reset()),N=!0,ye()},_e=()=>{if(!(ke&&be.matches&&!$t&&!(Re&&lt)&&!le))o==null||o.dispose(),o=void 0;else if(!o)try{o=new ba(i),o.setFlare(!lt),o.setSize(Y||1,X||1,Ie||1)}catch{o==null||o.dispose(),o=void 0,le=!0}i.domElement.dataset.postfx=o?"enabled":le?"unsupported":"disabled"};l.push(()=>o==null?void 0:o.dispose());const Fe=()=>{if(m||h)return;const t=r.getBoundingClientRect(),p=a.getBoundingClientRect(),k=t.width,c=t.height;if(!k||!c)return;Ce=t.left,ct=t.top+window.scrollY;const E=Math.min(devicePixelRatio,k<700?e.glass.mobileDpr:e.glass.maxDpr);(k!==Y||c!==X||E!==Ie)&&(i.setPixelRatio(E),i.setSize(k,c,!1),Y=k,X=c,Ie=E,o==null||o.setSize(k,c,E));const z=26,I=z*k/c;s.left=-I/2,s.right=I/2,s.top=z/2,s.bottom=-z/2,s.updateProjectionMatrix();const re=k<700?22:80;Z.scale.setScalar(Math.min((k-re*2)/it.x,p.height*.88/it.y)*z/c),Z.position.y=(c/2-(p.top-t.top+p.height/2))*z/c;const O=e.cameraMotion.overscan;$.scale.set(I*O,z*O,1);const K=xa(k,c,f.width,f.height);x.repeat.set(k/K.width,c/K.height),x.repeat.multiplyScalar(O),x.offset.set((1-x.repeat.x)/2,(1-x.repeat.y)/2),L.update(Ne(d),k,c,O),o==null||o.invalidateBackground(),Ge(),Bt(),N=!0,ye()},Ge=()=>{Z.rotation.set(he,pe,-.018),Z.updateMatrixWorld(!0),ve.copy(Lt).applyMatrix4(Se.matrixWorld),st.position.set(ve.x+Math.cos(Q)*e.rimLight.radius,ve.y+Math.sin(Q)*e.rimLight.radius,e.rimLight.z),s.position.set(ee,te,40),ht.set(ee*e.cameraMotion.lookAtFactor,te*e.cameraMotion.lookAtFactor,0),s.lookAt(ht),s.updateMatrixWorld(),s.getWorldDirection(pt),$.position.copy(s.position).addScaledVector(pt,46),$.quaternion.copy(s.quaternion),$.updateMatrixWorld(!0)},Bt=()=>{const t=G.boundingBox,p=new q;let k=1/0,c=1/0,E=-1/0,z=-1/0;for(const re of[t.min.x,t.max.x])for(const O of[t.min.y,t.max.y])for(const K of[t.min.z,t.max.z]){p.set(re,O,K).applyMatrix4(Se.matrixWorld).project(s);const fe=(p.x+1)*Y/2,ge=(1-p.y)*X/2;k=Math.min(k,fe),E=Math.max(E,fe),c=Math.min(c,ge),z=Math.max(z,ge)}const I=18;r.dataset.wordRect=JSON.stringify({left:k-I,top:c-I,width:E-k+I*2,height:z-c+I*2})};b=t=>{if(m||h)return;const p=x;x=P(t),R.map=x,L.updateTwinkles(t.fallback?[]:Ye(d).points),i.domElement.dataset.photoSource=t.url,Fe(),p.dispose()},i.domElement.dataset.photoSource=f.url;const gt=t=>{const p=Ne(d),k=Ye(d),c=Ft(d);c.revision!==we&&(we=c.revision,L.updateProjects(c),o==null||o.invalidateBackground()),k.revision!==Le&&(Le=k.revision,L.updateTwinkles(f!=null&&f.fallback?[]:k.points),o==null||o.invalidateBackground()),p.revision!==Ae&&(Ae=p.revision,L.update(p,Y,X,e.cameraMotion.overscan),o==null||o.invalidateBackground()),w.begin();try{if(o)try{o.render(M,s,Se,$,t,ke&&!Re)}catch{o.dispose(),o=void 0,le=!0,i.domElement.dataset.postfx="failed",i.setRenderTarget(null),i.render(M,s)}else i.render(M,s)}finally{w.end()}i.domElement.dataset.frames=String(++Et),d.dataset.skyReady!=="true"&&(d.dataset.skyReady="true"),J&&c.points.length?d.dataset.projectSkyReady="true":delete d.dataset.projectSkyReady,i.domElement.dataset.skyCount=String(p.streaks.length),i.domElement.dataset.twinkleCount=String(k.points.length),i.domElement.dataset.projectCount=String(J?c.points.length:0),i.domElement.dataset.fluid=o!=null&&o.active?"active":"rest",N=!1},xt=t=>{t.preventDefault(),h=!0,Me=!1,r.dataset.failed="context-lost",g(),u()},yt=()=>H(),wt=()=>{document.hidden?H(!0):(N=!0,ye())},St=()=>{H(!0),_e()},bt=()=>H();i.domElement.addEventListener("webglcontextlost",xt),qe.addEventListener("pointerleave",bt),window.addEventListener("blur",yt),document.addEventListener("visibilitychange",wt),be.addEventListener("change",St),l.push(()=>{i.domElement.removeEventListener("webglcontextlost",xt),qe.removeEventListener("pointerleave",bt),window.removeEventListener("blur",yt),document.removeEventListener("visibilitychange",wt),be.removeEventListener("change",St)});const Oe=new ResizeObserver(Fe);Oe.observe(r),Oe.observe(a),l.push(()=>Oe.disconnect()),l.push(ya(Fe));const kt=new IntersectionObserver(t=>{Me=t[0].isIntersecting,H(!0)});if(kt.observe(qe),l.push(()=>kt.disconnect()),Fe(),_e(),Ge(),await i.compileAsync(M,s),o)try{await o.warm()}catch{o.dispose(),o=void 0,le=!0,i.domElement.dataset.postfx="failed"}if(m||h)throw new Error("Glass context unavailable");gt(1/60);let me=!1;const Rt=Dt((t,p)=>{if(!Me||m||h||document.hidden||ze)return!1;if(At("hero").staticFallback)return r.dataset.failed="performance",g(),u(),!1;const k=wa(),c=k.pointer,E=ct-k.scrollY;ke&&be.matches&&c.kind!=="touch"&&c.inside&&c.x>=Ce&&c.x<=Ce+Y&&c.y>=E&&c.y<=E+X?(ae.set((c.x-Ce)/Y,1-(c.y-E)/X),ue=ae.x*2-1,de=1-ae.y*2,mt.set(ue,-de),vt.setFromCamera(mt,s),ft.constant=-ve.z,vt.ray.intersectPlane(ft,oe)&&(oe.sub(ve),Math.hypot(oe.x,oe.y)>26*e.rimLight.centerDeadZone&&(Pe=Math.atan2(oe.y,oe.x))),c.lastMoved!==Ve&&(ce&&o&&!Re&&(dt.copy(ae).sub(ut),o.push(ae,dt)),ut.copy(ae),Ve=c.lastMoved),ce=!0):ce&&H();const I=.07+de*e.pointer.rotationX,re=-.07+ue*e.pointer.rotationY,O=ue*e.cameraMotion.offsetX,K=-de*e.cameraMotion.offsetY,fe=1-Math.exp(-e.pointer.damping*p),ge=1-Math.exp(-(ce?e.cameraMotion.damping:e.cameraMotion.leaveDamping)*p);he+=(I-he)*fe,pe+=(re-pe)*fe,ee+=(O-ee)*ge,te+=(K-te)*ge;const Mt=Math.atan2(Math.sin(Pe-Q),Math.cos(Pe-Q));Q+=Mt*(1-Math.exp(-e.rimLight.damping*p));const Pt=Math.abs(I-he)+Math.abs(re-pe)+Math.abs(Mt)+Math.abs(O-ee)+Math.abs(K-te)>2e-4;return(N||Pt||o!=null&&o.active)&&(Ge(),me=!0),Pt||!!(o!=null&&o.active)},"update"),zt=Dt((t,p)=>!Me||m||h||document.hidden||ze?(me=!1,!1):((Ne(d).revision!==Ae||Ye(d).revision!==Le||Ft(d).revision!==we)&&(me=!0),me&&(gt(p),me=!1),!!(o!=null&&o.active)),"render");return l.push(Rt,zt),{setMotion(t){m||h||(ke=t,H(!0),_e())},setSuspended(t){ze=t,t||(N=!0,ye())},dispose:u}}catch(w){throw u(),w}}export{ja as mountGlass};
