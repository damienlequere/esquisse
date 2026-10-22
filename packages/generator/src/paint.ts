// The scene's images, with Gemini: the background painted from its decor, an
// object added by retouching it, a character painted on green and keyed out.
// Then the render shown at each step: the background, the characters placed on
// it, and the outlines of what is clickable.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Box, Character, Scene, SceneData, SceneObject } from "@esquisse/shared";
import { characterBox, sceneRatio } from "@esquisse/shared/layout";
import sharp from "sharp";
import { pct } from "./check-scene.ts";
import { detectBoxes, generateImage } from "./gemini.ts";

const IMAGE_MODEL = "gemini-nano-banana-2.1";
const VISION_MODEL = "gemini-3.8-flash";

export const where = (b: Box) =>
  `de ${pct(b.x0)} à ${pct(b.x1)} de la largeur, de ${pct(b.y0)} à ${pct(b.y1)} de la hauteur`;

const paint = (key: string, prompt: string, references: Buffer[]) =>
  generateImage(key, {
    model: IMAGE_MODEL,
    prompt,
    references: references.map((data) => ({ mimeType: "image/jpeg", data })),
    aspectRatio: "9:16",
    imageSize: "2K",
  });

export const paintBackground = (key: string, scene: Scene) =>
  paint(key, [scene.style, scene.background.prompt, "Format portrait."].join("\n"), []);

// The object is painted into the background as it is: the rest must not move.
export const addObject = (key: string, scene: Scene, background: Buffer, o: SceneObject) =>
  paint(
    key,
    [
      scene.style,
      `Retouche l'image jointe : ajoute-y ${o.paint}, ${where(o.zone)}.`,
      `Il s'intègre au décor comme s'il y avait toujours été : même technique de peinture, même touche, même lumière (${scene.light}), même perspective, avec ses ombres et ses reflets.`,
      "Ne change rien d'autre : le cadrage, le décor et tout ce qui s'y trouve restent identiques, à la même place. N'ajoute aucune personne ni aucun texte.",
    ].join("\n"),
    [background],
  );

export const detectObjects = (key: string, background: Buffer, objects: SceneObject[]) =>
  objects.length === 0
    ? Promise.resolve<Record<string, Box>>({})
    : detectBoxes(key, VISION_MODEL, background, objects);

const characterPrompt = (scene: Scene, c: Character) =>
  [
    scene.style,
    `Un seul personnage : ${c.paint}.`,
    "Il est représenté en pied, entier de la tête aux pieds, centré, sur un fond uni vert chroma pur (#00FF00), sans aucun décor, sans sol et sans ombre portée. Aucun vert dans ses vêtements ni dans ce qu'il tient.",
    `L'image jointe est le décor où il se tiendra : même style de peinture, même touche et même lumière (${scene.light}), vu à la même hauteur que le décor.`,
  ].join("\n");

// Green screen keying: transparent above a "greenness" threshold, faded below,
// and the green spilling on the edges brought back to the other channels.
const chromaKey = async (jpg: Buffer) => {
  const { data, info } = await sharp(jpg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] as number;
    const g = data[i + 1] as number;
    const b = data[i + 2] as number;
    const green = g - Math.max(r, b);
    if (green > 25) {
      data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (70 - green) / 45)));
      data[i + 1] = Math.max(r, b);
    }
  }
  return sharp(data, { raw: info }).png().trim().toBuffer({ resolveWithObject: true });
};

// The original, its keyed layer (PNG), and the layer's width / height.
export const paintCharacter = async (
  key: string,
  scene: Scene,
  background: Buffer,
  c: Character,
) => {
  const jpg = await paint(key, characterPrompt(scene, c), [background]);
  const { data, info } = await chromaKey(jpg);
  return { jpg, layer: data, aspect: info.width / info.height };
};

// ── The render ───────────────────────────────────────────────────────────────

const WIDTH = 1080;

// The background, the characters' layers placed by their feet, and outlines:
// the safe zone dashed, the objects in orange and the characters in blue, with
// their ids.
export const render = async (
  { scene, objects, aspects }: SceneData,
  background: Buffer,
  layers: Record<string, Buffer>,
) => {
  const ratio = sceneRatio(scene);
  const W = WIDTH;
  const H = Math.round(WIDTH / ratio);
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
