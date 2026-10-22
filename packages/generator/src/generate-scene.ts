// Writes a scene's scene.json from a brief, generates its background and its
// characters, then detects where the objects really are in the background.
//
//   pnpm generate <id> ["brief"] [ecriture] [fond] [reperage] [personnages]
//
// Without a step, only the steps whose result is missing are done. A named step
// is redone, and so is what depends on it: a brief rewrites the scene, and
// rewriting the scene or redoing the background redoes everything after.
//
// The scene and the positions are in packages/shared/src/scenes/<id>, the
// converted images in packages/shared/assets/scenes/<id>, and the originals in
// packages/generator/sources/<id>. Once done, the scene is listed for both apps
// (see registry.ts). Needs ANTHROPIC_API_KEY (to write) and GEMINI_API_KEY (for
// the images), in packages/generator/.env.local or .env (see env.ts).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Box, Character, CharacterAspects, Scene } from "@esquisse/shared";
import sharp from "sharp";
import { characterZone, inside, overlap, pct, sceneProblems } from "./check-scene.ts";
import { apiKey } from "./env.ts";
import { detectBoxes, generateImage } from "./gemini.ts";
import { writeRegistries } from "./registry.ts";
import { writeScene } from "./write-scene.ts";

const GENERATOR = join(import.meta.dirname, "..");
const ROOT = join(GENERATOR, "../..");
const IMAGE_MODEL = "gemini-nano-banana-2.1";
const VISION_MODEL = "gemini-3.8-flash";
// Size of the composition guide, in 9:16.
const GUIDE = { width: 1152, height: 2048 };

const STEPS = ["ecriture", "fond", "reperage", "personnages"];

const [id, ...args] = process.argv.slice(2);
if (id === undefined) {
  throw new Error('Usage: pnpm generate <id> ["brief"] [step…]');
}
// The id is a folder, a URL and a name in the registries' imports.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid id: ${id} (kebab-case)`);
// The brief is the argument with spaces, so that a mistyped step is not taken
// for one and does not rewrite the scene.
const steps = new Set(args.filter((a) => STEPS.includes(a)));
const briefs = args.filter((a) => !STEPS.includes(a));
for (const a of briefs) if (!/\s/.test(a)) throw new Error(`Unknown step: ${a}`);
if (briefs.length > 1) throw new Error("Only one brief, in quotes.");
const brief = briefs[0];
const DIR = join(ROOT, "packages/shared/src/scenes", id);
const SOURCES = join(GENERATOR, "sources", id);
const MEDIA = join(ROOT, "packages/shared/assets/scenes", id);
const SCENE = join(DIR, "scene.json");

// Checked before anything is paid for: the images come after the writing.
const geminiKey = apiKey("GEMINI_API_KEY");

// Set once the scene is written (or read, if it already is).
let scene: Scene;

const where = (b: Box) =>
  `de ${pct(b.x0)} à ${pct(b.x1)} de la largeur, de ${pct(b.y0)} à ${pct(b.y1)} de la hauteur`;

// ── Composition guide ────────────────────────────────────────────────────────

const COLORS = ["#d94f30", "#2f7fd9", "#d9a730", "#8f4fd9"];

