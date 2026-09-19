var xo=Object.defineProperty;var yo=(t,o,i)=>o in t?xo(t,o,{enumerable:!0,configurable:!0,writable:!0,value:i}):t[o]=i;var m=(t,o,i)=>yo(t,typeof o!="symbol"?o+"":o,i);import{R as it,a as rt,b as Jt,S as ro,c as gt,C as wo,M as Xe,P as xt,V as ne,d as yt,e as re,f as ht,g as nt,W as bo,L as At,H as Mo,h as ko,i as vt,j as So,k as Co,l as de,D as Po,U as Fo,N as Eo,m as To,O as so,n as no,F as lo,G as co,o as Rt,p as Do,B as uo,q as Lt,r as Ye,T as ho,s as Ao,A as Ro,t as Lo,u as Bo,v as Uo,w as jo,x as zo,y as $o}from"./three.module-DjL7ZNB5.js";import{v as s,g as Bt,h as Ut,p as Ct,a as He,s as Io,b as ie,c as pt,d as po,e as st,r as De,f as jt,i as zt,j as Vo,k as qo,l as _o,m as Pt,n as at,o as eo,q as Ft,t as Et,u as to}from"./version21-CzkI9xz1.js";const mo=`
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
`,Go=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,oo="#include <tonemapping_pars_fragment>",ue=(t=!1,o=0,i=rt)=>new bo(1,1,{type:Mo,minFilter:At,magFilter:At,format:i,depthBuffer:t,stencilBuffer:!1,samples:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1}),Wo=(t,o)=>o();function Tt(t,o,i=0){const l=t.getContext();if(!("getInternalformatParameter"in l)||!t.extensions.has("EXT_color_buffer_float"))return!1;const e=o===it?l.R16F:l.RG16F;if(i&&!Array.from(l.getInternalformatParameter(l.RENDERBUFFER,e,l.SAMPLES)).includes(i))return!1;const a=t.getRenderTarget(),d=ue(!1,i,o);try{return t.setRenderTarget(d),l.checkFramebufferStatus(l.FRAMEBUFFER)===l.FRAMEBUFFER_COMPLETE}catch{return!1}finally{t.setRenderTarget(a),d.dispose()}}const Oe=(t,o)=>new ro({vertexShader:Go,fragmentShader:t,uniforms:o,depthTest:!1,depthWrite:!1,toneMapped:!1});class Oo{constructor(o,i=!0){m(this,"quadScene",new gt);m(this,"quadCamera",new wo);m(this,"quad",new Xe(new xt(2,2)));m(this,"color",ue(!0,4));m(this,"mask");m(this,"background",ue());m(this,"flare",ue());m(this,"velocity");m(this,"velocitySwap");m(this,"pressure");m(this,"pressureSwap");m(this,"divergence");m(this,"texel",new ne(1,1));m(this,"pointer",new ne(-1,-1));m(this,"pointerFrom",new ne(-1,-1));m(this,"impulse",new ne);m(this,"pixel",new ne(1,1));m(this,"aspect",{value:1});m(this,"dt",{value:1/60});m(this,"maskMaterial",new yt({color:16777215,toneMapped:!1}));m(this,"advect");m(this,"diverge");m(this,"solve");m(this,"project");m(this,"star");m(this,"composite");m(this,"cachedBackdrop");m(this,"cacheViewport",new re);m(this,"maskWorld",new ht);m(this,"maskView",new ht);m(this,"maskProjection",new ht);m(this,"clipMatrix",new ht);m(this,"corner",new re);m(this,"flareBounds",new re);m(this,"previousFlareBounds",new re);m(this,"maskGeometry","");m(this,"maskGeometryVersion","");m(this,"maskVisible",!1);m(this,"maskDirty",!0);m(this,"quality","full");m(this,"energy",0);m(this,"stale",!0);m(this,"backgroundDirty",!0);m(this,"nextFlareAt",-1/0);m(this,"flareAllowed",!0);m(this,"disposed",!1);m(this,"width",1);m(this,"height",1);this.renderer=o,this.nativePhoto=i,this.quad.material.dispose();const l=Math.min(4,o.capabilities.maxSamples);this.color.samples=l;const e=Tt(o,it)?it:rt,a=Tt(o,Jt)?Jt:rt;this.mask=ue(!1,l,Tt(o,it,l)?it:rt),this.velocity=ue(!1,0,a),this.velocitySwap=ue(!1,0,a),this.pressure=ue(!1,0,e),this.pressureSwap=ue(!1,0,e),this.divergence=ue(!1,0,e),this.cachedBackdrop=new ro({vertexShader:"void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D uBackground; uniform vec4 uViewport; void main(){vec2 uv=(gl_FragCoord.xy-uViewport.xy)/uViewport.zw;gl_FragColor=texture2D(uBackground,uv);}",uniforms:{uBackground:{value:this.background.texture},uViewport:{value:this.cacheViewport}},toneMapped:!1}),this.cachedBackdrop.onBeforeRender=d=>{d.getCurrentViewport(this.cacheViewport).floor(),this.cachedBackdrop.uniformsNeedUpdate=!0},this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=Oe(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform float uDt, uAspect;
      uniform vec2 uPointer, uFrom, uImpulse;
      void main() {
        vec2 old = texture2D(uVelocity, vUv).xy;
        vec2 velocity = texture2D(uVelocity, clamp(vUv - old * uDt, .001, .999)).xy;
        velocity *= exp(-${s.fluid.dissipation.toFixed(2)} * uDt);
        // Splat along the actual pointer segment, avoiding disconnected dents on fast passes.
        vec2 metric=vec2(uAspect,1.);
        vec2 segment=(uPointer-uFrom)*metric;
        vec2 relative=(vUv-uFrom)*metric;
        float along=clamp(dot(relative,segment)/max(dot(segment,segment),.000001),0.,1.);
        vec2 d=relative-segment*along;
        float splat = exp(-dot(d,d) / ${(s.fluid.radius**2).toFixed(6)});
        velocity += uImpulse * splat * ${s.fluid.force.toFixed(2)};
        float speed = length(velocity*metric);
        if (speed > ${s.fluid.velocityLimit}) velocity *= ${s.fluid.velocityLimit} / speed;
        gl_FragColor = vec4(velocity, 0., 1.);
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=Oe(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=Oe(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=Oe(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=Oe(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${oo}
      vec3 bright(vec2 uv) {
        vec2 sampleUv=clamp(uv,0.,1.);
        float coverage=texture2D(uMask,sampleUv).r;
        // Zero coverage made the original result exactly zero. Test it before
        // HDR sampling and ACES: most ray taps cross sky or letter holes.
        // Contributing taps retain the original interpolation/tonemap order.
        if(coverage<=0.) return vec3(0.);
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,sampleUv).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${s.flare.threshold})/${1-s.flare.threshold},0.,1.),${s.flare.power.toFixed(1)});
        return c*b*coverage;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        // The eighth pair has (1 - 8/8)^2 = 0 weight, so it adds no light.
        for(int i=1;i<=7;i++) {
          float t=float(i)/8.; vec2 d=axis*uPixel*${s.flare.length.toFixed(1)}*t;
          float weight=pow(1.-t,2.);
          sum+=(bright(vUv+d)+bright(vUv-d))*weight;
        }
        return sum;
      }
      void main() {
        vec3 glow=ray(vec2(0.,1.))+ray(vec2(.8660254,.5))+ray(vec2(.8660254,-.5));
        gl_FragColor=vec4(glow*${(s.flare.intensity/5).toFixed(5)},1.);
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new ne(1,1)},toneMappingExposure:{value:s.lighting.exposure}}),this.composite=Oe(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform sampler2D uPhotograph;
      uniform vec4 uPhotoCover;
      uniform bool uNativePhoto;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${oo}
      ${mo}
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
          d=texture2D(uVelocity,vUv).xy*${s.fluid.displacement}*uFluid;
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
            vec2 redUv=uv-d*${s.fluid.chroma}, blueUv=uv+d*${s.fluid.chroma};
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:s.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:s.lighting.exposure},uNativePhoto:{value:i},uPhotograph:{value:null},uPhotoCover:{value:new re(1,1,0,0)}})}setSize(o,i,l){this.width=Math.max(1,Math.round(o*l)),this.height=Math.max(1,Math.round(i*l)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.maskDirty=!0,this.sizeFlare();const e=o/i,a=Math.round(s.fluid.resolution*Math.max(1,e)),d=Math.round(s.fluid.resolution*Math.max(1,1/e));for(const f of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])f.setSize(a,d);this.texel.set(1/a,1/d),this.aspect.value=e,this.pixel.set(1/o,1/i),this.composite.uniforms.uMaxDisplacement.value=Math.min(s.fluid.maxPixels,o*s.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/o,1/i),this.reset(),this.nextFlareAt=-1/0}setPhotograph(o,i,l){this.composite.uniforms.uPhotograph.value=o,this.composite.uniforms.uPhotoCover.value.set(i,l,(1-i)/2,(1-l)/2)}sizeFlare(){const o=s.renderQuality[this.quality].flareScale;this.flare.setSize(Math.ceil(this.width*o),Math.ceil(this.height*o)),this.previousFlareBounds.set(0,0,0,0),this.nextFlareAt=-1/0}setQuality(o){this.quality!==o&&(this.quality=o,this.sizeFlare())}setFlare(o){this.flareAllowed=o,this.composite.uniforms.uFlareEnabled.value=+o}invalidateBackground(){this.backgroundDirty=!0}async warm(){const o=this.renderer.getRenderTarget(),i=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.cachedBackdrop,this.color],[this.composite,null]];try{for(const[l,e]of i){if(this.disposed)return;this.quad.material=l,this.renderer.setRenderTarget(e),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(o)}}push(o,i){this.pointerFrom.copy(o).sub(i),this.pointer.copy(o),this.impulse.add(i).clampLength(0,s.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,i.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>s.fluid.settle||this.impulse.lengthSq()>1e-9}draw(o,i){this.quad.material=o,this.renderer.setRenderTarget(i),this.renderer.render(this.quadScene,this.quadCamera)}clear(o){this.renderer.setRenderTarget(o),this.renderer.clear()}needsMask(o,i){var c;o.updateWorldMatrix(!0,!1),i.updateWorldMatrix(!0,!1);const l=o.geometry.getAttribute("position"),a=`${(l&&("version"in l?l.version:l.data.version))??0}:${((c=o.geometry.index)==null?void 0:c.version)??0}`,d=o.geometry.uuid!==this.maskGeometry||a!==this.maskGeometryVersion;return d&&o.geometry.computeBoundingBox(),{changed:this.maskDirty||d||o.visible!==this.maskVisible||!this.maskWorld.equals(o.matrixWorld)||!this.maskView.equals(i.matrixWorldInverse)||!this.maskProjection.equals(i.projectionMatrix),version:a}}rememberMask(o,i,l){this.maskWorld.copy(o.matrixWorld),this.maskView.copy(i.matrixWorldInverse),this.maskProjection.copy(i.projectionMatrix),this.maskVisible=o.visible,this.maskGeometry=o.geometry.uuid,this.maskGeometryVersion=l,this.maskDirty=!1}drawFlare(o,i){const l=this.renderer,e=this.flareBounds;e.set(1,1,0,0);const a=o.geometry.boundingBox;if(a&&o.visible){this.clipMatrix.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse).multiply(o.matrixWorld);for(let p=0;p<8;p++){if(this.corner.set(p&1?a.max.x:a.min.x,p&2?a.max.y:a.min.y,p&4?a.max.z:a.min.z,1).applyMatrix4(this.clipMatrix),this.corner.w<=0){e.set(0,0,1,1);break}const x=this.corner.x/this.corner.w*.5+.5,w=this.corner.y/this.corner.w*.5+.5;e.x=Math.min(e.x,x),e.y=Math.min(e.y,w),e.z=Math.max(e.z,x),e.w=Math.max(e.w,w)}}const d=s.flare.length+s.fluid.maxPixels+4,f=d*this.pixel.x,c=d*this.pixel.y,D=e.clone(),M=this.previousFlareBounds;M.z>M.x&&M.w>M.y&&(e.x=Math.min(e.x,M.x),e.y=Math.min(e.y,M.y),e.z=Math.max(e.z,M.z),e.w=Math.max(e.w,M.w)),M.copy(D);const y=Math.max(0,Math.floor((e.x-f)*this.flare.width)),v=Math.max(0,Math.floor((e.y-c)*this.flare.height)),F=Math.min(this.flare.width,Math.ceil((e.z+f)*this.flare.width)),C=Math.min(this.flare.height,Math.ceil((e.w+c)*this.flare.height));if(this.flare.scissorTest=!1,l.setClearColor(0,1),this.clear(this.flare),F<=y||C<=v)return;const u=l.autoClear;try{this.flare.scissor.set(y,v,F-y,C-v),this.flare.scissorTest=!0,l.autoClear=!1,this.draw(this.star,this.flare)}finally{l.autoClear=u,this.flare.scissorTest=!1,this.flare.scissor.set(0,0,this.flare.width,this.flare.height)}}render(o,i,l,e,a,d,f=Wo){const c=this.renderer,D=c.getRenderTarget(),M=c.getClearColor(new nt),y=c.getClearAlpha(),v=l.material,F=e.material,C=e.visible,u=l.visible;try{f("fluid",()=>{if(c.setClearColor(0,1),(this.stale||!d&&this.active)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,d||(this.energy=0,this.impulse.set(0,0))),d&&this.active){this.dt.value=Math.min(a,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let P=0;P<s.fluid.pressureIterations;P++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-s.fluid.dissipation*a),this.impulse.set(0,0)}}),c.setClearColor(M,y),this.backgroundDirty&&f("background",()=>{l.visible=!1,c.setRenderTarget(this.background),c.render(o,i),l.visible=u,this.backgroundDirty=!1}),e.material=this.cachedBackdrop,f("color",()=>{c.setRenderTarget(this.color),c.render(o,i)});const p=this.needsMask(l,i);p.changed&&f("mask",()=>{l.material=this.maskMaterial,e.visible=!1,c.setClearColor(0,1),c.setRenderTarget(this.mask),c.render(o,i),l.material=v,e.visible=C,this.rememberMask(l,i,p.version)});const x=performance.now();this.flareAllowed&&x+.5>=this.nextFlareAt&&f("flare",()=>{this.drawFlare(l,i);const g=1e3/(Bt("hero").targetFps>60?s.flare.highRefreshFps:s.flare.standardFps),A=Number.isFinite(this.nextFlareAt)?Math.max(0,x-this.nextFlareAt)%g:0;this.nextFlareAt=x+g-A}),this.composite.uniforms.uVelocity.value=this.velocity.texture;const w=Math.min(1,this.energy/s.fluid.tailThreshold);this.composite.uniforms.uFluid.value=d&&this.active?w*w*(3-2*w):0,f("composite",()=>this.draw(this.composite,D))}finally{l.material=v,e.material=F,e.visible=C,l.visible=u,c.setClearColor(M,y),c.setRenderTarget(D)}}dispose(){if(!this.disposed){this.disposed=!0;for(const o of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])o.dispose();for(const o of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial,this.cachedBackdrop])o.dispose();this.quad.geometry.dispose()}}}const R={columns:4,rows:4,cell:304,padding:8,image:128,capacity:Ut.length,labelStart:Ut.length,labelImage:He.canvasSize*He.scale},ft=Ut,ao=Object.fromEntries(ft.map((t,o)=>[t,o]));let Dt;function io(t){return new Promise((o,i)=>{const l=new Image,e=window.setTimeout(()=>a(new Error(`Project mark timed out: ${t}`)),1e4),a=d=>{clearTimeout(e),l.onload=null,l.onerror=null,d?i(d):o(l)};l.onload=()=>a(),l.onerror=()=>a(new Error(`Project mark could not load: ${t}`)),l.src=`/v-next/project-marks/${t}`})}async function No(){Dt||(Dt=Promise.all([Promise.all(ft.map(o=>{const i=Ct[o];return io(i.file).catch(l=>{if(i.file===i.fallbackFile)throw l;return io(i.fallbackFile)})})),document.fonts.load(He.font,ft.map(o=>Ct[o].shortName).join(" "))]).then(([o])=>{const{columns:i,rows:l,cell:e,padding:a,image:d}=R,f=document.createElement("canvas");f.width=i*e,f.height=l*e;const c=f.getContext("2d");if(!c)throw new Error("Project atlas canvas is unavailable");return o.forEach((D,M)=>{const y=d/Math.max(D.naturalWidth,D.naturalHeight),v=D.naturalWidth*y,F=D.naturalHeight*y;c.drawImage(D,M%i*e+a+(d-v)/2,Math.floor(M/i)*e+a+(d-F)/2,v,F)}),ft.forEach((D,M)=>{const y=M+R.labelStart,v=He,F=v.canvasSize/2;c.save(),c.translate(y%i*e+a,Math.floor(y/i)*e+a),c.scale(v.scale,v.scale),c.font=v.font,"letterSpacing"in c&&(c.letterSpacing=`${v.letterSpacing}px`);const C=Ct[D].shortName,u=c.measureText(C),p=Math.min(v.maxWidth,Math.ceil(u.width)+v.paddingX*2);c.beginPath(),c.roundRect(F-p/2,F-v.height/2,p,v.height,v.radius),c.fillStyle=v.background,c.shadowColor="#0002",c.shadowBlur=8*v.scale,c.shadowOffsetY=2*v.scale,c.fill(),c.shadowColor="transparent",c.shadowBlur=0,c.shadowOffsetY=0,c.fillStyle=v.foreground,c.textAlign="center",c.textBaseline="alphabetic";const x=u.fontBoundingBoxAscent??u.actualBoundingBoxAscent,w=u.fontBoundingBoxDescent??u.actualBoundingBoxDescent;c.fillText(C,F,F+(x-w)/2,p-v.paddingX*2),c.restore()}),f}));const t=new ko(await Dt);return t.colorSpace=vt,t.minFilter=So,t.magFilter=At,t.wrapS=t.wrapT=Co,t.name="galaxci-project-marks-and-labels",t}const he={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},mt={width:he.columns*he.texelsPerCell,height:he.rows};function Yo(t,o,i,l,e){const{columns:a,rows:d,slots:f,texelsPerCell:c,overflow:D}=he;if(t.length!==a*d*c*4)throw new Error("Incorrect star index buffer size");if(o.length>=D)throw new Error("Star index supports at most 254 points");t.fill(0);let M=0,y=0;for(let v=0;v<o.length;v++){const F=o[v],C=F.radiusPx*e;if(!Number.isFinite(F.u+F.v+C)||C<=0)continue;const u=C+.01,p=F.u-u/i,x=F.u+u/i,w=F.v-u/l,P=F.v+u/l;if(x<0||p>1||P<0||w>1)continue;const g=Math.max(0,Math.min(a-1,Math.floor(p*a))),A=Math.max(0,Math.min(a-1,Math.floor(x*a))),U=Math.max(0,Math.min(d-1,Math.floor(w*d))),E=Math.max(0,Math.min(d-1,Math.floor(P*d)));for(let T=U;T<=E;T++)for(let B=g;B<=A;B++){const N=(T*a+B)*c*4,Y=t[N];if(Y!==D){if(Y===f){t[N]=D,y++;continue}Y===0&&M++,t[N]=Y+1,t[N+Y+1]=v+1}}}return{occupiedCells:M,overflowCells:y}}const Ne=Io.capacity;function Xo(t,o=!0){const i=t.onBeforeCompile,l=t.customProgramCacheKey,e=l.call(t),a=new de(1,1,1),d=Array.from({length:Ne},()=>new re),f=Array.from({length:Ne},()=>new re(1,0,1,0)),c=Array.from({length:ie.capacity},()=>new re),D=Array.from({length:ie.capacity},()=>new de(1,1,1)),M=new Uint8Array(mt.width*mt.height*4),y=new Po(M,mt.width,mt.height,rt,Fo);y.minFilter=y.magFilter=Eo,y.generateMipmaps=!1,y.flipY=!1,y.colorSpace=To,y.needsUpdate=!0;const v=Array.from({length:R.capacity},()=>new re),F=Array.from({length:R.capacity},()=>new re),C=Array.from({length:R.capacity},()=>0),u={uNativePhoto:{value:!1},uSkyViewport:{value:a},uSkyCount:{value:0},uSkyHeads:{value:d},uSkyDirections:{value:f},uPhotoStarSize:{value:new ne(pt.source.width,pt.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:c},uPhotoStarColors:{value:D},uPhotoStarIndex:{value:y},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:v},uProjectCells:{value:C},uProjectTails:{value:F}};let p=!1;const x=function(P,g){i.call(t,P,g),Object.assign(P.uniforms,u),P.vertexShader=P.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),P.fragmentShader=P.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform bool uNativePhoto;
${mo}
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${Ne}];
uniform vec4 uSkyDirections[${Ne}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${ie.capacity}];
uniform vec3 uPhotoStarColors[${ie.capacity}];
uniform sampler2D uPhotoStarIndex;
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${R.capacity}];
uniform float uProjectCells[${R.capacity}];
uniform vec4 uProjectTails[${R.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${R.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${R.columns.toFixed(1)}), floor(cell / ${R.columns.toFixed(1)})) * ${R.cell.toFixed(1)};
    vec2 uv = (origin + ${R.padding.toFixed(1)} + local * ${R.image.toFixed(1)})
      / vec2(${(R.columns*R.cell).toFixed(1)}, ${(R.rows*R.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${He.offsetY.toFixed(1)})) / ${He.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${R.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${R.columns.toFixed(1)}), floor(labelCell / ${R.columns.toFixed(1)})) * ${R.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${R.padding.toFixed(1)} + labelLocal * ${R.labelImage.toFixed(1)})
      / vec2(${(R.columns*R.cell).toFixed(1)}, ${(R.rows*R.cell).toFixed(1)});
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
  ivec2 address = ivec2(cell.x * ${he.texelsPerCell} + slot / 4, cell.y);
  vec4 packedIndices = texelFetch(uPhotoStarIndex, address, 0);
  return int(floor(packedIndices[slot % 4] * 255.0 + 0.5));
}
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  // Lookup uses top-left original-photo UV, independent of viewport/DPR/crop.
  ivec2 cell = ivec2(clamp(floor(vec2(photoUv.x, 1.0 - photoUv.y)
    * vec2(${he.columns.toFixed(1)}, ${he.rows.toFixed(1)})), vec2(0.0),
    vec2(${(he.columns-1).toFixed(1)}, ${(he.rows-1).toFixed(1)})));
  int storedCount = photoStarIndexAt(cell, 0);
  bool overflow = storedCount == ${he.overflow};
  int count = overflow ? uPhotoStarCount : storedCount;
  if (count == 0) return light;
  for (int entry = 0; entry < ${ie.capacity}; entry++) {
    if (entry >= count) break;
    int i = overflow ? entry : photoStarIndexAt(cell, entry + 1) - 1;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${(ie.supportSigma**2).toFixed(1)}) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2*ie.haloSigma**2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${(ie.supportSigma**2).toFixed(1)}, q);
    float alpha = clamp(core * ${ie.coreOpacity.toFixed(4)} + halo * ${ie.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
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
  for (int i = 0; i < ${Ne}; i++) {
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
}`)},w=()=>`${e}:gxc-sky-backdrop-v11-native-photo`;return t.onBeforeCompile=x,t.customProgramCacheKey=w,t.needsUpdate=!0,{beforeDraw(P){u.uNativePhoto.value=o&&P.getRenderTarget()===null},setProjectAtlas(P){p||(u.uProjectAtlas.value=P,P||(u.uProjectCount.value=0))},updateProjects(P){if(p)return;const g=P.points.filter(U=>Number.isInteger(ao[U.slug])),A=u.uProjectAtlas.value?Math.min(g.length,R.capacity):0;u.uProjectCount.value=A;for(let U=0;U<A;U++){const E=g[U],T=E.angle*Math.PI/180;v[U].set(E.x,E.y,E.size,Math.max(0,Math.min(1,E.opacity))),F[U].set(Math.cos(T),Math.sin(T),E.tailLength,Math.max(0,Math.min(1,E.labelOpacity))),C[U]=ao[E.slug]}},updateTwinkles(P){var U;const g=u.uPhotoStarCount.value;u.uPhotoStarCount.value=p?0:Math.min(P.length,ie.capacity);let A=g!==u.uPhotoStarCount.value;for(let E=0;E<u.uPhotoStarCount.value;E++){const T=P[E],B=c[E];(B.x!==T.u||B.y!==T.v||B.z!==T.radiusPx)&&(A=!0),B.set(T.u,T.v,T.radiusPx,T.amplitude),D[E].fromArray(((U=T.overlay)==null?void 0:U.color)??[1,1,1])}!p&&A&&(Yo(M,P.slice(0,u.uPhotoStarCount.value),pt.source.width,pt.source.height,ie.supportSigma),y.needsUpdate=!0)},update(P,g,A,U){if(p)return;a.set(Math.max(g,1),Math.max(A,1),U);const E=Math.min(P.streaks.length,Ne);u.uSkyCount.value=E;for(let T=0;T<E;T++){const B=P.streaks[T],N=B.angle*Math.PI/180;d[T].set(B.x,B.y,B.length,Math.max(0,B.opacity)),f[T].set(Math.cos(N),Math.sin(N),B.width,0)}},dispose(){p||(p=!0,u.uSkyCount.value=0,u.uProjectCount.value=0,u.uProjectAtlas.value=null,u.uPhotoStarCount.value=0,y.dispose(),t.onBeforeCompile===x&&(t.onBeforeCompile=i),t.customProgramCacheKey===w&&(t.customProgramCacheKey=l),t.needsUpdate=!0)}}}function Ho(){const a=[],d=[];for(let c=0;c<96;c++){const D=c/96*Math.PI*2,M=Math.cos(D),y=Math.sin(D),v=D/2,F=Math.cos(v),C=Math.sin(v);for(let u=0;u<12;u++){const p=u/12*Math.PI*2,x=.7*Math.cos(p)*F-.17*Math.sin(p)*C,w=.7*Math.cos(p)*C+.17*Math.sin(p)*F;a.push((3.1+x)*M,(3.1+x)*y,w);const P=(u+1)%12,g=c===95?12/2:0,A=c*12+u,U=c*12+P,E=(c+1)%96*12+(u+g)%12,T=(c+1)%96*12+(P+g)%12;d.push(A,E,T,A,T,U)}}const f=new uo;return f.setAttribute("position",new Lt(a,3)),f.setIndex(d),f.computeVertexNormals(),f.computeBoundingSphere(),f}function Ko(t,o,i,l,e){const a=document.getElementById("gxc-entry-visual"),d=window,f=d.__gxcEntry;if(!a||!f||f.phase==="complete")return;const c=window.matchMedia("(prefers-reduced-motion: reduce)"),D=new URLSearchParams(location.search).get("qa")==="1",M=new gt;M.environment=l;const y=new so(-7,7,7,-7,.1,100);y.position.z=20;const v=new no({color:s.glass.tint,metalness:0,roughness:.025,transmission:1,thickness:.45,ior:s.glass.ior,dispersion:s.glass.dispersion,envMapIntensity:1.7,clearcoat:.65,toneMapped:!1,clearcoatRoughness:.035,attenuationColor:s.glass.attenuation,attenuationDistance:50,side:lo});v.onBeforeCompile=r=>{r.fragmentShader=r.fragmentShader.replace("#include <opaque_fragment>",`
      float entryRim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 5.0);
      outgoingLight += vec3(0.35, 0.44, 0.58) * entryRim * 0.16;
      #include <opaque_fragment>
    `)},v.customProgramCacheKey=()=>"entry-glass-rim-v1";const F=new Xe(Ho(),v),C=new co;C.add(F),M.add(C);const u=new Rt(15201279,160,0,2);u.position.set(-4,5,7);const p=new Rt(16770756,90,0,2);p.position.set(5,-2,4),M.add(u,p,new Do(15923199,7107976,1.25));const x=new yt({color:16777215,toneMapped:!1,depthWrite:!1});x.onBeforeCompile=r=>{r.vertexShader=r.vertexShader.replace("#include <uv_vertex>",`#include <uv_vertex>
#ifdef USE_MAP
vMapUv = uv;
#endif`)},x.customProgramCacheKey=()=>"entry-photo-cover-v1";const w=new Xe(new xt(1,1),x);w.position.z=-5,w.visible=!1,M.add(w);let P=null;w.onBeforeRender=()=>{const r=t.getRenderTarget();x.colorWrite=r!==null,r&&(P=r)};let g=!1,A,U,E=1,T=1,B=1,N=!0,Y=!0,Ae=1.5,q=0,_=0,pe=0,Se=0,X=!1,V=!1,Q=!1,ze=0,$e=0,me,j;const le=new Set,H=[],se=a.style.touchAction;a.style.touchAction="pinch-zoom",i.dataset.entryRing="true";const Ce=()=>!e&&!c.matches,Z=()=>{X||(Y=!0,De())},Re=()=>{if(!U)return;const r=jt(E,T,U.width,U.height);w.scale.set(r.width*B,r.height*B,1)},fe=()=>{if(X||!N)return;N=!1;const r=o.getBoundingClientRect(),k=a.getBoundingClientRect();!r.width||!r.height||!k.width||!k.height||(E=r.width,T=r.height,B=14/T,y.left=-E*B/2,y.right=E*B/2,y.top=7,y.bottom=-7,y.updateProjectionMatrix(),t.setPixelRatio(Math.min(devicePixelRatio||1,s.glass.maxDpr)),t.setSize(E,T,!1),C.position.set((k.left-r.left+k.width/2-E/2)*B,(T/2-(k.top-r.top+k.height/2))*B,0),C.scale.setScalar(Math.min(k.width/7.5,k.height/4.6)*B*.94),Re(),Y=!0)},Le=()=>{N=!0,Z()},lt=()=>{C.rotation.set(1.05+Se,pe,-.06),F.rotation.z=Ae,u.position.set(C.position.x-4+pe*12,C.position.y+5+Se*10,7),p.position.set(C.position.x+5,C.position.y-2,4),D&&(i.dataset.entryPose=[Ae,pe,Se].map(r=>r.toFixed(5)).join(","))},Pe=()=>{if(X||document.hidden)return;fe(),lt();const r=t.getRenderTarget(),k=t.getClearColor(new nt),z=t.getClearAlpha(),K=t.autoClear,ce=t.getViewport(new re),ee=t.getScissor(new re),O=t.getScissorTest();try{t.setRenderTarget(null),t.setViewport(0,0,E,T),t.setScissorTest(!1),t.autoClear=!0,t.setClearColor(0,0),t.render(M,y),Y=!1,$e++,D&&(i.dataset.entryFrames=String($e))}finally{t.setRenderTarget(r),t.setViewport(ce),t.setScissor(ee),t.setScissorTest(O),t.autoClear=K,t.setClearColor(k,z)}},G=()=>{q=0,_=0,Z()},ve=()=>{const r=j;j=void 0,r&&a.hasPointerCapture(r.id)&&a.releasePointerCapture(r.id)},Ie=r=>{if(!(!Ce()||V||le.size>1)){if(j&&j.id===r.pointerId){const k=Math.max(180,a.getBoundingClientRect().width);q=Ye.clamp(j.tx+(r.clientX-j.x)/k*.8,-.4,.4),_=Ye.clamp(j.ty+(r.clientY-j.y)/k*.6,-.3,.3)}else if(r.pointerType==="mouse"){const k=a.getBoundingClientRect();q=Ye.clamp((r.clientX-k.left)/k.width-.5,-.5,.5)*.55,_=Ye.clamp((r.clientY-k.top)/k.height-.5,-.5,.5)*.42}else return;Z()}},Ke=r=>{if(r.pointerType!=="mouse"&&le.add(r.pointerId),le.size>1){ve(),G();return}!Ce()||V||r.button!==0||(j={id:r.pointerId,x:r.clientX,y:r.clientY,tx:q,ty:_},a.setPointerCapture(r.pointerId),Z())},n=r=>{r.pointerType!=="mouse"&&(le.add(r.pointerId),le.size>1&&(ve(),G()))},W=r=>{le.delete(r.pointerId),(j==null?void 0:j.id)===r.pointerId&&(ve(),G())},ge=()=>{j||G()},Ve=()=>{j&&(j=void 0,G())},xe=()=>{le.clear(),ve(),G()},ye=r=>{if(!(!Ce()||V)){if(r.key==="ArrowLeft")q=Math.max(-.4,q-.12);else if(r.key==="ArrowRight")q=Math.min(.4,q+.12);else if(r.key==="ArrowUp")_=Math.max(-.3,_-.1);else if(r.key==="ArrowDown")_=Math.min(.3,_+.1);else if(r.key==="Home")q=0,_=0;else return;r.preventDefault(),Z()}};a.addEventListener("pointermove",Ie),a.addEventListener("pointerdown",Ke),a.addEventListener("pointerleave",ge),a.addEventListener("lostpointercapture",Ve),a.addEventListener("keydown",ye),a.addEventListener("blur",G),window.addEventListener("pointerdown",n,{capture:!0,passive:!0}),window.addEventListener("pointerup",W),window.addEventListener("pointercancel",W),window.addEventListener("blur",xe),H.push(()=>{ve(),a.style.touchAction=se,a.removeEventListener("pointermove",Ie),a.removeEventListener("pointerdown",Ke),a.removeEventListener("pointerleave",ge),a.removeEventListener("keydown",ye),a.removeEventListener("lostpointercapture",Ve),a.removeEventListener("blur",G),window.removeEventListener("pointerup",W),window.removeEventListener("pointercancel",W),window.removeEventListener("pointerdown",n,!0),window.removeEventListener("blur",xe)});const Be=new ResizeObserver(Le);Be.observe(o),Be.observe(a),H.push(()=>Be.disconnect(),po(Le)),c.addEventListener("change",Z),document.addEventListener("visibilitychange",Z),H.push(()=>{c.removeEventListener("change",Z),document.removeEventListener("visibilitychange",Z)}),H.push(st(()=>{fe()},"measure")),H.push(st((r,k)=>{if(X||document.hidden)return!1;if(Ce()&&!V){Ae+=.15*Math.min(.1,zt().elapsed||k);const z=1-Math.exp(-k/.13);pe+=(q-pe)*z,Se+=(_-Se)*z,Y=!0}return!1},"update")),H.push(st(()=>{if(X||document.hidden)return!1;if(Y)try{Pe()}catch{i.dataset.entryRingFailure="render",J()}return Ce()&&!V},"render"));const J=()=>{X||(X=!0,Fe.active=!1,window.clearTimeout(ze),H.splice(0).forEach(r=>r()),F.geometry.dispose(),v.dispose(),g&&(A==null||A.dispose()),w.geometry.dispose(),x.dispose(),P==null||P.dispose(),M.clear(),delete i.dataset.entryRing)},we=()=>{if(Q)return;Q=!0,J();const r=t.getRenderTarget(),k=t.getClearColor(new nt),z=t.getClearAlpha();t.setRenderTarget(null),t.setClearColor(0,0),t.clear(),t.setClearColor(k,z),t.setRenderTarget(r),me==null||me(),i.dataset.entryHandoff="in",t.domElement.dataset.entryHandoff="in",De()},qe=()=>{if(f.phase==="complete"){we();return}f.phase==="revealing"&&!V&&(V=!0,ve(),i.dataset.entryHandoff="out",t.domElement.dataset.entryHandoff="out",ze=window.setTimeout(we,c.matches?0:300))},Fe={active:!0,refresh:Le,redraw:Pe,dispose:J,setOnHandoff(r){me=r,Q&&r()},setPhoto(r,k){if(X)return;const z=g?A:void 0;U=r,g=!k,A=k??new ho(r.image),A.colorSpace=vt,A.needsUpdate=!0,A.anisotropy=Math.min(8,t.capabilities.getMaxAnisotropy()),x.map=A,x.needsUpdate=!0,w.visible=!0,Re(),z==null||z.dispose(),Z()}};if(D){const r=()=>{Pe();const k=t.domElement.getBoundingClientRect(),z=a.getBoundingClientRect(),K=t.domElement,ce=K.width/k.width,ee=K.height/k.height,O=12,te=Math.max(0,Math.floor((z.left-k.left-O)*ce)),oe=Math.max(0,Math.floor((z.top-k.top-O)*ee)),Ue=Math.min(K.width-te,Math.ceil((z.width+O*2)*ce)),_e=Math.min(K.height-oe,Math.ceil((z.height+O*2)*ee)),be=document.createElement("canvas");be.width=Ue,be.height=_e;const je=be.getContext("2d");if(!je)throw new Error("Entry capture is unavailable");return je.drawImage(K,te,oe,Ue,_e,0,0,Ue,_e),be.toDataURL("image/webp",.92)};d.__gxcCaptureEntryRing=r,H.push(()=>{d.__gxcCaptureEntryRing===r&&delete d.__gxcCaptureEntryRing})}H.push(f.subscribe(qe));try{Le(),Pe(),qe()}catch(r){throw J(),r}return Fe}function Qo(t){const o=new gt;o.background=new nt(1118742);const i=[],l=new $o(t);try{for(const e of s.lighting.panels){const a=new yt({color:new nt(e.color).multiplyScalar(e.strength),side:zo}),d=new Xe(new xt(...e.size),a);d.position.set(e.position[0],e.position[1],e.position[2]),d.lookAt(0,0,0),o.add(d),i.push(d)}return l.fromScene(o,.06)}finally{for(const e of i)e.geometry.dispose(),e.material.dispose();l.dispose()}}async function ta(t,o,i,l){var D;const e=new Ao({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),a=[];let d=!1,f=!1;const c=()=>{if(!d){d=!0;for(const M of a.reverse())M();e.dispose(),e.domElement.remove()}};try{e.setClearColor(592396,1),e.outputColorSpace=vt,e.toneMapping=Ro,e.toneMappingExposure=s.lighting.exposure,e.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},e.domElement.setAttribute("aria-hidden","true"),t.appendChild(e.domElement);const M=h=>{h.preventDefault(),f=!0,t.dataset.failed="context-lost",l(),c()};e.domElement.addEventListener("webglcontextlost",M),a.push(()=>e.domElement.removeEventListener("webglcontextlost",M));const y=new URLSearchParams(location.search),v=!(y.get("qa")==="1"&&y.has("opaque-photo"));t.dataset.photoPresentation=v?"native":"opaque-control";const F=Vo(e.getContext(),h=>qo("hero",h),y.get("perf")==="1"&&y.get("passes")==="1");a.push(()=>F.dispose());const C=new gt,u=new so(-20,20,10,-10,.1,150);u.position.set(0,0,40);const p=t.closest(".gxc-hero")??t;let x,w;const P=h=>{const S=new ho(h.image);return S.colorSpace=vt,S.anisotropy=Math.min(8,e.capabilities.getMaxAnisotropy()),S.needsUpdate=!0,S};a.push(()=>w==null?void 0:w.dispose());let g,A,U,E;const T=new Promise((h,S)=>{U=h,E=S});a.push(()=>E(new Error("Glass initialization cancelled"))),a.push(_o(p,h=>{if(d||f)return;if((x==null?void 0:x.image)===h.image&&x.url===h.url&&w){U(h);return}const S=w;w=P(h),x=h,g==null||g.setPhoto(h,w),A==null||A(h,w),S==null||S.dispose(),U(h)},()=>E(new Error("Background photograph could not load"))));const B=new AbortController;a.push(()=>B.abort());const N=fetch("/v-next/galaxci-inflated-mesh.json",{signal:B.signal}).then(h=>{if(!h.ok)throw new Error("Wordmark could not load");return h.json()}),Y=Promise.allSettled([N,T]),Ae=Qo(e);a.push(()=>Ae.dispose()),C.environment=Ae.texture;try{g=Ko(e,p,t,Ae.texture,i)}catch{t.dataset.entryRingFailure="initialization"}a.push(()=>g==null?void 0:g.dispose()),x&&(g==null||g.setPhoto(x,w));const[q,_]=await Y;if(d||f)throw new Error("Glass context unavailable");if(q.status==="rejected")throw q.reason;if(_.status==="rejected")throw _.reason;const pe=q.value;x=x??_.value;const Se=new xt(1,1),X=new yt({map:w,color:s.lighting.backdropTint,toneMapped:!1});a.push(()=>Se.dispose(),()=>X.dispose());const V=new Xe(Se,X);V.position.z=-6,C.add(V);const Q=Xo(X,v);V.onBeforeRender=h=>Q.beforeDraw(h);let ze=-1,$e=-1,me=-1,j,le=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?t.dataset.projectAtlas="disabled":No().then(h=>{if(d||f){h.dispose();return}j=h,Q.setProjectAtlas(h),t.dataset.projectAtlas="ready",le()}).catch(()=>{d||(t.dataset.projectAtlas="failed")}),a.push(()=>{Q.dispose(),j==null||j.dispose(),delete p.dataset.skyReady,delete p.dataset.projectSkyReady});const H=new no({color:s.glass.tint,metalness:0,roughness:s.glass.roughness,transmission:1,thickness:s.glass.thickness,ior:s.glass.ior,dispersion:s.glass.dispersion,envMapIntensity:s.glass.environment,clearcoat:s.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:s.glass.attenuation,attenuationDistance:50,side:lo});a.push(()=>H.dispose()),H.onBeforeCompile=h=>{h.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:s.scattering.strength},h.fragmentShader=`uniform float gxcScatterStrength;
`+h.fragmentShader;const S=Lo.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${s.glass.starExposure.toFixed(1)}, material.transmission`);h.fragmentShader=h.fragmentShader.replace("#include <transmission_fragment>",S+`
        #if defined(USE_TRANSMISSION) && NUM_POINT_LIGHTS > 0
          // A faint material-space light diffusion approximation, confined to the glass.
          // Three's geometry and point lights share view space, including orthographic views.
          IncidentLight gxcScatterLight;
          getPointLightInfo(pointLights[0], geometryPosition, gxcScatterLight);
          float gxcFacing = saturate(dot(geometryNormal, geometryViewDir));
          float gxcWrapped = saturate((dot(geometryNormal, gxcScatterLight.direction) + ${s.scattering.wrap}) / ${(1+s.scattering.wrap).toFixed(2)});
          float gxcPath = 1. - exp(-${s.scattering.density} * material.thickness / max(gxcFacing, .3));
          float gxcShoulder = .3 + .7 * pow(1. - gxcFacing, 1.5);
          totalDiffuse += gxcScatterLight.color * pow(gxcWrapped, 1.5) * gxcPath * gxcShoulder * gxcScatterStrength;
        #endif
      `)};const se=new uo;a.push(()=>se.dispose()),se.setAttribute("position",new Lt(pe.positions,3)),se.setAttribute("normal",new Lt(pe.normals,3)),se.setIndex(pe.indices),se.computeBoundingBox();const Ce=se.boundingBox.getSize(new de),Z=se.boundingBox.getCenter(new de),Re=new Xe(se,H),fe=new co;fe.add(Re),C.add(fe);const Le=new Rt(15397631,s.lighting.point,90,2);C.add(Le);const lt=new Bo(16777215,s.lighting.fill);lt.position.set(-5,9,6),C.add(lt);const Pe=new URLSearchParams(location.search),G=matchMedia("(hover: hover) and (pointer: fine)"),ve=Pe.has("no-postfx"),Ie=Pe.has("no-fluid"),Ke=Pe.has("no-flare");let n,W=!1,ge=!1,Ve=null,xe=!e.extensions.has("EXT_color_buffer_float"),ye=!i,Be=!0,J=!0,we=!1,qe=!1,Fe=0,r=0,k=s.rimLight.angle,z=s.rimLight.angle,K=.07,ce=-.07,ee=0,O=0,te=0,oe=0,Ue=0,_e=0,be=0,je=-1,fo=0,Qe=0;le=()=>{me=-1,J=!0,n==null||n.invalidateBackground(),De()};const $t=new ne,Ge=new ne,It=new ne,Ze=new de,We=new de,Vt=new de,qt=new de,_t=new Uo,Gt=new ne,Wt=new jo(new de(0,0,1),0),wt=((D=t.parentElement)==null?void 0:D.parentElement)??t,Ee=(h=!1)=>{Fe=0,r=0,z=s.rimLight.angle,we=!1,je=-1,W=!1,Ve=null,h&&(K=.07,ce=-.07,k=s.rimLight.angle,ee=0,O=0,n==null||n.reset(),Qe=0),J=!0,De()},ct=()=>{if(ye&&(G.matches||W)&&!ve&&!(Ie&&Ke)&&!xe&&!n){const S=performance.now();try{n=new Oo(e,v),n.setFlare(!Ke),n.setSize(te||1,oe||1,Ue||1);const L=jt(te||1,oe||1,x.width,x.height);n.setPhotograph(w,(te||1)/L.width,(oe||1)/L.height),Pt("heroPostAllocations"),at("heroPostCreateMs",performance.now()-S),eo("hero-post-created",{input:W?"touch":"fine-pointer"})}catch{n==null||n.dispose(),n=void 0,xe=!0}}e.domElement.dataset.postfx=n?"ready":xe?"unsupported":"disabled"},Ot=()=>!!n&&ye&&!ve&&(G.matches||W||n.active);a.push(()=>n==null?void 0:n.dispose());const Je=()=>{if(d||f)return;const h=t.getBoundingClientRect(),S=o.getBoundingClientRect(),L=h.width,b=h.height;if(!L||!b)return;be=h.left,_e=h.top+window.scrollY;const $=Math.min(devicePixelRatio,L<700?s.glass.mobileDpr:s.glass.maxDpr);(L!==te||b!==oe||$!==Ue)&&(e.setPixelRatio($),e.setSize(L,b,!1),te=L,oe=b,Ue=$,n==null||n.setSize(L,b,$));const I=26,Me=I*L/b;u.left=-Me/2,u.right=Me/2,u.top=I/2,u.bottom=-I/2,u.updateProjectionMatrix();const Te=L<700?22:80;fe.scale.setScalar(Math.min((L-Te*2)/Ce.x,S.height*.88/Ce.y)*I/b),fe.position.y=(b/2-(S.top-h.top+S.height/2))*I/b;const ae=s.cameraMotion.overscan;V.scale.set(Me*ae,I*ae,1);const ke=jt(L,b,x.width,x.height);n==null||n.setPhotograph(w,L/ke.width,b/ke.height),w.repeat.set(L/ke.width,b/ke.height),w.repeat.multiplyScalar(ae),w.offset.set((1-w.repeat.x)/2,(1-w.repeat.y)/2),Q.update(Ft(p),L,b,ae),n==null||n.invalidateBackground(),bt(),Nt(),J=!0,De()},bt=()=>{fe.rotation.set(K,ce,-.018),fe.updateMatrixWorld(!0),Ze.copy(Z).applyMatrix4(Re.matrixWorld),Le.position.set(Ze.x+Math.cos(k)*s.rimLight.radius,Ze.y+Math.sin(k)*s.rimLight.radius,s.rimLight.z),u.position.set(ee,O,40),Vt.set(ee*s.cameraMotion.lookAtFactor,O*s.cameraMotion.lookAtFactor,0),u.lookAt(Vt),u.updateMatrixWorld(),u.getWorldDirection(qt),V.position.copy(u.position).addScaledVector(qt,46),V.quaternion.copy(u.quaternion),V.updateMatrixWorld(!0)},Nt=(h=!0)=>{const S=se.boundingBox,L=new de;let b=1/0,$=1/0,I=-1/0,Me=-1/0;for(const ke of[S.min.x,S.max.x])for(const ut of[S.min.y,S.max.y])for(const dt of[S.min.z,S.max.z]){L.set(ke,ut,dt).applyMatrix4(Re.matrixWorld).project(u);const tt=(L.x+1)*te/2,ot=(1-L.y)*oe/2;b=Math.min(b,tt),I=Math.max(I,tt),$=Math.min($,ot),Me=Math.max(Me,ot)}const Te=18,ae=JSON.stringify({left:b-Te,top:$-Te,width:I-b+Te*2,height:Me-$+Te*2});h&&t.dataset.wordRect!==ae&&(t.dataset.wordRect=ae),t.dataset.touchRect!==ae&&(t.dataset.touchRect=ae)};A=(h,S)=>{d||f||(X.map=S,Q.updateTwinkles(h.fallback?[]:Et(p).points),e.domElement.dataset.photoSource=h.url,Je())},e.domElement.dataset.photoSource=x.url;const Mt=h=>{e.setClearColor(592396,1);const S=performance.now();Qe&&(at("heroFrameIntervalMs",S-Qe),(W||n!=null&&n.active)&&at("heroTouchFrameIntervalMs",S-Qe)),Qe=S;const L=Ft(p),b=Et(p),$=to(p);$.revision!==me&&(me=$.revision,Q.updateProjects($),n==null||n.invalidateBackground()),b.revision!==$e&&($e=b.revision,Q.updateTwinkles(x!=null&&x.fallback?[]:b.points),n==null||n.invalidateBackground()),L.revision!==ze&&(ze=L.revision,Q.update(L,te,oe,s.cameraMotion.overscan),n==null||n.invalidateBackground());const I=Bt("hero").quality;e.transmissionResolutionScale=s.renderQuality[I].transmissionScale,n==null||n.setQuality(I),ge=Ot(),F.begin();try{if(n&&ge)try{n.render(C,u,Re,V,h,ye&&!Ie,F.measure)}catch{n.dispose(),n=void 0,xe=!0,ge=!1,e.domElement.dataset.postfx="failed",eo("hero-post-failed"),e.setRenderTarget(null),e.render(C,u)}else e.render(C,u)}finally{F.end()}Pt(ge?"heroPostFrames":"heroBaseFrames"),at("heroDrawCpuMs",performance.now()-S),(W||n!=null&&n.active)&&(Pt("heroTouchFrames"),at("heroTouchDrawCpuMs",performance.now()-S)),e.domElement.dataset.postfx=xe?"unsupported":ge?"enabled":n?"idle":"disabled",e.domElement.dataset.frames=String(++fo),p.dataset.skyReady!=="true"&&(p.dataset.skyReady="true"),j&&$.points.length?p.dataset.projectSkyReady="true":delete p.dataset.projectSkyReady,e.domElement.dataset.skyCount=String(L.streaks.length),e.domElement.dataset.twinkleCount=String(b.points.length),e.domElement.dataset.projectCount=String(j?$.points.length:0),e.domElement.dataset.fluid=n!=null&&n.active?"active":"rest",e.domElement.dataset.quality=I,(y.get("perf")==="1"||y.get("qa")==="1")&&(e.domElement.dataset.camera=`${ee.toFixed(4)},${O.toFixed(4)}`,e.domElement.dataset.rim=`${k.toFixed(4)},${s.rimLight.radius.toFixed(4)}`,e.domElement.dataset.touchInteraction=String(W)),J=!1},Yt=()=>Ee(),Xt=()=>{document.hidden?Ee(!0):(J=!0,De())},Ht=()=>{Ee(!0),ct()},Kt=()=>{zt().pointer.glassTouch||Ee()};wt.addEventListener("pointerleave",Kt),window.addEventListener("blur",Yt),document.addEventListener("visibilitychange",Xt),G.addEventListener("change",Ht),a.push(()=>{wt.removeEventListener("pointerleave",Kt),window.removeEventListener("blur",Yt),document.removeEventListener("visibilitychange",Xt),G.removeEventListener("change",Ht)});const kt=new ResizeObserver(Je);kt.observe(t),kt.observe(o),a.push(()=>kt.disconnect()),a.push(po(Je));const Qt=new IntersectionObserver(h=>{Be=h[0].isIntersecting,Ee(!0)});if(Qt.observe(wt),a.push(()=>Qt.disconnect()),Je(),ct(),bt(),await e.compileAsync(C,u),n)try{await n.warm()}catch{n.dispose(),n=void 0,xe=!0,e.domElement.dataset.postfx="failed"}if(d||f)throw new Error("Glass context unavailable");Mt(1/60),g==null||g.setOnHandoff(()=>{d||f||(Je(),Mt(1/60),De())}),g!=null&&g.active&&g.redraw();let et=!1;const vo=st((h,S)=>{if(g!=null&&g.active||!Be||d||f||document.hidden||qe)return!1;if(Bt("hero").staticFallback)return t.dataset.failed="performance",l(),c(),!1;const L=zt(),b=L.pointer,$=_e-L.scrollY,I=ye&&b.kind==="touch"&&b.glassTouch&&b.pressed&&b.contacts===1,Me=ye&&G.matches&&b.kind!=="touch"&&b.inside&&b.x>=be&&b.x<=be+te&&b.y>=$&&b.y<=$+oe,Te=I||Me;I!==W&&(W=I,ct()),I&&b.pointerId!==Ve&&(we=!1,je=-1,Ve=b.pointerId),Te?(Ge.set((b.x-be)/te,1-(b.y-$)/oe),Fe=Ye.clamp(Ge.x*2-1,-1,1),r=Ye.clamp(1-Ge.y*2,-1,1),Gt.set(Fe,-r),_t.setFromCamera(Gt,u),Wt.constant=-Ze.z,_t.ray.intersectPlane(Wt,We)&&(We.sub(Ze),Math.hypot(We.x,We.y)>26*s.rimLight.centerDeadZone&&(z=Math.atan2(We.y,We.x))),b.lastMoved!==je&&(we&&n&&!Ie&&(It.copy(Ge).sub($t),n.push(Ge,It)),$t.copy(Ge),je=b.lastMoved),we=!0):we&&Ee();const ae=.07+r*s.pointer.rotationX,ke=-.07+Fe*s.pointer.rotationY,ut=Fe*s.cameraMotion.offsetX,dt=-r*s.cameraMotion.offsetY,tt=1-Math.exp(-s.pointer.damping*S),ot=1-Math.exp(-(we?s.cameraMotion.damping:s.cameraMotion.leaveDamping)*S);K+=(ae-K)*tt,ce+=(ke-ce)*tt,ee+=(ut-ee)*ot,O+=(dt-O)*ot;const Zt=Math.atan2(Math.sin(z-k),Math.cos(z-k));k+=Zt*(1-Math.exp(-s.rimLight.damping*S));const St=Math.abs(ae-K)+Math.abs(ke-ce)+Math.abs(Zt)+Math.abs(ut-ee)+Math.abs(dt-O)>2e-4;return(J||St||n!=null&&n.active||ge!==Ot())&&(bt(),St&&Nt(!1),et=!0),St||!!(n!=null&&n.active)},"update"),go=st((h,S)=>g!=null&&g.active?!1:!Be||d||f||document.hidden||qe?(et=!1,!1):((Ft(p).revision!==ze||Et(p).revision!==$e||to(p).revision!==me)&&(et=!0),et&&(Mt(S),et=!1),!!(n!=null&&n.active)),"render");return a.push(vo,go),{setMotion(h){d||f||(ye=h,Ee(!0),ct())},setSuspended(h){qe=h,h?Ee(!0):(J=!0,De())},dispose:c}}catch(M){throw c(),M}}export{ta as mountGlass};
