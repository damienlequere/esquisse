// Writes the lists of the games that Next and Metro need spelled out, one
// import per file: content/games/index.ts, and content/games/images.ts, which
// both apps share. A game is listed once its first scene is; a scene
// once all its files are there; an item once its image is.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Scene } from "@esquisse/engine";
import { effectFiles } from "@esquisse/engine/effects";

const ROOT = join(import.meta.dirname, "../../..");
export const GAMES = join(ROOT, "content/games");

// A game's folder, and the folder of one of its scenes, which holds it all: its
// texts and positions, its converted images, and their originals in sources/.
export const gameDir = (game: string) => join(GAMES, game);
export const sceneDir = (game: string, scene: string) => join(GAMES, game, "scenes", scene);

// A game's or a scene's id is a folder, a URL and a name in the lists' imports.
export const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const HEADER = "// Written by packages/generator/src/generate-scene.ts: do not edit by hand.";

// "longue-vue" → "longueVue"
const camel = (id: string) => id.replace(/-(.)/g, (_, c: string) => c.toUpperCase());
const pascal = (id: string) => camel(id).replace(/^./, (c) => c.toUpperCase());
const key = (id: string) => (/^[a-z][a-zA-Z0-9]*$/.test(id) ? id : JSON.stringify(id));

// The names of the imports: a game's, one of its scenes', one of its items';
// the words between keep them apart whatever the ids.
const gameName = (game: string) => `${camel(game)}Game`;
const sceneName = (game: string, scene: string) => `${camel(game)}Scene${pascal(scene)}`;
const itemName = (game: string, item: string) => `${camel(game)}Item${pascal(item)}`;

// An effect's images, by its id (see effectFiles).
type ListedScene = {
  id: string;
  characters: string[];
  effects: { id: string; files: string[] }[];
};
// items: those with an image; catalog: whether items/index.ts lists them.
type ListedGame = { id: string; scenes: ListedScene[]; items: string[]; catalog: boolean };

const folders = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

const effectsOf = (scene: Scene) =>
  (scene.effects ?? []).map((e) => ({ id: e.id, files: effectFiles(e) }));

const complete = (dir: string, scene: Scene) =>
  ["scene.json", "objects.json", "characters.json"].every((f) => existsSync(join(dir, f))) &&
  ["fond", ...scene.characters.map((c) => c.id), ...effectsOf(scene).flatMap((e) => e.files)].every(
    (f) => existsSync(join(dir, `${f}.webp`)),
  );

const listScenes = (game: string): ListedScene[] =>
  folders(join(gameDir(game), "scenes")).flatMap((id) => {
    const dir = sceneDir(game, id);
    if (!existsSync(join(dir, "scene.json"))) return [];
    const scene: Scene = JSON.parse(readFileSync(join(dir, "scene.json"), "utf8"));
    return complete(dir, scene)
      ? [{ id, characters: scene.characters.map((c) => c.id), effects: effectsOf(scene) }]
      : [];
  });

// The games the apps can play: those whose first scene is listed.
export const listGames = (): ListedGame[] =>
  folders(GAMES).flatMap((id) => {
    const file = join(gameDir(id), "game.json");
    if (!existsSync(file)) return [];
    const game: Game = JSON.parse(readFileSync(file, "utf8"));
    const scenes = listScenes(id);
    if (!scenes.some((s) => s.id === game.start)) return [];
    const items = join(gameDir(id), "items");
    return [
      {
        id,
        scenes,
        items: existsSync(items)
          ? readdirSync(items)
              .filter((f) => f.endsWith(".webp"))
              .map((f) => f.slice(0, -".webp".length))
              .sort()
          : [],
        catalog: existsSync(join(items, "index.ts")),
      },
    ];
  });

// Sorted by path; Biome then puts them in its own order (see writeRegistries).
const imports = (lines: [string, string][]) =>
  lines
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, line]) => line)
    .join("\n");

