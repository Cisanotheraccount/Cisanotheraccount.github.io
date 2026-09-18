var Et=Object.defineProperty;var $t=(r,a,n)=>a in r?Et(r,a,{enumerable:!0,configurable:!0,writable:!0,value:n}):r[a]=n;var u=(r,a,n)=>$t(r,typeof a!="symbol"?a+"":a,n);import{S as We,C as Bt,M as Pe,P as Oe,V as $,a as Ye,b as Ne,c as Rt,W as zt,L as Xe,H as qt,d as Vt,e as He,f as It,g as _t,h as me,i as B,j as Gt,A as Wt,O as Ot,T as Yt,k as Nt,D as Xt,l as Ht,F as Kt,m as Jt,B as Zt,n as bt,G as Qt,o as ea,p as ta,R as aa,q as oa}from"./three.module-BphUv-iJ.js";import{v as e,h as Ke,p as Ve,a as oe,s as ia,b as E,c as St,d as ra,r as Me,e as sa,g as Ie,f as _e,i as kt,j as Mt,k as na}from"./next-BCW9AtrL.js";import"./lenis-CH_BOYM6.js";const la=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Pt="#include <tonemapping_pars_fragment>",q=(r=!1,a=0)=>new zt(1,1,{type:qt,minFilter:Xe,magFilter:Xe,depthBuffer:r,stencilBuffer:!1,samples:a}),te=(r,a)=>new Rt({vertexShader:la,fragmentShader:r,uniforms:a,depthTest:!1,depthWrite:!1,toneMapped:!1});class ca{constructor(a){u(this,"quadScene",new We);u(this,"quadCamera",new Bt);u(this,"quad",new Pe(new Oe(2,2)));u(this,"color",q(!0,4));u(this,"mask",q(!0,4));u(this,"background",q());u(this,"flare",q());u(this,"velocity",q());u(this,"velocitySwap",q());u(this,"pressure",q());u(this,"pressureSwap",q());u(this,"divergence",q());u(this,"texel",new $(1,1));u(this,"pointer",new $(-1,-1));u(this,"pointerFrom",new $(-1,-1));u(this,"impulse",new $);u(this,"pixel",new $(1,1));u(this,"aspect",{value:1});u(this,"dt",{value:1/60});u(this,"maskMaterial",new Ye({color:16777215,toneMapped:!1}));u(this,"advect");u(this,"diverge");u(this,"solve");u(this,"project");u(this,"star");u(this,"composite");u(this,"energy",0);u(this,"stale",!0);u(this,"backgroundDirty",!0);u(this,"cadence",0);u(this,"flareAllowed",!0);u(this,"disposed",!1);u(this,"width",1);u(this,"height",1);this.renderer=a,this.quad.material.dispose(),this.color.samples=this.mask.samples=Math.min(4,a.capabilities.maxSamples),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=te(`
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new $(1,1)},toneMappingExposure:{value:e.lighting.exposure}}),this.composite=te(`
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:e.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:e.lighting.exposure}})}setSize(a,n,g){this.width=Math.max(1,Math.round(a*g)),this.height=Math.max(1,Math.round(n*g)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.flare.setSize(Math.ceil(this.width*e.flare.resolutionScale),Math.ceil(this.height*e.flare.resolutionScale));const i=a/n,p=Math.round(e.fluid.resolution*Math.max(1,i)),f=Math.round(e.fluid.resolution*Math.max(1,1/i));for(const h of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])h.setSize(p,f);this.texel.set(1/p,1/f),this.aspect.value=i,this.pixel.set(1/a,1/n),this.composite.uniforms.uMaxDisplacement.value=Math.min(e.fluid.maxPixels,a*e.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/a,1/n),this.reset(),this.cadence=0}setFlare(a){this.flareAllowed=a,this.composite.uniforms.uFlareEnabled.value=+a,this.cadence=0}invalidateBackground(){this.backgroundDirty=!0,this.cadence=0}async warm(){const a=this.renderer.getRenderTarget(),n=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.composite,null]];try{for(const[g,i]of n){if(this.disposed)return;this.quad.material=g,this.renderer.setRenderTarget(i),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(a)}}push(a,n){this.pointerFrom.copy(a).sub(n),this.pointer.copy(a),this.impulse.add(n).clampLength(0,e.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,n.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>e.fluid.settle||this.impulse.lengthSq()>1e-9}draw(a,n){this.quad.material=a,this.renderer.setRenderTarget(n),this.renderer.render(this.quadScene,this.quadCamera)}clear(a){this.renderer.setRenderTarget(a),this.renderer.clear()}render(a,n,g,i,p,f){const h=this.renderer,d=h.getRenderTarget(),M=h.getClearColor(new Ne),b=h.getClearAlpha(),v=g.material,s=i.visible,x=g.visible;try{if(h.setClearColor(0,1),(this.stale||!f)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,f||(this.energy=0,this.impulse.set(0,0))),f&&this.active){this.dt.value=Math.min(p,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let y=0;y<e.fluid.pressureIterations;y++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-e.fluid.dissipation*p),this.impulse.set(0,0)}h.setClearColor(M,b),this.backgroundDirty&&(g.visible=!1,h.setRenderTarget(this.background),h.render(a,n),g.visible=x,this.backgroundDirty=!1),h.setRenderTarget(this.color),h.render(a,n),g.material=this.maskMaterial,i.visible=!1,h.setClearColor(0,1),h.setRenderTarget(this.mask),h.render(a,n),g.material=v,i.visible=s,this.flareAllowed&&this.cadence++%e.flare.stride===0&&this.draw(this.star,this.flare),this.composite.uniforms.uVelocity.value=this.velocity.texture;const C=Math.min(1,this.energy/e.fluid.tailThreshold);this.composite.uniforms.uFluid.value=f&&this.active?C*C*(3-2*C):0,this.draw(this.composite,d)}finally{g.material=v,i.visible=s,g.visible=x,h.setClearColor(M,b),h.setRenderTarget(d)}}dispose(){if(!this.disposed){this.disposed=!0;for(const a of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])a.dispose();for(const a of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial])a.dispose();this.quad.geometry.dispose()}}}const m={columns:4,rows:4,cell:304,padding:8,image:128,capacity:Ke.length,labelStart:Ke.length,labelImage:oe.canvasSize*oe.scale},Ce=Ke,Ct=Object.fromEntries(Ce.map((r,a)=>[r,a]));let Ge;function Ft(r){return new Promise((a,n)=>{const g=new Image,i=window.setTimeout(()=>p(new Error(`Project mark timed out: ${r}`)),1e4),p=f=>{clearTimeout(i),g.onload=null,g.onerror=null,f?n(f):a(g)};g.onload=()=>p(),g.onerror=()=>p(new Error(`Project mark could not load: ${r}`)),g.src=`/v-next/project-marks/${r}`})}async function ua(){Ge||(Ge=Promise.all([Promise.all(Ce.map(a=>{const n=Ve[a];return Ft(n.file).catch(g=>{if(n.file===n.fallbackFile)throw g;return Ft(n.fallbackFile)})})),document.fonts.load(oe.font,Ce.map(a=>Ve[a].shortName).join(" "))]).then(([a])=>{const{columns:n,rows:g,cell:i,padding:p,image:f}=m,h=document.createElement("canvas");h.width=n*i,h.height=g*i;const d=h.getContext("2d");if(!d)throw new Error("Project atlas canvas is unavailable");return a.forEach((M,b)=>{const v=f/Math.max(M.naturalWidth,M.naturalHeight),s=M.naturalWidth*v,x=M.naturalHeight*v;d.drawImage(M,b%n*i+p+(f-s)/2,Math.floor(b/n)*i+p+(f-x)/2,s,x)}),Ce.forEach((M,b)=>{const v=b+m.labelStart,s=oe,x=s.canvasSize/2;d.save(),d.translate(v%n*i+p,Math.floor(v/n)*i+p),d.scale(s.scale,s.scale),d.font=s.font,"letterSpacing"in d&&(d.letterSpacing=`${s.letterSpacing}px`);const T=Ve[M].shortName,C=d.measureText(T),y=Math.min(s.maxWidth,Math.ceil(C.width)+s.paddingX*2);d.beginPath(),d.roundRect(x-y/2,x-s.height/2,y,s.height,s.radius),d.fillStyle=s.background,d.shadowColor="#0002",d.shadowBlur=8*s.scale,d.shadowOffsetY=2*s.scale,d.fill(),d.shadowColor="transparent",d.shadowBlur=0,d.shadowOffsetY=0,d.fillStyle=s.foreground,d.textAlign="center",d.textBaseline="alphabetic";const D=C.fontBoundingBoxAscent??C.actualBoundingBoxAscent,P=C.fontBoundingBoxDescent??C.actualBoundingBoxDescent;d.fillText(T,x,x+(D-P)/2,y-s.paddingX*2),d.restore()}),h}));const r=new Vt(await Ge);return r.colorSpace=He,r.minFilter=It,r.magFilter=Xe,r.wrapS=r.wrapT=_t,r.name="galaxci-project-marks-and-labels",r}const ae=ia.capacity;function da(r){const a=r.onBeforeCompile,n=r.customProgramCacheKey,g=n.call(r),i=new B(1,1,1),p=Array.from({length:ae},()=>new me),f=Array.from({length:ae},()=>new me(1,0,1,0)),h=Array.from({length:E.capacity},()=>new me),d=Array.from({length:E.capacity},()=>new B(1,1,1)),M=Array.from({length:m.capacity},()=>new me),b=Array.from({length:m.capacity},()=>new me),v=Array.from({length:m.capacity},()=>0),s={uSkyViewport:{value:i},uSkyCount:{value:0},uSkyHeads:{value:p},uSkyDirections:{value:f},uPhotoStarSize:{value:new $(St.source.width,St.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:h},uPhotoStarColors:{value:d},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:M},uProjectCells:{value:v},uProjectTails:{value:b}};let x=!1;const T=function(y,D){a.call(r,y,D),Object.assign(y.uniforms,s),y.vertexShader=y.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),y.fragmentShader=y.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${ae}];
uniform vec4 uSkyDirections[${ae}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${E.capacity}];
uniform vec3 uPhotoStarColors[${E.capacity}];
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${m.capacity}];
uniform float uProjectCells[${m.capacity}];
uniform vec4 uProjectTails[${m.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${m.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${m.columns.toFixed(1)}), floor(cell / ${m.columns.toFixed(1)})) * ${m.cell.toFixed(1)};
    vec2 uv = (origin + ${m.padding.toFixed(1)} + local * ${m.image.toFixed(1)})
      / vec2(${(m.columns*m.cell).toFixed(1)}, ${(m.rows*m.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${oe.offsetY.toFixed(1)})) / ${oe.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${m.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${m.columns.toFixed(1)}), floor(labelCell / ${m.columns.toFixed(1)})) * ${m.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${m.padding.toFixed(1)} + labelLocal * ${m.labelImage.toFixed(1)})
      / vec2(${(m.columns*m.cell).toFixed(1)}, ${(m.rows*m.cell).toFixed(1)});
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
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  for (int i = 0; i < ${E.capacity}; i++) {
    if (i >= uPhotoStarCount) break;
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
#include <opaque_fragment>`)},C=()=>`${g}:gxc-sky-backdrop-v7-visible-stars`;return r.onBeforeCompile=T,r.customProgramCacheKey=C,r.needsUpdate=!0,{setProjectAtlas(y){x||(s.uProjectAtlas.value=y,y||(s.uProjectCount.value=0))},updateProjects(y){if(x)return;const D=y.points.filter(S=>Number.isInteger(Ct[S.slug])),P=s.uProjectAtlas.value?Math.min(D.length,m.capacity):0;s.uProjectCount.value=P;for(let S=0;S<P;S++){const F=D[S],U=F.angle*Math.PI/180;M[S].set(F.x,F.y,F.size,Math.max(0,Math.min(1,F.opacity))),b[S].set(Math.cos(U),Math.sin(U),F.tailLength,Math.max(0,Math.min(1,F.labelOpacity))),v[S]=Ct[F.slug]}},updateTwinkles(y){var D;s.uPhotoStarCount.value=x?0:Math.min(y.length,E.capacity);for(let P=0;P<s.uPhotoStarCount.value;P++){const S=y[P];h[P].set(S.u,S.v,S.radiusPx,S.amplitude),d[P].fromArray(((D=S.overlay)==null?void 0:D.color)??[1,1,1])}},update(y,D,P,S){if(x)return;i.set(Math.max(D,1),Math.max(P,1),S);const F=Math.min(y.streaks.length,ae);s.uSkyCount.value=F;for(let U=0;U<F;U++){const k=y.streaks[U],ie=k.angle*Math.PI/180;p[U].set(k.x,k.y,k.length,Math.max(0,k.opacity)),f[U].set(Math.cos(ie),Math.sin(ie),k.width,0)}},dispose(){x||(x=!0,s.uSkyCount.value=0,s.uProjectCount.value=0,s.uProjectAtlas.value=null,r.onBeforeCompile===T&&(r.onBeforeCompile=a),r.customProgramCacheKey===C&&(r.customProgramCacheKey=n),r.needsUpdate=!0)}}}async function ga(r,a,n,g){var M;const i=new Gt({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),p=[];let f=!1,h=!1;const d=()=>{if(!f){f=!0;for(const b of p.reverse())b();i.dispose(),i.domElement.remove()}};try{i.setClearColor(592396,1),i.outputColorSpace=He,i.toneMapping=Wt,i.toneMappingExposure=e.lighting.exposure,i.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},i.domElement.setAttribute("aria-hidden","true"),r.appendChild(i.domElement);const b=new We,v=new Ot(-20,20,10,-10,.1,150);v.position.set(0,0,40);const s=r.closest(".gxc-hero")??r;let x,T,C,y;const D=new Promise((o,c)=>{C=o,y=c});p.push(ra(s,o=>{x=o,C(o),T==null||T(o)},()=>y(new Error("Background photograph could not load"))));const[P,S]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(o=>{if(!o.ok)throw new Error("Wordmark could not load");return o.json()}),D]);if(P.status==="rejected")throw P.reason;if(S.status==="rejected")throw S.reason;const F=P.value;x=x??S.value;const U=o=>{const c=new Yt(o.image);return c.colorSpace=He,c.needsUpdate=!0,c};let k=U(x);p.push(()=>k.dispose());const ie=new Oe(1,1),ge=new Ye({map:k,color:e.lighting.backdropTint,toneMapped:!1});p.push(()=>ie.dispose(),()=>ge.dispose());const V=new Pe(ie,ge);V.position.z=-6,b.add(V);const I=da(ge);let Fe=-1,De=-1,fe=-1,Y,Je=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?r.dataset.projectAtlas="disabled":ua().then(o=>{if(f||h){o.dispose();return}Y=o,I.setProjectAtlas(o),r.dataset.projectAtlas="ready",Je()}).catch(()=>{f||(r.dataset.projectAtlas="failed")}),p.push(()=>{I.dispose(),Y==null||Y.dispose(),delete s.dataset.skyReady,delete s.dataset.projectSkyReady});const je=new We;je.background=new Ne(1118742);const Ze=[],Qe=new Nt(i);try{for(const c of e.lighting.panels){const w=new Ye({color:new Ne(c.color).multiplyScalar(c.strength),side:Xt}),l=new Pe(new Oe(...c.size),w);l.position.set(c.position[0],c.position[1],c.position[2]),l.lookAt(0,0,0),je.add(l),Ze.push(l)}const o=Qe.fromScene(je,.06);p.push(()=>o.dispose()),b.environment=o.texture}finally{for(const o of Ze)o.geometry.dispose(),o.material.dispose();Qe.dispose()}const Te=new Ht({color:e.glass.tint,metalness:0,roughness:e.glass.roughness,transmission:1,thickness:e.glass.thickness,ior:e.glass.ior,dispersion:e.glass.dispersion,envMapIntensity:e.glass.environment,clearcoat:e.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:e.glass.attenuation,attenuationDistance:50,side:Kt});p.push(()=>Te.dispose()),Te.onBeforeCompile=o=>{o.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:e.scattering.strength},o.fragmentShader=`uniform float gxcScatterStrength;
`+o.fragmentShader;const c=Jt.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${e.glass.starExposure.toFixed(1)}, material.transmission`);o.fragmentShader=o.fragmentShader.replace("#include <transmission_fragment>",c+`
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
      `)};const R=new Zt;p.push(()=>R.dispose()),R.setAttribute("position",new bt(F.positions,3)),R.setAttribute("normal",new bt(F.normals,3)),R.setIndex(F.indices),R.computeBoundingBox();const et=R.boundingBox.getSize(new B),Dt=R.boundingBox.getCenter(new B),xe=new Pe(R,Te),N=new Qt;N.add(xe),b.add(N);const tt=new ea(15397631,e.lighting.point,90,2);b.add(tt);const at=new ta(16777215,e.lighting.fill);at.position.set(-5,9,6),b.add(at);const Ue=new URLSearchParams(location.search),ye=matchMedia("(hover: hover) and (pointer: fine)"),jt=Ue.has("no-postfx"),Le=Ue.has("no-fluid"),ot=Ue.has("no-flare");let t,re=!i.extensions.has("EXT_color_buffer_float"),we=!n,be=!0,X=!0,se=!1,ne=0,le=0,H=e.rimLight.angle,Se=e.rimLight.angle,ce=.07,ue=-.07,K=0,J=0,_=0,G=0,Ae=0,it=0,ke=0,Ee=-1,Tt=0;Je=()=>{fe=-1,X=!0,t==null||t.invalidateBackground(),Me()};const rt=new $,Z=new $,st=new $,de=new B,Q=new B,nt=new B,lt=new B,ct=new aa,ut=new $,dt=new oa(new B(0,0,1),0),$e=((M=r.parentElement)==null?void 0:M.parentElement)??r,W=(o=!1)=>{ne=0,le=0,Se=e.rimLight.angle,se=!1,Ee=-1,o&&(ce=.07,ue=-.07,H=e.rimLight.angle,K=0,J=0,t==null||t.reset()),X=!0,Me()},Be=()=>{if(!(we&&ye.matches&&!jt&&!(Le&&ot)&&!re))t==null||t.dispose(),t=void 0;else if(!t)try{t=new ca(i),t.setFlare(!ot),t.setSize(_||1,G||1,Ae||1)}catch{t==null||t.dispose(),t=void 0,re=!0}i.domElement.dataset.postfx=t?"enabled":re?"unsupported":"disabled"};p.push(()=>t==null?void 0:t.dispose());const Re=()=>{if(f||h)return;const o=r.getBoundingClientRect(),c=a.getBoundingClientRect(),w=o.width,l=o.height;if(!w||!l)return;ke=o.left,it=o.top+window.scrollY;const j=Math.min(devicePixelRatio,w<700?e.glass.mobileDpr:e.glass.maxDpr);(w!==_||l!==G||j!==Ae)&&(i.setPixelRatio(j),i.setSize(w,l,!1),_=w,G=l,Ae=j,t==null||t.setSize(w,l,j));const L=26,A=L*w/l;v.left=-A/2,v.right=A/2,v.top=L/2,v.bottom=-L/2,v.updateProjectionMatrix();const ee=w<700?22:80;N.scale.setScalar(Math.min((w-ee*2)/et.x,c.height*.88/et.y)*L/l),N.position.y=(l/2-(c.top-o.top+c.height/2))*L/l;const z=e.cameraMotion.overscan;V.scale.set(A*z,L*z,1);const O=sa(w,l,x.width,x.height);k.repeat.set(w/O.width,l/O.height),k.repeat.multiplyScalar(z),k.offset.set((1-k.repeat.x)/2,(1-k.repeat.y)/2),I.update(Ie(s),w,l,z),t==null||t.invalidateBackground(),ze(),Ut(),X=!0,Me()},ze=()=>{N.rotation.set(ce,ue,-.018),N.updateMatrixWorld(!0),de.copy(Dt).applyMatrix4(xe.matrixWorld),tt.position.set(de.x+Math.cos(H)*e.rimLight.radius,de.y+Math.sin(H)*e.rimLight.radius,e.rimLight.z),v.position.set(K,J,40),nt.set(K*e.cameraMotion.lookAtFactor,J*e.cameraMotion.lookAtFactor,0),v.lookAt(nt),v.updateMatrixWorld(),v.getWorldDirection(lt),V.position.copy(v.position).addScaledVector(lt,46),V.quaternion.copy(v.quaternion),V.updateMatrixWorld(!0)},Ut=()=>{const o=R.boundingBox,c=new B;let w=1/0,l=1/0,j=-1/0,L=-1/0;for(const ee of[o.min.x,o.max.x])for(const z of[o.min.y,o.max.y])for(const O of[o.min.z,o.max.z]){c.set(ee,z,O).applyMatrix4(xe.matrixWorld).project(v);const pe=(c.x+1)*_/2,ve=(1-c.y)*G/2;w=Math.min(w,pe),j=Math.max(j,pe),l=Math.min(l,ve),L=Math.max(L,ve)}const A=18;r.dataset.wordRect=JSON.stringify({left:w-A,top:l-A,width:j-w+A*2,height:L-l+A*2})};T=o=>{if(f||h)return;const c=k;k=U(o),ge.map=k,I.updateTwinkles(o.fallback?[]:_e(s).points),i.domElement.dataset.photoSource=o.url,Re(),c.dispose()},i.domElement.dataset.photoSource=x.url;const ht=o=>{const c=Ie(s),w=_e(s),l=kt(s);if(l.revision!==fe&&(fe=l.revision,I.updateProjects(l),t==null||t.invalidateBackground()),w.revision!==De&&(De=w.revision,I.updateTwinkles(x!=null&&x.fallback?[]:w.points),t==null||t.invalidateBackground()),c.revision!==Fe&&(Fe=c.revision,I.update(c,_,G,e.cameraMotion.overscan),t==null||t.invalidateBackground()),t)try{t.render(b,v,xe,V,o,we&&!Le)}catch{t.dispose(),t=void 0,re=!0,i.domElement.dataset.postfx="failed",i.setRenderTarget(null),i.render(b,v)}else i.render(b,v);i.domElement.dataset.frames=String(++Tt),s.dataset.skyReady="true",Y&&l.points.length?s.dataset.projectSkyReady="true":delete s.dataset.projectSkyReady,i.domElement.dataset.skyCount=String(c.streaks.length),i.domElement.dataset.twinkleCount=String(w.points.length),i.domElement.dataset.projectCount=String(Y?l.points.length:0),i.domElement.dataset.fluid=t!=null&&t.active?"active":"rest",X=!1},pt=o=>{o.preventDefault(),h=!0,be=!1,r.dataset.failed="context-lost",g(),d()},vt=()=>W(),mt=()=>{document.hidden?W(!0):(X=!0,Me())},gt=()=>{W(!0),Be()},ft=()=>W();i.domElement.addEventListener("webglcontextlost",pt),$e.addEventListener("pointerleave",ft),window.addEventListener("blur",vt),document.addEventListener("visibilitychange",mt),ye.addEventListener("change",gt),p.push(()=>{i.domElement.removeEventListener("webglcontextlost",pt),$e.removeEventListener("pointerleave",ft),window.removeEventListener("blur",vt),document.removeEventListener("visibilitychange",mt),ye.removeEventListener("change",gt)});const qe=new ResizeObserver(Re);qe.observe(r),qe.observe(a),p.push(()=>qe.disconnect());const xt=new IntersectionObserver(o=>{be=o[0].isIntersecting,W(!0)});if(xt.observe($e),p.push(()=>xt.disconnect()),Re(),Be(),ze(),await i.compileAsync(b,v),t)try{await t.warm()}catch{t.dispose(),t=void 0,re=!0,i.domElement.dataset.postfx="failed"}if(f||h)throw new Error("Glass context unavailable");ht(1/60);let he=!1;const Lt=Mt((o,c)=>{if(!be||f||h||document.hidden)return!1;const w=na(),l=w.pointer,j=it-w.scrollY;we&&ye.matches&&l.kind!=="touch"&&l.inside&&l.x>=ke&&l.x<=ke+_&&l.y>=j&&l.y<=j+G?(Z.set((l.x-ke)/_,1-(l.y-j)/G),ne=Z.x*2-1,le=1-Z.y*2,ut.set(ne,-le),ct.setFromCamera(ut,v),dt.constant=-de.z,ct.ray.intersectPlane(dt,Q)&&(Q.sub(de),Math.hypot(Q.x,Q.y)>26*e.rimLight.centerDeadZone&&(Se=Math.atan2(Q.y,Q.x))),l.lastMoved!==Ee&&(se&&t&&!Le&&(st.copy(Z).sub(rt),t.push(Z,st)),rt.copy(Z),Ee=l.lastMoved),se=!0):se&&W();const A=.07+le*e.pointer.rotationX,ee=-.07+ne*e.pointer.rotationY,z=ne*e.cameraMotion.offsetX,O=-le*e.cameraMotion.offsetY,pe=1-Math.exp(-e.pointer.damping*c),ve=1-Math.exp(-(se?e.cameraMotion.damping:e.cameraMotion.leaveDamping)*c);ce+=(A-ce)*pe,ue+=(ee-ue)*pe,K+=(z-K)*ve,J+=(O-J)*ve;const yt=Math.atan2(Math.sin(Se-H),Math.cos(Se-H));H+=yt*(1-Math.exp(-e.rimLight.damping*c));const wt=Math.abs(A-ce)+Math.abs(ee-ue)+Math.abs(yt)+Math.abs(z-K)+Math.abs(O-J)>2e-4;return(X||wt||t!=null&&t.active)&&(ze(),he=!0),wt||!!(t!=null&&t.active)},"update"),At=Mt((o,c)=>!be||f||h||document.hidden?(he=!1,!1):((Ie(s).revision!==Fe||_e(s).revision!==De||kt(s).revision!==fe)&&(he=!0),he&&(ht(c),he=!1),!!(t!=null&&t.active)),"render");return p.push(Lt,At),{setMotion(o){f||h||(we=o,W(!0),Be())},dispose:d}}catch(b){throw d(),b}}export{ga as mountGlass};
