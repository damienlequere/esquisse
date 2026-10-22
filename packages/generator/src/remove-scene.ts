// Removes a scene entirely: its texts and positions, its converted images and
// its originals, then lists the remaining scenes for both apps (see registry.ts).
//
//   pnpm remove-scene <id> [--yes]
//
// Asks before deleting anything, unless --yes is given.

import { existsSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { writeRegistries } from "./registry.ts";

const GENERATOR = join(import.meta.dirname, "..");
const ROOT = join(GENERATOR, "../..");

const [id, ...args] = process.argv.slice(2);
if (id === undefined) throw new Error("Usage: pnpm remove-scene <id> [--yes]");
// Checked as in generate-scene.ts: the id must not reach outside its folders.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid id: ${id} (kebab-case)`);
for (const a of args) if (a !== "--yes") throw new Error(`Unknown argument: ${a}`);

const folders = [
  join(ROOT, "packages/shared/src/scenes", id),
  join(ROOT, "packages/shared/assets/scenes", id),
  join(GENERATOR, "sources", id),
].filter((f) => existsSync(f));
if (folders.length === 0) throw new Error(`No scene "${id}"`);

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
console.log(`✓ Removed. Scenes listed for both apps: ${writeRegistries().join(", ") || "none"}`);
