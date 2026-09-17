import * as THREE from 'three';
import type { SkyFrame } from './skyState';
import { skyMotion } from './meteorSky';
import { starCatalog, type Twinkle } from './twinkle';
import { heroTwinkleArt as twinkleArt } from './heroTwinkleArt';
import { projectAtlasLayout, projectAtlasCellBySlug } from './projectAtlas';
import { projectLabelArt } from './projectLabel';
import type { ProjectSkyFrame } from './projectSkyState';

const SKY_CAPACITY = skyMotion.capacity;

/**
 * Add meteor light to the photograph's opaque material. Because the light is in
 * the actual scene background, Three's transmission pass sees it through the
 * wordmark as well as around it. This module owns no render loop or textures.
 */
export function createSkyBackdrop(material: THREE.MeshBasicMaterial) {
  const previousCompile = material.onBeforeCompile;
  const previousCacheKey = material.customProgramCacheKey;
  const baseCacheKey = previousCacheKey.call(material);
  const viewport = new THREE.Vector3(1, 1, 1);
  const heads = Array.from({ length: SKY_CAPACITY }, () => new THREE.Vector4());
  const directions = Array.from({ length: SKY_CAPACITY }, () => new THREE.Vector4(1, 0, 1, 0));
  const twinkles = Array.from({ length: twinkleArt.capacity }, () => new THREE.Vector4());
  const twinkleColors = Array.from({ length: twinkleArt.capacity }, () => new THREE.Vector3(1, 1, 1));
  const projects = Array.from({ length: projectAtlasLayout.capacity }, () => new THREE.Vector4());
  const projectTails = Array.from({ length: projectAtlasLayout.capacity }, () => new THREE.Vector4());
  const projectCells = Array.from({ length: projectAtlasLayout.capacity }, () => 0);
  const uniforms = {
    uSkyViewport: { value: viewport },
    uSkyCount: { value: 0 },
    // head.x / head.y / tail length / opacity, all positions in CSS pixels.
    uSkyHeads: { value: heads },
    // Unit tail direction.x / direction.y / core halfwidth / reserved.
    uSkyDirections: { value: directions },
    uPhotoStarSize: { value: new THREE.Vector2(starCatalog.source.width, starCatalog.source.height) },
    uPhotoStarCount: { value: 0 },
    uPhotoStars: { value: twinkles },
    uPhotoStarColors: { value: twinkleColors },
    uProjectAtlas: { value: null as THREE.Texture | null },
    uProjectCount: { value: 0 },
    // Center.x / center.y / CSS size / opacity; atlas cells preserve project identity.
    uProjects: { value: projects },
    uProjectCells: { value: projectCells },
    // Unit tail direction / length / label opacity; the name belongs to this scene layer.
    uProjectTails: { value: projectTails },
  };
  let disposed = false;

  const compile: typeof material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    // Use untransformed geometry UVs: the photograph's map UVs have their own
    // cover crop, whereas meteor coordinates belong to the visible viewport.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSkyUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvSkyUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec2 vSkyUv;
uniform vec3 uSkyViewport;
uniform int uSkyCount;
uniform vec4 uSkyHeads[${SKY_CAPACITY}];
uniform vec4 uSkyDirections[${SKY_CAPACITY}];
uniform vec2 uPhotoStarSize;
uniform int uPhotoStarCount;
uniform vec4 uPhotoStars[${twinkleArt.capacity}];
uniform vec3 uPhotoStarColors[${twinkleArt.capacity}];
uniform sampler2D uProjectAtlas;
uniform int uProjectCount;
uniform vec4 uProjects[${projectAtlasLayout.capacity}];
uniform float uProjectCells[${projectAtlasLayout.capacity}];
uniform vec4 uProjectTails[${projectAtlasLayout.capacity}];

vec2 skyScreenPosition() {
  return vec2(
    ((vSkyUv.x - 0.5) * uSkyViewport.z + 0.5) * uSkyViewport.x,
    (0.5 - (vSkyUv.y - 0.5) * uSkyViewport.z) * uSkyViewport.y
  );
}

vec3 projectSkyColor(vec3 background) {
  vec2 screen = skyScreenPosition();
  vec3 result = background;
  for (int i = 0; i < ${projectAtlasLayout.capacity}; i++) {
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
    vec2 origin = vec2(mod(cell, ${projectAtlasLayout.columns.toFixed(1)}), floor(cell / ${projectAtlasLayout.columns.toFixed(1)})) * ${projectAtlasLayout.cell.toFixed(1)};
    vec2 uv = (origin + ${projectAtlasLayout.padding.toFixed(1)} + local * ${projectAtlasLayout.image.toFixed(1)})
      / vec2(${(projectAtlasLayout.columns * projectAtlasLayout.cell).toFixed(1)}, ${(projectAtlasLayout.rows * projectAtlasLayout.cell).toFixed(1)});
    uv.y = 1.0 - uv.y;
    vec2 labelLocal = (offset - vec2(0.0, ${projectLabelArt.offsetY.toFixed(1)})) / ${projectLabelArt.canvasSize.toFixed(1)} + 0.5;
    float labelCell = cell + ${projectAtlasLayout.labelStart.toFixed(1)};
    vec2 labelOrigin = vec2(mod(labelCell, ${projectAtlasLayout.columns.toFixed(1)}), floor(labelCell / ${projectAtlasLayout.columns.toFixed(1)})) * ${projectAtlasLayout.cell.toFixed(1)};
    vec2 labelUv = (labelOrigin + ${projectAtlasLayout.padding.toFixed(1)} + labelLocal * ${projectAtlasLayout.labelImage.toFixed(1)})
      / vec2(${(projectAtlasLayout.columns * projectAtlasLayout.cell).toFixed(1)}, ${(projectAtlasLayout.rows * projectAtlasLayout.cell).toFixed(1)});
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
  for (int i = 0; i < ${twinkleArt.capacity}; i++) {
    if (i >= uPhotoStarCount) break;
    vec4 star = uPhotoStars[i];
    // vMapUv is the exact transformed UV used to sample the photograph: cover,
    // overscan, camera alignment and every responsive variant are already in it.
    vec2 delta = (photoUv - vec2(star.x, 1.0 - star.y)) * uPhotoStarSize;
    float q = dot(delta, delta) / max(star.z * star.z, 0.01);
    if (q > ${ (twinkleArt.supportSigma ** 2).toFixed(1) }) continue;
    float core = exp(-0.5 * q);
    float halo = exp(-q / ${(2 * twinkleArt.haloSigma ** 2).toFixed(4)});
    float taper = 1.0 - smoothstep(16.0, ${(twinkleArt.supportSigma ** 2).toFixed(1)}, q);
    float alpha = clamp(core * ${twinkleArt.coreOpacity.toFixed(4)} + halo * ${twinkleArt.haloOpacity.toFixed(4)}, 0.0, 1.0) * star.w * taper;
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
  for (int i = 0; i < ${SKY_CAPACITY}; i++) {
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
}`)
      .replace('#include <opaque_fragment>', 'outgoingLight += skyMeteorLight();\n#ifdef USE_MAP\noutgoingLight += photoTwinkleLight(diffuseColor.rgb, vMapUv);\n#endif\noutgoingLight = projectSkyColor(outgoingLight);\n#include <opaque_fragment>');
  };
  const cacheKey = () => `${baseCacheKey}:gxc-sky-backdrop-v7-visible-stars`;
  material.onBeforeCompile = compile;
  material.customProgramCacheKey = cacheKey;
  material.needsUpdate = true;

  return {
    setProjectAtlas(texture: THREE.Texture | null) {
      if (disposed) return;
      uniforms.uProjectAtlas.value = texture;
      if (!texture) uniforms.uProjectCount.value = 0;
    },
    updateProjects(frame: ProjectSkyFrame) {
      if (disposed) return;
      const points = frame.points.filter(point => Number.isInteger(projectAtlasCellBySlug[point.slug]));
      const count = uniforms.uProjectAtlas.value ? Math.min(points.length, projectAtlasLayout.capacity) : 0;
      uniforms.uProjectCount.value = count;
      for (let i = 0; i < count; i++) {
        const point = points[i], radians = point.angle * Math.PI / 180;
        projects[i].set(point.x, point.y, point.size, Math.max(0, Math.min(1, point.opacity)));
        projectTails[i].set(Math.cos(radians), Math.sin(radians), point.tailLength, Math.max(0, Math.min(1, point.labelOpacity)));
        projectCells[i] = projectAtlasCellBySlug[point.slug];
      }
    },
    updateTwinkles(points: Twinkle[]) {
      uniforms.uPhotoStarCount.value = disposed ? 0 : Math.min(points.length, twinkleArt.capacity);
      for (let i = 0; i < uniforms.uPhotoStarCount.value; i++) {
        const point = points[i]; twinkles[i].set(point.u, point.v, point.radiusPx, point.amplitude);
        twinkleColors[i].fromArray(point.overlay?.color ?? [1, 1, 1]);
      }
    },
    update(frame: SkyFrame, width: number, height: number, overscan: number) {
      if (disposed) return;
      viewport.set(Math.max(width, 1), Math.max(height, 1), overscan);
      const count = Math.min(frame.streaks.length, SKY_CAPACITY);
      uniforms.uSkyCount.value = count;
      for (let i = 0; i < count; i++) {
        const streak = frame.streaks[i];
        const radians = streak.angle * Math.PI / 180;
        heads[i].set(streak.x, streak.y, streak.length, Math.max(0, streak.opacity));
        directions[i].set(Math.cos(radians), Math.sin(radians), streak.width, 0);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      uniforms.uSkyCount.value = 0;
      uniforms.uProjectCount.value = 0;
      uniforms.uProjectAtlas.value = null;
      // Avoid removing any newer hooks installed by the scene owner.
      if (material.onBeforeCompile === compile) material.onBeforeCompile = previousCompile;
      if (material.customProgramCacheKey === cacheKey) material.customProgramCacheKey = previousCacheKey;
      material.needsUpdate = true;
    },
  };
}
