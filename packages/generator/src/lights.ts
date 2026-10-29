// The mask of lights lit by a fire (windows, a lantern), for their animation
// (see packages/shared/src/scenes/effects.ts): in each box where Gemini found
// one, its warm pixels, white, and around them a softer glow on the wall, which
// flickers with them.

import type { Box } from "@esquisse/shared";
import sharp from "sharp";

// The image is searched small: the lights' outline is softened.
const WIDTH = 384;

// A box is searched a little wider: Gemini's are tight.
const MARGIN = 0.2;

// A fire's light: bright, warm, orange rather than pink (r > g > b).
const BRIGHT = 85;
const WARM = 30;

// The glow around a light, in pixels of the full image, and its strength.
const GLOW = 40;
const GLOW_STRENGTH = 0.55;

export const lightsMask = async (jpg: Buffer, boxes: Box[]) => {
  const { width = 0, height = 0 } = await sharp(jpg).metadata();
  const { data, info } = await sharp(jpg)
    .resize({ width: WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const lit = Buffer.alloc(W * H);
  for (const box of boxes) {
    const mx = (box.x1 - box.x0) * MARGIN;
    const my = (box.y1 - box.y0) * MARGIN;
    const x0 = Math.max(0, Math.floor((box.x0 - mx) * W));
    const x1 = Math.min(W, Math.ceil((box.x1 + mx) * W));
    const y0 = Math.max(0, Math.floor((box.y0 - my) * H));
    const y1 = Math.min(H, Math.ceil((box.y1 + my) * H));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * W + x;
        const r = data[p * 3] as number;
        const g = data[p * 3 + 1] as number;
        const b = data[p * 3 + 2] as number;
        if (r > BRIGHT && r - b > WARM && g > b) lit[p] = 255;
      }
    }
  }

  // The lights, their lead lattice filled, at the full size; the glow, the
  // same blurred wide; the brighter of the two.
  const raw = { raw: { width: W, height: H, channels: 1 as const } };
  const core = await sharp(lit, raw)
    .blur(1)
    .threshold(60)
    .resize(width, height, { kernel: "cubic" })
    .blur(3)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const glow = await sharp(core, { raw: { width, height, channels: 1 } })
    .blur(GLOW / 2)
    .linear(GLOW_STRENGTH * 3, 0)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const mask = core.map((v, p) => Math.max(v, Math.min(255 * GLOW_STRENGTH, glow[p] as number)));
  return sharp(mask, { raw: { width, height, channels: 1 } })
    .toColourspace("b-w")
    .webp({ quality: 90 })
    .toBuffer();
};

// The zone of a glow (see GLOW in packages/shared/src/scenes/effects.ts): the
// boxes where Gemini found what glows, a little wider, their edges softened.
// The shader finds the glow in it by its colour.
const GLOW_MARGIN = 0.2;
const GLOW_SOFT = 40;

export const glowMask = async (jpg: Buffer, boxes: Box[]) => {
  const { width = 0, height = 0 } = await sharp(jpg).metadata();
  const rects = boxes
    .map((b) => {
      const mx = (b.x1 - b.x0) * GLOW_MARGIN;
      const my = (b.y1 - b.y0) * GLOW_MARGIN;
      return `<rect x="${(b.x0 - mx) * width}" y="${(b.y0 - my) * height}" width="${(b.x1 - b.x0 + 2 * mx) * width}" height="${(b.y1 - b.y0 + 2 * my) * height}" fill="#fff"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/>${rects}</svg>`;
  return sharp(Buffer.from(svg))
    .blur(GLOW_SOFT / 2)
    .toColourspace("b-w")
    .webp({ quality: 90 })
    .toBuffer();
};
