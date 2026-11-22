// Checks a game's game.json against its scenes, without opening an app nor
// calling an API: what would break it is an error, what is only odd a warning.
//
//   pnpm check-game [<id>]
//
// Without an id, every game in content/games. Exits with 1 if a game has an
// error.
//
// Errors: a game.json not shaped as a Game; a scene it names that is not in
// its scenes/ folder, or not complete, so the apps do not list it (see
// registry.ts); a link from an exit its scene does not have (an object's
// action's exit, or its back); a flag required in the game that nothing in it
// raises; an item an object holds that the game's items do not list.
// Warnings: an exit the game does not link (it stays closed: the action does
// what it would without it, the back button is not shown); a scene no exit
// leads to from the first; a scene of the game that no link names (it is only
// played alone); a flag raised that nothing requires.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkGame, type Items, type Scene } from "@esquisse/engine";
import { GAMES, gameDir, ID, listGames, sceneDir } from "./registry.ts";

// The checks themselves are in packages/engine (games/check.ts), shared with
// the studio.
export { checkGame } from "@esquisse/engine";

// ── The command ──────────────────────────────────────────────────────────────

const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

const isMain = process.argv[1] === import.meta.filename;
if (isMain) {
  const [only, ...args] = process.argv.slice(2);
  if (args.length > 0) throw new Error("Usage: pnpm check-game [<id>]");
  // The id must not reach outside its folder.
  if (only !== undefined && !ID.test(only)) throw new Error(`Invalid id: ${only} (kebab-case)`);

  const folders = (dir: string) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
          .sort()
      : [];

  // What the apps list (see registry.ts): the games, and each one's scenes.
  const listed = new Map(listGames().map((g) => [g.id, new Set(g.scenes.map((s) => s.id))]));

  const ids = only === undefined ? folders(GAMES) : [only];
  if (ids.length === 0) console.log("No game in content/games.");
  let failed = false;
  for (const id of ids) {
    const file = join(gameDir(id), "game.json");
    if (!existsSync(file)) throw new Error(`No game "${id}" (content/games/${id})`);
    const scenes = Object.fromEntries(
      folders(join(gameDir(id), "scenes"))
        .filter((s) => existsSync(join(sceneDir(id, s), "scene.json")))
        .map((s) => [s, read(join(sceneDir(id, s), "scene.json")) as Scene]),
    );
    const catalog = join(gameDir(id), "items/index.ts");
    const items: Items = existsSync(catalog) ? (await import(catalog)).ITEMS : {};
    const raw = read(file);
    const { errors, warnings } = checkGame(raw, scenes, listed.get(id) ?? new Set(), items);
    if (!listed.has(id) && errors.length === 0)
      errors.push("The apps do not list it: its first scene is not complete");
    failed ||= errors.length > 0;
    console.log(`${errors.length > 0 ? "✗" : "✓"} ${id}`);
    for (const e of errors) console.log(`  ✗ ${e}`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (failed) process.exit(1);
}
