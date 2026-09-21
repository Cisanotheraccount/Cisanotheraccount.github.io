var ra=Object.defineProperty;var ia=(o,t,i)=>t in o?ra(o,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):o[t]=i;var u=(o,t,i)=>ia(o,typeof t!="symbol"?t+"":t,i);import{R as Ce,a as De,b as Gt,S as Jt,c as ct,C as sa,M as _e,P as ut,V,d as dt,e as Y,f as ze,g as ht,W as na,L as pt,H as la,h as ca,i as mt,j as ua,k as da,l as I,D as ha,U as pa,N as ma,m as va,n as fa,A as ga,O as xa,T as ya,o as wa,p as ka,q as Sa,F as ba,r as Ma,B as Pa,s as Wt,G as Fa,t as Ca,u as Da,v as Ta,w as ja,x as Ot}from"./three.module-D_0gVHEd.js";import{v as a,g as vt,h as ft,p as ot,a as me,s as Aa,b as $,c as Ie,d as Ba,r as Ua,e as Ea,f as Pe,i as rt,j as Fe,k as Nt,l as Ra,m as it,n as st,o as Yt,q as Xt,t as La,u as Ht}from"./version21-DX7qsg_e.js";const $a=`varying vec2 vUv;
void main() { vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`,Kt="#include <tonemapping_pars_fragment>",z=(o=!1,t=0,i=De)=>new na(1,1,{type:la,minFilter:pt,magFilter:pt,format:i,depthBuffer:o,stencilBuffer:!1,samples:t,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1}),Va=(o,t)=>t();function nt(o,t,i=0){const s=o.getContext();if(!("getInternalformatParameter"in s)||!o.extensions.has("EXT_color_buffer_float"))return!1;const e=t===Ce?s.R16F:s.RG16F;if(i&&!Array.from(s.getInternalformatParameter(s.RENDERBUFFER,e,s.SAMPLES)).includes(i))return!1;const c=o.getRenderTarget(),p=z(!1,i,t);try{return o.setRenderTarget(p),s.checkFramebufferStatus(s.FRAMEBUFFER)===s.FRAMEBUFFER_COMPLETE}catch{return!1}finally{o.setRenderTarget(c),p.dispose()}}const he=(o,t)=>new Jt({vertexShader:$a,fragmentShader:o,uniforms:t,depthTest:!1,depthWrite:!1,toneMapped:!1});class za{constructor(t){u(this,"quadScene",new ct);u(this,"quadCamera",new sa);u(this,"quad",new _e(new ut(2,2)));u(this,"color",z(!0,4));u(this,"mask");u(this,"background",z());u(this,"flare",z());u(this,"velocity");u(this,"velocitySwap");u(this,"pressure");u(this,"pressureSwap");u(this,"divergence");u(this,"texel",new V(1,1));u(this,"pointer",new V(-1,-1));u(this,"pointerFrom",new V(-1,-1));u(this,"impulse",new V);u(this,"pixel",new V(1,1));u(this,"aspect",{value:1});u(this,"dt",{value:1/60});u(this,"maskMaterial",new dt({color:16777215,toneMapped:!1}));u(this,"advect");u(this,"diverge");u(this,"solve");u(this,"project");u(this,"star");u(this,"composite");u(this,"cachedBackdrop");u(this,"cacheViewport",new Y);u(this,"maskWorld",new ze);u(this,"maskView",new ze);u(this,"maskProjection",new ze);u(this,"clipMatrix",new ze);u(this,"corner",new Y);u(this,"flareBounds",new Y);u(this,"previousFlareBounds",new Y);u(this,"maskGeometry","");u(this,"maskGeometryVersion","");u(this,"maskVisible",!1);u(this,"maskDirty",!0);u(this,"quality","full");u(this,"energy",0);u(this,"stale",!0);u(this,"backgroundDirty",!0);u(this,"nextFlareAt",-1/0);u(this,"flareAllowed",!0);u(this,"disposed",!1);u(this,"width",1);u(this,"height",1);this.renderer=t,this.quad.material.dispose();const i=Math.min(4,t.capabilities.maxSamples);this.color.samples=i;const s=nt(t,Ce)?Ce:De,e=nt(t,Gt)?Gt:De;this.mask=z(!1,i,nt(t,Ce,i)?Ce:De),this.velocity=z(!1,0,e),this.velocitySwap=z(!1,0,e),this.pressure=z(!1,0,s),this.pressureSwap=z(!1,0,s),this.divergence=z(!1,0,s),this.cachedBackdrop=new Jt({vertexShader:"void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform sampler2D uBackground; uniform vec4 uViewport; void main(){vec2 uv=(gl_FragCoord.xy-uViewport.xy)/uViewport.zw;gl_FragColor=texture2D(uBackground,uv);}",uniforms:{uBackground:{value:this.background.texture},uViewport:{value:this.cacheViewport}},toneMapped:!1}),this.cachedBackdrop.onBeforeRender=c=>{c.getCurrentViewport(this.cacheViewport).floor(),this.cachedBackdrop.uniformsNeedUpdate=!0},this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.advect=he(`
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
      }`,{uVelocity:{value:this.velocity.texture},uDt:this.dt,uAspect:this.aspect,uPointer:{value:this.pointer},uFrom:{value:this.pointerFrom},uImpulse:{value:this.impulse}}),this.diverge=he(`
      varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x;
        float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x;
        float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y;
        float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y;
        gl_FragColor=vec4(.5*(r-l+t-b),0.,0.,1.);
      }`,{uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.solve=he(`
      varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        float d=texture2D(uDivergence,vUv).r;
        gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uDivergence:{value:this.divergence.texture},uTexel:{value:this.texel}}),this.project=he(`
      varying vec2 vUv; uniform sampler2D uPressure,uVelocity; uniform vec2 uTexel;
      void main() {
        float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r;
        float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r;
        float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r;
        float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r;
        vec2 velocity=texture2D(uVelocity,vUv).xy-.5*vec2(r-l,t-b);
        gl_FragColor=vec4(velocity,0.,1.);
      }`,{uPressure:{value:this.pressure.texture},uVelocity:{value:this.velocitySwap.texture},uTexel:{value:this.texel}}),this.star=he(`
      varying vec2 vUv; uniform sampler2D uColor,uMask; uniform vec2 uPixel;
      ${Kt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uPixel:{value:new V(1,1)},toneMappingExposure:{value:a.lighting.exposure}}),this.composite=he(`
      varying vec2 vUv; uniform sampler2D uColor,uMask,uBackground,uFlare,uVelocity;
      uniform float uFluid,uFlareEnabled,uMaxDisplacement;
      uniform vec2 uPixel;
      ${Kt}
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
      }`,{uColor:{value:this.color.texture},uMask:{value:this.mask.texture},uBackground:{value:this.background.texture},uFlare:{value:this.flare.texture},uVelocity:{value:this.velocity.texture},uPixel:{value:this.pixel},uMaxDisplacement:{value:a.fluid.maxPixels},uFluid:{value:0},uFlareEnabled:{value:1},toneMappingExposure:{value:a.lighting.exposure}})}setSize(t,i,s){this.width=Math.max(1,Math.round(t*s)),this.height=Math.max(1,Math.round(i*s)),this.color.setSize(this.width,this.height),this.mask.setSize(this.width,this.height),this.background.setSize(this.width,this.height),this.backgroundDirty=!0,this.maskDirty=!0,this.sizeFlare();const e=t/i,c=Math.round(a.fluid.resolution*Math.max(1,e)),p=Math.round(a.fluid.resolution*Math.max(1,1/e));for(const w of[this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])w.setSize(c,p);this.texel.set(1/c,1/p),this.aspect.value=e,this.pixel.set(1/t,1/i),this.composite.uniforms.uMaxDisplacement.value=Math.min(a.fluid.maxPixels,t*a.fluid.widthRatio),this.star.uniforms.uPixel.value.set(1/t,1/i),this.reset(),this.nextFlareAt=-1/0}sizeFlare(){const t=a.renderQuality[this.quality].flareScale;this.flare.setSize(Math.ceil(this.width*t),Math.ceil(this.height*t)),this.previousFlareBounds.set(0,0,0,0),this.nextFlareAt=-1/0}setQuality(t){this.quality!==t&&(this.quality=t,this.sizeFlare())}setFlare(t){this.flareAllowed=t,this.composite.uniforms.uFlareEnabled.value=+t}invalidateBackground(){this.backgroundDirty=!0}async warm(){const t=this.renderer.getRenderTarget(),i=[[this.advect,this.velocitySwap],[this.diverge,this.divergence],[this.solve,this.pressureSwap],[this.project,this.velocity],[this.star,this.flare],[this.cachedBackdrop,this.color],[this.composite,null]];try{for(const[s,e]of i){if(this.disposed)return;this.quad.material=s,this.renderer.setRenderTarget(e),await this.renderer.compileAsync(this.quadScene,this.quadCamera)}}finally{this.renderer.setRenderTarget(t)}}push(t,i){this.pointerFrom.copy(t).sub(i),this.pointer.copy(t),this.impulse.add(i).clampLength(0,a.fluid.maxImpulse),this.energy=Math.max(this.energy,Math.min(.3,i.length()*8))}reset(){this.energy=0,this.impulse.set(0,0),this.pointer.set(-1,-1),this.stale=!0}get active(){return this.energy>a.fluid.settle||this.impulse.lengthSq()>1e-9}draw(t,i){this.quad.material=t,this.renderer.setRenderTarget(i),this.renderer.render(this.quadScene,this.quadCamera)}clear(t){this.renderer.setRenderTarget(t),this.renderer.clear()}needsMask(t,i){var n;t.updateWorldMatrix(!0,!1),i.updateWorldMatrix(!0,!1);const s=t.geometry.getAttribute("position"),c=`${(s&&("version"in s?s.version:s.data.version))??0}:${((n=t.geometry.index)==null?void 0:n.version)??0}`,p=t.geometry.uuid!==this.maskGeometry||c!==this.maskGeometryVersion;return p&&t.geometry.computeBoundingBox(),{changed:this.maskDirty||p||t.visible!==this.maskVisible||!this.maskWorld.equals(t.matrixWorld)||!this.maskView.equals(i.matrixWorldInverse)||!this.maskProjection.equals(i.projectionMatrix),version:c}}rememberMask(t,i,s){this.maskWorld.copy(t.matrixWorld),this.maskView.copy(i.matrixWorldInverse),this.maskProjection.copy(i.projectionMatrix),this.maskVisible=t.visible,this.maskGeometry=t.geometry.uuid,this.maskGeometryVersion=s,this.maskDirty=!1}drawFlare(t,i){const s=this.renderer,e=this.flareBounds;e.set(1,1,0,0);const c=t.geometry.boundingBox;if(c&&t.visible){this.clipMatrix.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse).multiply(t.matrixWorld);for(let P=0;P<8;P++){if(this.corner.set(P&1?c.max.x:c.min.x,P&2?c.max.y:c.min.y,P&4?c.max.z:c.min.z,1).applyMatrix4(this.clipMatrix),this.corner.w<=0){e.set(0,0,1,1);break}const B=this.corner.x/this.corner.w*.5+.5,y=this.corner.y/this.corner.w*.5+.5;e.x=Math.min(e.x,B),e.y=Math.min(e.y,y),e.z=Math.max(e.z,B),e.w=Math.max(e.w,y)}}const p=a.flare.length+a.fluid.maxPixels+4,w=p*this.pixel.x,n=p*this.pixel.y,C=e.clone(),g=this.previousFlareBounds;g.z>g.x&&g.w>g.y&&(e.x=Math.min(e.x,g.x),e.y=Math.min(e.y,g.y),e.z=Math.max(e.z,g.z),e.w=Math.max(e.w,g.w)),g.copy(C);const M=Math.max(0,Math.floor((e.x-w)*this.flare.width)),m=Math.max(0,Math.floor((e.y-n)*this.flare.height)),v=Math.min(this.flare.width,Math.ceil((e.z+w)*this.flare.width)),d=Math.min(this.flare.height,Math.ceil((e.w+n)*this.flare.height));if(this.flare.scissorTest=!1,s.setClearColor(0,1),this.clear(this.flare),v<=M||d<=m)return;const x=s.autoClear;try{this.flare.scissor.set(M,m,v-M,d-m),this.flare.scissorTest=!0,s.autoClear=!1,this.draw(this.star,this.flare)}finally{s.autoClear=x,this.flare.scissorTest=!1,this.flare.scissor.set(0,0,this.flare.width,this.flare.height)}}render(t,i,s,e,c,p,w=Va){const n=this.renderer,C=n.getRenderTarget(),g=n.getClearColor(new ht),M=n.getClearAlpha(),m=s.material,v=e.material,d=e.visible,x=s.visible;try{w("fluid",()=>{if(n.setClearColor(0,1),(this.stale||!p&&this.active)&&(this.clear(this.velocity),this.clear(this.velocitySwap),this.stale=!1,p||(this.energy=0,this.impulse.set(0,0))),p&&this.active){this.dt.value=Math.min(c,.05),this.advect.uniforms.uVelocity.value=this.velocity.texture,this.draw(this.advect,this.velocitySwap),this.diverge.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.diverge,this.divergence),this.clear(this.pressure);for(let U=0;U<a.fluid.pressureIterations;U++)this.solve.uniforms.uPressure.value=this.pressure.texture,this.draw(this.solve,this.pressureSwap),[this.pressure,this.pressureSwap]=[this.pressureSwap,this.pressure];this.project.uniforms.uPressure.value=this.pressure.texture,this.project.uniforms.uVelocity.value=this.velocitySwap.texture,this.draw(this.project,this.velocity),this.energy*=Math.exp(-a.fluid.dissipation*c),this.impulse.set(0,0)}}),n.setClearColor(g,M),this.backgroundDirty&&w("background",()=>{s.visible=!1,n.setRenderTarget(this.background),n.render(t,i),s.visible=x,this.backgroundDirty=!1}),e.material=this.cachedBackdrop,w("color",()=>{n.setRenderTarget(this.color),n.render(t,i)});const P=this.needsMask(s,i);P.changed&&w("mask",()=>{s.material=this.maskMaterial,e.visible=!1,n.setClearColor(0,1),n.setRenderTarget(this.mask),n.render(t,i),s.material=m,e.visible=d,this.rememberMask(s,i,P.version)});const B=performance.now();this.flareAllowed&&B+.5>=this.nextFlareAt&&w("flare",()=>{this.drawFlare(s,i);const E=1e3/(vt("hero").targetFps>60?a.flare.highRefreshFps:a.flare.standardFps),T=Number.isFinite(this.nextFlareAt)?Math.max(0,B-this.nextFlareAt)%E:0;this.nextFlareAt=B+E-T}),this.composite.uniforms.uVelocity.value=this.velocity.texture;const y=Math.min(1,this.energy/a.fluid.tailThreshold);this.composite.uniforms.uFluid.value=p&&this.active?y*y*(3-2*y):0,w("composite",()=>this.draw(this.composite,C))}finally{s.material=m,e.material=v,e.visible=d,s.visible=x,n.setClearColor(g,M),n.setRenderTarget(C)}}dispose(){if(!this.disposed){this.disposed=!0;for(const t of[this.color,this.mask,this.background,this.flare,this.velocity,this.velocitySwap,this.pressure,this.pressureSwap,this.divergence])t.dispose();for(const t of[this.advect,this.diverge,this.solve,this.project,this.star,this.composite,this.maskMaterial,this.cachedBackdrop])t.dispose();this.quad.geometry.dispose()}}}const k={columns:4,rows:4,cell:304,padding:8,image:128,capacity:ft.length,labelStart:ft.length,labelImage:me.canvasSize*me.scale},Ge=ft,Qt=Object.fromEntries(Ge.map((o,t)=>[o,t]));let lt;function Zt(o){return new Promise((t,i)=>{const s=new Image,e=window.setTimeout(()=>c(new Error(`Project mark timed out: ${o}`)),1e4),c=p=>{clearTimeout(e),s.onload=null,s.onerror=null,p?i(p):t(s)};s.onload=()=>c(),s.onerror=()=>c(new Error(`Project mark could not load: ${o}`)),s.src=`/v-next/project-marks/${o}`})}async function Ia(){lt||(lt=Promise.all([Promise.all(Ge.map(t=>{const i=ot[t];return Zt(i.file).catch(s=>{if(i.file===i.fallbackFile)throw s;return Zt(i.fallbackFile)})})),document.fonts.load(me.font,Ge.map(t=>ot[t].shortName).join(" "))]).then(([t])=>{const{columns:i,rows:s,cell:e,padding:c,image:p}=k,w=document.createElement("canvas");w.width=i*e,w.height=s*e;const n=w.getContext("2d");if(!n)throw new Error("Project atlas canvas is unavailable");return t.forEach((C,g)=>{const M=p/Math.max(C.naturalWidth,C.naturalHeight),m=C.naturalWidth*M,v=C.naturalHeight*M;n.drawImage(C,g%i*e+c+(p-m)/2,Math.floor(g/i)*e+c+(p-v)/2,m,v)}),Ge.forEach((C,g)=>{const M=g+k.labelStart,m=me,v=m.canvasSize/2;n.save(),n.translate(M%i*e+c,Math.floor(M/i)*e+c),n.scale(m.scale,m.scale),n.font=m.font,"letterSpacing"in n&&(n.letterSpacing=`${m.letterSpacing}px`);const d=ot[C].shortName,x=n.measureText(d),P=Math.min(m.maxWidth,Math.ceil(x.width)+m.paddingX*2);n.beginPath(),n.roundRect(v-P/2,v-m.height/2,P,m.height,m.radius),n.fillStyle=m.background,n.shadowColor="#0002",n.shadowBlur=8*m.scale,n.shadowOffsetY=2*m.scale,n.fill(),n.shadowColor="transparent",n.shadowBlur=0,n.shadowOffsetY=0,n.fillStyle=m.foreground,n.textAlign="center",n.textBaseline="alphabetic";const B=x.fontBoundingBoxAscent??x.actualBoundingBoxAscent,y=x.fontBoundingBoxDescent??x.actualBoundingBoxDescent;n.fillText(d,v,v+(B-y)/2,P-m.paddingX*2),n.restore()}),w}));const o=new ca(await lt);return o.colorSpace=mt,o.minFilter=ua,o.magFilter=pt,o.wrapS=o.wrapT=da,o.name="galaxci-project-marks-and-labels",o}const q={columns:64,rows:64,slots:16,texelsPerCell:5,overflow:255},qe={width:q.columns*q.texelsPerCell,height:q.rows};function qa(o,t,i,s,e){const{columns:c,rows:p,slots:w,texelsPerCell:n,overflow:C}=q;if(o.length!==c*p*n*4)throw new Error("Incorrect star index buffer size");if(t.length>=C)throw new Error("Star index supports at most 254 points");o.fill(0);let g=0,M=0;for(let m=0;m<t.length;m++){const v=t[m],d=v.radiusPx*e;if(!Number.isFinite(v.u+v.v+d)||d<=0)continue;const x=d+.01,P=v.u-x/i,B=v.u+x/i,y=v.v-x/s,U=v.v+x/s;if(B<0||P>1||U<0||y>1)continue;const E=Math.max(0,Math.min(c-1,Math.floor(P*c))),T=Math.max(0,Math.min(c-1,Math.floor(B*c))),F=Math.max(0,Math.min(p-1,Math.floor(y*p))),D=Math.max(0,Math.min(p-1,Math.floor(U*p)));for(let S=F;S<=D;S++)for(let _=E;_<=T;_++){const G=(S*c+_)*n*4,R=o[G];if(R!==C){if(R===w){o[G]=C,M++;continue}R===0&&g++,o[G]=R+1,o[G+R+1]=m+1}}}return{occupiedCells:g,overflowCells:M}}const pe=Aa.capacity;function _a(o){const t=o.onBeforeCompile,i=o.customProgramCacheKey,s=i.call(o),e=new I(1,1,1),c=Array.from({length:pe},()=>new Y),p=Array.from({length:pe},()=>new Y(1,0,1,0)),w=Array.from({length:$.capacity},()=>new Y),n=Array.from({length:$.capacity},()=>new I(1,1,1)),C=new Uint8Array(qe.width*qe.height*4),g=new ha(C,qe.width,qe.height,De,pa);g.minFilter=g.magFilter=ma,g.generateMipmaps=!1,g.flipY=!1,g.colorSpace=va,g.needsUpdate=!0;const M=Array.from({length:k.capacity},()=>new Y),m=Array.from({length:k.capacity},()=>new Y),v=Array.from({length:k.capacity},()=>0),d={uSkyViewport:{value:e},uSkyCount:{value:0},uSkyHeads:{value:c},uSkyDirections:{value:p},uPhotoStarSize:{value:new V(Ie.source.width,Ie.source.height)},uPhotoStarCount:{value:0},uPhotoStars:{value:w},uPhotoStarColors:{value:n},uPhotoStarIndex:{value:g},uProjectAtlas:{value:null},uProjectCount:{value:0},uProjects:{value:M},uProjectCells:{value:v},uProjectTails:{value:m}};let x=!1;const P=function(y,U){t.call(o,y,U),Object.assign(y.uniforms,d),y.vertexShader=y.vertexShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vSkyUv = uv;`),y.fragmentShader=y.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${pe}];
uniform vec4 uSkyDirections[${pe}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${$.capacity}];
uniform vec3 uPhotoStarColors[${$.capacity}];
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
    vec2 labelLocal = (offset - vec2(0.0, ${me.offsetY.toFixed(1)})) / ${me.canvasSize.toFixed(1)} + 0.5;
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
  for (int i = 0; i < ${pe}; i++) {
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
#include <opaque_fragment>`)},B=()=>`${s}:gxc-sky-backdrop-v10-layered-stars`;return o.onBeforeCompile=P,o.customProgramCacheKey=B,o.needsUpdate=!0,{setProjectAtlas(y){x||(d.uProjectAtlas.value=y,y||(d.uProjectCount.value=0))},updateProjects(y){if(x)return;const U=y.points.filter(T=>Number.isInteger(Qt[T.slug])),E=d.uProjectAtlas.value?Math.min(U.length,k.capacity):0;d.uProjectCount.value=E;for(let T=0;T<E;T++){const F=U[T],D=F.angle*Math.PI/180;M[T].set(F.x,F.y,F.size,Math.max(0,Math.min(1,F.opacity))),m[T].set(Math.cos(D),Math.sin(D),F.tailLength,Math.max(0,Math.min(1,F.labelOpacity))),v[T]=Qt[F.slug]}},updateTwinkles(y){var T;const U=d.uPhotoStarCount.value;d.uPhotoStarCount.value=x?0:Math.min(y.length,$.capacity);let E=U!==d.uPhotoStarCount.value;for(let F=0;F<d.uPhotoStarCount.value;F++){const D=y[F],S=w[F];(S.x!==D.u||S.y!==D.v||S.z!==D.radiusPx)&&(E=!0),S.set(D.u,D.v,D.radiusPx,D.amplitude),n[F].fromArray(((T=D.overlay)==null?void 0:T.color)??[1,1,1])}!x&&E&&(qa(C,y.slice(0,d.uPhotoStarCount.value),Ie.source.width,Ie.source.height,$.supportSigma),g.needsUpdate=!0)},update(y,U,E,T){if(x)return;e.set(Math.max(U,1),Math.max(E,1),T);const F=Math.min(y.streaks.length,pe);d.uSkyCount.value=F;for(let D=0;D<F;D++){const S=y.streaks[D],_=S.angle*Math.PI/180;c[D].set(S.x,S.y,S.length,Math.max(0,S.opacity)),p[D].set(Math.cos(_),Math.sin(_),S.width,0)}},dispose(){x||(x=!0,d.uSkyCount.value=0,d.uProjectCount.value=0,d.uProjectAtlas.value=null,d.uPhotoStarCount.value=0,g.dispose(),o.onBeforeCompile===P&&(o.onBeforeCompile=t),o.customProgramCacheKey===B&&(o.customProgramCacheKey=i),o.needsUpdate=!0)}}}async function Na(o,t,i,s){var C;const e=new fa({alpha:!0,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1}),c=[];let p=!1,w=!1;const n=()=>{if(!p){p=!0;for(const g of c.reverse())g();e.dispose(),e.domElement.remove()}};try{e.setClearColor(592396,1),e.outputColorSpace=mt,e.toneMapping=ga,e.toneMappingExposure=a.lighting.exposure,e.debug.onShaderError=()=>{throw new Error("Glass shader could not compile")},e.domElement.setAttribute("aria-hidden","true"),o.appendChild(e.domElement);const g=new URLSearchParams(location.search),M=Ba(e.getContext(),l=>Ua("hero",l),g.get("perf")==="1"&&g.get("passes")==="1");c.push(()=>M.dispose());const m=new ct,v=new xa(-20,20,10,-10,.1,150);v.position.set(0,0,40);const d=o.closest(".gxc-hero")??o;let x,P,B,y;const U=new Promise((l,f)=>{B=l,y=f});c.push(Ea(d,l=>{x=l,B(l),P==null||P(l)},()=>y(new Error("Background photograph could not load"))));const[E,T]=await Promise.allSettled([fetch("/v-next/galaxci-inflated-mesh.json").then(l=>{if(!l.ok)throw new Error("Wordmark could not load");return l.json()}),U]);if(E.status==="rejected")throw E.reason;if(T.status==="rejected")throw T.reason;const F=E.value;x=x??T.value;const D=l=>{const f=new ya(l.image);return f.colorSpace=mt,f.needsUpdate=!0,f};let S=D(x);c.push(()=>S.dispose());const _=new ut(1,1),G=new dt({map:S,color:a.lighting.backdropTint,toneMapped:!1});c.push(()=>_.dispose(),()=>G.dispose());const R=new _e(_,G);R.position.z=-6,m.add(R);const K=_a(G);let We=-1,Oe=-1,Te=-1,re,gt=()=>{};new URLSearchParams(location.search).has("no-project-atlas")?o.dataset.projectAtlas="disabled":Ia().then(l=>{if(p||w){l.dispose();return}re=l,K.setProjectAtlas(l),o.dataset.projectAtlas="ready",gt()}).catch(()=>{p||(o.dataset.projectAtlas="failed")}),c.push(()=>{K.dispose(),re==null||re.dispose(),delete d.dataset.skyReady,delete d.dataset.projectSkyReady});const Ne=new ct;Ne.background=new ht(1118742);const xt=[],yt=new wa(e);try{for(const f of a.lighting.panels){const b=new dt({color:new ht(f.color).multiplyScalar(f.strength),side:ka}),h=new _e(new ut(...f.size),b);h.position.set(f.position[0],f.position[1],f.position[2]),h.lookAt(0,0,0),Ne.add(h),xt.push(h)}const l=yt.fromScene(Ne,.06);c.push(()=>l.dispose()),m.environment=l.texture}finally{for(const l of xt)l.geometry.dispose(),l.material.dispose();yt.dispose()}const Ye=new Sa({color:a.glass.tint,metalness:0,roughness:a.glass.roughness,transmission:1,thickness:a.glass.thickness,ior:a.glass.ior,dispersion:a.glass.dispersion,envMapIntensity:a.glass.environment,clearcoat:a.glass.clearcoat,clearcoatRoughness:.04,attenuationColor:a.glass.attenuation,attenuationDistance:50,side:ba});c.push(()=>Ye.dispose()),Ye.onBeforeCompile=l=>{l.uniforms.gxcScatterStrength={value:new URLSearchParams(location.search).has("no-scattering")?0:a.scattering.strength},l.fragmentShader=`uniform float gxcScatterStrength;
`+l.fragmentShader;const f=Ma.transmission_fragment.replace("transmitted.rgb, material.transmission",`transmitted.rgb * ${a.glass.starExposure.toFixed(1)}, material.transmission`);l.fragmentShader=l.fragmentShader.replace("#include <transmission_fragment>",f+`
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
      `)};const W=new Pa;c.push(()=>W.dispose()),W.setAttribute("position",new Wt(F.positions,3)),W.setAttribute("normal",new Wt(F.normals,3)),W.setIndex(F.indices),W.computeBoundingBox();const wt=W.boundingBox.getSize(new I),ea=W.boundingBox.getCenter(new I),je=new _e(W,Ye),ie=new Fa;ie.add(je),m.add(ie);const kt=new Ca(15397631,a.lighting.point,90,2);m.add(kt);const St=new Da(16777215,a.lighting.fill);St.position.set(-5,9,6),m.add(St);const Xe=new URLSearchParams(location.search),ve=matchMedia("(hover: hover) and (pointer: fine)"),bt=Xe.has("no-postfx"),He=Xe.has("no-fluid"),Mt=Xe.has("no-flare");let r,O=!1,se=!1,Ke=null,ne=!e.extensions.has("EXT_color_buffer_float"),le=!i,Ae=!0,Q=!0,ce=!1,Qe=!1,fe=0,ge=0,Z=a.rimLight.angle,Be=a.rimLight.angle,xe=.07,ye=-.07,J=0,ee=0,te=0,ae=0,Ze=0,Pt=0,Ue=0,Ee=-1,ta=0,we=0;gt=()=>{Te=-1,Q=!0,r==null||r.invalidateBackground(),Pe()};const Ft=new V,ue=new V,Ct=new V,ke=new I,de=new I,Dt=new I,Tt=new I,jt=new Ta,At=new V,Bt=new ja(new I(0,0,1),0),Je=((C=o.parentElement)==null?void 0:C.parentElement)??o,X=(l=!1)=>{fe=0,ge=0,Be=a.rimLight.angle,ce=!1,Ee=-1,O=!1,Ke=null,l&&(xe=.07,ye=-.07,Z=a.rimLight.angle,J=0,ee=0,r==null||r.reset(),we=0),Q=!0,Pe()},Re=()=>{if(le&&(ve.matches||O)&&!bt&&!(He&&Mt)&&!ne&&!r){const f=performance.now();try{r=new za(e),r.setFlare(!Mt),r.setSize(te||1,ae||1,Ze||1),rt("heroPostAllocations"),Fe("heroPostCreateMs",performance.now()-f),Nt("hero-post-created",{input:O?"touch":"fine-pointer"})}catch{r==null||r.dispose(),r=void 0,ne=!0}}e.domElement.dataset.postfx=r?"ready":ne?"unsupported":"disabled"},Ut=()=>!!r&&le&&!bt&&(ve.matches||O||r.active);c.push(()=>r==null?void 0:r.dispose());const Le=()=>{if(p||w)return;const l=o.getBoundingClientRect(),f=t.getBoundingClientRect(),b=l.width,h=l.height;if(!b||!h)return;Ue=l.left,Pt=l.top+window.scrollY;const j=Math.min(devicePixelRatio,b<700?a.glass.mobileDpr:a.glass.maxDpr);(b!==te||h!==ae||j!==Ze)&&(e.setPixelRatio(j),e.setSize(b,h,!1),te=b,ae=h,Ze=j,r==null||r.setSize(b,h,j));const A=26,N=A*b/h;v.left=-N/2,v.right=N/2,v.top=A/2,v.bottom=-A/2,v.updateProjectionMatrix();const H=b<700?22:80;ie.scale.setScalar(Math.min((b-H*2)/wt.x,f.height*.88/wt.y)*A/h),ie.position.y=(h/2-(f.top-l.top+f.height/2))*A/h;const L=a.cameraMotion.overscan;R.scale.set(N*L,A*L,1);const oe=Ra(b,h,x.width,x.height);S.repeat.set(b/oe.width,h/oe.height),S.repeat.multiplyScalar(L),S.offset.set((1-S.repeat.x)/2,(1-S.repeat.y)/2),K.update(it(d),b,h,L),r==null||r.invalidateBackground(),et(),Et(),Q=!0,Pe()},et=()=>{ie.rotation.set(xe,ye,-.018),ie.updateMatrixWorld(!0),ke.copy(ea).applyMatrix4(je.matrixWorld),kt.position.set(ke.x+Math.cos(Z)*a.rimLight.radius,ke.y+Math.sin(Z)*a.rimLight.radius,a.rimLight.z),v.position.set(J,ee,40),Dt.set(J*a.cameraMotion.lookAtFactor,ee*a.cameraMotion.lookAtFactor,0),v.lookAt(Dt),v.updateMatrixWorld(),v.getWorldDirection(Tt),R.position.copy(v.position).addScaledVector(Tt,46),R.quaternion.copy(v.quaternion),R.updateMatrixWorld(!0)},Et=(l=!0)=>{const f=W.boundingBox,b=new I;let h=1/0,j=1/0,A=-1/0,N=-1/0;for(const oe of[f.min.x,f.max.x])for(const $e of[f.min.y,f.max.y])for(const Ve of[f.min.z,f.max.z]){b.set(oe,$e,Ve).applyMatrix4(je.matrixWorld).project(v);const be=(b.x+1)*te/2,Me=(1-b.y)*ae/2;h=Math.min(h,be),A=Math.max(A,be),j=Math.min(j,Me),N=Math.max(N,Me)}const H=18,L=JSON.stringify({left:h-H,top:j-H,width:A-h+H*2,height:N-j+H*2});l&&o.dataset.wordRect!==L&&(o.dataset.wordRect=L),o.dataset.touchRect!==L&&(o.dataset.touchRect=L)};P=l=>{if(p||w)return;const f=S;S=D(l),G.map=S,K.updateTwinkles(l.fallback?[]:st(d).points),e.domElement.dataset.photoSource=l.url,Le(),f.dispose()},e.domElement.dataset.photoSource=x.url;const Rt=l=>{const f=performance.now();we&&(Fe("heroFrameIntervalMs",f-we),(O||r!=null&&r.active)&&Fe("heroTouchFrameIntervalMs",f-we)),we=f;const b=it(d),h=st(d),j=Yt(d);j.revision!==Te&&(Te=j.revision,K.updateProjects(j),r==null||r.invalidateBackground()),h.revision!==Oe&&(Oe=h.revision,K.updateTwinkles(x!=null&&x.fallback?[]:h.points),r==null||r.invalidateBackground()),b.revision!==We&&(We=b.revision,K.update(b,te,ae,a.cameraMotion.overscan),r==null||r.invalidateBackground());const A=vt("hero").quality;e.transmissionResolutionScale=a.renderQuality[A].transmissionScale,r==null||r.setQuality(A),se=Ut(),M.begin();try{if(r&&se)try{r.render(m,v,je,R,l,le&&!He,M.measure)}catch{r.dispose(),r=void 0,ne=!0,se=!1,e.domElement.dataset.postfx="failed",Nt("hero-post-failed"),e.setRenderTarget(null),e.render(m,v)}else e.render(m,v)}finally{M.end()}rt(se?"heroPostFrames":"heroBaseFrames"),Fe("heroDrawCpuMs",performance.now()-f),(O||r!=null&&r.active)&&(rt("heroTouchFrames"),Fe("heroTouchDrawCpuMs",performance.now()-f)),e.domElement.dataset.postfx=ne?"unsupported":se?"enabled":r?"idle":"disabled",e.domElement.dataset.frames=String(++ta),d.dataset.skyReady!=="true"&&(d.dataset.skyReady="true"),re&&j.points.length?d.dataset.projectSkyReady="true":delete d.dataset.projectSkyReady,e.domElement.dataset.skyCount=String(b.streaks.length),e.domElement.dataset.twinkleCount=String(h.points.length),e.domElement.dataset.projectCount=String(re?j.points.length:0),e.domElement.dataset.fluid=r!=null&&r.active?"active":"rest",e.domElement.dataset.quality=A,(g.get("perf")==="1"||g.get("qa")==="1")&&(e.domElement.dataset.camera=`${J.toFixed(4)},${ee.toFixed(4)}`,e.domElement.dataset.rim=`${Z.toFixed(4)},${a.rimLight.radius.toFixed(4)}`,e.domElement.dataset.touchInteraction=String(O)),Q=!1},Lt=l=>{l.preventDefault(),w=!0,Ae=!1,o.dataset.failed="context-lost",s(),n()},$t=()=>X(),Vt=()=>{document.hidden?X(!0):(Q=!0,Pe())},zt=()=>{X(!0),Re()},It=()=>{Xt().pointer.glassTouch||X()};e.domElement.addEventListener("webglcontextlost",Lt),Je.addEventListener("pointerleave",It),window.addEventListener("blur",$t),document.addEventListener("visibilitychange",Vt),ve.addEventListener("change",zt),c.push(()=>{e.domElement.removeEventListener("webglcontextlost",Lt),Je.removeEventListener("pointerleave",It),window.removeEventListener("blur",$t),document.removeEventListener("visibilitychange",Vt),ve.removeEventListener("change",zt)});const tt=new ResizeObserver(Le);tt.observe(o),tt.observe(t),c.push(()=>tt.disconnect()),c.push(La(Le));const qt=new IntersectionObserver(l=>{Ae=l[0].isIntersecting,X(!0)});if(qt.observe(Je),c.push(()=>qt.disconnect()),Le(),Re(),et(),await e.compileAsync(m,v),r)try{await r.warm()}catch{r.dispose(),r=void 0,ne=!0,e.domElement.dataset.postfx="failed"}if(p||w)throw new Error("Glass context unavailable");Rt(1/60);let Se=!1;const aa=Ht((l,f)=>{if(!Ae||p||w||document.hidden||Qe)return!1;if(vt("hero").staticFallback)return o.dataset.failed="performance",s(),n(),!1;const b=Xt(),h=b.pointer,j=Pt-b.scrollY,A=le&&h.kind==="touch"&&h.glassTouch&&h.pressed&&h.contacts===1,N=le&&ve.matches&&h.kind!=="touch"&&h.inside&&h.x>=Ue&&h.x<=Ue+te&&h.y>=j&&h.y<=j+ae,H=A||N;A!==O&&(O=A,Re()),A&&h.pointerId!==Ke&&(ce=!1,Ee=-1,Ke=h.pointerId),H?(ue.set((h.x-Ue)/te,1-(h.y-j)/ae),fe=Ot.clamp(ue.x*2-1,-1,1),ge=Ot.clamp(1-ue.y*2,-1,1),At.set(fe,-ge),jt.setFromCamera(At,v),Bt.constant=-ke.z,jt.ray.intersectPlane(Bt,de)&&(de.sub(ke),Math.hypot(de.x,de.y)>26*a.rimLight.centerDeadZone&&(Be=Math.atan2(de.y,de.x))),h.lastMoved!==Ee&&(ce&&r&&!He&&(Ct.copy(ue).sub(Ft),r.push(ue,Ct)),Ft.copy(ue),Ee=h.lastMoved),ce=!0):ce&&X();const L=.07+ge*a.pointer.rotationX,oe=-.07+fe*a.pointer.rotationY,$e=fe*a.cameraMotion.offsetX,Ve=-ge*a.cameraMotion.offsetY,be=1-Math.exp(-a.pointer.damping*f),Me=1-Math.exp(-(ce?a.cameraMotion.damping:a.cameraMotion.leaveDamping)*f);xe+=(L-xe)*be,ye+=(oe-ye)*be,J+=($e-J)*Me,ee+=(Ve-ee)*Me;const _t=Math.atan2(Math.sin(Be-Z),Math.cos(Be-Z));Z+=_t*(1-Math.exp(-a.rimLight.damping*f));const at=Math.abs(L-xe)+Math.abs(oe-ye)+Math.abs(_t)+Math.abs($e-J)+Math.abs(Ve-ee)>2e-4;return(Q||at||r!=null&&r.active||se!==Ut())&&(et(),at&&Et(!1),Se=!0),at||!!(r!=null&&r.active)},"update"),oa=Ht((l,f)=>!Ae||p||w||document.hidden||Qe?(Se=!1,!1):((it(d).revision!==We||st(d).revision!==Oe||Yt(d).revision!==Te)&&(Se=!0),Se&&(Rt(f),Se=!1),!!(r!=null&&r.active)),"render");return c.push(aa,oa),{setMotion(l){p||w||(le=l,X(!0),Re())},setSuspended(l){Qe=l,l?X(!0):(Q=!0,Pe())},dispose:n}}catch(g){throw n(),g}}export{Na as mountGlass};
