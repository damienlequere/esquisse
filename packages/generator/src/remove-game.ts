// Removes a game entirely: its game.json, its items, and all its scenes with
// their texts, their images and their originals, then lists the remaining games
// for both apps (see registry.ts).
//
//   pnpm remove-game <game> [--yes]
//
// Asks before deleting anything, unless --yes is given.

import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { gameDir, ID, writeRegistries } from "./registry.ts";

const ROOT = join(import.meta.dirname, "../../..");

const [game, ...args] = process.argv.slice(2);
if (game === undefined) throw new Error("Usage: pnpm remove-game <game> [--yes]");
// Checked as in generate-scene.ts: the id must not reach outside its folder.
if (!ID.test(game)) throw new Error(`Invalid id: ${game} (kebab-case)`);
for (const a of args) if (a !== "--yes") throw new Error(`Unknown argument: ${a}`);

const folder = gameDir(game);
if (!existsSync(folder)) throw new Error(`No game "${game}"`);

const scenes = join(folder, "scenes");
const names = existsSync(scenes) ? readdirSync(scenes).sort() : [];
console.log(
  `Removing the game "${game}":\n  ${relative(ROOT, folder)}\n  Scenes: ${names.join(", ") || "none"}`,
);
if (!args.includes("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Delete this folder? [y/N] ");
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("Nothing removed.");
    process.exit(0);
  }
}

rmSync(folder, { recursive: true });
const listed = writeRegistries().map((g) => g.id);
console.log(`✓ Removed. Games listed for both apps: ${listed.join(", ") || "none"}`);