const content = (games: ListedGame[]) => `${HEADER}

import type { GameData } from "@esquisse/engine";
${imports(
  games.flatMap(({ id, scenes, catalog }) => [
    [`./${id}/game.json`, `import ${gameName(id)} from "./${id}/game.json";`],
    ...(catalog
      ? ([
          [
            `./${id}/items/index.ts`,
            `import { ITEMS as ${camel(id)}Items } from "./${id}/items/index.ts";`,
          ],
        ] as [string, string][])
      : []),
    ...scenes.flatMap(({ id: s }) =>
      (
        [
          ["characters", "Aspects"],
          ["objects", "Objects"],
          ["scene", "Scene"],
        ] as const
      ).map(([file, name]): [string, string] => {
        const path = `./${id}/scenes/${s}/${file}.json`;
        return [path, `import ${sceneName(id, s)}${name} from "${path}";`];
      }),
    ),
  ]),
)}

// The games, by id: each one with all its scenes, by id, and its items.
export const games = {
${games
  .map(
    ({ id, scenes, catalog }) =>
      `  ${key(id)}: {\n    game: ${gameName(id)},\n    scenes: {\n${scenes
        .map(({ id: s }) => {
          const n = sceneName(id, s);
          return `      ${key(s)}: { scene: ${n}Scene, objects: ${n}Objects, aspects: ${n}Aspects },`;
        })
        .join("\n")}\n    },\n    items: ${catalog ? `${camel(id)}Items` : "{}"},\n  },`,
  )
  .join("\n")}
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
`;

const sceneAsset = (game: string, scene: string, file: string) =>
  `./${game}/scenes/${scene}/${file}.webp`;
const itemAsset = (game: string, item: string) => `./${game}/items/${item}.webp`;

const sceneFiles = ({ characters, effects }: ListedScene) => [
  "fond",
  ...characters,
  ...effects.flatMap((e) => e.files),
];

// A game's images, as an object literal, from how each one is written (its
// import's name).
const gameImages = (
  { id, scenes, items }: ListedGame,
  scene: (s: string, file: string) => string,
  item: (i: string) => string,
) =>
  `  ${key(id)}: {\n    scenes: {\n${scenes
    .map(
      ({ id: s, characters, effects }) =>
        `      ${key(s)}: {\n        background: ${scene(s, "fond")},\n        characters: {\n${characters
          .map((c) => `          ${key(c)}: ${scene(s, c)},`)
          .join("\n")}\n        },\n        effects: {\n${effects
          .map((e) => `          ${key(e.id)}: [${e.files.map((f) => scene(s, f)).join(", ")}],`)
          .join("\n")}\n        },\n      },`,
    )
    .join("\n")}\n    },\n    items: {\n${items
    .map((i) => `      ${key(i)}: ${item(i)},`)
    .join("\n")}\n    },\n  },`;

const images = (games: ListedGame[]) => `${HEADER}

${imports(
  games.flatMap((g) => [
    ...g.scenes.flatMap((s) =>
      sceneFiles(s).map((file): [string, string] => {
        const path = sceneAsset(g.id, s.id, file);
        return [path, `import ${sceneName(g.id, s.id)}${pascal(file)} from "${path}";`];
      }),
    ),
    ...g.items.map((i): [string, string] => {
      const path = itemAsset(g.id, i);
      return [path, `import ${itemName(g.id, i)} from "${path}";`];
    }),
  ]),
)}

// The games' images, for both apps: each scene's background, its characters'
// layers, and the images of its background's animations, by effect (see
// effectFiles); and the items', by id. Each app's bundler makes each import
// what it shows: Next a StaticImageData, Metro an ImageSourcePropType. Each
// app gives that type as Image, and its own declaration of *.webp checks it
// (next/image-types/global, apps/mobile/webp.d.ts).
export type SceneImages<Image> = {
  background: Image;
  characters: Record<string, Image>;
  effects: Record<string, Image[]>;
};
export type GameImages<Image> = {
  scenes: Record<string, SceneImages<Image>>;
  items: Record<string, Image>;
};

export const gameImages = {
${games
  .map((g) =>
    gameImages(
      g,
      (s, file) => `${sceneName(g.id, s)}${pascal(file)}`,
      (i) => itemName(g.id, i),
    ),
  )
  .join("\n")}
};
`;

// Writes the lists; returns the games listed, each with its scenes.
export const writeRegistries = () => {
  const games = listGames();
  const files = {
    [join(GAMES, "index.ts")]: content(games),
    [join(GAMES, "images.ts")]: images(games),
  };
  for (const [file, code] of Object.entries(files)) writeFileSync(file, code);
  // Long ids make long lines, and imports have their order: Biome puts them
  // as it wants them.
  execFileSync(join(ROOT, "node_modules/.bin/biome"), ["check", "--write", ...Object.keys(files)], {
    stdio: "ignore",
  });
  return games.map((g) => ({ id: g.id, scenes: g.scenes.map((s) => s.id) }));
};
