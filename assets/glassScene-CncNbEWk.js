var Ut=Object.defineProperty;var Lt=(r,o,d)=>o in r?Ut(r,o,{enumerable:!0,configurable:!0,writable:!0,value:d}):r[o]=d;var u=(r,o,d)=>Lt(r,typeof o!="symbol"?o+"":o,d);import{S as _e,C as At,M as Me,P as Ge,V as U,a as We,b as Oe,c as Et,W as $t,L as Ye,H as Bt,d as Rt,e as Xe,f as zt,g as Vt,h as ve,i as z,j as qt,A as It,O as _t,T as Gt,k as Wt,D as Ot,l as Yt,F as Xt,m as Nt,B as Ht,n as yt,G as Kt,o as Jt,p as Zt,R as Qt,q as ea}from"./three.module-BphUv-iJ.js";import{v as e,p as Pe,a as oe,s as ta,t as ee,b as wt,c as aa,r as ke,d as oa,g as Ve,e as qe,f as bt,h as St,i as ia}from"./next-BR23DtKb.js";import"./lenis-B3SHcJo1.js";const ra=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,kt="#include <tonemapping_pars_fragment>",R=(r=!1,o=0)=>new $t(1,1,{type:Bt,minFilter:Ye,magFilter:Ye,depthBuffer:r,stencilBuffer:!1,samples:o}),te=(r,o)=>new Et({vertexShader:ra,fragmentShader:r,uniforms:o,depthTest:!1,depthWrite:!1,toneMapped:!1});class sa{constructor(o){u(this,"quadScene",new _e);u(this,"quadCamera",new At);u(this,"quad",new Me(new Ge(2,2)));u(this,"color",R(!0,4));u(this,"mask",R(!0,4));u(this,"background",R());u(this,"flare",R());u(this,"velocity",R());u(this,"velocitySwap",R());u(this,"pressure",R());u(this,"pressureSwap",R());u(this,"divergence",R());u(this,"texel",new U(1,1));u(this,"pointer",new U(-1,-1));u(this,"pointerFrom",new U(-1,-1));u(this,"impulse",new U);u(this,"pixel",new U(1,1));u(this,"aspect",{value:1});u(this,"dt",{value:1/60});u(this,"maskMaterial",new We({color:16777215,toneMapped:!1}));u(this,"advect");u(this,"diverge");u(this,"solve");u(this,"project");u(this,"star");u(this,"composite");u(this,"energy",0);u(this,"stale",!0);u(this,"backgroundDirty",!0);u(this,"cadence",0);u(this,"flareAllowed",!0);u(this,"disposed",!1);u(this,"width",1);u(this,"height",1);this.renderer=o,this.quad.material.dispose(),this.color.samples=this.mask.samples=Math.min(4,o.capabilities.maxSamples),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=te(`
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
      ${kt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new U(1,1)},toneMappingExposure:{value:e.lighting.exposure}}),this.composite=te(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${kt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:e.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:e.lighting.exposure}})}setSize(o,d,y){this.width=Math.max(1,Math.round(o*y)),this.height=Math.max(1,Math.round(d*y)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.flare.setSize(Math.ceil(this.width*e.flare.resolutionScale),Math.ceil(this.height*e.flare.resolutionScale));const i=o/d,v=Math.round(e.fluid.resolution*Math.max(1,i)),f=Math.round(e.fluid.resolution*Math.max(1,1/i));for(const p of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])p.setSize(v,f);this.texel.set(1/v,1/f),this.aspect.value=i,this.pixel.set(1/o,1/d),this.composite.uniforms.uMaxDisplacement.value=Math.min(e.fluid.maxPixels,o*e.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/o,1/d),this.reset(),this.cadence=0}setFlare(o){this.flareAllowed=o,this.composite.uniforms.uFlareEnabled.value=+o,this.cadence=0}invalidateBackground(){this.backgroundDirty=!0,this.cadence=0}async warm(){const o=this.renderer.getRenderTarget(),d=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.composite,null]];try{for(const[y,i]of d){if(this.disposed)return;this.quad.material=y,this.renderer.setRenderTarget(i),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(o)}}push(o,d){this.pointerFrom.copy(o).sub(d),this.pointer.copy(o),this.impulse.add(d).clampLength(0,e.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,d.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>e.fluid.settle||this.impulse.lengthSq()>1e-9}draw(o,d){this.quad.material=o,this.renderer.setRenderTarget(d),this.renderer.render(this.quadScene,this.quadCamera)}clear(o){this.renderer.setRenderTarget(o),this.renderer.clear()}render(o,d,y,i,v,f){const p=this.renderer,h=p.getRenderTarget(),C=p.getClearColor(new Oe),w=p.getClearAlpha(),l=y.material,s=i.visible,b=y.visible;try{if(p.setClearColor(0,1),(this.stale||!f)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,f||(this.energy=0,this.impulse.set(0,0))),f&&this.active){this.dt.value=Math.min(v,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let S=0;S<e.fluid.pressureIterations;S++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-e.fluid.dissipation*v),this.impulse.set(0,0)}p.setClearColor(C,w),this.backgroundDirty&&(y.visible=!1,p.setRenderTarget(this.background),p.render(o,d),y.visible=b,this.backgroundDirty=!1),p.setRenderTarget(this.color),p.render(o,d),y.material=this.maskMaterial,i.visible=!1,p.setClearColor(0,1),p.setRenderTarget(this.mask),p.render(o,d),y.material=l,i.visible=s,this.flareAllowed&&this.cadence++%e.flare.stride===0&&this.draw(this.star,this.flare),this.composite.uniforms.uVelocity.value=this.velocity.texture;const m=Math.min(1,this.energy/e.fluid.tailThreshold);this.composite.uniforms.uFluid.value=f&&this.active?m*m*(3-2*m):0,this.draw(this.composite,h)}finally{y.material=l,i.visible=s,y.visible=b,p.setClearColor(C,w),p.setRenderTarget(h)}}dispose(){if(!this.disposed){this.disposed=!0;for(const o of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])o.dispose();for(const o of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial])o.dispose();this.quad.geometry.dispose()}}}const g={columns:4,rows:4,cell:304,padding:8,image:128,capacity:7,labelStart:7,labelImage:oe.canvasSize*oe.scale},Mt=Object.keys(Pe);let Ie;function na(r){return new Promise((o,d)=>{const y=new Image,i=window.setTimeout(()=>v(new Error(`Project mark timed out: ${r}`)),1e4),v=f=>{clearTimeout(i),y.onload=null,y.onerror=null,f?d(f):o(y)};y.onload=()=>v(),y.onerror=()=>v(new Error(`Project mark could not load: ${r}`)),y.src=`/v-next/project-marks/${r}`})}async function la(){Ie||(Ie=Promise.all([Promise.all(Mt.map(o=>na(Pe[o].file))),document.fonts.load(oe.font,Object.values(Pe).map(o=>o.shortName).join(" "))]).then(([o])=>{const{columns:d,rows:y,cell:i,padding:v,image:f}=g,p=document.createElement("canvas");p.width=d*i,p.height=y*i;const h=p.getContext("2d");if(!h)throw new Error("Project atlas canvas is unavailable");return o.forEach((C,w)=>h.drawImage(C,w%d*i+v,Math.floor(w/d)*i+v,f,f)),Mt.forEach((C,w)=>{const l=w+g.labelStart,s=oe,b=s.canvasSize/2;h.save(),h.translate(l%d*i+v,Math.floor(l/d)*i+v),h.scale(s.scale,s.scale),h.font=s.font,"letterSpacing"in h&&(h.letterSpacing=`${s.letterSpacing}px`);const D=Pe[C].shortName,m=h.measureText(D),S=Math.min(s.maxWidth,Math.ceil(m.width)+s.paddingX*2);h.beginPath(),h.roundRect(b-S/2,b-s.height/2,S,s.height,s.radius),h.fillStyle=s.background,h.shadowColor="#0002",h.shadowBlur=8*s.scale,h.shadowOffsetY=2*s.scale,h.fill(),h.shadowColor="transparent",h.shadowBlur=0,h.shadowOffsetY=0,h.fillStyle=s.foreground,h.textAlign="center",h.textBaseline="alphabetic";const k=m.fontBoundingBoxAscent??m.actualBoundingBoxAscent,M=m.fontBoundingBoxDescent??m.actualBoundingBoxDescent;h.fillText(D,b,b+(k-M)/2,S-s.paddingX*2),h.restore()}),p}));const r=new Rt(await Ie);return r.colorSpace=Xe,r.minFilter=zt,r.magFilter=Ye,r.wrapS=r.wrapT=Vt,r.name="galaxci-project-marks-and-labels",r}const ae=ta.capacity;function ca(r){const o=r.onBeforeCompile,d=r.customProgramCacheKey,y=d.call(r),i=new z(1,1,1),v=Array.from({length:ae},()=>new ve),f=Array.from({length:ae},()=>new ve(1,0,1,0)),p=Array.from({length:ee.capacity},()=>new ve),h=Array.from({length:g.capacity},()=>new ve),C=Array.from({length:g.capacity},()=>new ve),w=Array.from({length:g.capacity},()=>0),l={uSkyViewport:{value:i},uSkyCount:{value:0},uSkyHeads:{value:v},uSkyDirections:{value:f},uPhotoStarSize:{value:new U(wt.source.width,wt.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:p},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:h},uProjectCells:{value:w},uProjectTails:{value:C}};let s=!1;const b=function(m,S){o.call(r,m,S),Object.assign(m.uniforms,l),m.vertexShader=m.vertexShader.replace("#include <common>",`#include <common>
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
#include <opaque_fragment>`)},D=()=>`${y}:gxc-sky-backdrop-v5-project-labels`;return r.onBeforeCompile=b,r.customProgramCacheKey=D,r.needsUpdate=!0,{setProjectAtlas(m){s||(l.uProjectAtlas.value=m,m||(l.uProjectCount.value=0))},updateProjects(m){if(s)return;const S=l.uProjectAtlas.value?Math.min(m.points.length,g.capacity):0;l.uProjectCount.value=S;for(let k=0;k<S;k++){const M=m.points[k],L=M.angle*Math.PI/180;h[k].set(M.x,M.y,M.size,Math.max(0,Math.min(1,M.opacity))),C[k].set(Math.cos(L),Math.sin(L),M.tailLength,Math.max(0,Math.min(1,M.labelOpacity))),w[k]=Math.max(0,Math.min(g.capacity-1,M.index))}},updateTwinkles(m){l.uPhotoStarCount.value=s?0:Math.min(m.length,ee.capacity);for(let S=0;S<l.uPhotoStarCount.value;S++){const k=m[S];p[S].set(k.u,k.v,k.radiusPx,k.amplitude)}},update(m,S,k,M){if(s)return;i.set(Math.max(S,1),Math.max(k,1),M);const L=Math.min(m.streaks.length,ae);l.uSkyCount.value=L;for(let A=0;A<L;A++){const E=m.streaks[A],P=E.angle*Math.PI/180;v[A].set(E.x,E.y,E.length,Math.max(0,E.opacity)),f[A].set(Math.cos(P),Math.sin(P),E.width,0)}},dispose(){s||(s=!0,l.uSkyCount.value=0,l.uProjectCount.value=0,l.uProjectAtlas.value=null,r.onBeforeCompile===b&&(r.onBeforeCompile=o),r.customProgramCacheKey===D&&(r.customProgramCacheKey=d),r.needsUpdate=!0)}}}async function va(r,o,d,y){var C;const i=new qt({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),v=[];let f=!1,p=!1;const h=()=>{if(!f){f=!0;for(const w of v.reverse())w();i.dispose(),i.domElement.remove()}};try{i.setClearColor(592396,1),i.outputColorSpace=Xe,i.toneMapping=It,i.toneMappingExposure=e.lighting.exposure,i.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},i.domElement.setAttribute("aria-hidden","true"),r.appendChild(i.domElement);const w=new _e,l=new _t(-20,20,10,-10,.1,150);l.position.set(0,0,40);const s=r.closest(".gxc-hero")??r;let b,D,m,S;const k=new Promise((a,c)=>{m=a,S=c});v.push(aa(s,a=>{b=a,m(a),D==null||D(a)},()=>S(new Error("Background photograph could not load"))));const[M,L]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(a=>{if(!a.ok)throw new Error("Wordmark could not load");return a.json()}),k]);if(M.status==="rejected")throw M.reason;if(L.status==="rejected")throw L.reason;const A=M.value;b=b??L.value;const E=a=>{const c=new Gt(a.image);return c.colorSpace=Xe,c.needsUpdate=!0,c};let P=E(b);v.push(()=>P.dispose());const Ne=new Ge(1,1),me=new We({map:P,color:e.lighting.backdropTint,toneMapped:!1});v.push(()=>Ne.dispose(),()=>me.dispose());const V=new Me(Ne,me);V.position.z=-6,w.add(V);const q=ca(me);let Ce=-1,Fe=-1,ge=-1,O,He=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?r.dataset.projectAtlas="disabled":la().then(a=>{if(f||p){a.dispose();return}O=a,q.setProjectAtlas(a),r.dataset.projectAtlas="ready",He()}).catch(()=>{f||(r.dataset.projectAtlas="failed")}),v.push(()=>{q.dispose(),O==null||O.dispose(),delete s.dataset.skyReady,delete s.dataset.projectSkyReady});const De=new _e;De.background=new Oe(1118742);const Ke=[],Je=new Wt(i);try{for(const c of e.lighting.panels){const x=new We({color:new Oe(c.color).multiplyScalar(c.strength),side:Ot}),n=new Me(new Ge(...c.size),x);n.position.set(c.position[0],c.position[1],c.position[2]),n.lookAt(0,0,0),De.add(n),Ke.push(n)}const a=Je.fromScene(De,.06);v.push(()=>a.dispose()),w.environment=a.texture}finally{for(const a of Ke)a.geometry.dispose(),a.material.dispose();Je.dispose()}const je=new Yt({color:e.glass.tint,metalness:0,roughness:e.glass.roughness,transmission:1,thickness:e.glass.thickness,ior:e.glass.ior,dispersion:e.glass.dispersion,envMapIntensity:e.glass.environment,clearcoat:e.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:e.glass.attenuation,attenuationDistance:50,side:Xt});v.push(()=>je.dispose()),je.onBeforeCompile=a=>{a.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:e.scattering.strength},a.fragmentShader=`uniform float gxcScatterStrength;
`+a.fragmentShader;const c=Nt.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${e.glass.starExposure.toFixed(1)}, material.transmission`);a.fragmentShader=a.fragmentShader.replace("#include <transmission_fragment>",c+`
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
      `)};const $=new Ht;v.push(()=>$.dispose()),$.setAttribute("position",new yt(A.positions,3)),$.setAttribute("normal",new yt(A.normals,3)),$.setIndex(A.indices),$.computeBoundingBox();const Ze=$.boundingBox.getSize(new z),Pt=$.boundingBox.getCenter(new z),fe=new Me($,je),Y=new Kt;Y.add(fe),w.add(Y);const Qe=new Jt(15397631,e.lighting.point,90,2);w.add(Qe);const et=new Zt(16777215,e.lighting.fill);et.position.set(-5,9,6),w.add(et);const Te=new URLSearchParams(location.search),xe=matchMedia("(hover: hover) and (pointer: fine)"),Ct=Te.has("no-postfx"),Ue=Te.has("no-fluid"),tt=Te.has("no-flare");let t,ie=!i.extensions.has("EXT_color_buffer_float"),ye=!d,we=!0,X=!0,re=!1,se=0,ne=0,N=e.rimLight.angle,be=e.rimLight.angle,le=.07,ce=-.07,H=0,K=0,I=0,_=0,Le=0,at=0,Se=0,Ae=-1,Ft=0;He=()=>{ge=-1,X=!0,t==null||t.invalidateBackground(),ke()};const ot=new U,J=new U,it=new U,ue=new z,Z=new z,rt=new z,st=new z,nt=new Qt,lt=new U,ct=new ea(new z(0,0,1),0),Ee=((C=r.parentElement)==null?void 0:C.parentElement)??r,G=(a=!1)=>{se=0,ne=0,be=e.rimLight.angle,re=!1,Ae=-1,a&&(le=.07,ce=-.07,N=e.rimLight.angle,H=0,K=0,t==null||t.reset()),X=!0,ke()},$e=()=>{if(!(ye&&xe.matches&&!Ct&&!(Ue&&tt)&&!ie))t==null||t.dispose(),t=void 0;else if(!t)try{t=new sa(i),t.setFlare(!tt),t.setSize(I||1,_||1,Le||1)}catch{t==null||t.dispose(),t=void 0,ie=!0}i.domElement.dataset.postfx=t?"enabled":ie?"unsupported":"disabled"};v.push(()=>t==null?void 0:t.dispose());const Be=()=>{if(f||p)return;const a=r.getBoundingClientRect(),c=o.getBoundingClientRect(),x=a.width,n=a.height;if(!x||!n)return;Se=a.left,at=a.top+window.scrollY;const F=Math.min(devicePixelRatio,x<700?e.glass.mobileDpr:e.glass.maxDpr);(x!==I||n!==_||F!==Le)&&(i.setPixelRatio(F),i.setSize(x,n,!1),I=x,_=n,Le=F,t==null||t.setSize(x,n,F));const j=26,T=j*x/n;l.left=-T/2,l.right=T/2,l.top=j/2,l.bottom=-j/2,l.updateProjectionMatrix();const Q=x<700?22:80;Y.scale.setScalar(Math.min((x-Q*2)/Ze.x,c.height*.88/Ze.y)*j/n),Y.position.y=(n/2-(c.top-a.top+c.height/2))*j/n;const B=e.cameraMotion.overscan;V.scale.set(T*B,j*B,1);const W=oa(x,n,b.width,b.height);P.repeat.set(x/W.width,n/W.height),P.repeat.multiplyScalar(B),P.offset.set((1-P.repeat.x)/2,(1-P.repeat.y)/2),q.update(Ve(s),x,n,B),t==null||t.invalidateBackground(),Re(),Dt(),X=!0,ke()},Re=()=>{Y.rotation.set(le,ce,-.018),Y.updateMatrixWorld(!0),ue.copy(Pt).applyMatrix4(fe.matrixWorld),Qe.position.set(ue.x+Math.cos(N)*e.rimLight.radius,ue.y+Math.sin(N)*e.rimLight.radius,e.rimLight.z),l.position.set(H,K,40),rt.set(H*e.cameraMotion.lookAtFactor,K*e.cameraMotion.lookAtFactor,0),l.lookAt(rt),l.updateMatrixWorld(),l.getWorldDirection(st),V.position.copy(l.position).addScaledVector(st,46),V.quaternion.copy(l.quaternion),V.updateMatrixWorld(!0)},Dt=()=>{const a=$.boundingBox,c=new z;let x=1/0,n=1/0,F=-1/0,j=-1/0;for(const Q of[a.min.x,a.max.x])for(const B of[a.min.y,a.max.y])for(const W of[a.min.z,a.max.z]){c.set(Q,B,W).applyMatrix4(fe.matrixWorld).project(l);const he=(c.x+1)*I/2,pe=(1-c.y)*_/2;x=Math.min(x,he),F=Math.max(F,he),n=Math.min(n,pe),j=Math.max(j,pe)}const T=18;r.dataset.wordRect=JSON.stringify({left:x-T,top:n-T,width:F-x+T*2,height:j-n+T*2})};D=a=>{if(f||p)return;const c=P;P=E(a),me.map=P,q.updateTwinkles(a.fallback?[]:qe(s).points),i.domElement.dataset.photoSource=a.url,Be(),c.dispose()},i.domElement.dataset.photoSource=b.url;const ut=a=>{const c=Ve(s),x=qe(s),n=bt(s);if(n.revision!==ge&&(ge=n.revision,q.updateProjects(n),t==null||t.invalidateBackground()),x.revision!==Fe&&(Fe=x.revision,q.updateTwinkles(b!=null&&b.fallback?[]:x.points),t==null||t.invalidateBackground()),c.revision!==Ce&&(Ce=c.revision,q.update(c,I,_,e.cameraMotion.overscan),t==null||t.invalidateBackground()),t)try{t.render(w,l,fe,V,a,ye&&!Ue)}catch{t.dispose(),t=void 0,ie=!0,i.domElement.dataset.postfx="failed",i.setRenderTarget(null),i.render(w,l)}else i.render(w,l);i.domElement.dataset.frames=String(++Ft),s.dataset.skyReady="true",O&&n.points.length?s.dataset.projectSkyReady="true":delete s.dataset.projectSkyReady,i.domElement.dataset.skyCount=String(c.streaks.length),i.domElement.dataset.twinkleCount=String(x.points.length),i.domElement.dataset.projectCount=String(O?n.points.length:0),i.domElement.dataset.fluid=t!=null&&t.active?"active":"rest",X=!1},dt=a=>{a.preventDefault(),p=!0,we=!1,r.dataset.failed="context-lost",y(),h()},ht=()=>G(),pt=()=>{document.hidden?G(!0):(X=!0,ke())},vt=()=>{G(!0),$e()},mt=()=>G();i.domElement.addEventListener("webglcontextlost",dt),Ee.addEventListener("pointerleave",mt),window.addEventListener("blur",ht),document.addEventListener("visibilitychange",pt),xe.addEventListener("change",vt),v.push(()=>{i.domElement.removeEventListener("webglcontextlost",dt),Ee.removeEventListener("pointerleave",mt),window.removeEventListener("blur",ht),document.removeEventListener("visibilitychange",pt),xe.removeEventListener("change",vt)});const ze=new ResizeObserver(Be);ze.observe(r),ze.observe(o),v.push(()=>ze.disconnect());const gt=new IntersectionObserver(a=>{we=a[0].isIntersecting,G(!0)});if(gt.observe(Ee),v.push(()=>gt.disconnect()),Be(),$e(),Re(),await i.compileAsync(w,l),t)try{await t.warm()}catch{t.dispose(),t=void 0,ie=!0,i.domElement.dataset.postfx="failed"}if(f||p)throw new Error("Glass context unavailable");ut(1/60);let de=!1;const jt=St((a,c)=>{if(!we||f||p||document.hidden)return!1;const x=ia(),n=x.pointer,F=at-x.scrollY;ye&&xe.matches&&n.kind!=="touch"&&n.inside&&n.x>=Se&&n.x<=Se+I&&n.y>=F&&n.y<=F+_?(J.set((n.x-Se)/I,1-(n.y-F)/_),se=J.x*2-1,ne=1-J.y*2,lt.set(se,-ne),nt.setFromCamera(lt,l),ct.constant=-ue.z,nt.ray.intersectPlane(ct,Z)&&(Z.sub(ue),Math.hypot(Z.x,Z.y)>26*e.rimLight.centerDeadZone&&(be=Math.atan2(Z.y,Z.x))),n.lastMoved!==Ae&&(re&&t&&!Ue&&(it.copy(J).sub(ot),t.push(J,it)),ot.copy(J),Ae=n.lastMoved),re=!0):re&&G();const T=.07+ne*e.pointer.rotationX,Q=-.07+se*e.pointer.rotationY,B=se*e.cameraMotion.offsetX,W=-ne*e.cameraMotion.offsetY,he=1-Math.exp(-e.pointer.damping*c),pe=1-Math.exp(-(re?e.cameraMotion.damping:e.cameraMotion.leaveDamping)*c);le+=(T-le)*he,ce+=(Q-ce)*he,H+=(B-H)*pe,K+=(W-K)*pe;const ft=Math.atan2(Math.sin(be-N),Math.cos(be-N));N+=ft*(1-Math.exp(-e.rimLight.damping*c));const xt=Math.abs(T-le)+Math.abs(Q-ce)+Math.abs(ft)+Math.abs(B-H)+Math.abs(W-K)>2e-4;return(X||xt||t!=null&&t.active)&&(Re(),de=!0),xt||!!(t!=null&&t.active)},"update"),Tt=St((a,c)=>!we||f||p||document.hidden?(de=!1,!1):((Ve(s).revision!==Ce||qe(s).revision!==Fe||bt(s).revision!==ge)&&(de=!0),de&&(ut(c),de=!1),!!(t!=null&&t.active)),"render");return v.push(jt,Tt),{setMotion(a){f||p||(ye=a,G(!0),$e())},dispose:h}}catch(w){throw h(),w}}export{va as mountGlass};
