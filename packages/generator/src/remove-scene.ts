// Removes a scene entirely: its texts and positions, its converted images and
// its originals, then lists the remaining scenes for both apps (see registry.ts).
//
//   pnpm remove-scene <game> <id> [--yes]
//
// Asks before deleting anything, unless --yes is given.

import { existsSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { ID, sceneDir, writeRegistries } from "./registry.ts";

const ROOT = join(import.meta.dirname, "../../..");

const [game, id, ...args] = process.argv.slice(2);
if (game === undefined || id === undefined)
  throw new Error("Usage: pnpm remove-scene <game> <id> [--yes]");
// Checked as in generate-scene.ts: the ids must not reach outside their folders.
for (const i of [game, id]) if (!ID.test(i)) throw new Error(`Invalid id: ${i} (kebab-case)`);
for (const a of args) if (a !== "--yes") throw new Error(`Unknown argument: ${a}`);

const folders = [sceneDir(game, id)].filter((f) => existsSync(f));
if (folders.length === 0) throw new Error(`No scene "${id}" in "${game}"`);

console.log(`Removing the scene "${id}":\n  ${folders.map((f) => relative(ROOT, f)).join("\n  ")}`);
if (!args.includes("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Delete these folders? [y/N] ");
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("Nothing removed.");
    process.exit(0);
  }
}

for (const f of folders) rmSync(f, { recursive: true });
const listed = writeRegistries().find((g) => g.id === game);
console.log(
  `✓ Removed. Scenes of "${game}" listed for both apps: ${listed?.scenes.join(", ") || "none"}`,
);
// Its game may still start in it, or lead to it.
console.log(`Run pnpm check-game ${game} to see what in the game still names it.`);
