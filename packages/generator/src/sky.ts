// What stands in front of a scene's other sky (see SKY in
// packages/shared/src/scenes/effects.ts), found again after a retouch.
//
// The sky's matte: for each pixel of the background, at its full size, how
// much of it is sky (white) rather than what stands in front of it (black): the
// spires, the roofs, the branches.
//
// First where the sky is, roughly: what can be reached from the top of the
// image, searched small, through smooth, cold, not too dark pixels, without
// crossing an outline; widened, so that the thin things in front of it (a
// twig, a pinnacle) are inside. Then, at the full size, each pixel there is
// sky as much as its colour is nearer the sky around it than what stands in
// front of it around it. What is red (the cathedral's glow) is not sky.

import { SKY_ASPECT, SKY_HEIGHT } from "@esquisse/shared/effects";
import sharp from "sharp";

// ── Where the sky is, roughly ────────────────────────────────────────────────

// The image is searched small.
const WIDTH = 384;

// Below, the mist, which veils the sky and the ruins alike, and the hill:
// never sky. The matte fades out above it, from FADE_Y: the sky melts into the
// mist without a line.
const FADE_Y = 0.25;
const MAX_Y = 0.31;

// A sky pixel: not too dark (the roofs, the spires), not red (the cathedral's
// glow), and smooth (the thatch, the stones and the branches are not).
const DARK = 58;
const RED = 25;
const ROUGH = 26;

// The half width of a passage too narrow for the sky to go through.
const NARROW = 2;

// Two neighbours whose luminances differ more than this are on an outline.
const EDGE = 7;

// How far the rough sky is widened, in small pixels: a branch's length.
const WIDEN = 10;

// ── Each pixel ───────────────────────────────────────────────────────────────

// The sky around a pixel, and what stands in front of it around it: the mean
// colour of the sure ones within these radii, in pixels of the full image. The
// front is looked for further: inside a branch's reach, there is none sure.
const SKY_AROUND = 24;
const FRONT_AROUND = 60;

// Where neither is near: a cloudy sky, and a dark front.
const SKY_DEFAULT = [110, 115, 130] as const;
const FRONT_DEFAULT = [40, 38, 45] as const;

// A pixel is sky as much as its colour is nearer the sky's than the front's;
// sharpened between these two fractions.
const SHARP_FROM = 0.25;
const SHARP_TO = 0.75;

// Redder than this (r - b) is the cathedral's glow, not sky.
const GLOW_FROM = 28;
const GLOW_TO = 45;

// What stands in front of the sky is darker than this: the mist below it is
// not taken for it.
const FRONT_DARK = 75;

// Sky that the sure sky cannot reach through sky, or over something this thin
// (a branch), in pixels, is a light speck in front of it (a straw of thatch):
// left out. Its edge, this many pixels wide, is kept.
const JUMP = 8;
const EDGE_KEPT = 2;

// Where the sky is, roughly, ends softly, over this many pixels: below it,
// the mist.
const WHERE_SOFT = 40;

const luminance = (data: Buffer, p: number) =>
  ((data[p * 3] as number) + (data[p * 3 + 1] as number) + (data[p * 3 + 2] as number)) / 3;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The rough sky, small: 1 where it is, widened.
