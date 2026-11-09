// The scene's background, painted by Gemini from its decor, and the render shown
// to the author: the background, the characters placed on it, and the outlines
// of what is clickable.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Box, Scene, SceneData } from "@esquisse/engine";
import { characterBox, isLandscape, sceneRatio } from "@esquisse/engine/layout";
import sharp from "sharp";
import { generateImage } from "./gemini.ts";

export const IMAGE_MODEL = "gemini-nano-banana-2.1";

// The background is painted in the scene's format (9:16 or 16:9).
export const paintBackground = (key: string, scene: Scene) =>
  generateImage(key, {
    model: IMAGE_MODEL,
    prompt: [
      scene.style,
      scene.background.prompt,
      isLandscape(scene) ? "Format paysage." : "Format portrait.",
    ].join("\n"),
    references: [],
    aspectRatio: scene.imageRatio,
    imageSize: "2K",
  });

// ── The render ───────────────────────────────────────────────────────────────

// The render's longest side.
const LENGTH = 1920;

// The background, the characters' layers placed by their feet, and outlines:
// the safe zone dashed, the objects in orange and the characters in blue, with
// their ids.
export const render = async (
  { scene, objects, aspects }: SceneData,
  background: Buffer,
  layers: Record<string, Buffer>,
) => {
  const ratio = sceneRatio(scene);
  const W = Math.round(ratio > 1 ? LENGTH : LENGTH * ratio);
  const H = Math.round(W / ratio);
  const px = (b: Box) => ({
    left: Math.round(b.x0 * W),
    top: Math.round(b.y0 * H),
    width: Math.round((b.x1 - b.x0) * W),
    height: Math.round((b.y1 - b.y0) * H),
  });
  const characters = await Promise.all(
    scene.characters.flatMap((c) => {
      const layer = layers[c.id];
      if (layer === undefined) return [];
      const { left, top, width, height } = px(characterBox(c, aspects[c.id] ?? 0.4, ratio));
      return [
        sharp(layer)
          .resize(width, height, { fit: "fill" })
          .toBuffer()
          .then((input) => ({ input, left: Math.max(0, left), top: Math.max(0, top) })),
      ];
    }),
  );
  const outline = (b: Box, color: string, label: string) => {
    const { left, top, width, height } = px(b);
    return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="4"/>
  <rect x="${left}" y="${top}" width="${label.length * 15 + 16}" height="34" fill="${color}"/>
  <text x="${left + 8}" y="${top + 25}" font-size="26" font-family="sans-serif" font-weight="bold" fill="#000">${label}</text>`;
  };
  const safe = px(scene.safe);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${safe.left}" y="${safe.top}" width="${safe.width}" height="${safe.height}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="3" stroke-dasharray="14 10"/>
  ${scene.objects.flatMap((o) => (objects[o.id] ? [outline(objects[o.id] as Box, "#f59e0b", o.id)] : [])).join("\n  ")}
  ${scene.characters.map((c) => outline(characterBox(c, aspects[c.id] ?? 0.4, ratio), "#60a5fa", c.id)).join("\n  ")}
</svg>`;
  return sharp(background)
    .resize(W, H, { fit: "cover" })
    .composite([...characters, { input: Buffer.from(svg) }])
    .jpeg({ quality: 85 })
    .toBuffer();
};

const OPEN = { darwin: "open", win32: "explorer" } as Partial<Record<NodeJS.Platform, string>>;

// Saves the render in the system's temporary folder and opens it in the image
// viewer; each step has its own file, so a viewer showing the previous one is
// not fooled by its cache.
let shown = 0;
export const show = (id: string, jpg: Buffer) => {
  const file = join(tmpdir(), `esquisse-${id}-${++shown}.jpg`);
  writeFileSync(file, jpg);
  console.log(`  Render: ${file}`);
  try {
    const viewer = spawn(OPEN[process.platform] ?? "xdg-open", [file], {
      detached: true,
      stdio: "ignore",
    });
    viewer.on("error", () => console.log("  (no image viewer found: open the file above)"));
    viewer.unref();
  } catch {
    console.log("  (no image viewer found: open the file above)");
  }
};
