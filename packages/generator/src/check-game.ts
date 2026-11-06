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
import type { Game, Items, Scene } from "@esquisse/engine";
import { GAMES, gameDir, ID, listGames, sceneDir } from "./registry.ts";

export type Report = { errors: string[]; warnings: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// What is wrong with the shape of a game.json, if anything.
const shapeErrors = (game: unknown): string[] => {
  if (!isRecord(game)) return ["game.json is not an object"];
  const errors: string[] = [];
  if (typeof game.title !== "string") errors.push(`"title" must be a string`);
  if (typeof game.start !== "string") errors.push(`"start" must be a scene's id`);
  if (!isRecord(game.links)) errors.push(`"links" must be { scene: { exit: scene } }`);
  else
    for (const [from, exits] of Object.entries(game.links)) {
      if (!isRecord(exits)) errors.push(`links.${from} must be { exit: scene }`);
      else
        for (const [exit, to] of Object.entries(exits))
          if (typeof to !== "string") errors.push(`links.${from}.${exit} must be a scene's id`);
    }
  return errors;
};

// A scene's exits, by name, each with what offers it: an object's action, or
// the back button.
const exitsOf = (scene: Scene) => {
  const exits = new Map<string, string>();
  if (scene.back !== undefined) exits.set(scene.back, "the back button");
  for (const object of scene.objects)
    for (const action of object.actions ?? [])
      if (action.exit !== undefined && !exits.has(action.exit))
        exits.set(action.exit, `« ${action.label} » on ${object.id}`);
  return exits;
};

// The flags a scene's actions raise and require, each with where.
const flagsOf = (id: string, scene: Scene) => {
  const sets: [string, string][] = [];
  const requires: [string, string][] = [];
  for (const object of scene.objects)
    for (const action of object.actions ?? []) {
      const where = `${id}: « ${action.label} » on ${object.id}`;
      if (action.sets !== undefined) sets.push([action.sets, where]);
      if (action.requires !== undefined) requires.push([action.requires, where]);
    }
  return { sets, requires };
};

// The checks of one game, from its game.json as read, its scenes as they are on
// disk (by id, those that exist), those the apps list, and its items.
export const checkGame = (
  raw: unknown,
  scenes: Record<string, Scene>,
  listed: Set<string>,
  items: Items,
): Report => {
  const errors = shapeErrors(raw);
  const warnings: string[] = [];
  if (errors.length > 0) return { errors, warnings };
  const game = raw as Game;

  // The scenes it names: each must exist, and be listed for the apps.
  const named = new Set([
    game.start,
    ...Object.keys(game.links),
    ...Object.values(game.links).flatMap(Object.values),
  ]);
  for (const id of named) {
    if (!(id in scenes)) errors.push(`No scene « ${id} » in the game (scenes/${id})`);
    else if (!listed.has(id))
      errors.push(`« ${id} » is not complete: the apps do not list it (pnpm generate-scene)`);
  }
  for (const id of Object.keys(scenes))
    if (!named.has(id)) warnings.push(`« ${id} » is in no link: it is only played alone`);

  // What the objects hold is in the game's items.
  for (const [id, scene] of Object.entries(scenes))
    for (const object of scene.objects)
      for (const item of object.contents ?? [])
        if (!Object.hasOwn(items, item))
          errors.push(`${id}: ${object.id} holds « ${item} », not in the game's items`);

  // Each link leaves from an exit its scene has.
  for (const [from, links] of Object.entries(game.links)) {
    const scene = scenes[from];
    if (scene === undefined) continue;
    const exits = exitsOf(scene);
    for (const [exit, to] of Object.entries(links))
      if (!exits.has(exit))
        errors.push(
          `${from}: no exit « ${exit} » to link to « ${to} » (an action's exit, or back)`,
        );
  }

  // The scenes reached from the first, by its links.
  const reached = new Set<string>();
  const next = [game.start];
  for (let id = next.pop(); id !== undefined; id = next.pop()) {
    if (reached.has(id) || !(id in scenes)) continue;
    reached.add(id);
    next.push(...Object.values(game.links[id] ?? {}));
  }
  for (const id of named)
    if (id in scenes && !reached.has(id))
      warnings.push(`« ${id} » cannot be reached from « ${game.start} »`);

  // Every exit of a scene reached is linked, or stays closed.
  for (const id of reached) {
    const scene = scenes[id];
    if (scene === undefined) continue;
    for (const [exit, by] of exitsOf(scene))
      if (game.links[id]?.[exit] === undefined)
        warnings.push(`${id}: the exit « ${exit} » (${by}) is not linked: it stays closed`);
  }

  // A flag required is raised somewhere the player can go; one raised is
  // required somewhere.
  const sets = new Map<string, string>();
  const requires = new Map<string, string>();
  for (const id of reached) {
    const scene = scenes[id];
    if (scene === undefined) continue;
    const flags = flagsOf(id, scene);
    for (const [flag, where] of flags.sets) if (!sets.has(flag)) sets.set(flag, where);
    for (const [flag, where] of flags.requires) if (!requires.has(flag)) requires.set(flag, where);
  }
  for (const [flag, where] of requires)
    if (!sets.has(flag))
      errors.push(`${where} requires « ${flag} », which nothing in the game raises`);
  for (const [flag, where] of sets)
    if (!requires.has(flag)) warnings.push(`${where} raises « ${flag} », which nothing requires`);

  return { errors, warnings };
};

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