const roughSky = async (jpg: Buffer) => {
  const { data, info } = await sharp(jpg)
    .resize({ width: WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const lum = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) lum[p] = luminance(data, p);

  // The local roughness: the largest difference with a neighbour two pixels away.
  const rough = (x: number, y: number) => {
    const l = lum[y * W + x] as number;
    let max = 0;
    for (const [dx, dy] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ] as const) {
      const nx = Math.min(W - 1, Math.max(0, x + dx));
      const ny = Math.min(H - 1, Math.max(0, y + dy));
      max = Math.max(max, Math.abs(l - (lum[ny * W + nx] as number)));
    }
    return max;
  };
  const like = new Uint8Array(W * H);
  for (let y = 0; y < H * MAX_Y; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const r = data[p * 3] as number;
      const b = data[p * 3 + 2] as number;
      like[p] = (lum[p] as number) > DARK && r - b < RED && rough(x, y) < ROUGH ? 1 : 0;
    }
  }

  // 1 where every pixel within the radius is 1 (all), or any is (not all).
  const near = (src: Uint8Array, radius: number, all: boolean) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let hit = all;
        for (let dy = -radius; dy <= radius && hit === all; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const v = nx >= 0 && ny >= 0 && nx < W && ny < H ? src[ny * W + nx] === 1 : all;
            if (v !== all) {
              hit = !all;
              break;
            }
          }
        }
        out[y * W + x] = hit ? 1 : 0;
      }
    }
    return out;
  };

  // Filled from the top row, only where it is wide: narrow passages (a gap
  // between two spires, a glow along a wall) are closed.
  const wide = near(like, NARROW, true);
  const sky = new Uint8Array(W * H);
  const queue: number[] = [];
  for (let x = 0; x < W; x++) {
    if (wide[x]) {
      sky[x] = 1;
      queue.push(x);
    }
  }
  while (queue.length > 0) {
    const p = queue.pop() as number;
    const x = p % W;
    const y = (p - x) / W;
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (sky[n] || !wide[n]) continue;
      if (Math.abs((lum[p] as number) - (lum[n] as number)) > EDGE) continue;
      sky[n] = 1;
      queue.push(n);
    }
  }
  const sure = near(sky, NARROW, false).map((v, p) => v & (like[p] as number));
  return { W, H, sure, widened: near(sure, WIDEN, false) };
};

