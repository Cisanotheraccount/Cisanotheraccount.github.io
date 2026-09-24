/** Geometry-derived optics for the docked mark. No screen-sized render targets. */
export const brandGlassMaterial = {
  maxDpr: 2.5,
  padding: .42,
  refraction: .24,
  dispersion: .025,
  responseSeconds: .12,
  settleSeconds: .24,
} as const;

const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=vec2(position.x*.5+.5,.5-position.y*.5); gl_Position=vec4(position,0.,1.); }`;
const fragment = `precision highp float;
varying vec2 uv;
uniform sampler2D backdrop, normals, silhouette, highlight;
uniform vec2 light, aspect;
uniform float pressure, strength, dispersion, padding;
vec3 background(vec2 p){return texture2D(backdrop,clamp((p+padding)/(1.+2.*padding),0.,1.)).rgb;}
void main(){
  float alpha=texture2D(silhouette,uv).a;
  if(alpha<.002){gl_FragColor=vec4(0.);return;}
  vec2 normal=(texture2D(normals,uv).rg-128./255.)*(255./126.);
  vec2 point=vec2(.5)+light*.4;
  vec2 distance=(uv-point)*aspect;
  float proximity=exp(-dot(distance,distance)*9.);
  vec2 bend=normal*strength/aspect;
  bend+=light*.028*pressure*proximity;
  vec2 p=uv-bend;
  vec3 transmitted=vec3(background(p-bend*dispersion).r,background(p).g,background(p+bend*dispersion).b);
  vec3 n=normalize(vec3(normal.x,-normal.y,sqrt(max(.02,1.-dot(normal,normal)))));
  vec3 direction=normalize(vec3(-.55+light.x*.65,.7-light.y*.65,1.15));
  vec3 halfDirection=normalize(direction+vec3(0.,0.,1.));
  float fresnel=pow(1.-abs(n.z),3.);
  float soft=pow(max(0.,dot(n,halfDirection)),30.);
  float rim=pow(max(0.,dot(n,direction)),8.)*fresnel;
  vec3 reflected=reflect(vec3(0.,0.,-1.),n);
  float strip=exp(-pow((reflected.x+reflected.y*.52-.1-light.x*.28+light.y*.2)/.115,2.));
  float fill=exp(-pow((reflected.x-reflected.y*.7+.56+light.y*.22)/.3,2.));
  float underside=pow(max(0.,dot(n,normalize(vec3(.6,-.7,.25)))),5.)*fresnel;
  // Clear center, shaded curved flanks and tight moving highlights, not a white fill.
  vec3 color=transmitted*(1.-fresnel*.28);
  color+=vec3(.80,.89,1.)*(soft*.15+rim*.72+fresnel*.065);
  color+=vec3(1.,.92,.79)*underside*.18;
  color+=vec3(.88,.94,1.)*(strip*(.2+.7*fresnel)+fill*.11+texture2D(highlight,uv).a*.08);
  gl_FragColor=vec4(color,alpha);
}`;

export function createBrandMaterial(canvas: HTMLCanvasElement, maps: [HTMLImageElement, HTMLImageElement, HTMLImageElement]) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('Logo WebGL unavailable');
  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [];
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!; shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Logo shader');
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Logo material link failed');
  gl.useProgram(program);
  const buffer = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  ['backdrop', 'normals', 'silhouette', 'highlight'].forEach((name, index) => {
    const texture = gl.createTexture()!; textures.push(texture); gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, name), index);
    if (index) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maps[index - 1]);
  });
  const uniforms = Object.fromEntries(['light','aspect','pressure','strength','dispersion','padding'].map(name => [name, gl.getUniformLocation(program,name)]));
  gl.uniform1f(uniforms.strength, brandGlassMaterial.refraction); gl.uniform1f(uniforms.dispersion, brandGlassMaterial.dispersion);
  gl.uniform1f(uniforms.padding, brandGlassMaterial.padding);
  let frames = 0;
  return {
    draw(source: HTMLCanvasElement, width: number, height: number, dpr: number, x: number, y: number, pressure: number) {
      if (gl.isContextLost()) return false;
      const w = Math.ceil(width * dpr), h = Math.ceil(height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.uniform2f(uniforms.light, x, y); gl.uniform2f(uniforms.aspect, width / height, 1);
      gl.uniform1f(uniforms.pressure, pressure);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.dataset.frames = String(++frames);
      return true;
    },
    dispose() { textures.forEach(t => gl.deleteTexture(t)); shaders.forEach(s => gl.deleteShader(s)); gl.deleteBuffer(buffer); gl.deleteProgram(program); if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
