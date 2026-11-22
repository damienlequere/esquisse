// The games as they are on disk, in content/games, read and written by the
// studio as the generator reads and writes them (packages/generator): the same
// files, formatted by Biome, and the lists of both apps written again after a
// scene is saved. Only on the server.

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  type CharacterAspects,
  effectFiles,
  type Game,
  type Items,
  type ObjectBoxes,
  type Scene,
} from "@esquisse/engine";
import type { StudioGame, StudioScene, StudioSummary } from "../types.ts";

const run = promisify(execFile);

// The repository's root: the folder with pnpm-workspace.yaml, above the studio.
const findRoot = () => {
  for (let dir = process.cwd(); dir !== dirname(dir); dir = dirname(dir))
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
  throw new Error("The studio runs inside the esquisse repository");
};
export const ROOT = findRoot();
export const GAMES = join(ROOT, "content/games");
export const GENERATOR = join(ROOT, "packages/generator");

// As in packages/generator/src/registry.ts: a game's or a scene's id is a
// folder, a URL and a name in the lists' imports.
export const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const checkId = (id: string) => {
  if (!ID.test(id)) throw new HttpError(400, `Invalid id: ${id} (kebab-case)`);
  return id;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const gameDir = (game: string) => join(GAMES, checkId(game));
export const sceneDir = (game: string, scene: string) =>
  join(gameDir(game), "scenes", checkId(scene));

const readJson = <T>(path: string, fallback?: T): T => {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new HttpError(404, `No file ${path.slice(ROOT.length + 1)}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
};

const folders = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((name) => ID.test(name))
        .sort()
    : [];

// A file's URL in the studio, its time in it, for the browser to ask again
// once it is painted again.
const media = (path: string) =>
  existsSync(path)
    ? `/api/media/${path.slice(GAMES.length + 1)}?v=${Math.round(statSync(path).mtimeMs)}`
    : undefined;

// The items a game lists, from its items/index.ts, without running it: each
// entry's id, its name, and whether it is feminine. Only shown in the studio,
// which does not write that file.
const readItems = (game: string): Items => {
  const file = join(gameDir(game), "items/index.ts");
  if (!existsSync(file)) return {};
  const items: Items = {};
  const entry = /(?:^|[\s{,])(["']?)([a-z][a-z0-9-]*)\1\s*:\s*\{([^}]*)\}/g;
  for (const [, , id, body] of readFileSync(file, "utf8").matchAll(entry)) {
    const name = /name:\s*(["'])(.*?)\1/.exec(body ?? "")?.[2];
    if (id === undefined || name === undefined) continue;
    items[id] = { name, ...(/feminine:\s*true/.test(body ?? "") ? { feminine: true } : {}) };
  }
  return items;
};

const readScene = (game: string, id: string): StudioScene => {
  const dir = sceneDir(game, id);
  const scene = readJson<Scene>(join(dir, "scene.json"));
  const objects = readJson<ObjectBoxes>(join(dir, "objects.json"), {});
  const aspects = readJson<CharacterAspects>(join(dir, "characters.json"), {});
  const file = (name: string) => media(join(dir, `${name}.webp`));
  const background = file("fond");
  const night = scene.night !== undefined ? file("nuit") : undefined;
  const characters = Object.fromEntries(
    scene.characters.flatMap((c) => {
      const url = file(c.id);
      return url === undefined ? [] : [[c.id, url]];
    }),
  );
  const effects = Object.fromEntries(
    (scene.effects ?? []).map((e) => [e.id, effectFiles(e).flatMap((f) => file(f) ?? [])]),
  );
  // What the apps need to list it (see complete in registry.ts).
  const missing = [
    ...["scene.json", "objects.json", "characters.json"].filter((f) => !existsSync(join(dir, f))),
    ...[
      "fond",
      ...(scene.night !== undefined ? ["nuit"] : []),
      ...scene.characters.map((c) => c.id),
      ...(scene.effects ?? []).flatMap((e) => effectFiles(e)),
    ]
      .filter((f) => !existsSync(join(dir, `${f}.webp`)))
      .map((f) => `${f}.webp`),
  ];
  return {
    id,
    data: { scene, objects, aspects },
    images: { background: background ?? "", night, characters, effects },
    missing,
  };
};

const sceneIds = (game: string) =>
  folders(join(gameDir(game), "scenes")).filter((id) =>
    existsSync(join(sceneDir(game, id), "scene.json")),
  );

export const listGames = (): StudioSummary[] =>
  folders(GAMES).flatMap((id) => {
    const file = join(gameDir(id), "game.json");
    if (!existsSync(file)) return [];
    const game = readJson<Game>(file);
    const scenes = sceneIds(id);
    const first = scenes.includes(game.start) ? game.start : scenes[0];
    return [
      {
        id,
        title: game.title,
        start: game.start,
        scenes,
        planned: (game.generation?.scenes ?? []).map((s) => s.id),
        thumbnail: first === undefined ? undefined : media(join(sceneDir(id, first), "fond.webp")),
      },
    ];
  });

export const readGame = (game: string): StudioGame => {
  const file = join(gameDir(game), "game.json");
  if (!existsSync(file)) throw new HttpError(404, `No game « ${game} »`);
  const scenes = Object.fromEntries(sceneIds(game).map((id) => [id, readScene(game, id)]));
  return {
    id: game,
    game: readJson<Game>(file),
    scenes,
    items: readItems(game),
    itemImages: Object.fromEntries(
      existsSync(join(gameDir(game), "items"))
        ? readdirSync(join(gameDir(game), "items"))
            .filter((f) => f.endsWith(".webp"))
            .flatMap((f) => {
              const url = media(join(gameDir(game), "items", f));
              return url === undefined ? [] : [[f.slice(0, -".webp".length), url]];
            })
        : [],
    ),
  };
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// As the generator does it (see format in registry.ts).
const format = (files: string[]) =>
  run(join(ROOT, "node_modules/.bin/biome"), ["check", "--write", ...files], { cwd: ROOT });

// The lists of both apps, from what is on disk (see registry.ts): a scene's
// characters and night are imports there.
const writeRegistries = () =>
  run(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "src/write-registries.ts",
    ],
    { cwd: GENERATOR },
  );

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const writeGame = async (game: string, value: unknown) => {
  const file = join(gameDir(game), "game.json");
  if (!existsSync(file)) throw new HttpError(404, `No game « ${game} »`);
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.start !== "string")
    throw new HttpError(400, "game.json needs a title and a start");
  writeFileSync(file, json(value));
  await format([file]);
};

export const writeScene = async (game: string, id: string, value: unknown) => {
  const dir = sceneDir(game, id);
  if (!existsSync(join(dir, "scene.json"))) throw new HttpError(404, `No scene « ${id} »`);
  if (!isRecord(value) || !isRecord(value.scene) || !isRecord(value.objects))
    throw new HttpError(400, "A scene is { scene, objects, aspects }");
  const scene = value.scene as Scene;
  if (!Array.isArray(scene.objects) || !Array.isArray(scene.characters))
    throw new HttpError(400, "A scene has objects and characters");
  for (const o of scene.objects) checkId(o.id);
  for (const c of scene.characters) checkId(c.id);
  const files = {
    [join(dir, "scene.json")]: scene,
    [join(dir, "objects.json")]: value.objects,
    [join(dir, "characters.json")]: isRecord(value.aspects) ? value.aspects : {},
  };
  for (const [file, content] of Object.entries(files)) writeFileSync(file, json(content));
  await format(Object.keys(files));
  await writeRegistries();
};

// A character's layer, from an image with its transparency: its original in
// sources/, the app's in webp, and its proportions in characters.json.
export const writeLayer = async (game: string, scene: string, id: string, image: Buffer) => {
  const sharp = (await import("sharp")).default;
  const dir = sceneDir(game, scene);
  checkId(id);
  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new HttpError(400, "Not an image");
  mkdirSync(join(dir, "sources"), { recursive: true });
  writeFileSync(join(dir, "sources", `${id}.png`), await sharp(image).png().toBuffer());
  await sharp(image)
    .resize({ height: Math.min(height, 1600), withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(join(dir, `${id}.webp`));
  const aspectsFile = join(dir, "characters.json");
  const aspects = readJson<CharacterAspects>(aspectsFile, {});
  aspects[id] = Math.round((width / height) * 1000) / 1000;
  writeFileSync(aspectsFile, json(aspects));
  await format([aspectsFile]);
  await writeRegistries();
  return aspects[id];
};
