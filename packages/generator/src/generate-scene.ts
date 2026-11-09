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
// A scene of a game made by pnpm generate-game keeps the game's style: when its
// game.json keeps its brief and its "generation" gives all its painted scenes
// one style, Claude writes within the game and that style is kept as it is. A
// scene painted again keeps whether it has an opening, from its scene.json, or
// from the game's plan for a scene not made yet.
//
// What is validated is saved at once: the scene and the converted background in
// content/games/<game>/scenes/<id>, the original in its sources/, and the scene
// listed for both apps (see registry.ts). Needs ANTHROPIC_API_KEY (to write) and
// GEMINI_API_KEY (for the image), in packages/generator/.env.local or .env (see
// env.ts).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Scene } from "@esquisse/engine";
import { apiKey } from "./env.ts";
import { format, gameDir, ID, sceneDir } from "./registry.ts";
import { json, paintScene, session } from "./session.ts";
import { baseWriter, FORMATS, type Orientation } from "./write-scene.ts";

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

const DIR = sceneDir(game, id);
const GAME = join(gameDir(game), "game.json");
const SCENE = join(DIR, "scene.json");

// Both are checked before anything is paid for.
const anthropicKey = apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");

const author = session();
const { choose } = author;

const read = <T>(path: string): T | undefined =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
const gameJson = read<Game>(GAME);
const previous = read<Scene>(SCENE);

// The game's style: one for all the scenes generate-game painted.
const styles = new Set(
  (gameJson?.generation?.scenes ?? []).flatMap((s) => (s.style === undefined ? [] : [s.style])),
);
const [style] = styles;
const context =
  gameJson?.brief !== undefined && styles.size === 1 && style !== undefined
    ? { brief: gameJson.brief, style }
    : undefined;
// false: no opening, as the scene had, or as the game's plan has it.
const opening =
  previous !== undefined
    ? previous.opening
    : gameJson?.generation?.scenes.find((s) => s.id === id)?.opening;

if (previous !== undefined) {
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

if (context !== undefined) console.log(`Within the game "${game}": its brief and its style`);
if (opening === false) console.log(`"${id}" has no opening`);
const writer = baseWriter(anthropicKey, FORMAT, context);
const painted = await paintScene({
  session: author,
  geminiKey,
  game,
  id,
  format: FORMAT,
  brief,
  writer,
  opening,
});
if (painted === undefined) process.exit(0);
author.close();
console.log(`✓ ${painted.scene.title}: /game/${game}/scene/${id}, run pnpm dev to see it`);
