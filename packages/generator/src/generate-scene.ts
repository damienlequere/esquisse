// Paints a scene's background, with its author, in the terminal:
//
//   pnpm generate-scene <game> <id> portrait|landscape "brief"
//
// A scene belongs to a game (content/games/<game>): a new game is made with its
// first scene, which it starts in; its game.json then says where the exits of
// the scenes added to it lead (see pnpm check-game).
//
// The orientation is the image's: portrait (9:16) or landscape (16:9), played
// with the screen turned to match.
//
// Claude writes the decor from the brief, Gemini paints it, and the author
// validates it, has it painted again, or asks for a change. The render opens in
// the image viewer. The objects, the characters and the animations are not made
// here: they are written in scene.json by hand.
//
// What is validated is saved at once: the scene and the converted background in
// content/games/<game>/scenes/<id>, the original in its sources/, and the scene
// listed for both apps (see registry.ts). Needs ANTHROPIC_API_KEY (to write) and
// GEMINI_API_KEY (for the image), in packages/generator/.env.local or .env (see
// env.ts).

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import type { Scene, SceneData } from "@esquisse/engine";
import { isLandscape } from "@esquisse/engine/layout";
import sharp from "sharp";
import { apiKey } from "./env.ts";
import { paintBackground, render, show } from "./paint.ts";
import { format, gameDir, ID, sceneDir, writeRegistries } from "./registry.ts";
import { type Base, baseWriter, FORMATS, type Orientation } from "./write-scene.ts";

const USAGE = 'Usage: pnpm generate-scene <game> <id> portrait|landscape "brief"';
const [game, id, ...args] = process.argv.slice(2);
if (game === undefined || id === undefined) throw new Error(USAGE);
// Both ids are folders, URLs and names in the registries' imports.
for (const i of [game, id]) if (!ID.test(i)) throw new Error(`Invalid id: ${i} (kebab-case)`);
const [orientation, brief, ...rest] = args;
if (orientation === undefined || !Object.hasOwn(FORMATS, orientation)) {
  throw new Error(`The orientation comes first, portrait or landscape.\n${USAGE}`);
}
if (brief === undefined) throw new Error(`The brief is missing, in quotes.\n${USAGE}`);
if (rest.length > 0) throw new Error(`Only one brief, in quotes.\n${USAGE}`);
const FORMAT = FORMATS[orientation as Orientation];

// A scene's folder holds it all: its texts, its converted images, and their
// originals in sources/.
const DIR = sceneDir(game, id);
const SOURCES = join(DIR, "sources");
const GAME = join(gameDir(game), "game.json");
const SCENE = join(DIR, "scene.json");

// Both are checked before anything is paid for.
const anthropicKey = apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");

const rl = createInterface({ input: process.stdin, output: process.stdout });
// Without a listener, readline only pauses on Ctrl+C.
rl.on("SIGINT", () => process.exit(130));

// Asks until the answer is one of the choices' keys.
const choose = async (question: string, choices: Record<string, string>) => {
  const line = Object.entries(choices)
    .map(([k, label]) => `[${k}] ${label}`)
    .join("  ");
  for (;;) {
    const answer = (await rl.question(`${question}  ${line}\n> `)).trim().toLowerCase();
    if (Object.hasOwn(choices, answer)) return answer;
  }
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// The size the apps get the background at: 1440 × 2560 or 2560 × 1440.
const appSize = (scene: Scene) => (isLandscape(scene) ? { width: 2560 } : { width: 1440 });

const save = async (scene: Scene, background: Buffer) => {
  mkdirSync(SOURCES, { recursive: true });
  const texts = {
    [SCENE]: scene,
    [join(DIR, "objects.json")]: {},
    [join(DIR, "characters.json")]: {},
  };
  for (const [file, value] of Object.entries(texts)) writeFileSync(file, json(value));
  format(Object.keys(texts));
  writeFileSync(join(SOURCES, "fond.jpg"), background);
  await sharp(background)
    .resize(appSize(scene))
    .webp({ quality: 90 })
    .toFile(join(DIR, "fond.webp"));
  writeRegistries();
  console.log(`✓ Saved: /game/${game}/scene/${id} in both apps`);
};

if (existsSync(SCENE)) {
  const answer = await choose(`The scene "${id}" exists: start it over, losing it?`, {
    o: "oui",
    n: "non",
  });
  if (answer === "n") process.exit(0);
  rmSync(DIR, { recursive: true, force: true });
}
// A new game starts in its first scene; its title is to be written by hand.
if (!existsSync(GAME)) {
  mkdirSync(gameDir(game), { recursive: true });
  writeFileSync(GAME, json({ title: game, start: id, links: {} }));
  format([GAME]);
  console.log(`New game "${game}", starting in "${id}": its title is in ${GAME}`);
}

const writer = baseWriter(anthropicKey, FORMAT);
let base: Base = await writer.write(brief);
for (;;) {
  const scene: Scene = {
    brief,
    title: base.title,
    intro: base.intro,
    imageRatio: FORMAT.imageRatio,
    safe: FORMAT.safe,
    style: base.style,
    light: base.light,
    background: base.background,
    objects: [],
    characters: [],
  };
  console.log(`\n${scene.title}\n${scene.intro}\n\nDécor : ${scene.background.prompt}\n`);
  console.log("Painting the background…");
  const background = await paintBackground(geminiKey, scene);
  const data: SceneData = { scene, objects: {}, aspects: {} };
  show(`${game}-${id}`, await render(data, background, {}));
  const answer = await choose("Le fond :", {
    v: "valider",
    r: "repeindre",
    m: "modifier",
    q: "quitter",
  });
  if (answer === "v") {
    await save(scene, background);
    break;
  }
  if (answer === "q") process.exit(0);
  if (answer === "m") base = await writer.revise(await rl.question("Que changer ?\n> "));
}
rl.close();
console.log(`✓ ${base.title}: /game/${game}/scene/${id}, run pnpm dev to see it`);
