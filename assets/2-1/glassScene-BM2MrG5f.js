var Nt=Object.defineProperty;var Yt=(o,t,i)=>t in o?Nt(o,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):o[t]=i;var u=(o,t,i)=>Yt(o,typeof t!="symbol"?t+"":t,i);import{R as ke,a as be,b as Ut,S as zt,c as et,C as Xt,M as Ee,P as tt,V,d as at,e as N,f as Be,g as ot,W as Ht,L as it,H as Kt,h as Qt,i as rt,j as Zt,k as Jt,l as I,D as ea,U as ta,N as aa,m as oa,n as ia,A as ra,O as sa,T as na,o as la,p as ca,q as ua,F as da,r as ha,B as pa,s as At,G as ma,t as va,u as fa,v as ga,w as xa}from"./three.module-Da7gi4-r.js";import{v as a,g as st,h as nt,p as He,a as ce,s as ya,b as R,c as Ue,d as wa,r as ka,e as ba,f as we,i as Sa,j as Ke,k as Qe,l as Et,m as Ma,n as Rt,o as Pa}from"./version21-BK2Hnb70.js";const Ca=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Lt="#include <tonemapping_pars_fragment>",z=(o=!1,t=0,i=be)=>new Ht(1,1,{type:Kt,minFilter:it,magFilter:it,format:i,depthBuffer:o,stencilBuffer:!1,samples:t,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1}),Fa=(o,t)=>t();function Ze(o,t,i=0){const s=o.getContext();if(!("getInternalformatParameter"in s)||!o.extensions.has("EXT_color_buffer_float"))return!1;const e=t===ke?s.R16F:s.RG16F;if(i&&!Array.from(s.getInternalformatParameter(s.RENDERBUFFER,e,s.SAMPLES)).includes(i))return!1;const c=o.getRenderTarget(),h=z(!1,i,t);try{return o.setRenderTarget(h),s.checkFramebufferStatus(s.FRAMEBUFFER)===s.FRAMEBUFFER_COMPLETE}catch{return!1}finally{o.setRenderTarget(c),h.dispose()}}const ne=(o,t)=>new zt({vertexShader:Ca,fragmentShader:o,uniforms:t,depthTest:!1,depthWrite:!1,toneMapped:!1});class Da{constructor(t){u(this,"quadScene",new et);u(this,"quadCamera",new Xt);u(this,"quad",new Ee(new tt(2,2)));u(this,"color",z(!0,4));u(this,"mask");u(this,"background",z());u(this,"flare",z());u(this,"velocity");u(this,"velocitySwap");u(this,"pressure");u(this,"pressureSwap");u(this,"divergence");u(this,"texel",new V(1,1));u(this,"pointer",new V(-1,-1));u(this,"pointerFrom",new V(-1,-1));u(this,"impulse",new V);u(this,"pixel",new V(1,1));u(this,"aspect",{value:1});u(this,"dt",{value:1/60});u(this,"maskMaterial",new at({color:16777215,toneMapped:!1}));u(this,"advect");u(this,"diverge");u(this,"solve");u(this,"project");u(this,"star");u(this,"composite");u(this,"cachedBackdrop");u(this,"cacheViewport",new N);u(this,"maskWorld",new Be);u(this,"maskView",new Be);u(this,"maskProjection",new Be);u(this,"clipMatrix",new Be);u(this,"corner",new N);u(this,"flareBounds",new N);u(this,"previousFlareBounds",new N);u(this,"maskGeometry","");u(this,"maskGeometryVersion","");u(this,"maskVisible",!1);u(this,"maskDirty",!0);u(this,"quality","full");u(this,"energy",0);u(this,"stale",!0);u(this,"backgroundDirty",!0);u(this,"nextFlareAt",-1/0);u(this,"flareAllowed",!0);u(this,"disposed",!1);u(this,"width",1);u(this,"height",1);this.renderer=t,this.quad.material.dispose();const i=Math.min(4,t.capabilities.maxSamples);this.color.samples=i;const s=Ze(t,ke)?ke:be,e=Ze(t,Ut)?Ut:be;this.mask=z(!1,i,Ze(t,ke,i)?ke:be),this.velocity=z(!1,0,e),this.velocitySwap=z(!1,0,e),this.pressure=z(!1,0,s),this.pressureSwap=z(!1,0,s),this.divergence=z(!1,0,s),this.cachedBackdrop=new zt({vertexShader:"void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D uBackground; uniform vec4 uViewport; void main(){vec2 uv=(gl_FragCoord.xy-uViewport.xy)/uViewport.zw;gl_FragColor=texture2D(uBackground,uv);}",uniforms:{uBackground:{value:this.background.texture},uViewport:{value:this.cacheViewport}},toneMapped:!1}),this.cachedBackdrop.onBeforeRender=c=>{c.getCurrentViewport(this.cacheViewport).floor(),this.cachedBackdrop.uniformsNeedUpdate=!0},this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=ne(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform float uDt, uAspect;
      uniform vec2 uPointer, uFrom, uImpulse;
      void main() {
        vec2 old = texture2D(uVelocity, vUv).xy;
        vec2 velocity = texture2D(uVelocity, clamp(vUv - old * uDt, .001, .999)).xy;
        velocity *= exp(-${a.fluid.dissipation.toFixed(2)} * uDt);
        // Splat along the actual pointer segment, avoiding disconnected dents on fast passes.
        vec2 metric=vec2(uAspect,1.);
        vec2 segment=(uPointer-uFrom)*metric;
        vec2 relative=(vUv-uFrom)*metric;
        float along=clamp(dot(relative,segment)/max(dot(segment,segment),.000001),0.,1.);
        vec2 d=relative-segment*along;
        float splat = exp(-dot(d,d) / ${(a.fluid.radius**2).toFixed(6)});
        velocity += uImpulse * splat * ${a.fluid.force.toFixed(2)};
        float speed = length(velocity*metric);
        if (speed > ${a.fluid.velocityLimit}) velocity *= ${a.fluid.velocityLimit} / speed;
        gl_FragColor = vec4(velocity, 0., 1.);
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=ne(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=ne(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=ne(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=ne(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${Lt}
      vec3 bright(vec2 uv) {
        vec2 sampleUv=clamp(uv,0.,1.);
        float coverage=texture2D(uMask,sampleUv).r;
        // Zero coverage made the original result exactly zero. Test it before
        // HDR sampling and ACES: most ray taps cross sky or letter holes.
        // Contributing taps retain the original interpolation/tonemap order.
        if(coverage<=0.) return vec3(0.);
        vec3 c=ACESFilmicToneMapping(texture2D(uColor,sampleUv).rgb);
        float l=dot(c,vec3(.2126,.7152,.0722));
        float b=pow(clamp((l-${a.flare.threshold})/${1-a.flare.threshold},0.,1.),${a.flare.power.toFixed(1)});
        return c*b*coverage;
      }
      vec3 ray(vec2 axis) {
        vec3 sum=vec3(0.);
        // The eighth pair has (1 - 8/8)^2 = 0 weight, so it adds no light.
        for(int i=1;i<=7;i++) {
          float t=float(i)/8.; vec2 d=axis*uPixel*${a.flare.length.toFixed(1)}*t;
          float weight=pow(1.-t,2.);
          sum+=(bright(vUv+d)+bright(vUv-d))*weight;
        }
        return sum;
      }
      void main() {
        vec3 glow=ray(vec2(0.,1.))+ray(vec2(.8660254,.5))+ray(vec2(.8660254,-.5));
        gl_FragColor=vec4(glow*${(a.flare.intensity/5).toFixed(5)},1.);
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new V(1,1)},toneMappingExposure:{value:a.lighting.exposure}}),this.composite=ne(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Lt}
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
          d=texture2D(uVelocity,vUv).xy*${a.fluid.displacement}*uFluid;
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
            vec2 redUv=uv-d*${a.fluid.chroma}, blueUv=uv+d*${a.fluid.chroma};
            float redMask=texture2D(uMask,redUv).r, blueMask=texture2D(uMask,blueUv).r;
            if(redMask>.2) glass.r=mix(glass.r,glassAt(redUv,redMask).r,smoothstep(.2,.95,redMask));
            if(blueMask>.2) glass.b=mix(glass.b,glassAt(blueUv,blueMask).b,smoothstep(.2,.95,blueMask));
          }
          if(uFlareEnabled>.5) glass+=texture2D(uFlare,uv).rgb;
          result=mix(bg,glass,coverage);
        }
        gl_FragColor=vec4(result,1.);
        #include <colorspace_fragment>
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:a.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:a.lighting.exposure}})}setSize(t,i,s){this.width=Math.max(1,Math.round(t*s)),this.height=Math.max(1,Math.round(i*s)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.maskDirty=!0,this.sizeFlare();const e=t/i,c=Math.round(a.fluid.resolution*Math.max(1,e)),h=Math.round(a.fluid.resolution*Math.max(1,1/e));for(const w of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])w.setSize(c,h);this.texel.set(1/c,1/h),this.aspect.value=e,this.pixel.set(1/t,1/i),this.composite.uniforms.uMaxDisplacement.value=Math.min(a.fluid.maxPixels,t*a.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/t,1/i),this.reset(),this.nextFlareAt=-1/0}sizeFlare(){const t=a.renderQuality[this.quality].flareScale;this.flare.setSize(Math.ceil(this.width*t),Math.ceil(this.height*t)),this.previousFlareBounds.set(0,0,0,0),this.nextFlareAt=-1/0}setQuality(t){this.quality!==t&&(this.quality=t,this.sizeFlare())}setFlare(t){this.flareAllowed=t,this.composite.uniforms.uFlareEnabled.value=+t}invalidateBackground(){this.backgroundDirty=!0}async warm(){const t=this.renderer.getRenderTarget(),i=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.cachedBackdrop,this.color],[this.composite,null]];try{for(const[s,e]of i){if(this.disposed)return;this.quad.material=s,this.renderer.setRenderTarget(e),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(t)}}push(t,i){this.pointerFrom.copy(t).sub(i),this.pointer.copy(t),this.impulse.add(i).clampLength(0,a.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,i.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>a.fluid.settle||this.impulse.lengthSq()>1e-9}draw(t,i){this.quad.material=t,this.renderer.setRenderTarget(i),this.renderer.render(this.quadScene,this.quadCamera)}clear(t){this.renderer.setRenderTarget(t),this.renderer.clear()}needsMask(t,i){var l;t.updateWorldMatrix(!0,!1),i.updateWorldMatrix(!0,!1);const s=t.geometry.getAttribute("position"),c=`${(s&&("version"in s?s.version:s.data.version))??0}:${((l=t.geometry.index)==null?void 0:l.version)??0}`,h=t.geometry.uuid!==this.maskGeometry||c!==this.maskGeometryVersion;return h&&t.geometry.computeBoundingBox(),{changed:this.maskDirty||h||t.visible!==this.maskVisible||!this.maskWorld.equals(t.matrixWorld)||!this.maskView.equals(i.matrixWorldInverse)||!this.maskProjection.equals(i.projectionMatrix),version:c}}rememberMask(t,i,s){this.maskWorld.copy(t.matrixWorld),this.maskView.copy(i.matrixWorldInverse),this.maskProjection.copy(i.projectionMatrix),this.maskVisible=t.visible,this.maskGeometry=t.geometry.uuid,this.maskGeometryVersion=s,this.maskDirty=!1}drawFlare(t,i){const s=this.renderer,e=this.flareBounds;e.set(1,1,0,0);const c=t.geometry.boundingBox;if(c&&t.visible){this.clipMatrix.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse).multiply(t.matrixWorld);for(let P=0;P<8;P++){if(this.corner.set(P&1?c.max.x:c.min.x,P&2?c.max.y:c.min.y,P&4?c.max.z:c.min.z,1).applyMatrix4(this.clipMatrix),this.corner.w<=0){e.set(0,0,1,1);break}const j=this.corner.x/this.corner.w*.5+.5,y=this.corner.y/this.corner.w*.5+.5;e.x=Math.min(e.x,j),e.y=Math.min(e.y,y),e.z=Math.max(e.z,j),e.w=Math.max(e.w,y)}}const h=a.flare.length+a.fluid.maxPixels+4,w=h*this.pixel.x,l=h*this.pixel.y,F=e.clone(),f=this.previousFlareBounds;f.z>f.x&&f.w>f.y&&(e.x=Math.min(e.x,f.x),e.y=Math.min(e.y,f.y),e.z=Math.max(e.z,f.z),e.w=Math.max(e.w,f.w)),f.copy(F);const M=Math.max(0,Math.floor((e.x-w)*this.flare.width)),p=Math.max(0,Math.floor((e.y-l)*this.flare.height)),m=Math.min(this.flare.width,Math.ceil((e.z+w)*this.flare.width)),d=Math.min(this.flare.height,Math.ceil((e.w+l)*this.flare.height));if(this.flare.scissorTest=!1,s.setClearColor(0,1),this.clear(this.flare),m<=M||d<=p)return;const x=s.autoClear;try{this.flare.scissor.set(M,p,m-M,d-p),this.flare.scissorTest=!0,s.autoClear=!1,this.draw(this.star,this.flare)}finally{s.autoClear=x,this.flare.scissorTest=!1,this.flare.scissor.set(0,0,this.flare.width,this.flare.height)}}render(t,i,s,e,c,h,w=Fa){const l=this.renderer,F=l.getRenderTarget(),f=l.getClearColor(new ot),M=l.getClearAlpha(),p=s.material,m=e.material,d=e.visible,x=s.visible;try{w("fluid",()=>{if(l.setClearColor(0,1),(this.stale||!h&&this.active)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,h||(this.energy=0,this.impulse.set(0,0))),h&&this.active){this.dt.value=Math.min(c,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let B=0;B<a.fluid.pressureIterations;B++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-a.fluid.dissipation*c),this.impulse.set(0,0)}}),l.setClearColor(f,M),this.backgroundDirty&&w("background",()=>{s.visible=!1,l.setRenderTarget(this.background),l.render(t,i),s.visible=x,this.backgroundDirty=!1}),e.material=this.cachedBackdrop,w("color",()=>{l.setRenderTarget(this.color),l.render(t,i)});const P=this.needsMask(s,i);P.changed&&w("mask",()=>{s.material=this.maskMaterial,e.visible=!1,l.setClearColor(0,1),l.setRenderTarget(this.mask),l.render(t,i),s.material=p,e.visible=d,this.rememberMask(s,i,P.version)});const j=performance.now();this.flareAllowed&&j+.5>=this.nextFlareAt&&w("flare",()=>{this.drawFlare(s,i);const U=1e3/(st("hero").targetFps>60?a.flare.highRefreshFps:a.flare.standardFps),T=Number.isFinite(this.nextFlareAt)?Math.max(0,j-this.nextFlareAt)%U:0;this.nextFlareAt=j+U-T}),this.composite.uniforms.uVelocity.value=this.velocity.texture;const y=Math.min(1,this.energy/a.fluid.tailThreshold);this.composite.uniforms.uFluid.value=h&&this.active?y*y*(3-2*y):0,w("composite",()=>this.draw(this.composite,F))}finally{s.material=p,e.material=m,e.visible=d,s.visible=x,l.setClearColor(f,M),l.setRenderTarget(F)}}dispose(){if(!this.disposed){this.disposed=!0;for(const t of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])t.dispose();for(const t of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial,this.cachedBackdrop])t.dispose();this.quad.geometry.dispose()}}}const k={columns:4,rows:4,cell:304,padding:8,image:128,capacity:nt.length,labelStart:nt.length,labelImage:ce.canvasSize*ce.scale},Re=nt,$t=Object.fromEntries(Re.map((o,t)=>[o,t]));let Je;function Vt(o){return new Promise((t,i)=>{const s=new Image,e=window.setTimeout(()=>c(new Error(`Project mark timed out: ${o}`)),1e4),c=h=>{clearTimeout(e),s.onload=null,s.onerror=null,h?i(h):t(s)};s.onload=()=>c(),s.onerror=()=>c(new Error(`Project mark could not load: ${o}`)),s.src=`/v-next/project-marks/${o}`})}async function Ta(){Je||(Je=Promise.all([Promise.all(Re.map(t=>{const i=He[t];return Vt(i.file).catch(s=>{if(i.file===i.fallbackFile)throw s;return Vt(i.fallbackFile)})})),document.fonts.load(ce.font,Re.map(t=>He[t].shortName).join(" "))]).then(([t])=>{const{columns:i,rows:s,cell:e,padding:c,image:h}=k,w=document.createElement("canvas");w.width=i*e,w.height=s*e;const l=w.getContext("2d");if(!l)throw new Error("Project atlas canvas is unavailable");return t.forEach((F,f)=>{const M=h/Math.max(F.naturalWidth,F.naturalHeight),p=F.naturalWidth*M,m=F.naturalHeight*M;l.drawImage(F,f%i*e+c+(h-p)/2,Math.floor(f/i)*e+c+(h-m)/2,p,m)}),Re.forEach((F,f)=>{const M=f+k.labelStart,p=ce,m=p.canvasSize/2;l.save(),l.translate(M%i*e+c,Math.floor(M/i)*e+c),l.scale(p.scale,p.scale),l.font=p.font,"letterSpacing"in l&&(l.letterSpacing=`${p.letterSpacing}px`);const d=He[F].shortName,x=l.measureText(d),P=Math.min(p.maxWidth,Math.ceil(x.width)+p.paddingX*2);l.beginPath(),l.roundRect(m-P/2,m-p.height/2,P,p.height,p.radius),l.fillStyle=p.background,l.shadowColor="#0002",l.shadowBlur=8*p.scale,l.shadowOffsetY=2*p.scale,l.fill(),l.shadowColor="transparent",l.shadowBlur=0,l.shadowOffsetY=0,l.fillStyle=p.foreground,l.textAlign="center",l.textBaseline="alphabetic";const j=x.fontBoundingBoxAscent??x.actualBoundingBoxAscent,y=x.fontBoundingBoxDescent??x.actualBoundingBoxDescent;l.fillText(d,m,m+(j-y)/2,P-p.paddingX*2),l.restore()}),w}));const o=new Qt(await Je);return o.colorSpace=rt,o.minFilter=Zt,o.magFilter=it,o.wrapS=o.wrapT=Jt,o.name="galaxci-project-marks-and-labels",o}const q={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},Ae={width:q.columns*q.texelsPerCell,height:q.rows};function ja(o,t,i,s,e){const{columns:c,rows:h,slots:w,texelsPerCell:l,overflow:F}=q;if(o.length!==c*h*l*4)throw new Error("Incorrect star index buffer size");if(t.length>=F)throw new Error("Star index supports at most 254 points");o.fill(0);let f=0,M=0;for(let p=0;p<t.length;p++){const m=t[p],d=m.radiusPx*e;if(!Number.isFinite(m.u+m.v+d)||d<=0)continue;const x=d+.01,P=m.u-x/i,j=m.u+x/i,y=m.v-x/s,B=m.v+x/s;if(j<0||P>1||B<0||y>1)continue;const U=Math.max(0,Math.min(c-1,Math.floor(P*c))),T=Math.max(0,Math.min(c-1,Math.floor(j*c))),C=Math.max(0,Math.min(h-1,Math.floor(y*h))),D=Math.max(0,Math.min(h-1,Math.floor(B*h)));for(let S=C;S<=D;S++)for(let _=U;_<=T;_++){const G=(S*c+_)*l*4,E=o[G];if(E!==F){if(E===w){o[G]=F,M++;continue}E===0&&f++,o[G]=E+1,o[G+E+1]=p+1}}}return{occupiedCells:f,overflowCells:M}}const le=ya.capacity;function Ba(o){const t=o.onBeforeCompile,i=o.customProgramCacheKey,s=i.call(o),e=new I(1,1,1),c=Array.from({length:le},()=>new N),h=Array.from({length:le},()=>new N(1,0,1,0)),w=Array.from({length:R.capacity},()=>new N),l=Array.from({length:R.capacity},()=>new I(1,1,1)),F=new Uint8Array(Ae.width*Ae.height*4),f=new ea(F,Ae.width,Ae.height,be,ta);f.minFilter=f.magFilter=aa,f.generateMipmaps=!1,f.flipY=!1,f.colorSpace=oa,f.needsUpdate=!0;const M=Array.from({length:k.capacity},()=>new N),p=Array.from({length:k.capacity},()=>new N),m=Array.from({length:k.capacity},()=>0),d={uSkyViewport:{value:e},uSkyCount:{value:0},uSkyHeads:{value:c},uSkyDirections:{value:h},uPhotoStarSize:{value:new V(Ue.source.width,Ue.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:w},uPhotoStarColors:{value:l},uPhotoStarIndex:{value:f},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:M},uProjectCells:{value:m},uProjectTails:{value:p}};let x=!1;const P=function(y,B){t.call(o,y,B),Object.assign(y.uniforms,d),y.vertexShader=y.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),y.fragmentShader=y.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${le}];
uniform vec4 uSkyDirections[${le}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${R.capacity}];
uniform vec3 uPhotoStarColors[${R.capacity}];
uniform sampler2D uPhotoStarIndex;
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${k.capacity}];
uniform float uProjectCells[${k.capacity}];
uniform vec4 uProjectTails[${k.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${k.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${k.columns.toFixed(1)}), floor(cell / ${k.columns.toFixed(1)})) * ${k.cell.toFixed(1)};
    vec2 uv = (origin + ${k.padding.toFixed(1)} + local * ${k.image.toFixed(1)})
      / vec2(${(k.columns*k.cell).toFixed(1)}, ${(k.rows*k.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${ce.offsetY.toFixed(1)})) / ${ce.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${k.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${k.columns.toFixed(1)}), floor(labelCell / ${k.columns.toFixed(1)})) * ${k.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${k.padding.toFixed(1)} + labelLocal * ${k.labelImage.toFixed(1)})
      / vec2(${(k.columns*k.cell).toFixed(1)}, ${(k.rows*k.cell).toFixed(1)});
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
  ivec2 address = ivec2(cell.x * ${q.texelsPerCell} + slot / 4, cell.y);
  vec4 packedIndices = texelFetch(uPhotoStarIndex, address, 0);
  return int(floor(packedIndices[slot % 4] * 255.0 + 0.5));
}
vec3 photoTwinkleLight(vec3 photoColor, vec2 photoUv) {
  vec3 light = vec3(0.0);
  #ifdef USE_MAP
  // Lookup uses top-left original-photo UV, independent of viewport/DPR/crop.
  ivec2 cell = ivec2(clamp(floor(vec2(photoUv.x, 1.0 - photoUv.y)
    * vec2(${q.columns.toFixed(1)}, ${q.rows.toFixed(1)})), vec2(0.0),
    vec2(${(q.columns-1).toFixed(1)}, ${(q.rows-1).toFixed(1)})));
  int storedCount = photoStarIndexAt(cell, 0);
  bool overflow = storedCount == ${q.overflow};
  int count = overflow ? uPhotoStarCount : storedCount;
  if (count == 0) return light;
  for (int entry = 0; entry < ${R.capacity}; entry++) {
    if (entry >= count) break;
    int i = overflow ? entry : photoStarIndexAt(cell, entry + 1) - 1;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${(R.supportSigma**2).toFixed(1)}) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2*R.haloSigma**2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${(R.supportSigma**2).toFixed(1)}, q);
    float alpha = clamp(core * ${R.coreOpacity.toFixed(4)} + halo * ${R.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
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
  for (int i = 0; i < ${le}; i++) {
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
#include <opaque_fragment>`)},j=()=>`${s}:gxc-sky-backdrop-v10-layered-stars`;return o.onBeforeCompile=P,o.customProgramCacheKey=j,o.needsUpdate=!0,{setProjectAtlas(y){x||(d.uProjectAtlas.value=y,y||(d.uProjectCount.value=0))},updateProjects(y){if(x)return;const B=y.points.filter(T=>Number.isInteger($t[T.slug])),U=d.uProjectAtlas.value?Math.min(B.length,k.capacity):0;d.uProjectCount.value=U;for(let T=0;T<U;T++){const C=B[T],D=C.angle*Math.PI/180;M[T].set(C.x,C.y,C.size,Math.max(0,Math.min(1,C.opacity))),p[T].set(Math.cos(D),Math.sin(D),C.tailLength,Math.max(0,Math.min(1,C.labelOpacity))),m[T]=$t[C.slug]}},updateTwinkles(y){var T;const B=d.uPhotoStarCount.value;d.uPhotoStarCount.value=x?0:Math.min(y.length,R.capacity);let U=B!==d.uPhotoStarCount.value;for(let C=0;C<d.uPhotoStarCount.value;C++){const D=y[C],S=w[C];(S.x!==D.u||S.y!==D.v||S.z!==D.radiusPx)&&(U=!0),S.set(D.u,D.v,D.radiusPx,D.amplitude),l[C].fromArray(((T=D.overlay)==null?void 0:T.color)??[1,1,1])}!x&&U&&(ja(F,y.slice(0,d.uPhotoStarCount.value),Ue.source.width,Ue.source.height,R.supportSigma),f.needsUpdate=!0)},update(y,B,U,T){if(x)return;e.set(Math.max(B,1),Math.max(U,1),T);const C=Math.min(y.streaks.length,le);d.uSkyCount.value=C;for(let D=0;D<C;D++){const S=y.streaks[D],_=S.angle*Math.PI/180;c[D].set(S.x,S.y,S.length,Math.max(0,S.opacity)),h[D].set(Math.cos(_),Math.sin(_),S.width,0)}},dispose(){x||(x=!0,d.uSkyCount.value=0,d.uProjectCount.value=0,d.uProjectAtlas.value=null,d.uPhotoStarCount.value=0,f.dispose(),o.onBeforeCompile===P&&(o.onBeforeCompile=t),o.customProgramCacheKey===j&&(o.customProgramCacheKey=i),o.needsUpdate=!0)}}}async function Ra(o,t,i,s){var F;const e=new ia({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),c=[];let h=!1,w=!1;const l=()=>{if(!h){h=!0;for(const f of c.reverse())f();e.dispose(),e.domElement.remove()}};try{e.setClearColor(592396,1),e.outputColorSpace=rt,e.toneMapping=ra,e.toneMappingExposure=a.lighting.exposure,e.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},e.domElement.setAttribute("aria-hidden","true"),o.appendChild(e.domElement);const f=new URLSearchParams(location.search),M=wa(e.getContext(),n=>ka("hero",n),f.get("perf")==="1"&&f.get("passes")==="1");c.push(()=>M.dispose());const p=new et,m=new sa(-20,20,10,-10,.1,150);m.position.set(0,0,40);const d=o.closest(".gxc-hero")??o;let x,P,j,y;const B=new Promise((n,g)=>{j=n,y=g});c.push(ba(d,n=>{x=n,j(n),P==null||P(n)},()=>y(new Error("Background photograph could not load"))));const[U,T]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(n=>{if(!n.ok)throw new Error("Wordmark could not load");return n.json()}),B]);if(U.status==="rejected")throw U.reason;if(T.status==="rejected")throw T.reason;const C=U.value;x=x??T.value;const D=n=>{const g=new na(n.image);return g.colorSpace=rt,g.needsUpdate=!0,g};let S=D(x);c.push(()=>S.dispose());const _=new tt(1,1),G=new at({map:S,color:a.lighting.backdropTint,toneMapped:!1});c.push(()=>_.dispose(),()=>G.dispose());const E=new Ee(_,G);E.position.z=-6,p.add(E);const Y=Ba(G);let Le=-1,$e=-1,Se=-1,J,lt=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?o.dataset.projectAtlas="disabled":Ta().then(n=>{if(h||w){n.dispose();return}J=n,Y.setProjectAtlas(n),o.dataset.projectAtlas="ready",lt()}).catch(()=>{h||(o.dataset.projectAtlas="failed")}),c.push(()=>{Y.dispose(),J==null||J.dispose(),delete d.dataset.skyReady,delete d.dataset.projectSkyReady});const Ve=new et;Ve.background=new ot(1118742);const ct=[],ut=new la(e);try{for(const g of a.lighting.panels){const b=new at({color:new ot(g.color).multiplyScalar(g.strength),side:ca}),v=new Ee(new tt(...g.size),b);v.position.set(g.position[0],g.position[1],g.position[2]),v.lookAt(0,0,0),Ve.add(v),ct.push(v)}const n=ut.fromScene(Ve,.06);c.push(()=>n.dispose()),p.environment=n.texture}finally{for(const n of ct)n.geometry.dispose(),n.material.dispose();ut.dispose()}const ze=new ua({color:a.glass.tint,metalness:0,roughness:a.glass.roughness,transmission:1,thickness:a.glass.thickness,ior:a.glass.ior,dispersion:a.glass.dispersion,envMapIntensity:a.glass.environment,clearcoat:a.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:a.glass.attenuation,attenuationDistance:50,side:da});c.push(()=>ze.dispose()),ze.onBeforeCompile=n=>{n.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:a.scattering.strength},n.fragmentShader=`uniform float gxcScatterStrength;
`+n.fragmentShader;const g=ha.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${a.glass.starExposure.toFixed(1)}, material.transmission`);n.fragmentShader=n.fragmentShader.replace("#include <transmission_fragment>",g+`
        #if defined(USE_TRANSMISSION) && NUM_POINT_LIGHTS > 0
          // A faint material-space light diffusion approximation, confined to the glass.
          // Three's geometry and point lights share view space, including orthographic views.
          IncidentLight gxcScatterLight;
          getPointLightInfo(pointLights[0], geometryPosition, gxcScatterLight);
          float gxcFacing = saturate(dot(geometryNormal, geometryViewDir));
          float gxcWrapped = saturate((dot(geometryNormal, gxcScatterLight.direction) + ${a.scattering.wrap}) / ${(1+a.scattering.wrap).toFixed(2)});
          float gxcPath = 1. - exp(-${a.scattering.density} * material.thickness / max(gxcFacing, .3));
          float gxcShoulder = .3 + .7 * pow(1. - gxcFacing, 1.5);
          totalDiffuse += gxcScatterLight.color * pow(gxcWrapped, 1.5) * gxcPath * gxcShoulder * gxcScatterStrength;
        #endif
      `)};const W=new pa;c.push(()=>W.dispose()),W.setAttribute("position",new At(C.positions,3)),W.setAttribute("normal",new At(C.normals,3)),W.setIndex(C.indices),W.computeBoundingBox();const dt=W.boundingBox.getSize(new I),It=W.boundingBox.getCenter(new I),Me=new Ee(W,ze),ee=new ma;ee.add(Me),p.add(ee);const ht=new va(15397631,a.lighting.point,90,2);p.add(ht);const pt=new fa(16777215,a.lighting.fill);pt.position.set(-5,9,6),p.add(pt);const Ie=new URLSearchParams(location.search),Pe=matchMedia("(hover: hover) and (pointer: fine)"),qt=Ie.has("no-postfx"),qe=Ie.has("no-fluid"),mt=Ie.has("no-flare");let r,ue=!e.extensions.has("EXT_color_buffer_float"),Ce=!i,Fe=!0,X=!0,de=!1,_e=!1,he=0,pe=0,te=a.rimLight.angle,De=a.rimLight.angle,me=.07,ve=-.07,ae=0,oe=0,H=0,K=0,Ge=0,vt=0,Te=0,We=-1,_t=0;lt=()=>{Se=-1,X=!0,r==null||r.invalidateBackground(),we()};const ft=new V,ie=new V,gt=new V,fe=new I,re=new I,xt=new I,yt=new I,wt=new ga,kt=new V,bt=new xa(new I(0,0,1),0),Oe=((F=o.parentElement)==null?void 0:F.parentElement)??o,Q=(n=!1)=>{he=0,pe=0,De=a.rimLight.angle,de=!1,We=-1,n&&(me=.07,ve=-.07,te=a.rimLight.angle,ae=0,oe=0,r==null||r.reset()),X=!0,we()},Ne=()=>{if(!(Ce&&Pe.matches&&!qt&&!(qe&&mt)&&!ue))r==null||r.dispose(),r=void 0;else if(!r)try{r=new Da(e),r.setFlare(!mt),r.setSize(H||1,K||1,Ge||1)}catch{r==null||r.dispose(),r=void 0,ue=!0}e.domElement.dataset.postfx=r?"enabled":ue?"unsupported":"disabled"};c.push(()=>r==null?void 0:r.dispose());const je=()=>{if(h||w)return;const n=o.getBoundingClientRect(),g=t.getBoundingClientRect(),b=n.width,v=n.height;if(!b||!v)return;Te=n.left,vt=n.top+window.scrollY;const A=Math.min(devicePixelRatio,b<700?a.glass.mobileDpr:a.glass.maxDpr);(b!==H||v!==K||A!==Ge)&&(e.setPixelRatio(A),e.setSize(b,v,!1),H=b,K=v,Ge=A,r==null||r.setSize(b,v,A));const L=26,$=L*b/v;m.left=-$/2,m.right=$/2,m.top=L/2,m.bottom=-L/2,m.updateProjectionMatrix();const se=b<700?22:80;ee.scale.setScalar(Math.min((b-se*2)/dt.x,g.height*.88/dt.y)*L/v),ee.position.y=(v/2-(g.top-n.top+g.height/2))*L/v;const O=a.cameraMotion.overscan;E.scale.set($*O,L*O,1);const Z=Sa(b,v,x.width,x.height);S.repeat.set(b/Z.width,v/Z.height),S.repeat.multiplyScalar(O),S.offset.set((1-S.repeat.x)/2,(1-S.repeat.y)/2),Y.update(Ke(d),b,v,O),r==null||r.invalidateBackground(),Ye(),Gt(),X=!0,we()},Ye=()=>{ee.rotation.set(me,ve,-.018),ee.updateMatrixWorld(!0),fe.copy(It).applyMatrix4(Me.matrixWorld),ht.position.set(fe.x+Math.cos(te)*a.rimLight.radius,fe.y+Math.sin(te)*a.rimLight.radius,a.rimLight.z),m.position.set(ae,oe,40),xt.set(ae*a.cameraMotion.lookAtFactor,oe*a.cameraMotion.lookAtFactor,0),m.lookAt(xt),m.updateMatrixWorld(),m.getWorldDirection(yt),E.position.copy(m.position).addScaledVector(yt,46),E.quaternion.copy(m.quaternion),E.updateMatrixWorld(!0)},Gt=()=>{const n=W.boundingBox,g=new I;let b=1/0,v=1/0,A=-1/0,L=-1/0;for(const se of[n.min.x,n.max.x])for(const O of[n.min.y,n.max.y])for(const Z of[n.min.z,n.max.z]){g.set(se,O,Z).applyMatrix4(Me.matrixWorld).project(m);const xe=(g.x+1)*H/2,ye=(1-g.y)*K/2;b=Math.min(b,xe),A=Math.max(A,xe),v=Math.min(v,ye),L=Math.max(L,ye)}const $=18;o.dataset.wordRect=JSON.stringify({left:b-$,top:v-$,width:A-b+$*2,height:L-v+$*2})};P=n=>{if(h||w)return;const g=S;S=D(n),G.map=S,Y.updateTwinkles(n.fallback?[]:Qe(d).points),e.domElement.dataset.photoSource=n.url,je(),g.dispose()},e.domElement.dataset.photoSource=x.url;const St=n=>{const g=Ke(d),b=Qe(d),v=Et(d);v.revision!==Se&&(Se=v.revision,Y.updateProjects(v),r==null||r.invalidateBackground()),b.revision!==$e&&($e=b.revision,Y.updateTwinkles(x!=null&&x.fallback?[]:b.points),r==null||r.invalidateBackground()),g.revision!==Le&&(Le=g.revision,Y.update(g,H,K,a.cameraMotion.overscan),r==null||r.invalidateBackground());const A=st("hero").quality;e.transmissionResolutionScale=a.renderQuality[A].transmissionScale,r==null||r.setQuality(A),M.begin();try{if(r)try{r.render(p,m,Me,E,n,Ce&&!qe,M.measure)}catch{r.dispose(),r=void 0,ue=!0,e.domElement.dataset.postfx="failed",e.setRenderTarget(null),e.render(p,m)}else e.render(p,m)}finally{M.end()}e.domElement.dataset.frames=String(++_t),d.dataset.skyReady!=="true"&&(d.dataset.skyReady="true"),J&&v.points.length?d.dataset.projectSkyReady="true":delete d.dataset.projectSkyReady,e.domElement.dataset.skyCount=String(g.streaks.length),e.domElement.dataset.twinkleCount=String(b.points.length),e.domElement.dataset.projectCount=String(J?v.points.length:0),e.domElement.dataset.fluid=r!=null&&r.active?"active":"rest",e.domElement.dataset.quality=A,X=!1},Mt=n=>{n.preventDefault(),w=!0,Fe=!1,o.dataset.failed="context-lost",s(),l()},Pt=()=>Q(),Ct=()=>{document.hidden?Q(!0):(X=!0,we())},Ft=()=>{Q(!0),Ne()},Dt=()=>Q();e.domElement.addEventListener("webglcontextlost",Mt),Oe.addEventListener("pointerleave",Dt),window.addEventListener("blur",Pt),document.addEventListener("visibilitychange",Ct),Pe.addEventListener("change",Ft),c.push(()=>{e.domElement.removeEventListener("webglcontextlost",Mt),Oe.removeEventListener("pointerleave",Dt),window.removeEventListener("blur",Pt),document.removeEventListener("visibilitychange",Ct),Pe.removeEventListener("change",Ft)});const Xe=new ResizeObserver(je);Xe.observe(o),Xe.observe(t),c.push(()=>Xe.disconnect()),c.push(Ma(je));const Tt=new IntersectionObserver(n=>{Fe=n[0].isIntersecting,Q(!0)});if(Tt.observe(Oe),c.push(()=>Tt.disconnect()),je(),Ne(),Ye(),await e.compileAsync(p,m),r)try{await r.warm()}catch{r.dispose(),r=void 0,ue=!0,e.domElement.dataset.postfx="failed"}if(h||w)throw new Error("Glass context unavailable");St(1/60);let ge=!1;const Wt=Rt((n,g)=>{if(!Fe||h||w||document.hidden||_e)return!1;if(st("hero").staticFallback)return o.dataset.failed="performance",s(),l(),!1;const b=Pa(),v=b.pointer,A=vt-b.scrollY;Ce&&Pe.matches&&v.kind!=="touch"&&v.inside&&v.x>=Te&&v.x<=Te+H&&v.y>=A&&v.y<=A+K?(ie.set((v.x-Te)/H,1-(v.y-A)/K),he=ie.x*2-1,pe=1-ie.y*2,kt.set(he,-pe),wt.setFromCamera(kt,m),bt.constant=-fe.z,wt.ray.intersectPlane(bt,re)&&(re.sub(fe),Math.hypot(re.x,re.y)>26*a.rimLight.centerDeadZone&&(De=Math.atan2(re.y,re.x))),v.lastMoved!==We&&(de&&r&&!qe&&(gt.copy(ie).sub(ft),r.push(ie,gt)),ft.copy(ie),We=v.lastMoved),de=!0):de&&Q();const $=.07+pe*a.pointer.rotationX,se=-.07+he*a.pointer.rotationY,O=he*a.cameraMotion.offsetX,Z=-pe*a.cameraMotion.offsetY,xe=1-Math.exp(-a.pointer.damping*g),ye=1-Math.exp(-(de?a.cameraMotion.damping:a.cameraMotion.leaveDamping)*g);me+=($-me)*xe,ve+=(se-ve)*xe,ae+=(O-ae)*ye,oe+=(Z-oe)*ye;const jt=Math.atan2(Math.sin(De-te),Math.cos(De-te));te+=jt*(1-Math.exp(-a.rimLight.damping*g));const Bt=Math.abs($-me)+Math.abs(se-ve)+Math.abs(jt)+Math.abs(O-ae)+Math.abs(Z-oe)>2e-4;return(X||Bt||r!=null&&r.active)&&(Ye(),ge=!0),Bt||!!(r!=null&&r.active)},"update"),Ot=Rt((n,g)=>!Fe||h||w||document.hidden||_e?(ge=!1,!1):((Ke(d).revision!==Le||Qe(d).revision!==$e||Et(d).revision!==Se)&&(ge=!0),ge&&(St(g),ge=!1),!!(r!=null&&r.active)),"render");return c.push(Wt,Ot),{setMotion(n){h||w||(Ce=n,Q(!0),Ne())},setSuspended(n){_e=n,n||(X=!0,we())},dispose:l}}catch(f){throw l(),f}}export{Ra as mountGlass};
