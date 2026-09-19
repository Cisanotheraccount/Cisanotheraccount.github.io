var no=Object.defineProperty;var lo=(r,t,i)=>t in r?no(r,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):r[t]=i;var u=(r,t,i)=>lo(r,typeof t!="symbol"?t+"":t,i);import{R as Te,a as De,b as Wt,S as to,c as ut,C as co,M as Ge,P as ht,V as z,d as dt,e as W,f as Ie,g as pt,W as uo,L as vt,H as ho,h as po,i as mt,j as vo,k as mo,l as _,D as fo,U as go,N as xo,m as yo,n as wo,A as bo,O as ko,T as So,o as Mo,p as Po,q as Co,F as Fo,r as To,B as Do,s as Ot,G as jo,t as Uo,u as Bo,v as Ao,w as Eo,x as Nt}from"./three.module-D_0gVHEd.js";import{v as o,g as ft,h as gt,p as rt,a as me,s as Ro,b as $,c as qe,d as Lo,r as $o,e as zo,f as Ce,i as Yt,j as it,k as Fe,l as Ht,m as st,n as nt,o as Xt,q as Kt,t as Vo,u as Qt}from"./version21-WRVejNhl.js";const oo=`
vec4 photoOverlay(vec3 composed, vec3 photograph, float coverage) {
  vec3 c = clamp(composed, 0.0, 1.0);
  vec3 b = clamp(photograph, 0.0, 1.0);
  // The smallest valid source-over alpha supports both brighter light and
  // darker/colored project artwork. Unchanged sky remains fully transparent.
  vec3 lighten = max(c - b, 0.0) / max(vec3(1.0) - b, vec3(0.00001));
  vec3 darken = max(b - c, 0.0) / max(b, vec3(0.00001));
  vec3 required = max(lighten, darken);
  float alpha = clamp(max(coverage, max(required.r, max(required.g, required.b))), 0.0, 1.0);
  return vec4(clamp(c - b * (1.0 - alpha), vec3(0.0), vec3(alpha)), alpha);
}
`,Io=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Zt="#include <tonemapping_pars_fragment>",q=(r=!1,t=0,i=De)=>new uo(1,1,{type:ho,minFilter:vt,magFilter:vt,format:i,depthBuffer:r,stencilBuffer:!1,samples:t,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1}),qo=(r,t)=>t();function lt(r,t,i=0){const s=r.getContext();if(!("getInternalformatParameter"in s)||!r.extensions.has("EXT_color_buffer_float"))return!1;const e=t===Te?s.R16F:s.RG16F;if(i&&!Array.from(s.getInternalformatParameter(s.RENDERBUFFER,e,s.SAMPLES)).includes(i))return!1;const l=r.getRenderTarget(),d=q(!1,i,t);try{return r.setRenderTarget(d),s.checkFramebufferStatus(s.FRAMEBUFFER)===s.FRAMEBUFFER_COMPLETE}catch{return!1}finally{r.setRenderTarget(l),d.dispose()}}const pe=(r,t)=>new to({vertexShader:Io,fragmentShader:r,uniforms:t,depthTest:!1,depthWrite:!1,toneMapped:!1});class _o{constructor(t,i=!0){u(this,"quadScene",new ut);u(this,"quadCamera",new co);u(this,"quad",new Ge(new ht(2,2)));u(this,"color",q(!0,4));u(this,"mask");u(this,"background",q());u(this,"flare",q());u(this,"velocity");u(this,"velocitySwap");u(this,"pressure");u(this,"pressureSwap");u(this,"divergence");u(this,"texel",new z(1,1));u(this,"pointer",new z(-1,-1));u(this,"pointerFrom",new z(-1,-1));u(this,"impulse",new z);u(this,"pixel",new z(1,1));u(this,"aspect",{value:1});u(this,"dt",{value:1/60});u(this,"maskMaterial",new dt({color:16777215,toneMapped:!1}));u(this,"advect");u(this,"diverge");u(this,"solve");u(this,"project");u(this,"star");u(this,"composite");u(this,"cachedBackdrop");u(this,"cacheViewport",new W);u(this,"maskWorld",new Ie);u(this,"maskView",new Ie);u(this,"maskProjection",new Ie);u(this,"clipMatrix",new Ie);u(this,"corner",new W);u(this,"flareBounds",new W);u(this,"previousFlareBounds",new W);u(this,"maskGeometry","");u(this,"maskGeometryVersion","");u(this,"maskVisible",!1);u(this,"maskDirty",!0);u(this,"quality","full");u(this,"energy",0);u(this,"stale",!0);u(this,"backgroundDirty",!0);u(this,"nextFlareAt",-1/0);u(this,"flareAllowed",!0);u(this,"disposed",!1);u(this,"width",1);u(this,"height",1);this.renderer=t,this.nativePhoto=i,this.quad.material.dispose();const s=Math.min(4,t.capabilities.maxSamples);this.color.samples=s;const e=lt(t,Te)?Te:De,l=lt(t,Wt)?Wt:De;this.mask=q(!1,s,lt(t,Te,s)?Te:De),this.velocity=q(!1,0,l),this.velocitySwap=q(!1,0,l),this.pressure=q(!1,0,e),this.pressureSwap=q(!1,0,e),this.divergence=q(!1,0,e),this.cachedBackdrop=new to({vertexShader:"void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D uBackground; uniform vec4 uViewport; void main(){vec2 uv=(gl_FragCoord.xy-uViewport.xy)/uViewport.zw;gl_FragColor=texture2D(uBackground,uv);}",uniforms:{uBackground:{value:this.background.texture},uViewport:{value:this.cacheViewport}},toneMapped:!1}),this.cachedBackdrop.onBeforeRender=d=>{d.getCurrentViewport(this.cacheViewport).floor(),this.cachedBackdrop.uniformsNeedUpdate=!0},this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=pe(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform float uDt, uAspect;
      uniform vec2 uPointer, uFrom, uImpulse;
      void main() {
        vec2 old = texture2D(uVelocity, vUv).xy;
        vec2 velocity = texture2D(uVelocity, clamp(vUv - old * uDt, .001, .999)).xy;
        velocity *= exp(-${o.fluid.dissipation.toFixed(2)} * uDt);
        // Splat along the actual pointer segment, avoiding disconnected dents on fast passes.
        vec2 metric=vec2(uAspect,1.);
        vec2 segment=(uPointer-uFrom)*metric;
        vec2 relative=(vUv-uFrom)*metric;
        float along=clamp(dot(relative,segment)/max(dot(segment,segment),.000001),0.,1.);
        vec2 d=relative-segment*along;
        float splat = exp(-dot(d,d) / ${(o.fluid.radius**2).toFixed(6)});
        velocity += uImpulse * splat * ${o.fluid.force.toFixed(2)};
        float speed = length(velocity*metric);
        if (speed > ${o.fluid.velocityLimit}) velocity *= ${o.fluid.velocityLimit} / speed;
        gl_FragColor = vec4(velocity, 0., 1.);
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=pe(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=pe(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=pe(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=pe(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${Zt}
      vec3 bright(vec2 uv) {
        vec2 sampleUv=clamp(uv,0.,1.);
        float coverage=texture2D(uMask,sampleUv).r;
        // Zero coverage made the original result exactly zero. Test it before
        // HDR sampling and ACES: most ray taps cross sky or letter holes.
        // Contributing taps retain the original interpolation/tonemap order.
        if(coverage<=0.) return vec3(0.);
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,sampleUv).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${o.flare.threshold})/${1-o.flare.threshold},0.,1.),${o.flare.power.toFixed(1)});
        return c*b*coverage;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        // The eighth pair has (1 - 8/8)^2 = 0 weight, so it adds no light.
        for(int i=1;i<=7;i++) {
          float t=float(i)/8.; vec2 d=axis*uPixel*${o.flare.length.toFixed(1)}*t;
          float weight=pow(1.-t,2.);
          sum+=(bright(vUv+d)+bright(vUv-d))*weight;
        }
        return sum;
      }
      void main() {
        vec3 glow=ray(vec2(0.,1.))+ray(vec2(.8660254,.5))+ray(vec2(.8660254,-.5));
        gl_FragColor=vec4(glow*${(o.flare.intensity/5).toFixed(5)},1.);
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new z(1,1)},toneMappingExposure:{value:o.lighting.exposure}}),this.composite=pe(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform sampler2D uPhotograph;
      uniform vec4 uPhotoCover;
      uniform bool uNativePhoto;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Zt}
      ${oo}
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
        vec2 d=vec2(0.);
        if(uFluid>0.) {
          d=texture2D(uVelocity,vUv).xy*${o.fluid.displacement}*uFluid;
          float pixels=length(d/uPixel);
          // A soft limit keeps large pushes rounded instead of clipping them into a flat dent.
          d /= sqrt(1. + pow(pixels / uMaxDisplacement, 2.));
        }
        vec2 uv=clamp(vUv-d,.0001,.9999);
        float coverage=texture2D(uMask,uv).r;
        vec3 result=bg;
        // Coverage is tested AFTER displacement, including all pushed-out edges.
        // Letter holes and untouched sky need neither ACES nor glass color fetches.
        if(coverage>0.) {
          vec3 glass=glassAt(uv,coverage);
          if(uFluid>0.) {
            // Dispersion stays inside one silhouette, never three displaced outlines.
            vec2 redUv=uv-d*${o.fluid.chroma}, blueUv=uv+d*${o.fluid.chroma};
            float redMask=texture2D(uMask,redUv).r, blueMask=texture2D(uMask,blueUv).r;
            if(redMask>.2) glass.r=mix(glass.r,glassAt(redUv,redMask).r,smoothstep(.2,.95,redMask));
            if(blueMask>.2) glass.b=mix(glass.b,glassAt(blueUv,blueMask).b,smoothstep(.2,.95,blueMask));
          }
          if(uFlareEnabled>.5) glass+=texture2D(uFlare,uv).rgb;
          result=mix(bg,glass,coverage);
        }
        gl_FragColor=vec4(result,1.);
        #include <colorspace_fragment>
        if(uNativePhoto) {
          vec3 photograph=texture2D(uPhotograph,vUv*uPhotoCover.xy+uPhotoCover.zw).rgb;
          gl_FragColor=photoOverlay(gl_FragColor.rgb,linearToOutputTexel(vec4(photograph,1.)).rgb,coverage);
        }
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:o.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:o.lighting.exposure},uNativePhoto:{value:i},uPhotograph:{value:null},uPhotoCover:{value:new W(1,1,0,0)}})}setSize(t,i,s){this.width=Math.max(1,Math.round(t*s)),this.height=Math.max(1,Math.round(i*s)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.maskDirty=!0,this.sizeFlare();const e=t/i,l=Math.round(o.fluid.resolution*Math.max(1,e)),d=Math.round(o.fluid.resolution*Math.max(1,1/e));for(const w of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])w.setSize(l,d);this.texel.set(1/l,1/d),this.aspect.value=e,this.pixel.set(1/t,1/i),this.composite.uniforms.uMaxDisplacement.value=Math.min(o.fluid.maxPixels,t*o.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/t,1/i),this.reset(),this.nextFlareAt=-1/0}setPhotograph(t,i,s){this.composite.uniforms.uPhotograph.value=t,this.composite.uniforms.uPhotoCover.value.set(i,s,(1-i)/2,(1-s)/2)}sizeFlare(){const t=o.renderQuality[this.quality].flareScale;this.flare.setSize(Math.ceil(this.width*t),Math.ceil(this.height*t)),this.previousFlareBounds.set(0,0,0,0),this.nextFlareAt=-1/0}setQuality(t){this.quality!==t&&(this.quality=t,this.sizeFlare())}setFlare(t){this.flareAllowed=t,this.composite.uniforms.uFlareEnabled.value=+t}invalidateBackground(){this.backgroundDirty=!0}async warm(){const t=this.renderer.getRenderTarget(),i=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.cachedBackdrop,this.color],[this.composite,null]];try{for(const[s,e]of i){if(this.disposed)return;this.quad.material=s,this.renderer.setRenderTarget(e),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(t)}}push(t,i){this.pointerFrom.copy(t).sub(i),this.pointer.copy(t),this.impulse.add(i).clampLength(0,o.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,i.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>o.fluid.settle||this.impulse.lengthSq()>1e-9}draw(t,i){this.quad.material=t,this.renderer.setRenderTarget(i),this.renderer.render(this.quadScene,this.quadCamera)}clear(t){this.renderer.setRenderTarget(t),this.renderer.clear()}needsMask(t,i){var c;t.updateWorldMatrix(!0,!1),i.updateWorldMatrix(!0,!1);const s=t.geometry.getAttribute("position"),l=`${(s&&("version"in s?s.version:s.data.version))??0}:${((c=t.geometry.index)==null?void 0:c.version)??0}`,d=t.geometry.uuid!==this.maskGeometry||l!==this.maskGeometryVersion;return d&&t.geometry.computeBoundingBox(),{changed:this.maskDirty||d||t.visible!==this.maskVisible||!this.maskWorld.equals(t.matrixWorld)||!this.maskView.equals(i.matrixWorldInverse)||!this.maskProjection.equals(i.projectionMatrix),version:l}}rememberMask(t,i,s){this.maskWorld.copy(t.matrixWorld),this.maskView.copy(i.matrixWorldInverse),this.maskProjection.copy(i.projectionMatrix),this.maskVisible=t.visible,this.maskGeometry=t.geometry.uuid,this.maskGeometryVersion=s,this.maskDirty=!1}drawFlare(t,i){const s=this.renderer,e=this.flareBounds;e.set(1,1,0,0);const l=t.geometry.boundingBox;if(l&&t.visible){this.clipMatrix.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse).multiply(t.matrixWorld);for(let f=0;f<8;f++){if(this.corner.set(f&1?l.max.x:l.min.x,f&2?l.max.y:l.min.y,f&4?l.max.z:l.min.z,1).applyMatrix4(this.clipMatrix),this.corner.w<=0){e.set(0,0,1,1);break}const D=this.corner.x/this.corner.w*.5+.5,A=this.corner.y/this.corner.w*.5+.5;e.x=Math.min(e.x,D),e.y=Math.min(e.y,A),e.z=Math.max(e.z,D),e.w=Math.max(e.w,A)}}const d=o.flare.length+o.fluid.maxPixels+4,w=d*this.pixel.x,c=d*this.pixel.y,T=e.clone(),g=this.previousFlareBounds;g.z>g.x&&g.w>g.y&&(e.x=Math.min(e.x,g.x),e.y=Math.min(e.y,g.y),e.z=Math.max(e.z,g.z),e.w=Math.max(e.w,g.w)),g.copy(T);const S=Math.max(0,Math.floor((e.x-w)*this.flare.width)),m=Math.max(0,Math.floor((e.y-c)*this.flare.height)),y=Math.min(this.flare.width,Math.ceil((e.z+w)*this.flare.width)),x=Math.min(this.flare.height,Math.ceil((e.w+c)*this.flare.height));if(this.flare.scissorTest=!1,s.setClearColor(0,1),this.clear(this.flare),y<=S||x<=m)return;const h=s.autoClear;try{this.flare.scissor.set(S,m,y-S,x-m),this.flare.scissorTest=!0,s.autoClear=!1,this.draw(this.star,this.flare)}finally{s.autoClear=h,this.flare.scissorTest=!1,this.flare.scissor.set(0,0,this.flare.width,this.flare.height)}}render(t,i,s,e,l,d,w=qo){const c=this.renderer,T=c.getRenderTarget(),g=c.getClearColor(new pt),S=c.getClearAlpha(),m=s.material,y=e.material,x=e.visible,h=s.visible;try{w("fluid",()=>{if(c.setClearColor(0,1),(this.stale||!d&&this.active)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,d||(this.energy=0,this.impulse.set(0,0))),d&&this.active){this.dt.value=Math.min(l,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let b=0;b<o.fluid.pressureIterations;b++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-o.fluid.dissipation*l),this.impulse.set(0,0)}}),c.setClearColor(g,S),this.backgroundDirty&&w("background",()=>{s.visible=!1,c.setRenderTarget(this.background),c.render(t,i),s.visible=h,this.backgroundDirty=!1}),e.material=this.cachedBackdrop,w("color",()=>{c.setRenderTarget(this.color),c.render(t,i)});const f=this.needsMask(s,i);f.changed&&w("mask",()=>{s.material=this.maskMaterial,e.visible=!1,c.setClearColor(0,1),c.setRenderTarget(this.mask),c.render(t,i),s.material=m,e.visible=x,this.rememberMask(s,i,f.version)});const D=performance.now();this.flareAllowed&&D+.5>=this.nextFlareAt&&w("flare",()=>{this.drawFlare(s,i);const E=1e3/(ft("hero").targetFps>60?o.flare.highRefreshFps:o.flare.standardFps),R=Number.isFinite(this.nextFlareAt)?Math.max(0,D-this.nextFlareAt)%E:0;this.nextFlareAt=D+E-R}),this.composite.uniforms.uVelocity.value=this.velocity.texture;const A=Math.min(1,this.energy/o.fluid.tailThreshold);this.composite.uniforms.uFluid.value=d&&this.active?A*A*(3-2*A):0,w("composite",()=>this.draw(this.composite,T))}finally{s.material=m,e.material=y,e.visible=x,s.visible=h,c.setClearColor(g,S),c.setRenderTarget(T)}}dispose(){if(!this.disposed){this.disposed=!0;for(const t of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])t.dispose();for(const t of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial,this.cachedBackdrop])t.dispose();this.quad.geometry.dispose()}}}const M={columns:4,rows:4,cell:304,padding:8,image:128,capacity:gt.length,labelStart:gt.length,labelImage:me.canvasSize*me.scale},We=gt,Jt=Object.fromEntries(We.map((r,t)=>[r,t]));let ct;function eo(r){return new Promise((t,i)=>{const s=new Image,e=window.setTimeout(()=>l(new Error(`Project mark timed out: ${r}`)),1e4),l=d=>{clearTimeout(e),s.onload=null,s.onerror=null,d?i(d):t(s)};s.onload=()=>l(),s.onerror=()=>l(new Error(`Project mark could not load: ${r}`)),s.src=`/v-next/project-marks/${r}`})}async function Go(){ct||(ct=Promise.all([Promise.all(We.map(t=>{const i=rt[t];return eo(i.file).catch(s=>{if(i.file===i.fallbackFile)throw s;return eo(i.fallbackFile)})})),document.fonts.load(me.font,We.map(t=>rt[t].shortName).join(" "))]).then(([t])=>{const{columns:i,rows:s,cell:e,padding:l,image:d}=M,w=document.createElement("canvas");w.width=i*e,w.height=s*e;const c=w.getContext("2d");if(!c)throw new Error("Project atlas canvas is unavailable");return t.forEach((T,g)=>{const S=d/Math.max(T.naturalWidth,T.naturalHeight),m=T.naturalWidth*S,y=T.naturalHeight*S;c.drawImage(T,g%i*e+l+(d-m)/2,Math.floor(g/i)*e+l+(d-y)/2,m,y)}),We.forEach((T,g)=>{const S=g+M.labelStart,m=me,y=m.canvasSize/2;c.save(),c.translate(S%i*e+l,Math.floor(S/i)*e+l),c.scale(m.scale,m.scale),c.font=m.font,"letterSpacing"in c&&(c.letterSpacing=`${m.letterSpacing}px`);const x=rt[T].shortName,h=c.measureText(x),f=Math.min(m.maxWidth,Math.ceil(h.width)+m.paddingX*2);c.beginPath(),c.roundRect(y-f/2,y-m.height/2,f,m.height,m.radius),c.fillStyle=m.background,c.shadowColor="#0002",c.shadowBlur=8*m.scale,c.shadowOffsetY=2*m.scale,c.fill(),c.shadowColor="transparent",c.shadowBlur=0,c.shadowOffsetY=0,c.fillStyle=m.foreground,c.textAlign="center",c.textBaseline="alphabetic";const D=h.fontBoundingBoxAscent??h.actualBoundingBoxAscent,A=h.fontBoundingBoxDescent??h.actualBoundingBoxDescent;c.fillText(x,y,y+(D-A)/2,f-m.paddingX*2),c.restore()}),w}));const r=new po(await ct);return r.colorSpace=mt,r.minFilter=vo,r.magFilter=vt,r.wrapS=r.wrapT=mo,r.name="galaxci-project-marks-and-labels",r}const G={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},_e={width:G.columns*G.texelsPerCell,height:G.rows};function Wo(r,t,i,s,e){const{columns:l,rows:d,slots:w,texelsPerCell:c,overflow:T}=G;if(r.length!==l*d*c*4)throw new Error("Incorrect star index buffer size");if(t.length>=T)throw new Error("Star index supports at most 254 points");r.fill(0);let g=0,S=0;for(let m=0;m<t.length;m++){const y=t[m],x=y.radiusPx*e;if(!Number.isFinite(y.u+y.v+x)||x<=0)continue;const h=x+.01,f=y.u-h/i,D=y.u+h/i,A=y.v-h/s,b=y.v+h/s;if(D<0||f>1||b<0||A>1)continue;const E=Math.max(0,Math.min(l-1,Math.floor(f*l))),R=Math.max(0,Math.min(l-1,Math.floor(D*l))),j=Math.max(0,Math.min(d-1,Math.floor(A*d))),F=Math.max(0,Math.min(d-1,Math.floor(b*d)));for(let C=j;C<=F;C++)for(let P=E;P<=R;P++){const V=(C*l+P)*c*4,I=r[V];if(I!==T){if(I===w){r[V]=T,S++;continue}I===0&&g++,r[V]=I+1,r[V+I+1]=m+1}}}return{occupiedCells:g,overflowCells:S}}const ve=Ro.capacity;function Oo(r,t=!0){const i=r.onBeforeCompile,s=r.customProgramCacheKey,e=s.call(r),l=new _(1,1,1),d=Array.from({length:ve},()=>new W),w=Array.from({length:ve},()=>new W(1,0,1,0)),c=Array.from({length:$.capacity},()=>new W),T=Array.from({length:$.capacity},()=>new _(1,1,1)),g=new Uint8Array(_e.width*_e.height*4),S=new fo(g,_e.width,_e.height,De,go);S.minFilter=S.magFilter=xo,S.generateMipmaps=!1,S.flipY=!1,S.colorSpace=yo,S.needsUpdate=!0;const m=Array.from({length:M.capacity},()=>new W),y=Array.from({length:M.capacity},()=>new W),x=Array.from({length:M.capacity},()=>0),h={uNativePhoto:{value:!1},uSkyViewport:{value:l},uSkyCount:{value:0},uSkyHeads:{value:d},uSkyDirections:{value:w},uPhotoStarSize:{value:new z(qe.source.width,qe.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:c},uPhotoStarColors:{value:T},uPhotoStarIndex:{value:S},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:m},uProjectCells:{value:x},uProjectTails:{value:y}};let f=!1;const D=function(b,E){i.call(r,b,E),Object.assign(b.uniforms,h),b.vertexShader=b.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),b.fragmentShader=b.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform bool uNativePhoto;
${oo}
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${ve}];
uniform vec4 uSkyDirections[${ve}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${$.capacity}];
uniform vec3 uPhotoStarColors[${$.capacity}];
uniform sampler2D uPhotoStarIndex;
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${M.capacity}];
uniform float uProjectCells[${M.capacity}];
uniform vec4 uProjectTails[${M.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${M.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${M.columns.toFixed(1)}), floor(cell / ${M.columns.toFixed(1)})) * ${M.cell.toFixed(1)};
    vec2 uv = (origin + ${M.padding.toFixed(1)} + local * ${M.image.toFixed(1)})
      / vec2(${(M.columns*M.cell).toFixed(1)}, ${(M.rows*M.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${me.offsetY.toFixed(1)})) / ${me.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${M.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${M.columns.toFixed(1)}), floor(labelCell / ${M.columns.toFixed(1)})) * ${M.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${M.padding.toFixed(1)} + labelLocal * ${M.labelImage.toFixed(1)})
      / vec2(${(M.columns*M.cell).toFixed(1)}, ${(M.rows*M.cell).toFixed(1)});
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
  ivec2 address = ivec2(cell.x * ${G.texelsPerCell} + slot / 4, cell.y);
  vec4 packedIndices = texelFetch(uPhotoStarIndex, address, 0);
  return int(floor(packedIndices[slot % 4] * 255.0 + 0.5));
}
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  // Lookup uses top-left original-photo UV, independent of viewport/DPR/crop.
  ivec2 cell = ivec2(clamp(floor(vec2(photoUv.x, 1.0 - photoUv.y)
    * vec2(${G.columns.toFixed(1)}, ${G.rows.toFixed(1)})), vec2(0.0),
    vec2(${(G.columns-1).toFixed(1)}, ${(G.rows-1).toFixed(1)})));
  int storedCount = photoStarIndexAt(cell, 0);
  bool overflow = storedCount == ${G.overflow};
  int count = overflow ? uPhotoStarCount : storedCount;
  if (count == 0) return light;
  for (int entry = 0; entry < ${$.capacity}; entry++) {
    if (entry >= count) break;
    int i = overflow ? entry : photoStarIndexAt(cell, entry + 1) - 1;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${($.supportSigma**2).toFixed(1)}) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2*$.haloSigma**2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${($.supportSigma**2).toFixed(1)}, q);
    float alpha = clamp(core * ${$.coreOpacity.toFixed(4)} + halo * ${$.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
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
  for (int i = 0; i < ${ve}; i++) {
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
}`).replace("#include <opaque_fragment>",`vec3 originalPhotograph = outgoingLight;
#ifdef USE_MAP
outgoingLight += photoTwinkleLight(diffuseColor.rgb, vMapUv);
#endif
outgoingLight += skyMeteorLight();
outgoingLight = projectSkyColor(outgoingLight);
#include <opaque_fragment>`).replace("#include <dithering_fragment>",`#include <dithering_fragment>
if (uNativePhoto) {
  gl_FragColor = photoOverlay(gl_FragColor.rgb, linearToOutputTexel(vec4(originalPhotograph, 1.0)).rgb, 0.0);
}`)},A=()=>`${e}:gxc-sky-backdrop-v11-native-photo`;return r.onBeforeCompile=D,r.customProgramCacheKey=A,r.needsUpdate=!0,{beforeDraw(b){h.uNativePhoto.value=t&&b.getRenderTarget()===null},setProjectAtlas(b){f||(h.uProjectAtlas.value=b,b||(h.uProjectCount.value=0))},updateProjects(b){if(f)return;const E=b.points.filter(j=>Number.isInteger(Jt[j.slug])),R=h.uProjectAtlas.value?Math.min(E.length,M.capacity):0;h.uProjectCount.value=R;for(let j=0;j<R;j++){const F=E[j],C=F.angle*Math.PI/180;m[j].set(F.x,F.y,F.size,Math.max(0,Math.min(1,F.opacity))),y[j].set(Math.cos(C),Math.sin(C),F.tailLength,Math.max(0,Math.min(1,F.labelOpacity))),x[j]=Jt[F.slug]}},updateTwinkles(b){var j;const E=h.uPhotoStarCount.value;h.uPhotoStarCount.value=f?0:Math.min(b.length,$.capacity);let R=E!==h.uPhotoStarCount.value;for(let F=0;F<h.uPhotoStarCount.value;F++){const C=b[F],P=c[F];(P.x!==C.u||P.y!==C.v||P.z!==C.radiusPx)&&(R=!0),P.set(C.u,C.v,C.radiusPx,C.amplitude),T[F].fromArray(((j=C.overlay)==null?void 0:j.color)??[1,1,1])}!f&&R&&(Wo(g,b.slice(0,h.uPhotoStarCount.value),qe.source.width,qe.source.height,$.supportSigma),S.needsUpdate=!0)},update(b,E,R,j){if(f)return;l.set(Math.max(E,1),Math.max(R,1),j);const F=Math.min(b.streaks.length,ve);h.uSkyCount.value=F;for(let C=0;C<F;C++){const P=b.streaks[C],V=P.angle*Math.PI/180;d[C].set(P.x,P.y,P.length,Math.max(0,P.opacity)),w[C].set(Math.cos(V),Math.sin(V),P.width,0)}},dispose(){f||(f=!0,h.uSkyCount.value=0,h.uProjectCount.value=0,h.uProjectAtlas.value=null,h.uPhotoStarCount.value=0,S.dispose(),r.onBeforeCompile===D&&(r.onBeforeCompile=i),r.customProgramCacheKey===A&&(r.customProgramCacheKey=s),r.needsUpdate=!0)}}}async function Xo(r,t,i,s){var T;const e=new wo({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),l=[];let d=!1,w=!1;const c=()=>{if(!d){d=!0;for(const g of l.reverse())g();e.dispose(),e.domElement.remove()}};try{e.setClearColor(592396,1),e.outputColorSpace=mt,e.toneMapping=bo,e.toneMappingExposure=o.lighting.exposure,e.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},e.domElement.setAttribute("aria-hidden","true"),r.appendChild(e.domElement);const g=new URLSearchParams(location.search),S=!(g.get("qa")==="1"&&g.has("opaque-photo"));r.dataset.photoPresentation=S?"native":"opaque-control";const m=Lo(e.getContext(),n=>$o("hero",n),g.get("perf")==="1"&&g.get("passes")==="1");l.push(()=>m.dispose());const y=new ut,x=new ko(-20,20,10,-10,.1,150);x.position.set(0,0,40);const h=r.closest(".gxc-hero")??r;let f,D,A,b;const E=new Promise((n,v)=>{A=n,b=v});l.push(zo(h,n=>{f=n,A(n),D==null||D(n)},()=>b(new Error("Background photograph could not load"))));const[R,j]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(n=>{if(!n.ok)throw new Error("Wordmark could not load");return n.json()}),E]);if(R.status==="rejected")throw R.reason;if(j.status==="rejected")throw j.reason;const F=R.value;f=f??j.value;const C=n=>{const v=new So(n.image);return v.colorSpace=mt,v.needsUpdate=!0,v};let P=C(f);l.push(()=>P.dispose());const V=new ht(1,1),I=new dt({map:P,color:o.lighting.backdropTint,toneMapped:!1});l.push(()=>V.dispose(),()=>I.dispose());const Q=new Ge(V,I);Q.position.z=-6,y.add(Q);const Z=Oo(I,S);Q.onBeforeRender=n=>Z.beforeDraw(n);let Oe=-1,Ne=-1,je=-1,ie,xt=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?r.dataset.projectAtlas="disabled":Go().then(n=>{if(d||w){n.dispose();return}ie=n,Z.setProjectAtlas(n),r.dataset.projectAtlas="ready",xt()}).catch(()=>{d||(r.dataset.projectAtlas="failed")}),l.push(()=>{Z.dispose(),ie==null||ie.dispose(),delete h.dataset.skyReady,delete h.dataset.projectSkyReady});const Ye=new ut;Ye.background=new pt(1118742);const yt=[],wt=new Mo(e);try{for(const v of o.lighting.panels){const k=new dt({color:new pt(v.color).multiplyScalar(v.strength),side:Po}),p=new Ge(new ht(...v.size),k);p.position.set(v.position[0],v.position[1],v.position[2]),p.lookAt(0,0,0),Ye.add(p),yt.push(p)}const n=wt.fromScene(Ye,.06);l.push(()=>n.dispose()),y.environment=n.texture}finally{for(const n of yt)n.geometry.dispose(),n.material.dispose();wt.dispose()}const He=new Co({color:o.glass.tint,metalness:0,roughness:o.glass.roughness,transmission:1,thickness:o.glass.thickness,ior:o.glass.ior,dispersion:o.glass.dispersion,envMapIntensity:o.glass.environment,clearcoat:o.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:o.glass.attenuation,attenuationDistance:50,side:Fo});l.push(()=>He.dispose()),He.onBeforeCompile=n=>{n.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:o.scattering.strength},n.fragmentShader=`uniform float gxcScatterStrength;
`+n.fragmentShader;const v=To.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${o.glass.starExposure.toFixed(1)}, material.transmission`);n.fragmentShader=n.fragmentShader.replace("#include <transmission_fragment>",v+`
        #if defined(USE_TRANSMISSION) && NUM_POINT_LIGHTS > 0
          // A faint material-space light diffusion approximation, confined to the glass.
          // Three's geometry and point lights share view space, including orthographic views.
          IncidentLight gxcScatterLight;
          getPointLightInfo(pointLights[0], geometryPosition, gxcScatterLight);
          float gxcFacing = saturate(dot(geometryNormal, geometryViewDir));
          float gxcWrapped = saturate((dot(geometryNormal, gxcScatterLight.direction) + ${o.scattering.wrap}) / ${(1+o.scattering.wrap).toFixed(2)});
          float gxcPath = 1. - exp(-${o.scattering.density} * material.thickness / max(gxcFacing, .3));
          float gxcShoulder = .3 + .7 * pow(1. - gxcFacing, 1.5);
          totalDiffuse += gxcScatterLight.color * pow(gxcWrapped, 1.5) * gxcPath * gxcShoulder * gxcScatterStrength;
        #endif
      `)};const O=new Do;l.push(()=>O.dispose()),O.setAttribute("position",new Ot(F.positions,3)),O.setAttribute("normal",new Ot(F.normals,3)),O.setIndex(F.indices),O.computeBoundingBox();const bt=O.boundingBox.getSize(new _),ao=O.boundingBox.getCenter(new _),Ue=new Ge(O,He),se=new jo;se.add(Ue),y.add(se);const kt=new Uo(15397631,o.lighting.point,90,2);y.add(kt);const St=new Bo(16777215,o.lighting.fill);St.position.set(-5,9,6),y.add(St);const Xe=new URLSearchParams(location.search),fe=matchMedia("(hover: hover) and (pointer: fine)"),Mt=Xe.has("no-postfx"),Ke=Xe.has("no-fluid"),Pt=Xe.has("no-flare");let a,N=!1,ne=!1,Qe=null,le=!e.extensions.has("EXT_color_buffer_float"),ce=!i,Be=!0,te=!0,ue=!1,Ze=!1,ge=0,xe=0,oe=o.rimLight.angle,Ae=o.rimLight.angle,ye=.07,we=-.07,ae=0,re=0,Y=0,H=0,Je=0,Ct=0,Ee=0,Re=-1,ro=0,be=0;xt=()=>{je=-1,te=!0,a==null||a.invalidateBackground(),Ce()};const Ft=new z,he=new z,Tt=new z,ke=new _,de=new _,Dt=new _,jt=new _,Ut=new Ao,Bt=new z,At=new Eo(new _(0,0,1),0),et=((T=r.parentElement)==null?void 0:T.parentElement)??r,J=(n=!1)=>{ge=0,xe=0,Ae=o.rimLight.angle,ue=!1,Re=-1,N=!1,Qe=null,n&&(ye=.07,we=-.07,oe=o.rimLight.angle,ae=0,re=0,a==null||a.reset(),be=0),te=!0,Ce()},Le=()=>{if(ce&&(fe.matches||N)&&!Mt&&!(Ke&&Pt)&&!le&&!a){const v=performance.now();try{a=new _o(e,S),a.setFlare(!Pt),a.setSize(Y||1,H||1,Je||1);const k=Yt(Y||1,H||1,f.width,f.height);a.setPhotograph(P,(Y||1)/k.width,(H||1)/k.height),it("heroPostAllocations"),Fe("heroPostCreateMs",performance.now()-v),Ht("hero-post-created",{input:N?"touch":"fine-pointer"})}catch{a==null||a.dispose(),a=void 0,le=!0}}e.domElement.dataset.postfx=a?"ready":le?"unsupported":"disabled"},Et=()=>!!a&&ce&&!Mt&&(fe.matches||N||a.active);l.push(()=>a==null?void 0:a.dispose());const $e=()=>{if(d||w)return;const n=r.getBoundingClientRect(),v=t.getBoundingClientRect(),k=n.width,p=n.height;if(!k||!p)return;Ee=n.left,Ct=n.top+window.scrollY;const U=Math.min(devicePixelRatio,k<700?o.glass.mobileDpr:o.glass.maxDpr);(k!==Y||p!==H||U!==Je)&&(e.setPixelRatio(U),e.setSize(k,p,!1),Y=k,H=p,Je=U,a==null||a.setSize(k,p,U));const B=26,X=B*k/p;x.left=-X/2,x.right=X/2,x.top=B/2,x.bottom=-B/2,x.updateProjectionMatrix();const ee=k<700?22:80;se.scale.setScalar(Math.min((k-ee*2)/bt.x,v.height*.88/bt.y)*B/p),se.position.y=(p/2-(v.top-n.top+v.height/2))*B/p;const L=o.cameraMotion.overscan;Q.scale.set(X*L,B*L,1);const K=Yt(k,p,f.width,f.height);a==null||a.setPhotograph(P,k/K.width,p/K.height),P.repeat.set(k/K.width,p/K.height),P.repeat.multiplyScalar(L),P.offset.set((1-P.repeat.x)/2,(1-P.repeat.y)/2),Z.update(st(h),k,p,L),a==null||a.invalidateBackground(),tt(),Rt(),te=!0,Ce()},tt=()=>{se.rotation.set(ye,we,-.018),se.updateMatrixWorld(!0),ke.copy(ao).applyMatrix4(Ue.matrixWorld),kt.position.set(ke.x+Math.cos(oe)*o.rimLight.radius,ke.y+Math.sin(oe)*o.rimLight.radius,o.rimLight.z),x.position.set(ae,re,40),Dt.set(ae*o.cameraMotion.lookAtFactor,re*o.cameraMotion.lookAtFactor,0),x.lookAt(Dt),x.updateMatrixWorld(),x.getWorldDirection(jt),Q.position.copy(x.position).addScaledVector(jt,46),Q.quaternion.copy(x.quaternion),Q.updateMatrixWorld(!0)},Rt=(n=!0)=>{const v=O.boundingBox,k=new _;let p=1/0,U=1/0,B=-1/0,X=-1/0;for(const K of[v.min.x,v.max.x])for(const ze of[v.min.y,v.max.y])for(const Ve of[v.min.z,v.max.z]){k.set(K,ze,Ve).applyMatrix4(Ue.matrixWorld).project(x);const Me=(k.x+1)*Y/2,Pe=(1-k.y)*H/2;p=Math.min(p,Me),B=Math.max(B,Me),U=Math.min(U,Pe),X=Math.max(X,Pe)}const ee=18,L=JSON.stringify({left:p-ee,top:U-ee,width:B-p+ee*2,height:X-U+ee*2});n&&r.dataset.wordRect!==L&&(r.dataset.wordRect=L),r.dataset.touchRect!==L&&(r.dataset.touchRect=L)};D=n=>{if(d||w)return;const v=P;P=C(n),I.map=P,Z.updateTwinkles(n.fallback?[]:nt(h).points),e.domElement.dataset.photoSource=n.url,$e(),v.dispose()},e.domElement.dataset.photoSource=f.url;const Lt=n=>{const v=performance.now();be&&(Fe("heroFrameIntervalMs",v-be),(N||a!=null&&a.active)&&Fe("heroTouchFrameIntervalMs",v-be)),be=v;const k=st(h),p=nt(h),U=Xt(h);U.revision!==je&&(je=U.revision,Z.updateProjects(U),a==null||a.invalidateBackground()),p.revision!==Ne&&(Ne=p.revision,Z.updateTwinkles(f!=null&&f.fallback?[]:p.points),a==null||a.invalidateBackground()),k.revision!==Oe&&(Oe=k.revision,Z.update(k,Y,H,o.cameraMotion.overscan),a==null||a.invalidateBackground());const B=ft("hero").quality;e.transmissionResolutionScale=o.renderQuality[B].transmissionScale,a==null||a.setQuality(B),ne=Et(),m.begin();try{if(a&&ne)try{a.render(y,x,Ue,Q,n,ce&&!Ke,m.measure)}catch{a.dispose(),a=void 0,le=!0,ne=!1,e.domElement.dataset.postfx="failed",Ht("hero-post-failed"),e.setRenderTarget(null),e.render(y,x)}else e.render(y,x)}finally{m.end()}it(ne?"heroPostFrames":"heroBaseFrames"),Fe("heroDrawCpuMs",performance.now()-v),(N||a!=null&&a.active)&&(it("heroTouchFrames"),Fe("heroTouchDrawCpuMs",performance.now()-v)),e.domElement.dataset.postfx=le?"unsupported":ne?"enabled":a?"idle":"disabled",e.domElement.dataset.frames=String(++ro),h.dataset.skyReady!=="true"&&(h.dataset.skyReady="true"),ie&&U.points.length?h.dataset.projectSkyReady="true":delete h.dataset.projectSkyReady,e.domElement.dataset.skyCount=String(k.streaks.length),e.domElement.dataset.twinkleCount=String(p.points.length),e.domElement.dataset.projectCount=String(ie?U.points.length:0),e.domElement.dataset.fluid=a!=null&&a.active?"active":"rest",e.domElement.dataset.quality=B,(g.get("perf")==="1"||g.get("qa")==="1")&&(e.domElement.dataset.camera=`${ae.toFixed(4)},${re.toFixed(4)}`,e.domElement.dataset.rim=`${oe.toFixed(4)},${o.rimLight.radius.toFixed(4)}`,e.domElement.dataset.touchInteraction=String(N)),te=!1},$t=n=>{n.preventDefault(),w=!0,Be=!1,r.dataset.failed="context-lost",s(),c()},zt=()=>J(),Vt=()=>{document.hidden?J(!0):(te=!0,Ce())},It=()=>{J(!0),Le()},qt=()=>{Kt().pointer.glassTouch||J()};e.domElement.addEventListener("webglcontextlost",$t),et.addEventListener("pointerleave",qt),window.addEventListener("blur",zt),document.addEventListener("visibilitychange",Vt),fe.addEventListener("change",It),l.push(()=>{e.domElement.removeEventListener("webglcontextlost",$t),et.removeEventListener("pointerleave",qt),window.removeEventListener("blur",zt),document.removeEventListener("visibilitychange",Vt),fe.removeEventListener("change",It)});const ot=new ResizeObserver($e);ot.observe(r),ot.observe(t),l.push(()=>ot.disconnect()),l.push(Vo($e));const _t=new IntersectionObserver(n=>{Be=n[0].isIntersecting,J(!0)});if(_t.observe(et),l.push(()=>_t.disconnect()),$e(),Le(),tt(),await e.compileAsync(y,x),a)try{await a.warm()}catch{a.dispose(),a=void 0,le=!0,e.domElement.dataset.postfx="failed"}if(d||w)throw new Error("Glass context unavailable");Lt(1/60);let Se=!1;const io=Qt((n,v)=>{if(!Be||d||w||document.hidden||Ze)return!1;if(ft("hero").staticFallback)return r.dataset.failed="performance",s(),c(),!1;const k=Kt(),p=k.pointer,U=Ct-k.scrollY,B=ce&&p.kind==="touch"&&p.glassTouch&&p.pressed&&p.contacts===1,X=ce&&fe.matches&&p.kind!=="touch"&&p.inside&&p.x>=Ee&&p.x<=Ee+Y&&p.y>=U&&p.y<=U+H,ee=B||X;B!==N&&(N=B,Le()),B&&p.pointerId!==Qe&&(ue=!1,Re=-1,Qe=p.pointerId),ee?(he.set((p.x-Ee)/Y,1-(p.y-U)/H),ge=Nt.clamp(he.x*2-1,-1,1),xe=Nt.clamp(1-he.y*2,-1,1),Bt.set(ge,-xe),Ut.setFromCamera(Bt,x),At.constant=-ke.z,Ut.ray.intersectPlane(At,de)&&(de.sub(ke),Math.hypot(de.x,de.y)>26*o.rimLight.centerDeadZone&&(Ae=Math.atan2(de.y,de.x))),p.lastMoved!==Re&&(ue&&a&&!Ke&&(Tt.copy(he).sub(Ft),a.push(he,Tt)),Ft.copy(he),Re=p.lastMoved),ue=!0):ue&&J();const L=.07+xe*o.pointer.rotationX,K=-.07+ge*o.pointer.rotationY,ze=ge*o.cameraMotion.offsetX,Ve=-xe*o.cameraMotion.offsetY,Me=1-Math.exp(-o.pointer.damping*v),Pe=1-Math.exp(-(ue?o.cameraMotion.damping:o.cameraMotion.leaveDamping)*v);ye+=(L-ye)*Me,we+=(K-we)*Me,ae+=(ze-ae)*Pe,re+=(Ve-re)*Pe;const Gt=Math.atan2(Math.sin(Ae-oe),Math.cos(Ae-oe));oe+=Gt*(1-Math.exp(-o.rimLight.damping*v));const at=Math.abs(L-ye)+Math.abs(K-we)+Math.abs(Gt)+Math.abs(ze-ae)+Math.abs(Ve-re)>2e-4;return(te||at||a!=null&&a.active||ne!==Et())&&(tt(),at&&Rt(!1),Se=!0),at||!!(a!=null&&a.active)},"update"),so=Qt((n,v)=>!Be||d||w||document.hidden||Ze?(Se=!1,!1):((st(h).revision!==Oe||nt(h).revision!==Ne||Xt(h).revision!==je)&&(Se=!0),Se&&(Lt(v),Se=!1),!!(a!=null&&a.active)),"render");return l.push(io,so),{setMotion(n){d||w||(ce=n,J(!0),Le())},setSuspended(n){Ze=n,n?J(!0):(te=!0,Ce())},dispose:c}}catch(g){throw c(),g}}export{Xo as mountGlass};