export const skyMatte = async (jpg: Buffer) => {
  const { width = 0, height = 0 } = await sharp(jpg).metadata();
  const rough = await roughSky(jpg);
  const small = { raw: { width: rough.W, height: rough.H, channels: 1 as const } };
  const one = { raw: { width, height, channels: 1 as const } };
  const three = { raw: { width, height, channels: 3 as const } };
  const toFull = (mask: Uint8Array) =>
    sharp(Buffer.from(mask.map((v) => v * 255)), small)
      .resize(width, height, { kernel: "nearest" })
      .extractChannel(0)
      .raw()
      .toBuffer();
  const [where, sureSky] = await Promise.all([toFull(rough.widened), toFull(rough.sure)]);
  const whereSoft = await sharp(where, one)
    .blur(WHERE_SOFT / 2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const { data } = await sharp(jpg).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  // The mean colour of the sure pixels near each one, and how many there are.
  const meanNear = async (sure: (p: number) => boolean, radius: number) => {
    const weight = Buffer.alloc(width * height);
    const colour = Buffer.alloc(width * height * 3);
    for (let p = 0; p < width * height; p++) {
      if (!sure(p)) continue;
      weight[p] = 255;
      for (let c = 0; c < 3; c++) colour[p * 3 + c] = data[p * 3 + c] as number;
    }
    const [w, sum] = await Promise.all([
      sharp(weight, one)
        .blur(radius / 2)
        .extractChannel(0)
        .raw()
        .toBuffer(),
      sharp(colour, three)
        .blur(radius / 2)
        .raw()
        .toBuffer(),
    ]);
    return { w, sum };
  };
  const sky = await meanNear((p) => (sureSky[p] as number) > 0, SKY_AROUND);
  // The front: below the sky's reach, or out of it.
  const front = await meanNear((p) => !where[p] && luminance(data, p) < FRONT_DARK, FRONT_AROUND);
  const at = (
    { w, sum }: { w: Buffer; sum: Buffer },
    p: number,
    c: number,
    fallback: readonly number[],
  ) => {
    const weight = (w[p] as number) / 255;
    return weight > 0.02 ? (sum[p * 3 + c] as number) / weight : (fallback[c] as number);
  };

  // The old sky's colour around each pixel, to free the front of it.
  const skyColour = new Float32Array(width * height * 3);
  const matte = Buffer.alloc(width * height);
  const fades = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    if (!where[p]) continue;
    // Where the pixel is between the front's colour (0) and the sky's (1).
    let along = 0;
    let span = 0;
    for (let c = 0; c < 3; c++) {
      const f = at(front, p, c, FRONT_DEFAULT);
      const b = at(sky, p, c, SKY_DEFAULT);
      skyColour[p * 3 + c] = b;
      along += ((data[p * 3 + c] as number) - f) * (b - f);
      span += (b - f) * (b - f);
    }
    const raw = Math.min(1, Math.max(0, span > 1 ? along / span : 0));
    const red = (data[p * 3] as number) - (data[p * 3 + 2] as number);
    const cold = 1 - smoothstep(GLOW_FROM, GLOW_TO, red);
    matte[p] = Math.round(255 * smoothstep(SHARP_FROM, SHARP_TO, raw) * cold);
    const y = Math.floor(p / width) / height;
    fades[p] = Math.min(1, Math.max(0, (MAX_Y - y) / (MAX_Y - FADE_Y)));
  }

  // Reached from the sure sky through what is mostly sky, or over a branch.
  const reached = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let p = 0; p < width * height; p++) {
    if ((sureSky[p] as number) > 0 && (matte[p] as number) > 127) {
      reached[p] = 1;
      queue.push(p);
    }
  }
  while (queue.length > 0) {
    const p = queue.pop() as number;
    const x = p % width;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      // The nearest sky that way, past what is not.
      for (let k = 1; k <= JUMP; k++) {
        const nx = x + dx * k;
        const n = p + (dx + dy * width) * k;
        if (nx < 0 || nx >= width || n < 0 || n >= width * height) break;
        if ((matte[n] as number) <= 127) continue;
        if (!reached[n]) {
          reached[n] = 1;
          queue.push(n);
        }
        break;
      }
    }
  }
  // Within radius of what is reached, in a square: along the rows, then the
  // columns. (Sharp's dilate shrinks white on black.)
  const near = (radius: number) => {
    const rows = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      if (!reached[p]) continue;
      const x = p % width;
      for (let dx = Math.max(-radius, -x); dx <= Math.min(radius, width - 1 - x); dx++) {
        rows[p + dx] = 1;
      }
    }
    const out = new Uint8Array(width * height);
    for (let p = 0; p < width * height; p++) {
      if (!rows[p]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const n = p + dy * width;
        if (n >= 0 && n < width * height) out[n] = 1;
      }
    }
    return out;
  };
  const kept = near(EDGE_KEPT);
  for (let p = 0; p < width * height; p++) {
    const soft = (fades[p] as number) * ((whereSoft[p] as number) / 255);
    matte[p] = kept[p] ? Math.round((matte[p] as number) * soft) : 0;
  }

  // The front: the background, opaque where it is not sky. Where it is partly
  // (an edge, the mist), a pixel's colour is freed of the old sky's share in
  // it: over a sky like the old one, it gives the background back as it was,
  // and over another one, no light line of the old sky shows.
  const frontRgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const sky = (matte[p] as number) / 255;
    for (let c = 0; c < 3; c++) {
      const colour = data[p * 3 + c] as number;
      frontRgba[p * 4 + c] =
        sky > 0 && sky < 0.95
          ? Math.min(
              255,
              Math.max(0, (colour - sky * (skyColour[p * 3 + c] as number)) / (1 - sky)),
            )
          : colour;
    }
    frontRgba[p * 4 + 3] = 255 - (matte[p] as number);
  }
  return {
    matte: await sharp(matte, one).toColourspace("b-w").png().toBuffer(),
    front: await sharp(frontRgba, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer(),
  };
};

// ── The new sky ──────────────────────────────────────────────────────────────

// The background as it is still: its front over the new sky, as the apps draw
// it when it starts (see SKY in packages/shared/src/scenes/effects.ts).
export const stillWithSky = async (front: Buffer, sky: Buffer) => {
  const { width = 0, height = 0 } = await sharp(front).metadata();
  const high = Math.round(height * SKY_HEIGHT);
  const wide = Math.round(high * SKY_ASPECT);
  const strip = await sharp(sky).resize(wide, high, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const canvas = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const row = Math.min(high - 1, y);
    for (let x = 0; x < width; x++) {
      strip.copy(
        canvas,
        (y * width + x) * 3,
        (row * wide + (x % wide)) * 3,
        (row * wide + (x % wide)) * 3 + 3,
      );
    }
  }
  return sharp(canvas, { raw: { width, height, channels: 3 } })
    .composite([{ input: front }])
    .png()
    .toBuffer();
};
