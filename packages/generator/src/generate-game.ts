// Builds a whole game at once, from a work of fiction the brief names, without
// stopping for its author:
//
//   pnpm generate-game <game> "brief"   a new game
//   pnpm generate-game <game>           the scenes of a game that have no image yet
//
// Claude writes the key moments of the story, in order, with one style for all;
// Gemini paints them, the last one in landscape, the others in portrait (see
// gameSceneFormat). They are backgrounds only, without objects nor characters.
// The game starts in the first, the only one with an opening, its title being
// the game's. An exit being an object's action or a back button, the game has no
// links: each scene is played alone, until exits are added (see pnpm generate-scene).
//
// The texts are saved first, then each image once painted, its fond.webp last: a
// scene without one is not listed for the apps (see registry.ts), and is what the
// command paints when it is run again. Needs ANTHROPIC_API_KEY (for a new game)
// and GEMINI_API_KEY, in packages/generator/.env.local or .env (see env.ts).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Scene } from "@esquisse/engine";
import sharp from "sharp";
import { apiKey } from "./env.ts";
import { appSize, paintBackground } from "./paint.ts";
import { format, gameDir, ID, sceneDir, writeRegistries } from "./registry.ts";
import { gameSceneFormat, type WrittenGame, writeGame } from "./write-scene.ts";

const USAGE = 'Usage: pnpm generate-game <game> ["brief"]';
const [id, brief, ...rest] = process.argv.slice(2);
if (id === undefined || rest.length > 0) throw new Error(USAGE);
// It is a folder, a URL and a name in the registries' imports.
if (!ID.test(id)) throw new Error(`Invalid id: ${id} (kebab-case)`);

const GAME = join(gameDir(id), "game.json");
if (brief !== undefined && existsSync(gameDir(id))) {
  throw new Error(
    `The game "${id}" exists. pnpm generate-game ${id}, without a brief, paints what it lacks.`,
  );
}
if (brief === undefined && !existsSync(GAME)) {
  throw new Error(`No game "${id}": pnpm generate-game ${id} "brief"`);
}

// Those it needs are checked before anything is paid for.
const anthropicKey = brief === undefined ? undefined : apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const saveTexts = (written: WrittenGame, brief: string) => {
  const files: Record<string, unknown> = {
    [GAME]: {
      title: written.title,
      start: written.scenes[0]?.id,
      links: {},
    } satisfies Partial<Game>,
  };
  written.scenes.forEach((s, i) => {
    const { imageRatio, safe } = gameSceneFormat(i);
    const scene: Scene = {
      brief,
      // The first one's opening is the game's title screen.
      title: i === 0 ? written.title : s.title,
      intro: s.intro,
      imageRatio,
      safe,
      style: written.style,
      light: s.light,
      background: { prompt: s.prompt },
      objects: [],
      characters: [],
      ...(i === 0 ? {} : { opening: false }),
    };
    const dir = sceneDir(id, s.id);
    mkdirSync(dir, { recursive: true });
    files[join(dir, "scene.json")] = scene;
    files[join(dir, "objects.json")] = {};
    files[join(dir, "characters.json")] = {};
  });
  for (const [file, value] of Object.entries(files)) writeFileSync(file, json(value));
  format(Object.keys(files));
};

const paintScene = async (sceneId: string) => {
  const dir = sceneDir(id, sceneId);
  const scene: Scene = JSON.parse(readFileSync(join(dir, "scene.json"), "utf8"));
  console.log(`Painting ${sceneId} (${scene.imageRatio}), ${scene.title}…`);
  const background = await paintBackground(geminiKey, scene);
  mkdirSync(join(dir, "sources"), { recursive: true });
  writeFileSync(join(dir, "sources/fond.jpg"), background);
  await sharp(background)
    .resize(appSize(scene))
    .webp({ quality: 90 })
    .toFile(join(dir, "fond.webp"));
  writeRegistries();
};

// The scenes in the order of the story for a new game; on disk, it is not kept.
let scenes: string[];
if (brief !== undefined && anthropicKey !== undefined) {
  const written = await writeGame(anthropicKey, brief);
  console.log(`\n${written.title}\n`);
  written.scenes.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title} (${s.id})\n   ${s.intro}\n`);
  });
  saveTexts(written, brief);
  console.log(`Saved. If this stops, pnpm generate-game ${id} paints what is left.`);
  scenes = written.scenes.map((s) => s.id);
} else {
  scenes = readdirSync(join(gameDir(id), "scenes"));
}

for (const sceneId of scenes) {
  if (!existsSync(join(sceneDir(id, sceneId), "fond.webp"))) await paintScene(sceneId);
}

console.log(`\n✓ /game/${id}, run pnpm dev to play it. No scene leads to another: each one alone:`);
for (const sceneId of scenes) console.log(`  /game/${id}/scene/${sceneId}`);
