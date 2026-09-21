/**
 * Keep the photograph in the native DOM compositor. WebGL contributes only
 * changes made by starlight, artwork and glass, at its independent effect DPR.
 * Inputs and the browser's premultiplied-alpha output are in display sRGB.
 */
export const nativePhotoComposite = /* glsl */`
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
`;
