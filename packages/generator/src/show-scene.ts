// Shows what is clickable in a scene, without opening an app nor calling an
// API: the render of the generator's sessions (see render in paint.ts), from the
// scene as it is now, opened in the image viewer.
//
//   pnpm show-scene <id>
//
// The background is the one both apps show (fond.webp), the characters are
// placed by their feet, the safe zone is dashed, the objects are outlined in
// orange and the characters in blue, with their ids.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SceneData } from "@esquisse/shared";
import { render, show } from "./paint.ts";

const ROOT = join(import.meta.dirname, "../../..");

const [id, ...args] = process.argv.slice(2);
if (id === undefined || args.length > 0) throw new Error("Usage: pnpm show-scene <id>");
// Checked as in generate-scene.ts: the id must not reach outside its folders.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid id: ${id} (kebab-case)`);

const DIR = join(ROOT, "packages/shared/src/scenes", id);
const MEDIA = join(ROOT, "packages/shared/assets/scenes", id);
if (!existsSync(join(DIR, "scene.json"))) throw new Error(`No scene "${id}"`);

const read = (file: string) =>
  existsSync(join(DIR, file)) ? JSON.parse(readFileSync(join(DIR, file), "utf8")) : {};
const data: SceneData = {
  scene: read("scene.json"),
  objects: read("objects.json"),
  aspects: read("characters.json"),
};
const layers = Object.fromEntries(
  data.scene.characters
    .filter((c) => existsSync(join(MEDIA, `${c.id}.webp`)))
    .map((c) => [c.id, readFileSync(join(MEDIA, `${c.id}.webp`))]),
);

show(id, await render(data, readFileSync(join(MEDIA, "fond.webp")), layers));
