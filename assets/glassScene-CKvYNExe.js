var Et=Object.defineProperty;var $t=(r,a,n)=>a in r?Et(r,a,{enumerable:!0,configurable:!0,writable:!0,value:n}):r[a]=n;var d=(r,a,n)=>$t(r,typeof a!="symbol"?a+"":a,n);import{S as We,C as Bt,M as Me,P as Ge,V as A,a as Oe,b as Ye,c as Rt,W as zt,L as Ne,H as Vt,d as qt,e as Xe,f as It,g as _t,h as ve,i as z,j as Wt,A as Gt,O as Ot,T as Yt,k as Nt,D as Xt,l as Ht,F as Kt,m as Jt,B as Zt,n as bt,G as Qt,o as ea,p as ta,R as aa,q as oa}from"./three.module-BphUv-iJ.js";import{v as e,h as He,p as Ve,a as oe,s as ia,t as ee,b as St,c as ra,r as ke,d as sa,g as qe,e as Ie,f as kt,i as Mt,j as na}from"./next-D_pvj6ve.js";import"./lenis-DzrRjaE-.js";const la=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Pt="#include <tonemapping_pars_fragment>",R=(r=!1,a=0)=>new zt(1,1,{type:Vt,minFilter:Ne,magFilter:Ne,depthBuffer:r,stencilBuffer:!1,samples:a}),te=(r,a)=>new Rt({vertexShader:la,fragmentShader:r,uniforms:a,depthTest:!1,depthWrite:!1,toneMapped:!1});class ca{constructor(a){d(this,"quadScene",new We);d(this,"quadCamera",new Bt);d(this,"quad",new Me(new Ge(2,2)));d(this,"color",R(!0,4));d(this,"mask",R(!0,4));d(this,"background",R());d(this,"flare",R());d(this,"velocity",R());d(this,"velocitySwap",R());d(this,"pressure",R());d(this,"pressureSwap",R());d(this,"divergence",R());d(this,"texel",new A(1,1));d(this,"pointer",new A(-1,-1));d(this,"pointerFrom",new A(-1,-1));d(this,"impulse",new A);d(this,"pixel",new A(1,1));d(this,"aspect",{value:1});d(this,"dt",{value:1/60});d(this,"maskMaterial",new Oe({color:16777215,toneMapped:!1}));d(this,"advect");d(this,"diverge");d(this,"solve");d(this,"project");d(this,"star");d(this,"composite");d(this,"energy",0);d(this,"stale",!0);d(this,"backgroundDirty",!0);d(this,"cadence",0);d(this,"flareAllowed",!0);d(this,"disposed",!1);d(this,"width",1);d(this,"height",1);this.renderer=a,this.quad.material.dispose(),this.color.samples=this.mask.samples=Math.min(4,a.capabilities.maxSamples),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=te(`
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
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=te(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=te(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=te(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=te(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${Pt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new A(1,1)},toneMappingExposure:{value:e.lighting.exposure}}),this.composite=te(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Pt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:e.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:e.lighting.exposure}})}setSize(a,n,f){this.width=Math.max(1,Math.round(a*f)),this.height=Math.max(1,Math.round(n*f)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.flare.setSize(Math.ceil(this.width*e.flare.resolutionScale),Math.ceil(this.height*e.flare.resolutionScale));const i=a/n,v=Math.round(e.fluid.resolution*Math.max(1,i)),x=Math.round(e.fluid.resolution*Math.max(1,1/i));for(const p of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])p.setSize(v,x);this.texel.set(1/v,1/x),this.aspect.value=i,this.pixel.set(1/a,1/n),this.composite.uniforms.uMaxDisplacement.value=Math.min(e.fluid.maxPixels,a*e.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/a,1/n),this.reset(),this.cadence=0}setFlare(a){this.flareAllowed=a,this.composite.uniforms.uFlareEnabled.value=+a,this.cadence=0}invalidateBackground(){this.backgroundDirty=!0,this.cadence=0}async warm(){const a=this.renderer.getRenderTarget(),n=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.composite,null]];try{for(const[f,i]of n){if(this.disposed)return;this.quad.material=f,this.renderer.setRenderTarget(i),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(a)}}push(a,n){this.pointerFrom.copy(a).sub(n),this.pointer.copy(a),this.impulse.add(n).clampLength(0,e.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,n.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>e.fluid.settle||this.impulse.lengthSq()>1e-9}draw(a,n){this.quad.material=a,this.renderer.setRenderTarget(n),this.renderer.render(this.quadScene,this.quadCamera)}clear(a){this.renderer.setRenderTarget(a),this.renderer.clear()}render(a,n,f,i,v,x){const p=this.renderer,h=p.getRenderTarget(),k=p.getClearColor(new Ye),w=p.getClearAlpha(),l=f.material,s=i.visible,b=f.visible;try{if(p.setClearColor(0,1),(this.stale||!x)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,x||(this.energy=0,this.impulse.set(0,0))),x&&this.active){this.dt.value=Math.min(v,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let S=0;S<e.fluid.pressureIterations;S++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-e.fluid.dissipation*v),this.impulse.set(0,0)}p.setClearColor(k,w),this.backgroundDirty&&(f.visible=!1,p.setRenderTarget(this.background),p.render(a,n),f.visible=b,this.backgroundDirty=!1),p.setRenderTarget(this.color),p.render(a,n),f.material=this.maskMaterial,i.visible=!1,p.setClearColor(0,1),p.setRenderTarget(this.mask),p.render(a,n),f.material=l,i.visible=s,this.flareAllowed&&this.cadence++%e.flare.stride===0&&this.draw(this.star,this.flare),this.composite.uniforms.uVelocity.value=this.velocity.texture;const m=Math.min(1,this.energy/e.fluid.tailThreshold);this.composite.uniforms.uFluid.value=x&&this.active?m*m*(3-2*m):0,this.draw(this.composite,h)}finally{f.material=l,i.visible=s,f.visible=b,p.setClearColor(k,w),p.setRenderTarget(h)}}dispose(){if(!this.disposed){this.disposed=!0;for(const a of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])a.dispose();for(const a of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial])a.dispose();this.quad.geometry.dispose()}}}const g={columns:4,rows:4,cell:304,padding:8,image:128,capacity:He.length,labelStart:He.length,labelImage:oe.canvasSize*oe.scale},Pe=He,Ct=Object.fromEntries(Pe.map((r,a)=>[r,a]));let _e;function Ft(r){return new Promise((a,n)=>{const f=new Image,i=window.setTimeout(()=>v(new Error(`Project mark timed out: ${r}`)),1e4),v=x=>{clearTimeout(i),f.onload=null,f.onerror=null,x?n(x):a(f)};f.onload=()=>v(),f.onerror=()=>v(new Error(`Project mark could not load: ${r}`)),f.src=`/v-next/project-marks/${r}`})}async function ua(){_e||(_e=Promise.all([Promise.all(Pe.map(a=>{const n=Ve[a];return Ft(n.file).catch(f=>{if(n.file===n.fallbackFile)throw f;return Ft(n.fallbackFile)})})),document.fonts.load(oe.font,Pe.map(a=>Ve[a].shortName).join(" "))]).then(([a])=>{const{columns:n,rows:f,cell:i,padding:v,image:x}=g,p=document.createElement("canvas");p.width=n*i,p.height=f*i;const h=p.getContext("2d");if(!h)throw new Error("Project atlas canvas is unavailable");return a.forEach((k,w)=>{const l=x/Math.max(k.naturalWidth,k.naturalHeight),s=k.naturalWidth*l,b=k.naturalHeight*l;h.drawImage(k,w%n*i+v+(x-s)/2,Math.floor(w/n)*i+v+(x-b)/2,s,b)}),Pe.forEach((k,w)=>{const l=w+g.labelStart,s=oe,b=s.canvasSize/2;h.save(),h.translate(l%n*i+v,Math.floor(l/n)*i+v),h.scale(s.scale,s.scale),h.font=s.font,"letterSpacing"in h&&(h.letterSpacing=`${s.letterSpacing}px`);const T=Ve[k].shortName,m=h.measureText(T),S=Math.min(s.maxWidth,Math.ceil(m.width)+s.paddingX*2);h.beginPath(),h.roundRect(b-S/2,b-s.height/2,S,s.height,s.radius),h.fillStyle=s.background,h.shadowColor="#0002",h.shadowBlur=8*s.scale,h.shadowOffsetY=2*s.scale,h.fill(),h.shadowColor="transparent",h.shadowBlur=0,h.shadowOffsetY=0,h.fillStyle=s.foreground,h.textAlign="center",h.textBaseline="alphabetic";const C=m.fontBoundingBoxAscent??m.actualBoundingBoxAscent,M=m.fontBoundingBoxDescent??m.actualBoundingBoxDescent;h.fillText(T,b,b+(C-M)/2,S-s.paddingX*2),h.restore()}),p}));const r=new qt(await _e);return r.colorSpace=Xe,r.minFilter=It,r.magFilter=Ne,r.wrapS=r.wrapT=_t,r.name="galaxci-project-marks-and-labels",r}const ae=ia.capacity;function da(r){const a=r.onBeforeCompile,n=r.customProgramCacheKey,f=n.call(r),i=new z(1,1,1),v=Array.from({length:ae},()=>new ve),x=Array.from({length:ae},()=>new ve(1,0,1,0)),p=Array.from({length:ee.capacity},()=>new ve),h=Array.from({length:g.capacity},()=>new ve),k=Array.from({length:g.capacity},()=>new ve),w=Array.from({length:g.capacity},()=>0),l={uSkyViewport:{value:i},uSkyCount:{value:0},uSkyHeads:{value:v},uSkyDirections:{value:x},uPhotoStarSize:{value:new A(St.source.width,St.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:p},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:h},uProjectCells:{value:w},uProjectTails:{value:k}};let s=!1;const b=function(m,S){a.call(r,m,S),Object.assign(m.uniforms,l),m.vertexShader=m.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),m.fragmentShader=m.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${ae}];
uniform vec4 uSkyDirections[${ae}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${ee.capacity}];
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${g.capacity}];
uniform float uProjectCells[${g.capacity}];
uniform vec4 uProjectTails[${g.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${g.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${g.columns.toFixed(1)}), floor(cell / ${g.columns.toFixed(1)})) * ${g.cell.toFixed(1)};
    vec2 uv = (origin + ${g.padding.toFixed(1)} + local * ${g.image.toFixed(1)})
      / vec2(${(g.columns*g.cell).toFixed(1)}, ${(g.rows*g.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${oe.offsetY.toFixed(1)})) / ${oe.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${g.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${g.columns.toFixed(1)}), floor(labelCell / ${g.columns.toFixed(1)})) * ${g.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${g.padding.toFixed(1)} + labelLocal * ${g.labelImage.toFixed(1)})
      / vec2(${(g.columns*g.cell).toFixed(1)}, ${(g.rows*g.cell).toFixed(1)});
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

vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  for (int i = 0; i < ${ee.capacity}; i++) {
    if (i >= uPhotoStarCount) break;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > 20.0) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-0.19 * q) * (1.0 - smoothstep(12.0, 20.0, q));
    // Amplify the original star's own pixels/color, with only a tiny local glow.
    light += photoColor * core * star.w * ${ee.gain.toFixed(2)};
    light += vec3(0.94, 0.97, 1.0) * halo * star.w * ${ee.halo.toFixed(4)};
  }
  #endif
  return light;
}

vec3 skyMeteorLight() {
  vec2 screen = skyScreenPosition();
  vec3 light = vec3(0.0);
  for (int i = 0; i < ${ae}; i++) {
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
}`).replace("#include <opaque_fragment>",`outgoingLight += skyMeteorLight();
#ifdef USE_MAP
outgoingLight += photoTwinkleLight(diffuseColor.rgb, vMapUv);
#endif
outgoingLight = projectSkyColor(outgoingLight);
#include <opaque_fragment>`)},T=()=>`${f}:gxc-sky-backdrop-v5-project-labels`;return r.onBeforeCompile=b,r.customProgramCacheKey=T,r.needsUpdate=!0,{setProjectAtlas(m){s||(l.uProjectAtlas.value=m,m||(l.uProjectCount.value=0))},updateProjects(m){if(s)return;const S=m.points.filter(M=>Number.isInteger(Ct[M.slug])),C=l.uProjectAtlas.value?Math.min(S.length,g.capacity):0;l.uProjectCount.value=C;for(let M=0;M<C;M++){const P=S[M],j=P.angle*Math.PI/180;h[M].set(P.x,P.y,P.size,Math.max(0,Math.min(1,P.opacity))),k[M].set(Math.cos(j),Math.sin(j),P.tailLength,Math.max(0,Math.min(1,P.labelOpacity))),w[M]=Ct[P.slug]}},updateTwinkles(m){l.uPhotoStarCount.value=s?0:Math.min(m.length,ee.capacity);for(let S=0;S<l.uPhotoStarCount.value;S++){const C=m[S];p[S].set(C.u,C.v,C.radiusPx,C.amplitude)}},update(m,S,C,M){if(s)return;i.set(Math.max(S,1),Math.max(C,1),M);const P=Math.min(m.streaks.length,ae);l.uSkyCount.value=P;for(let j=0;j<P;j++){const E=m.streaks[j],F=E.angle*Math.PI/180;v[j].set(E.x,E.y,E.length,Math.max(0,E.opacity)),x[j].set(Math.cos(F),Math.sin(F),E.width,0)}},dispose(){s||(s=!0,l.uSkyCount.value=0,l.uProjectCount.value=0,l.uProjectAtlas.value=null,r.onBeforeCompile===b&&(r.onBeforeCompile=a),r.customProgramCacheKey===T&&(r.customProgramCacheKey=n),r.needsUpdate=!0)}}}async function ga(r,a,n,f){var k;const i=new Wt({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),v=[];let x=!1,p=!1;const h=()=>{if(!x){x=!0;for(const w of v.reverse())w();i.dispose(),i.domElement.remove()}};try{i.setClearColor(592396,1),i.outputColorSpace=Xe,i.toneMapping=Gt,i.toneMappingExposure=e.lighting.exposure,i.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},i.domElement.setAttribute("aria-hidden","true"),r.appendChild(i.domElement);const w=new We,l=new Ot(-20,20,10,-10,.1,150);l.position.set(0,0,40);const s=r.closest(".gxc-hero")??r;let b,T,m,S;const C=new Promise((o,u)=>{m=o,S=u});v.push(ra(s,o=>{b=o,m(o),T==null||T(o)},()=>S(new Error("Background photograph could not load"))));const[M,P]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(o=>{if(!o.ok)throw new Error("Wordmark could not load");return o.json()}),C]);if(M.status==="rejected")throw M.reason;if(P.status==="rejected")throw P.reason;const j=M.value;b=b??P.value;const E=o=>{const u=new Yt(o.image);return u.colorSpace=Xe,u.needsUpdate=!0,u};let F=E(b);v.push(()=>F.dispose());const Ke=new Ge(1,1),me=new Oe({map:F,color:e.lighting.backdropTint,toneMapped:!1});v.push(()=>Ke.dispose(),()=>me.dispose());const V=new Me(Ke,me);V.position.z=-6,w.add(V);const q=da(me);let Ce=-1,Fe=-1,ge=-1,O,Je=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?r.dataset.projectAtlas="disabled":ua().then(o=>{if(x||p){o.dispose();return}O=o,q.setProjectAtlas(o),r.dataset.projectAtlas="ready",Je()}).catch(()=>{x||(r.dataset.projectAtlas="failed")}),v.push(()=>{q.dispose(),O==null||O.dispose(),delete s.dataset.skyReady,delete s.dataset.projectSkyReady});const je=new We;je.background=new Ye(1118742);const Ze=[],Qe=new Nt(i);try{for(const u of e.lighting.panels){const y=new Oe({color:new Ye(u.color).multiplyScalar(u.strength),side:Xt}),c=new Me(new Ge(...u.size),y);c.position.set(u.position[0],u.position[1],u.position[2]),c.lookAt(0,0,0),je.add(c),Ze.push(c)}const o=Qe.fromScene(je,.06);v.push(()=>o.dispose()),w.environment=o.texture}finally{for(const o of Ze)o.geometry.dispose(),o.material.dispose();Qe.dispose()}const De=new Ht({color:e.glass.tint,metalness:0,roughness:e.glass.roughness,transmission:1,thickness:e.glass.thickness,ior:e.glass.ior,dispersion:e.glass.dispersion,envMapIntensity:e.glass.environment,clearcoat:e.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:e.glass.attenuation,attenuationDistance:50,side:Kt});v.push(()=>De.dispose()),De.onBeforeCompile=o=>{o.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:e.scattering.strength},o.fragmentShader=`uniform float gxcScatterStrength;
`+o.fragmentShader;const u=Jt.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${e.glass.starExposure.toFixed(1)}, material.transmission`);o.fragmentShader=o.fragmentShader.replace("#include <transmission_fragment>",u+`
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
      `)};const $=new Zt;v.push(()=>$.dispose()),$.setAttribute("position",new bt(j.positions,3)),$.setAttribute("normal",new bt(j.normals,3)),$.setIndex(j.indices),$.computeBoundingBox();const et=$.boundingBox.getSize(new z),jt=$.boundingBox.getCenter(new z),fe=new Me($,De),Y=new Qt;Y.add(fe),w.add(Y);const tt=new ea(15397631,e.lighting.point,90,2);w.add(tt);const at=new ta(16777215,e.lighting.fill);at.position.set(-5,9,6),w.add(at);const Te=new URLSearchParams(location.search),xe=matchMedia("(hover: hover) and (pointer: fine)"),Dt=Te.has("no-postfx"),Ue=Te.has("no-fluid"),ot=Te.has("no-flare");let t,ie=!i.extensions.has("EXT_color_buffer_float"),ye=!n,we=!0,N=!0,re=!1,se=0,ne=0,X=e.rimLight.angle,be=e.rimLight.angle,le=.07,ce=-.07,H=0,K=0,I=0,_=0,Le=0,it=0,Se=0,Ae=-1,Tt=0;Je=()=>{ge=-1,N=!0,t==null||t.invalidateBackground(),ke()};const rt=new A,J=new A,st=new A,ue=new z,Z=new z,nt=new z,lt=new z,ct=new aa,ut=new A,dt=new oa(new z(0,0,1),0),Ee=((k=r.parentElement)==null?void 0:k.parentElement)??r,W=(o=!1)=>{se=0,ne=0,be=e.rimLight.angle,re=!1,Ae=-1,o&&(le=.07,ce=-.07,X=e.rimLight.angle,H=0,K=0,t==null||t.reset()),N=!0,ke()},$e=()=>{if(!(ye&&xe.matches&&!Dt&&!(Ue&&ot)&&!ie))t==null||t.dispose(),t=void 0;else if(!t)try{t=new ca(i),t.setFlare(!ot),t.setSize(I||1,_||1,Le||1)}catch{t==null||t.dispose(),t=void 0,ie=!0}i.domElement.dataset.postfx=t?"enabled":ie?"unsupported":"disabled"};v.push(()=>t==null?void 0:t.dispose());const Be=()=>{if(x||p)return;const o=r.getBoundingClientRect(),u=a.getBoundingClientRect(),y=o.width,c=o.height;if(!y||!c)return;Se=o.left,it=o.top+window.scrollY;const D=Math.min(devicePixelRatio,y<700?e.glass.mobileDpr:e.glass.maxDpr);(y!==I||c!==_||D!==Le)&&(i.setPixelRatio(D),i.setSize(y,c,!1),I=y,_=c,Le=D,t==null||t.setSize(y,c,D));const U=26,L=U*y/c;l.left=-L/2,l.right=L/2,l.top=U/2,l.bottom=-U/2,l.updateProjectionMatrix();const Q=y<700?22:80;Y.scale.setScalar(Math.min((y-Q*2)/et.x,u.height*.88/et.y)*U/c),Y.position.y=(c/2-(u.top-o.top+u.height/2))*U/c;const B=e.cameraMotion.overscan;V.scale.set(L*B,U*B,1);const G=sa(y,c,b.width,b.height);F.repeat.set(y/G.width,c/G.height),F.repeat.multiplyScalar(B),F.offset.set((1-F.repeat.x)/2,(1-F.repeat.y)/2),q.update(qe(s),y,c,B),t==null||t.invalidateBackground(),Re(),Ut(),N=!0,ke()},Re=()=>{Y.rotation.set(le,ce,-.018),Y.updateMatrixWorld(!0),ue.copy(jt).applyMatrix4(fe.matrixWorld),tt.position.set(ue.x+Math.cos(X)*e.rimLight.radius,ue.y+Math.sin(X)*e.rimLight.radius,e.rimLight.z),l.position.set(H,K,40),nt.set(H*e.cameraMotion.lookAtFactor,K*e.cameraMotion.lookAtFactor,0),l.lookAt(nt),l.updateMatrixWorld(),l.getWorldDirection(lt),V.position.copy(l.position).addScaledVector(lt,46),V.quaternion.copy(l.quaternion),V.updateMatrixWorld(!0)},Ut=()=>{const o=$.boundingBox,u=new z;let y=1/0,c=1/0,D=-1/0,U=-1/0;for(const Q of[o.min.x,o.max.x])for(const B of[o.min.y,o.max.y])for(const G of[o.min.z,o.max.z]){u.set(Q,B,G).applyMatrix4(fe.matrixWorld).project(l);const he=(u.x+1)*I/2,pe=(1-u.y)*_/2;y=Math.min(y,he),D=Math.max(D,he),c=Math.min(c,pe),U=Math.max(U,pe)}const L=18;r.dataset.wordRect=JSON.stringify({left:y-L,top:c-L,width:D-y+L*2,height:U-c+L*2})};T=o=>{if(x||p)return;const u=F;F=E(o),me.map=F,q.updateTwinkles(o.fallback?[]:Ie(s).points),i.domElement.dataset.photoSource=o.url,Be(),u.dispose()},i.domElement.dataset.photoSource=b.url;const ht=o=>{const u=qe(s),y=Ie(s),c=kt(s);if(c.revision!==ge&&(ge=c.revision,q.updateProjects(c),t==null||t.invalidateBackground()),y.revision!==Fe&&(Fe=y.revision,q.updateTwinkles(b!=null&&b.fallback?[]:y.points),t==null||t.invalidateBackground()),u.revision!==Ce&&(Ce=u.revision,q.update(u,I,_,e.cameraMotion.overscan),t==null||t.invalidateBackground()),t)try{t.render(w,l,fe,V,o,ye&&!Ue)}catch{t.dispose(),t=void 0,ie=!0,i.domElement.dataset.postfx="failed",i.setRenderTarget(null),i.render(w,l)}else i.render(w,l);i.domElement.dataset.frames=String(++Tt),s.dataset.skyReady="true",O&&c.points.length?s.dataset.projectSkyReady="true":delete s.dataset.projectSkyReady,i.domElement.dataset.skyCount=String(u.streaks.length),i.domElement.dataset.twinkleCount=String(y.points.length),i.domElement.dataset.projectCount=String(O?c.points.length:0),i.domElement.dataset.fluid=t!=null&&t.active?"active":"rest",N=!1},pt=o=>{o.preventDefault(),p=!0,we=!1,r.dataset.failed="context-lost",f(),h()},vt=()=>W(),mt=()=>{document.hidden?W(!0):(N=!0,ke())},gt=()=>{W(!0),$e()},ft=()=>W();i.domElement.addEventListener("webglcontextlost",pt),Ee.addEventListener("pointerleave",ft),window.addEventListener("blur",vt),document.addEventListener("visibilitychange",mt),xe.addEventListener("change",gt),v.push(()=>{i.domElement.removeEventListener("webglcontextlost",pt),Ee.removeEventListener("pointerleave",ft),window.removeEventListener("blur",vt),document.removeEventListener("visibilitychange",mt),xe.removeEventListener("change",gt)});const ze=new ResizeObserver(Be);ze.observe(r),ze.observe(a),v.push(()=>ze.disconnect());const xt=new IntersectionObserver(o=>{we=o[0].isIntersecting,W(!0)});if(xt.observe(Ee),v.push(()=>xt.disconnect()),Be(),$e(),Re(),await i.compileAsync(w,l),t)try{await t.warm()}catch{t.dispose(),t=void 0,ie=!0,i.domElement.dataset.postfx="failed"}if(x||p)throw new Error("Glass context unavailable");ht(1/60);let de=!1;const Lt=Mt((o,u)=>{if(!we||x||p||document.hidden)return!1;const y=na(),c=y.pointer,D=it-y.scrollY;ye&&xe.matches&&c.kind!=="touch"&&c.inside&&c.x>=Se&&c.x<=Se+I&&c.y>=D&&c.y<=D+_?(J.set((c.x-Se)/I,1-(c.y-D)/_),se=J.x*2-1,ne=1-J.y*2,ut.set(se,-ne),ct.setFromCamera(ut,l),dt.constant=-ue.z,ct.ray.intersectPlane(dt,Z)&&(Z.sub(ue),Math.hypot(Z.x,Z.y)>26*e.rimLight.centerDeadZone&&(be=Math.atan2(Z.y,Z.x))),c.lastMoved!==Ae&&(re&&t&&!Ue&&(st.copy(J).sub(rt),t.push(J,st)),rt.copy(J),Ae=c.lastMoved),re=!0):re&&W();const L=.07+ne*e.pointer.rotationX,Q=-.07+se*e.pointer.rotationY,B=se*e.cameraMotion.offsetX,G=-ne*e.cameraMotion.offsetY,he=1-Math.exp(-e.pointer.damping*u),pe=1-Math.exp(-(re?e.cameraMotion.damping:e.cameraMotion.leaveDamping)*u);le+=(L-le)*he,ce+=(Q-ce)*he,H+=(B-H)*pe,K+=(G-K)*pe;const yt=Math.atan2(Math.sin(be-X),Math.cos(be-X));X+=yt*(1-Math.exp(-e.rimLight.damping*u));const wt=Math.abs(L-le)+Math.abs(Q-ce)+Math.abs(yt)+Math.abs(B-H)+Math.abs(G-K)>2e-4;return(N||wt||t!=null&&t.active)&&(Re(),de=!0),wt||!!(t!=null&&t.active)},"update"),At=Mt((o,u)=>!we||x||p||document.hidden?(de=!1,!1):((qe(s).revision!==Ce||Ie(s).revision!==Fe||kt(s).revision!==ge)&&(de=!0),de&&(ht(u),de=!1),!!(t!=null&&t.active)),"render");return v.push(Lt,At),{setMotion(o){x||p||(ye=o,W(!0),$e())},dispose:h}}catch(w){throw h(),w}}export{ga as mountGlass};
