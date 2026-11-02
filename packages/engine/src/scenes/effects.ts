// The animations of a scene's background, drawn by Skia in both apps (CanvasKit
// on the web site, React Native Skia in the mobile app): one shader per kind of
// effect, in SkSL, the same text for both. Each one is drawn over the
// background, only where it moves, and is transparent elsewhere: the
// background shows as it is around it, and alone while Skia loads.
//
// Every shader gets the background, then the effect's own images (see
// effectFiles), all drawn at the size of the image on screen, and that size and
// the time (HEADER):
//   uniform shader image;  the background
//   uniform float2 size;   the image's size on screen, in pixels
//   uniform float time;    seconds since the scene opened

import type { Effect, EffectKind } from "./types.ts";

// The inputs, and smooth noise, for every shader.
const HEADER = `
uniform shader image;
uniform float2 size;
uniform float time;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
    mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x),
    u.y);
}
`;

// Firelight: lights lit by a fire inside (windows, a lantern) flicker, each
// one at its own pace (it follows the place), brighter and more orange as the
// flame rises; their glow on the wall around them flickers with them. Its
// image: its mask, white where it flickers.
const FIRELIGHT = `${HEADER}
uniform shader mask;

half4 main(float2 xy) {
  float m = mask.eval(xy).r;
  if (m < 0.004) return half4(0.0);
  float2 uv = xy / size.y;
  float seed = noise(uv * 3.0) * 6.0;

  // The flame: a slow swell, a quicker flutter, and crackles.
  float flame = 0.55 * noise(float2(time * 2.3 + seed, seed))
    + 0.3 * noise(float2(time * 6.1 - seed, 3.0 + seed))
    + 0.15 * noise(float2(time * 13.0 + seed, 7.0));

  half4 color = image.eval(xy);
  color.rgb *= half(0.72 + 0.6 * flame);
  color.r *= half(1.0 + 0.08 * (flame - 0.5));
  color.b *= half(1.0 - 0.15 * (flame - 0.5));
  return clamp(color, 0.0, 1.0) * half(m);
}
`;

// The sky: another sky, painted apart, drifts to the right behind what stands
// in front of it, and loops. It covers the top SKY_HEIGHT of the image, its
// width SKY_ASPECT times its height; below, its last row goes on, under the
// mist. Its images: the sky, and the background without its sky (its front),
// transparent where the sky shows. The generator paints the still background
// with this sky as it is at the start (see packages/generator/src/sky.ts).
export const SKY_HEIGHT = 0.36;
export const SKY_ASPECT = 1.9;
// Its drift, in image heights per second.
const SKY_SPEED = 0.003;

const SKY = `${HEADER}
uniform shader sky;
uniform shader front;

half4 main(float2 xy) {
  half4 ahead = front.eval(xy);
  if (ahead.a > 0.996) return half4(0.0);
  float high = size.y * ${SKY_HEIGHT};
  float wide = high * ${SKY_ASPECT};
  float2 at = float2(
    fract((xy.x - time * ${SKY_SPEED} * size.y) / wide),
    min(xy.y / high, 0.999));
  return ahead + sky.eval(at * size) * (1.0 - ahead.a);
}
`;

// A red glow (the cathedral's) is out most of the time: its red is taken out of
// the painting, its windows go dark and its stone and mist a cold grey. Every
// GLOW_EVERY seconds, it comes back: it rises over GLOW_RISE seconds, stays
// GLOW_STAY seconds, and fades over GLOW_RISE seconds. Its image: its zone,
// white where the red is taken out.
const GLOW_EVERY = 30;
const GLOW_RISE = 4;
const GLOW_STAY = 2;
const GLOW_FOR = 2 * GLOW_RISE + GLOW_STAY;

const GLOW = `${HEADER}
uniform shader mask;

half4 main(float2 xy) {
  float m = mask.eval(xy).r;
  if (m < 0.004) return half4(0.0);

  // How much the glow is there: it comes at the end of each period.
  float since = mod(time, ${GLOW_EVERY}.0) - ${GLOW_EVERY - GLOW_FOR}.0;
  float lit = since < 0.0 ? 0.0
    : smoothstep(0.0, ${GLOW_RISE}.0, since)
      * (1.0 - smoothstep(${GLOW_RISE + GLOW_STAY}.0, ${GLOW_FOR}.0, since));

  // A red pixel turns a cold grey as light as it, darker as it was redder.
  half4 color = image.eval(xy);
  float red = max(0.0, color.r - 0.5 * (color.g + color.b));
  float off = m * smoothstep(0.0, 0.08, red) * (1.0 - lit);
  if (off < 0.004) return half4(0.0);
  float light = dot(float3(color.rgb), float3(0.3, 0.59, 0.11)) * (1.0 - 0.6 * min(red, 1.0));
  half3 grey = half3(light * 0.94, light * 0.98, light * 1.06);
  return half4(grey, 1.0) * half(off);
}
`;

// Rain: thin streaks fall straight down over the whole image, in three depths:
// the nearer, the wider, longer, faster and more seen; light, never a
// downpour. It has no image of its own: it is drawn from noise alone.

const RAIN = `${HEADER}
// One depth of the rain: columns across the image, cut in cells down it that
// fall; a cell holds a drop or not. Its intensity at uv, in image heights.
float drops(float2 uv, float columns, float cell, float speed, float len, float width, float seed) {
  float x = uv.x * columns;
  float column = floor(x);
  float y = (uv.y - time * speed) / cell + hash(float2(column, seed)) * 7.0;
  float row = floor(y);
  float h = hash(float2(column + 0.37 * seed, row));
  if (h > 0.3) return 0.0;
  float x0 = 0.2 + 0.6 * hash(float2(row, column + seed));
  float y0 = hash(float2(column - seed, row + 0.5)) * (1.0 - len / cell);
  float across = abs(fract(x) - x0) / columns;
  float along = (fract(y) - y0) * cell / len;
  if (along < 0.0 || along > 1.0) return 0.0;
  // Its head, below, is brighter than its tail.
  return smoothstep(width, 0.0, across) * along * (0.5 + 1.6 * h);
}

half4 main(float2 xy) {
  float2 uv = xy / size.y;
  float rain = 0.4 * drops(uv, 22.0, 0.45, 1.5, 0.09, 0.0016, 1.0)
    + 0.3 * drops(uv, 40.0, 0.3, 1.1, 0.06, 0.0011, 2.0)
    + 0.22 * drops(uv, 70.0, 0.2, 0.75, 0.04, 0.0008, 3.0);
  float a = min(rain, 0.5);
  return half4(half3(0.78, 0.82, 0.9) * a, a);
}
`;

const SHADERS = { firelight: FIRELIGHT, sky: SKY, glow: GLOW, rain: RAIN } satisfies Record<
  EffectKind,
  string
>;

// The shader of a kind of effect; none for a kind this version does not know.
export const effectShader = (kind: string): string | undefined =>
  Object.hasOwn(SHADERS, kind) ? SHADERS[kind as EffectKind] : undefined;

// An effect's own images, in the order its shader takes them after the
// background: assets/scenes/<scene>/<file>.webp. The rain has none.
export const effectFiles = (e: Pick<Effect, "id" | "kind">) =>
  e.kind === "sky" ? [e.id, `${e.id}-devant`] : e.kind === "rain" ? [] : [e.id];