const guideSvg = () => {
  const { width: W, height: H } = GUIDE;
  const rect = (b: Box, attrs: string) =>
    `<rect x="${b.x0 * W}" y="${b.y0 * H}" width="${(b.x1 - b.x0) * W}" height="${(b.y1 - b.y0) * H}" ${attrs}/>`;
  const label = (b: Box, text: string) =>
    `<text x="${((b.x0 + b.x1) / 2) * W}" y="${((b.y0 + b.y1) / 2) * H}" font-size="44" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#000">${text}</text>`;
  // Without characters, the floor is the image's lower third.
  const floor =
    scene.characters.length > 0
      ? Math.min(...scene.characters.map((c) => c.anchor.y - c.height * 0.1))
      : 2 / 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><pattern id="h" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="40" stroke="#999" stroke-width="8"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="#e8e4dc"/>
  <rect x="0" y="${floor * H}" width="${W}" height="${(1 - floor) * H}" fill="#c9bfae"/>
  <text x="${W / 2}" y="${H * 0.93}" font-size="48" font-family="sans-serif" text-anchor="middle" fill="#555">SOL</text>
  ${scene.objects.map((o, i) => rect(o.zone, `fill="${COLORS[i % COLORS.length]}" fill-opacity="0.85"`) + label(o.zone, o.id.toUpperCase())).join("\n  ")}
  ${scene.characters.map((c) => rect(characterZone(scene, c), `fill="url(#h)" stroke="#777" stroke-width="4"`) + label(characterZone(scene, c), "VIDE")).join("\n  ")}
</svg>`;
};

// ── Steps ────────────────────────────────────────────────────────────────────

const write = async () => {
  const from = brief ?? (existsSync(SCENE) ? readScene().brief : undefined);
  if (from === undefined) {
    throw new Error(`No brief to write ${id} from: pnpm generate ${id} "brief"`);
  }
  const { scene, problems } = await writeScene(from, apiKey("ANTHROPIC_API_KEY"));
  writeFileSync(SCENE, `${JSON.stringify(scene, null, 2)}\n`);
  console.log(`✓ packages/shared/src/scenes/${id}/scene.json`);
  if (problems.length > 0) {
    throw new Error(
      `The composition still does not hold; fix scene.json by hand, then run again without a brief:\n  ${problems.join("\n  ")}`,
    );
  }
};

const readScene = (): Scene => JSON.parse(readFileSync(SCENE, "utf8"));

const backgroundPrompt = () =>
  [
    scene.style,
    scene.background.prompt,
    "L'image jointe est un schéma de composition, pas une image à imiter : chaque rectangle de couleur marque l'emplacement exact d'un élément du décor, la bande du bas marque le sol, et les zones hachurées « VIDE » doivent rester du sol et du mur dégagés, sans aucun objet ni meuble, car des personnages y seront ajoutés plus tard. Ne reproduis ni les rectangles, ni leurs couleurs, ni les mots du schéma.",
    "Éléments à placer, au format portrait :",
    ...scene.objects.map(
      (o) => `- ${o.paint}, ${where(o.zone)} (rectangle ${o.id.toUpperCase()}) ;`,
    ),
    "Ces éléments doivent être bien lisibles, entiers, et ne pas déborder de leur emplacement.",
  ].join("\n");

const generateBackground = async () => {
  const guide = await sharp(Buffer.from(guideSvg())).png().toBuffer();
  writeFileSync(join(SOURCES, "guide.png"), guide);
  console.log("Generating the background…");
  const jpg = await generateImage(geminiKey, {
    model: IMAGE_MODEL,
    prompt: backgroundPrompt(),
    references: [{ mimeType: "image/png", data: guide }],
    aspectRatio: scene.imageRatio,
    imageSize: "2K",
  });
  writeFileSync(join(SOURCES, "fond.jpg"), jpg);
  await sharp(jpg).resize({ width: 1440 }).webp({ quality: 90 }).toFile(join(MEDIA, "fond.webp"));
  console.log(`✓ packages/shared/assets/scenes/${id}/fond.webp`);
};

const locate = async () => {
  console.log(`Detecting the objects with ${VISION_MODEL}…`);
  const boxes = await detectBoxes(
    geminiKey,
    VISION_MODEL,
    readFileSync(join(SOURCES, "fond.jpg")),
    scene.objects,
  );
  const problems: string[] = [];
  for (const o of scene.objects) {
    const box = boxes[o.id];
    if (box === undefined) {
      problems.push(`${o.id}: not found`);
      continue;
    }
    const share = Math.round(overlap(box, o.zone) * 100);
    console.log(`  ${o.id}: ${where(box)} (${share} % in its planned zone)`);
    if (!inside(box, scene.safe)) problems.push(`${o.id}: outside the safe zone`);
  }
  writeFileSync(join(DIR, "objects.json"), `${JSON.stringify(boxes, null, 2)}\n`);
  console.log(`✓ packages/shared/src/scenes/${id}/objects.json`);
  if (problems.length > 0) {
    console.log(`⚠ ${problems.join("; ")}. Run again with “fond” to regenerate the background.`);
  }
};

const characterPrompt = (c: Character) =>
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

const generateCharacters = async () => {
  const background = readFileSync(join(SOURCES, "fond.jpg"));
  const aspects: CharacterAspects = {};
  for (const c of scene.characters) {
    console.log(`Generating ${c.id}…`);
    const jpg = await generateImage(geminiKey, {
      model: IMAGE_MODEL,
      prompt: characterPrompt(c),
      references: [{ mimeType: "image/jpeg", data: background }],
      aspectRatio: "9:16",
      imageSize: "2K",
    });
    writeFileSync(join(SOURCES, `${c.id}.jpg`), jpg);
    const { data, info } = await chromaKey(jpg);
    aspects[c.id] = info.width / info.height;
    await sharp(data)
      .resize({ height: 1000, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 90 })
      .toFile(join(MEDIA, `${c.id}.webp`));
    console.log(`✓ packages/shared/assets/scenes/${id}/${c.id}.webp`);
  }
  writeFileSync(join(DIR, "characters.json"), `${JSON.stringify(aspects, null, 2)}\n`);
};

// ── Run ──────────────────────────────────────────────────────────────────────

mkdirSync(DIR, { recursive: true });
mkdirSync(SOURCES, { recursive: true });
mkdirSync(MEDIA, { recursive: true });
const redo = (step: string, output: string, after?: boolean) =>
  steps.has(step) || after === true || !existsSync(output);

const written = brief !== undefined || redo("ecriture", SCENE);
if (written) await write();
scene = readScene();
// A scene written by hand is checked too, before any image is paid for.
const problems = sceneProblems(scene);
if (problems.length > 0) console.log(`⚠ scene.json:\n  ${problems.join("\n  ")}`);

const background = redo("fond", join(MEDIA, "fond.webp"), written);
if (background) await generateBackground();
if (redo("reperage", join(DIR, "objects.json"), background)) await locate();
if (redo("personnages", join(DIR, "characters.json"), background)) await generateCharacters();
console.log(`✓ Scenes listed for both apps: ${writeRegistries().join(", ")}`);
