var Bt=Object.defineProperty;var Rt=(o,t,n)=>t in o?Bt(o,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):o[t]=n;var p=(o,t,n)=>Rt(o,typeof t!="symbol"?t+"":t,n);import{S as Ne,C as zt,M as je,P as Xe,V as z,a as He,b as Ke,c as It,W as Vt,L as Je,H as qt,d as _t,e as Ze,f as Gt,g as Ot,h as xe,i as I,D as Wt,R as Yt,U as Nt,N as Xt,j as Ht,k as Kt,A as Jt,O as Zt,T as Qt,l as ea,m as ta,n as aa,F as oa,o as ra,B as ia,p as Mt,G as sa,q as na,r as la,s as ca,t as ua}from"./three.module-DXmDt1YS.js";import{v as e,h as Qe,p as Ge,a as ne,s as da,b as E,c as Ce,d as ha,r as Fe,e as pa,g as Oe,f as We,i as Pt,j as Ct,k as va}from"./next-SWLc3YGo.js";import"./lenis-CH_BOYM6.js";const ma=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Ft="#include <tonemapping_pars_fragment>",W=(o=!1,t=0)=>new Vt(1,1,{type:qt,minFilter:Je,magFilter:Je,depthBuffer:o,stencilBuffer:!1,samples:t}),ie=(o,t)=>new It({vertexShader:ma,fragmentShader:o,uniforms:t,depthTest:!1,depthWrite:!1,toneMapped:!1});class fa{constructor(t){p(this,"quadScene",new Ne);p(this,"quadCamera",new zt);p(this,"quad",new je(new Xe(2,2)));p(this,"color",W(!0,4));p(this,"mask",W(!0,4));p(this,"background",W());p(this,"flare",W());p(this,"velocity",W());p(this,"velocitySwap",W());p(this,"pressure",W());p(this,"pressureSwap",W());p(this,"divergence",W());p(this,"texel",new z(1,1));p(this,"pointer",new z(-1,-1));p(this,"pointerFrom",new z(-1,-1));p(this,"impulse",new z);p(this,"pixel",new z(1,1));p(this,"aspect",{value:1});p(this,"dt",{value:1/60});p(this,"maskMaterial",new He({color:16777215,toneMapped:!1}));p(this,"advect");p(this,"diverge");p(this,"solve");p(this,"project");p(this,"star");p(this,"composite");p(this,"energy",0);p(this,"stale",!0);p(this,"backgroundDirty",!0);p(this,"cadence",0);p(this,"flareAllowed",!0);p(this,"disposed",!1);p(this,"width",1);p(this,"height",1);this.renderer=t,this.quad.material.dispose(),this.color.samples=this.mask.samples=Math.min(4,t.capabilities.maxSamples),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=ie(`
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
      ${Ft}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new z(1,1)},toneMappingExposure:{value:e.lighting.exposure}}),this.composite=ie(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Ft}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:e.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:e.lighting.exposure}})}setSize(t,n,x){this.width=Math.max(1,Math.round(t*x)),this.height=Math.max(1,Math.round(n*x)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.flare.setSize(Math.ceil(this.width*e.flare.resolutionScale),Math.ceil(this.height*e.flare.resolutionScale));const i=t/n,c=Math.round(e.fluid.resolution*Math.max(1,i)),v=Math.round(e.fluid.resolution*Math.max(1,1/i));for(const d of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])d.setSize(c,v);this.texel.set(1/c,1/v),this.aspect.value=i,this.pixel.set(1/t,1/n),this.composite.uniforms.uMaxDisplacement.value=Math.min(e.fluid.maxPixels,t*e.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/t,1/n),this.reset(),this.cadence=0}setFlare(t){this.flareAllowed=t,this.composite.uniforms.uFlareEnabled.value=+t,this.cadence=0}invalidateBackground(){this.backgroundDirty=!0,this.cadence=0}async warm(){const t=this.renderer.getRenderTarget(),n=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.composite,null]];try{for(const[x,i]of n){if(this.disposed)return;this.quad.material=x,this.renderer.setRenderTarget(i),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(t)}}push(t,n){this.pointerFrom.copy(t).sub(n),this.pointer.copy(t),this.impulse.add(n).clampLength(0,e.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,n.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>e.fluid.settle||this.impulse.lengthSq()>1e-9}draw(t,n){this.quad.material=t,this.renderer.setRenderTarget(n),this.renderer.render(this.quadScene,this.quadCamera)}clear(t){this.renderer.setRenderTarget(t),this.renderer.clear()}render(t,n,x,i,c,v){const d=this.renderer,u=d.getRenderTarget(),C=d.getClearColor(new Ke),m=d.getClearAlpha(),f=x.material,s=i.visible,g=x.visible;try{if(d.setClearColor(0,1),(this.stale||!v)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,v||(this.energy=0,this.impulse.set(0,0))),v&&this.active){this.dt.value=Math.min(c,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let j=0;j<e.fluid.pressureIterations;j++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-e.fluid.dissipation*c),this.impulse.set(0,0)}d.setClearColor(C,m),this.backgroundDirty&&(x.visible=!1,d.setRenderTarget(this.background),d.render(t,n),x.visible=g,this.backgroundDirty=!1),d.setRenderTarget(this.color),d.render(t,n),x.material=this.maskMaterial,i.visible=!1,d.setClearColor(0,1),d.setRenderTarget(this.mask),d.render(t,n),x.material=f,i.visible=s,this.flareAllowed&&this.cadence++%e.flare.stride===0&&this.draw(this.star,this.flare),this.composite.uniforms.uVelocity.value=this.velocity.texture;const M=Math.min(1,this.energy/e.fluid.tailThreshold);this.composite.uniforms.uFluid.value=v&&this.active?M*M*(3-2*M):0,this.draw(this.composite,u)}finally{x.material=f,i.visible=s,x.visible=g,d.setClearColor(C,m),d.setRenderTarget(u)}}dispose(){if(!this.disposed){this.disposed=!0;for(const t of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])t.dispose();for(const t of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial])t.dispose();this.quad.geometry.dispose()}}}const w={columns:4,rows:4,cell:304,padding:8,image:128,capacity:Qe.length,labelStart:Qe.length,labelImage:ne.canvasSize*ne.scale},Te=Qe,Dt=Object.fromEntries(Te.map((o,t)=>[o,t]));let Ye;function jt(o){return new Promise((t,n)=>{const x=new Image,i=window.setTimeout(()=>c(new Error(`Project mark timed out: ${o}`)),1e4),c=v=>{clearTimeout(i),x.onload=null,x.onerror=null,v?n(v):t(x)};x.onload=()=>c(),x.onerror=()=>c(new Error(`Project mark could not load: ${o}`)),x.src=`/v-next/project-marks/${o}`})}async function ga(){Ye||(Ye=Promise.all([Promise.all(Te.map(t=>{const n=Ge[t];return jt(n.file).catch(x=>{if(n.file===n.fallbackFile)throw x;return jt(n.fallbackFile)})})),document.fonts.load(ne.font,Te.map(t=>Ge[t].shortName).join(" "))]).then(([t])=>{const{columns:n,rows:x,cell:i,padding:c,image:v}=w,d=document.createElement("canvas");d.width=n*i,d.height=x*i;const u=d.getContext("2d");if(!u)throw new Error("Project atlas canvas is unavailable");return t.forEach((C,m)=>{const f=v/Math.max(C.naturalWidth,C.naturalHeight),s=C.naturalWidth*f,g=C.naturalHeight*f;u.drawImage(C,m%n*i+c+(v-s)/2,Math.floor(m/n)*i+c+(v-g)/2,s,g)}),Te.forEach((C,m)=>{const f=m+w.labelStart,s=ne,g=s.canvasSize/2;u.save(),u.translate(f%n*i+c,Math.floor(f/n)*i+c),u.scale(s.scale,s.scale),u.font=s.font,"letterSpacing"in u&&(u.letterSpacing=`${s.letterSpacing}px`);const S=Ge[C].shortName,M=u.measureText(S),j=Math.min(s.maxWidth,Math.ceil(M.width)+s.paddingX*2);u.beginPath(),u.roundRect(g-j/2,g-s.height/2,j,s.height,s.radius),u.fillStyle=s.background,u.shadowColor="#0002",u.shadowBlur=8*s.scale,u.shadowOffsetY=2*s.scale,u.fill(),u.shadowColor="transparent",u.shadowBlur=0,u.shadowOffsetY=0,u.fillStyle=s.foreground,u.textAlign="center",u.textBaseline="alphabetic";const q=M.fontBoundingBoxAscent??M.actualBoundingBoxAscent,b=M.fontBoundingBoxDescent??M.actualBoundingBoxDescent;u.fillText(S,g,g+(q-b)/2,j-s.paddingX*2),u.restore()}),d}));const o=new _t(await Ye);return o.colorSpace=Ze,o.minFilter=Gt,o.magFilter=Je,o.wrapS=o.wrapT=Ot,o.name="galaxci-project-marks-and-labels",o}const V={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},De={width:V.columns*V.texelsPerCell,height:V.rows};function xa(o,t,n,x,i){const{columns:c,rows:v,slots:d,texelsPerCell:u,overflow:C}=V;if(o.length!==c*v*u*4)throw new Error("Incorrect star index buffer size");if(t.length>=C)throw new Error("Star index supports at most 254 points");o.fill(0);let m=0,f=0;for(let s=0;s<t.length;s++){const g=t[s],S=g.radiusPx*i;if(!Number.isFinite(g.u+g.v+S)||S<=0)continue;const M=S+.01,j=g.u-M/n,q=g.u+M/n,b=g.v-M/x,T=g.v+M/x;if(q<0||j>1||T<0||b>1)continue;const A=Math.max(0,Math.min(c-1,Math.floor(j*c))),D=Math.max(0,Math.min(c-1,Math.floor(q*c))),y=Math.max(0,Math.min(v-1,Math.floor(b*v))),P=Math.max(0,Math.min(v-1,Math.floor(T*v)));for(let F=y;F<=P;F++)for(let U=A;U<=D;U++){const L=(F*c+U)*u*4,_=o[L];if(_!==C){if(_===d){o[L]=C,f++;continue}_===0&&m++,o[L]=_+1,o[L+_+1]=s+1}}}return{occupiedCells:m,overflowCells:f}}const se=da.capacity;function ya(o){const t=o.onBeforeCompile,n=o.customProgramCacheKey,x=n.call(o),i=new I(1,1,1),c=Array.from({length:se},()=>new xe),v=Array.from({length:se},()=>new xe(1,0,1,0)),d=Array.from({length:E.capacity},()=>new xe),u=Array.from({length:E.capacity},()=>new I(1,1,1)),C=new Uint8Array(De.width*De.height*4),m=new Wt(C,De.width,De.height,Yt,Nt);m.minFilter=m.magFilter=Xt,m.generateMipmaps=!1,m.flipY=!1,m.colorSpace=Ht,m.needsUpdate=!0;const f=Array.from({length:w.capacity},()=>new xe),s=Array.from({length:w.capacity},()=>new xe),g=Array.from({length:w.capacity},()=>0),S={uSkyViewport:{value:i},uSkyCount:{value:0},uSkyHeads:{value:c},uSkyDirections:{value:v},uPhotoStarSize:{value:new z(Ce.source.width,Ce.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:d},uPhotoStarColors:{value:u},uPhotoStarIndex:{value:m},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:f},uProjectCells:{value:g},uProjectTails:{value:s}};let M=!1;const j=function(b,T){t.call(o,b,T),Object.assign(b.uniforms,S),b.vertexShader=b.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),b.fragmentShader=b.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${se}];
uniform vec4 uSkyDirections[${se}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${E.capacity}];
uniform vec3 uPhotoStarColors[${E.capacity}];
uniform sampler2D uPhotoStarIndex;
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${w.capacity}];
uniform float uProjectCells[${w.capacity}];
uniform vec4 uProjectTails[${w.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${w.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${w.columns.toFixed(1)}), floor(cell / ${w.columns.toFixed(1)})) * ${w.cell.toFixed(1)};
    vec2 uv = (origin + ${w.padding.toFixed(1)} + local * ${w.image.toFixed(1)})
      / vec2(${(w.columns*w.cell).toFixed(1)}, ${(w.rows*w.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${ne.offsetY.toFixed(1)})) / ${ne.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${w.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${w.columns.toFixed(1)}), floor(labelCell / ${w.columns.toFixed(1)})) * ${w.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${w.padding.toFixed(1)} + labelLocal * ${w.labelImage.toFixed(1)})
      / vec2(${(w.columns*w.cell).toFixed(1)}, ${(w.rows*w.cell).toFixed(1)});
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
  ivec2 address = ivec2(cell.x * ${V.texelsPerCell} + slot / 4, cell.y);
  vec4 packedIndices = texelFetch(uPhotoStarIndex, address, 0);
  return int(floor(packedIndices[slot % 4] * 255.0 + 0.5));
}
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  // Lookup uses top-left original-photo UV, independent of viewport/DPR/crop.
  ivec2 cell = ivec2(clamp(floor(vec2(photoUv.x, 1.0 - photoUv.y)
    * vec2(${V.columns.toFixed(1)}, ${V.rows.toFixed(1)})), vec2(0.0),
    vec2(${(V.columns-1).toFixed(1)}, ${(V.rows-1).toFixed(1)})));
  int storedCount = photoStarIndexAt(cell, 0);
  bool overflow = storedCount == ${V.overflow};
  int count = overflow ? uPhotoStarCount : storedCount;
  if (count == 0) return light;
  for (int entry = 0; entry < ${E.capacity}; entry++) {
    if (entry >= count) break;
    int i = overflow ? entry : photoStarIndexAt(cell, entry + 1) - 1;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${(E.supportSigma**2).toFixed(1)}) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2*E.haloSigma**2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${(E.supportSigma**2).toFixed(1)}, q);
    float alpha = clamp(core * ${E.coreOpacity.toFixed(4)} + halo * ${E.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
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
#include <opaque_fragment>`)},q=()=>`${x}:gxc-sky-backdrop-v10-layered-stars`;return o.onBeforeCompile=j,o.customProgramCacheKey=q,o.needsUpdate=!0,{setProjectAtlas(b){M||(S.uProjectAtlas.value=b,b||(S.uProjectCount.value=0))},updateProjects(b){if(M)return;const T=b.points.filter(D=>Number.isInteger(Dt[D.slug])),A=S.uProjectAtlas.value?Math.min(T.length,w.capacity):0;S.uProjectCount.value=A;for(let D=0;D<A;D++){const y=T[D],P=y.angle*Math.PI/180;f[D].set(y.x,y.y,y.size,Math.max(0,Math.min(1,y.opacity))),s[D].set(Math.cos(P),Math.sin(P),y.tailLength,Math.max(0,Math.min(1,y.labelOpacity))),g[D]=Dt[y.slug]}},updateTwinkles(b){var D;const T=S.uPhotoStarCount.value;S.uPhotoStarCount.value=M?0:Math.min(b.length,E.capacity);let A=T!==S.uPhotoStarCount.value;for(let y=0;y<S.uPhotoStarCount.value;y++){const P=b[y],F=d[y];(F.x!==P.u||F.y!==P.v||F.z!==P.radiusPx)&&(A=!0),F.set(P.u,P.v,P.radiusPx,P.amplitude),u[y].fromArray(((D=P.overlay)==null?void 0:D.color)??[1,1,1])}!M&&A&&(xa(C,b.slice(0,S.uPhotoStarCount.value),Ce.source.width,Ce.source.height,E.supportSigma),m.needsUpdate=!0)},update(b,T,A,D){if(M)return;i.set(Math.max(T,1),Math.max(A,1),D);const y=Math.min(b.streaks.length,se);S.uSkyCount.value=y;for(let P=0;P<y;P++){const F=b.streaks[P],U=F.angle*Math.PI/180;c[P].set(F.x,F.y,F.length,Math.max(0,F.opacity)),v[P].set(Math.cos(U),Math.sin(U),F.width,0)}},dispose(){M||(M=!0,S.uSkyCount.value=0,S.uProjectCount.value=0,S.uProjectAtlas.value=null,S.uPhotoStarCount.value=0,m.dispose(),o.onBeforeCompile===j&&(o.onBeforeCompile=t),o.customProgramCacheKey===q&&(o.customProgramCacheKey=n),o.needsUpdate=!0)}}}async function Ma(o,t,n,x){var C;const i=new Kt({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),c=[];let v=!1,d=!1;const u=()=>{if(!v){v=!0;for(const m of c.reverse())m();i.dispose(),i.domElement.remove()}};try{i.setClearColor(592396,1),i.outputColorSpace=Ze,i.toneMapping=Jt,i.toneMappingExposure=e.lighting.exposure,i.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},i.domElement.setAttribute("aria-hidden","true"),o.appendChild(i.domElement);const m=new Ne,f=new Zt(-20,20,10,-10,.1,150);f.position.set(0,0,40);const s=o.closest(".gxc-hero")??o;let g,S,M,j;const q=new Promise((r,h)=>{M=r,j=h});c.push(ha(s,r=>{g=r,M(r),S==null||S(r)},()=>j(new Error("Background photograph could not load"))));const[b,T]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(r=>{if(!r.ok)throw new Error("Wordmark could not load");return r.json()}),q]);if(b.status==="rejected")throw b.reason;if(T.status==="rejected")throw T.reason;const A=b.value;g=g??T.value;const D=r=>{const h=new Qt(r.image);return h.colorSpace=Ze,h.needsUpdate=!0,h};let y=D(g);c.push(()=>y.dispose());const P=new Xe(1,1),F=new He({map:y,color:e.lighting.backdropTint,toneMapped:!1});c.push(()=>P.dispose(),()=>F.dispose());const U=new je(P,F);U.position.z=-6,m.add(U);const L=ya(F);let _=-1,Ue=-1,ye=-1,K,et=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?o.dataset.projectAtlas="disabled":ga().then(r=>{if(v||d){r.dispose();return}K=r,L.setProjectAtlas(r),o.dataset.projectAtlas="ready",et()}).catch(()=>{v||(o.dataset.projectAtlas="failed")}),c.push(()=>{L.dispose(),K==null||K.dispose(),delete s.dataset.skyReady,delete s.dataset.projectSkyReady});const Ae=new Ne;Ae.background=new Ke(1118742);const tt=[],at=new ea(i);try{for(const h of e.lighting.panels){const k=new He({color:new Ke(h.color).multiplyScalar(h.strength),side:ta}),l=new je(new Xe(...h.size),k);l.position.set(h.position[0],h.position[1],h.position[2]),l.lookAt(0,0,0),Ae.add(l),tt.push(l)}const r=at.fromScene(Ae,.06);c.push(()=>r.dispose()),m.environment=r.texture}finally{for(const r of tt)r.geometry.dispose(),r.material.dispose();at.dispose()}const Le=new aa({color:e.glass.tint,metalness:0,roughness:e.glass.roughness,transmission:1,thickness:e.glass.thickness,ior:e.glass.ior,dispersion:e.glass.dispersion,envMapIntensity:e.glass.environment,clearcoat:e.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:e.glass.attenuation,attenuationDistance:50,side:oa});c.push(()=>Le.dispose()),Le.onBeforeCompile=r=>{r.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:e.scattering.strength},r.fragmentShader=`uniform float gxcScatterStrength;
`+r.fragmentShader;const h=ra.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${e.glass.starExposure.toFixed(1)}, material.transmission`);r.fragmentShader=r.fragmentShader.replace("#include <transmission_fragment>",h+`
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
      `)};const G=new ia;c.push(()=>G.dispose()),G.setAttribute("position",new Mt(A.positions,3)),G.setAttribute("normal",new Mt(A.normals,3)),G.setIndex(A.indices),G.computeBoundingBox();const ot=G.boundingBox.getSize(new I),Tt=G.boundingBox.getCenter(new I),we=new je(G,Le),J=new sa;J.add(we),m.add(J);const rt=new na(15397631,e.lighting.point,90,2);m.add(rt);const it=new la(16777215,e.lighting.fill);it.position.set(-5,9,6),m.add(it);const $e=new URLSearchParams(location.search),Se=matchMedia("(hover: hover) and (pointer: fine)"),Ut=$e.has("no-postfx"),Ee=$e.has("no-fluid"),st=$e.has("no-flare");let a,le=!i.extensions.has("EXT_color_buffer_float"),be=!n,ke=!0,Z=!0,ce=!1,ue=0,de=0,Q=e.rimLight.angle,Me=e.rimLight.angle,he=.07,pe=-.07,ee=0,te=0,Y=0,N=0,Be=0,nt=0,Pe=0,Re=-1,At=0;et=()=>{ye=-1,Z=!0,a==null||a.invalidateBackground(),Fe()};const lt=new z,ae=new z,ct=new z,ve=new I,oe=new I,ut=new I,dt=new I,ht=new ca,pt=new z,vt=new ua(new I(0,0,1),0),ze=((C=o.parentElement)==null?void 0:C.parentElement)??o,X=(r=!1)=>{ue=0,de=0,Me=e.rimLight.angle,ce=!1,Re=-1,r&&(he=.07,pe=-.07,Q=e.rimLight.angle,ee=0,te=0,a==null||a.reset()),Z=!0,Fe()},Ie=()=>{if(!(be&&Se.matches&&!Ut&&!(Ee&&st)&&!le))a==null||a.dispose(),a=void 0;else if(!a)try{a=new fa(i),a.setFlare(!st),a.setSize(Y||1,N||1,Be||1)}catch{a==null||a.dispose(),a=void 0,le=!0}i.domElement.dataset.postfx=a?"enabled":le?"unsupported":"disabled"};c.push(()=>a==null?void 0:a.dispose());const Ve=()=>{if(v||d)return;const r=o.getBoundingClientRect(),h=t.getBoundingClientRect(),k=r.width,l=r.height;if(!k||!l)return;Pe=r.left,nt=r.top+window.scrollY;const $=Math.min(devicePixelRatio,k<700?e.glass.mobileDpr:e.glass.maxDpr);(k!==Y||l!==N||$!==Be)&&(i.setPixelRatio($),i.setSize(k,l,!1),Y=k,N=l,Be=$,a==null||a.setSize(k,l,$));const B=26,R=B*k/l;f.left=-R/2,f.right=R/2,f.top=B/2,f.bottom=-B/2,f.updateProjectionMatrix();const re=k<700?22:80;J.scale.setScalar(Math.min((k-re*2)/ot.x,h.height*.88/ot.y)*B/l),J.position.y=(l/2-(h.top-r.top+h.height/2))*B/l;const O=e.cameraMotion.overscan;U.scale.set(R*O,B*O,1);const H=pa(k,l,g.width,g.height);y.repeat.set(k/H.width,l/H.height),y.repeat.multiplyScalar(O),y.offset.set((1-y.repeat.x)/2,(1-y.repeat.y)/2),L.update(Oe(s),k,l,O),a==null||a.invalidateBackground(),qe(),Lt(),Z=!0,Fe()},qe=()=>{J.rotation.set(he,pe,-.018),J.updateMatrixWorld(!0),ve.copy(Tt).applyMatrix4(we.matrixWorld),rt.position.set(ve.x+Math.cos(Q)*e.rimLight.radius,ve.y+Math.sin(Q)*e.rimLight.radius,e.rimLight.z),f.position.set(ee,te,40),ut.set(ee*e.cameraMotion.lookAtFactor,te*e.cameraMotion.lookAtFactor,0),f.lookAt(ut),f.updateMatrixWorld(),f.getWorldDirection(dt),U.position.copy(f.position).addScaledVector(dt,46),U.quaternion.copy(f.quaternion),U.updateMatrixWorld(!0)},Lt=()=>{const r=G.boundingBox,h=new I;let k=1/0,l=1/0,$=-1/0,B=-1/0;for(const re of[r.min.x,r.max.x])for(const O of[r.min.y,r.max.y])for(const H of[r.min.z,r.max.z]){h.set(re,O,H).applyMatrix4(we.matrixWorld).project(f);const fe=(h.x+1)*Y/2,ge=(1-h.y)*N/2;k=Math.min(k,fe),$=Math.max($,fe),l=Math.min(l,ge),B=Math.max(B,ge)}const R=18;o.dataset.wordRect=JSON.stringify({left:k-R,top:l-R,width:$-k+R*2,height:B-l+R*2})};S=r=>{if(v||d)return;const h=y;y=D(r),F.map=y,L.updateTwinkles(r.fallback?[]:We(s).points),i.domElement.dataset.photoSource=r.url,Ve(),h.dispose()},i.domElement.dataset.photoSource=g.url;const mt=r=>{const h=Oe(s),k=We(s),l=Pt(s);if(l.revision!==ye&&(ye=l.revision,L.updateProjects(l),a==null||a.invalidateBackground()),k.revision!==Ue&&(Ue=k.revision,L.updateTwinkles(g!=null&&g.fallback?[]:k.points),a==null||a.invalidateBackground()),h.revision!==_&&(_=h.revision,L.update(h,Y,N,e.cameraMotion.overscan),a==null||a.invalidateBackground()),a)try{a.render(m,f,we,U,r,be&&!Ee)}catch{a.dispose(),a=void 0,le=!0,i.domElement.dataset.postfx="failed",i.setRenderTarget(null),i.render(m,f)}else i.render(m,f);i.domElement.dataset.frames=String(++At),s.dataset.skyReady="true",K&&l.points.length?s.dataset.projectSkyReady="true":delete s.dataset.projectSkyReady,i.domElement.dataset.skyCount=String(h.streaks.length),i.domElement.dataset.twinkleCount=String(k.points.length),i.domElement.dataset.projectCount=String(K?l.points.length:0),i.domElement.dataset.fluid=a!=null&&a.active?"active":"rest",Z=!1},ft=r=>{r.preventDefault(),d=!0,ke=!1,o.dataset.failed="context-lost",x(),u()},gt=()=>X(),xt=()=>{document.hidden?X(!0):(Z=!0,Fe())},yt=()=>{X(!0),Ie()},wt=()=>X();i.domElement.addEventListener("webglcontextlost",ft),ze.addEventListener("pointerleave",wt),window.addEventListener("blur",gt),document.addEventListener("visibilitychange",xt),Se.addEventListener("change",yt),c.push(()=>{i.domElement.removeEventListener("webglcontextlost",ft),ze.removeEventListener("pointerleave",wt),window.removeEventListener("blur",gt),document.removeEventListener("visibilitychange",xt),Se.removeEventListener("change",yt)});const _e=new ResizeObserver(Ve);_e.observe(o),_e.observe(t),c.push(()=>_e.disconnect());const St=new IntersectionObserver(r=>{ke=r[0].isIntersecting,X(!0)});if(St.observe(ze),c.push(()=>St.disconnect()),Ve(),Ie(),qe(),await i.compileAsync(m,f),a)try{await a.warm()}catch{a.dispose(),a=void 0,le=!0,i.domElement.dataset.postfx="failed"}if(v||d)throw new Error("Glass context unavailable");mt(1/60);let me=!1;const $t=Ct((r,h)=>{if(!ke||v||d||document.hidden)return!1;const k=va(),l=k.pointer,$=nt-k.scrollY;be&&Se.matches&&l.kind!=="touch"&&l.inside&&l.x>=Pe&&l.x<=Pe+Y&&l.y>=$&&l.y<=$+N?(ae.set((l.x-Pe)/Y,1-(l.y-$)/N),ue=ae.x*2-1,de=1-ae.y*2,pt.set(ue,-de),ht.setFromCamera(pt,f),vt.constant=-ve.z,ht.ray.intersectPlane(vt,oe)&&(oe.sub(ve),Math.hypot(oe.x,oe.y)>26*e.rimLight.centerDeadZone&&(Me=Math.atan2(oe.y,oe.x))),l.lastMoved!==Re&&(ce&&a&&!Ee&&(ct.copy(ae).sub(lt),a.push(ae,ct)),lt.copy(ae),Re=l.lastMoved),ce=!0):ce&&X();const R=.07+de*e.pointer.rotationX,re=-.07+ue*e.pointer.rotationY,O=ue*e.cameraMotion.offsetX,H=-de*e.cameraMotion.offsetY,fe=1-Math.exp(-e.pointer.damping*h),ge=1-Math.exp(-(ce?e.cameraMotion.damping:e.cameraMotion.leaveDamping)*h);he+=(R-he)*fe,pe+=(re-pe)*fe,ee+=(O-ee)*ge,te+=(H-te)*ge;const bt=Math.atan2(Math.sin(Me-Q),Math.cos(Me-Q));Q+=bt*(1-Math.exp(-e.rimLight.damping*h));const kt=Math.abs(R-he)+Math.abs(re-pe)+Math.abs(bt)+Math.abs(O-ee)+Math.abs(H-te)>2e-4;return(Z||kt||a!=null&&a.active)&&(qe(),me=!0),kt||!!(a!=null&&a.active)},"update"),Et=Ct((r,h)=>!ke||v||d||document.hidden?(me=!1,!1):((Oe(s).revision!==_||We(s).revision!==Ue||Pt(s).revision!==ye)&&(me=!0),me&&(mt(h),me=!1),!!(a!=null&&a.active)),"render");return c.push($t,Et),{setMotion(r){v||d||(be=r,X(!0),Ie())},dispose:u}}catch(m){throw u(),m}}export{Ma as mountGlass};
