// Writes the lists of the scenes that Next and Metro need spelled out, one
// import per file: packages/shared/src/scenes/index.ts, apps/web/scenes.ts and
// apps/mobile/src/scenes.ts. A scene is listed once all its files are there.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Scene } from "@esquisse/shared";
import { effectFiles } from "@esquisse/shared/effects";

const ROOT = join(import.meta.dirname, "../../..");
const SCENES = join(ROOT, "packages/shared/src/scenes");
const MEDIA = join(ROOT, "packages/shared/assets/scenes");

const HEADER = "// Written by packages/generator/src/generate-scene.ts: do not edit by hand.";

// "longue-vue" → "longueVue"
const camel = (id: string) => id.replace(/-(.)/g, (_, c: string) => c.toUpperCase());
const pascal = (id: string) => camel(id).replace(/^./, (c) => c.toUpperCase());
const key = (id: string) => (/^[a-z][a-zA-Z0-9]*$/.test(id) ? id : JSON.stringify(id));

// An effect's images, by its id (see effectFiles).
type Listed = { id: string; characters: string[]; effects: { id: string; files: string[] }[] };

const effectsOf = (scene: Scene) =>
  (scene.effects ?? []).map((e) => ({ id: e.id, files: effectFiles(e) }));

const complete = (id: string, scene: Scene) =>
  ["scene.json", "objects.json", "characters.json"].every((f) => existsSync(join(SCENES, id, f))) &&
  ["fond", ...scene.characters.map((c) => c.id), ...effectsOf(scene).flatMap((e) => e.files)].every(
    (f) => existsSync(join(MEDIA, id, `${f}.webp`)),
  );

const listScenes = (): Listed[] =>
  readdirSync(SCENES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SCENES, d.name, "scene.json")))
    .map((d) => d.name)
    .sort()
    .flatMap((id) => {
      const scene: Scene = JSON.parse(readFileSync(join(SCENES, id, "scene.json"), "utf8"));
      return complete(id, scene)
        ? [
            {
              id,
              characters: scene.characters.map((c) => c.id),
              effects: effectsOf(scene),
            },
          ]
        : [];
    });

const shared = (scenes: Listed[]) => `${HEADER}

${scenes
  .flatMap(({ id }) => [
    `import ${camel(id)}Aspects from "./${id}/characters.json";`,
    `import ${camel(id)}Objects from "./${id}/objects.json";`,
    `import ${camel(id)}Scene from "./${id}/scene.json";`,
  ])
  .join("\n")}
import type { SceneData } from "./types.ts";

export * from "./effects.ts";
export * from "./items.ts";
export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
${scenes
  .map(
    ({ id }) =>
      `  ${key(id)}: { scene: ${camel(id)}Scene, objects: ${camel(id)}Objects, aspects: ${camel(id)}Aspects },`,
  )
  .join("\n")}
} satisfies Record<string, SceneData>;
`;

const asset = (id: string, file: string) => `@esquisse/shared/assets/scenes/${id}/${file}.webp`;

const web = (scenes: Listed[]) => `${HEADER}

${scenes
  .flatMap(({ id, characters, effects }) =>
    // Sorted, as Biome wants imports.
    ["fond", ...characters, ...effects.flatMap((e) => e.files)]
      .sort()
      .map((file) => `import ${camel(id)}${pascal(file)} from "${asset(id, file)}";`),
  )
  .join("\n")}
import type { StaticImageData } from "next/image";

// The scenes' images, served from packages/shared/assets, like the mobile app's
// (apps/mobile/src/scenes.ts): the background, the characters' layers, and the
// images of the background's animations, by effect (see effectFiles).
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
  effects: Record<string, StaticImageData[]>;
};

export const sceneImages = {
${scenes
  .map(
    ({ id, characters, effects }) =>
      `  ${key(id)}: {\n    background: ${camel(id)}Fond,\n    characters: {\n${characters
        .map((c) => `      ${key(c)}: ${camel(id)}${pascal(c)},`)
        .join("\n")}\n    },\n    effects: {\n${effects
        .map(
          (e) =>
            `      ${key(e.id)}: [${e.files.map((f) => `${camel(id)}${pascal(f)}`).join(", ")}],`,
        )
        .join("\n")}\n    },\n  },`,
  )
  .join("\n")}
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
`;

const mobile = (scenes: Listed[]) => `${HEADER}

import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app from packages/shared/assets, like the
// web site's (apps/web/scenes.ts): Metro needs each require spelled out.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
  effects: Record<string, ImageSourcePropType[]>;
};

export const sceneImages = {
${scenes
  .map(
    ({ id, characters, effects }) =>
      `  ${key(id)}: {\n    background: require("${asset(id, "fond")}"),\n    characters: {\n${characters
        .map((c) => `      ${key(c)}: require("${asset(id, c)}"),`)
        .join("\n")}\n    },\n    effects: {\n${effects
        .map(
          (e) =>
            `      ${key(e.id)}: [${e.files.map((f) => `require("${asset(id, f)}")`).join(", ")}],`,
        )
        .join("\n")}\n    },\n  },`,
  )
  .join("\n")}
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
`;

export const writeRegistries = () => {
  const scenes = listScenes();
  const files = {
    [join(SCENES, "index.ts")]: shared(scenes),
    [join(ROOT, "apps/web/scenes.ts")]: web(scenes),
    [join(ROOT, "apps/mobile/src/scenes.ts")]: mobile(scenes),
  };
  for (const [file, code] of Object.entries(files)) writeFileSync(file, code);
  // Long ids make long lines: Biome puts them as it wants them.
  execFileSync(
    join(ROOT, "node_modules/.bin/biome"),
    ["format", "--write", ...Object.keys(files)],
    {
      stdio: "ignore",
    },
  );
  return scenes.map((s) => s.id);
};
