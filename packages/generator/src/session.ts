// What pnpm generate-scene and pnpm generate-game share: the questions to the
// author, a background painted until validated, and the scene saved.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import type { Scene, SceneData } from "@esquisse/engine";
import { isLandscape } from "@esquisse/engine/layout";
import sharp from "sharp";
import { paintBackground, render, show } from "./paint.ts";
import { format, sceneDir, writeRegistries } from "./registry.ts";
import type { baseWriter, Format } from "./write-scene.ts";

export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const session = () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // Without a listener, readline only pauses on Ctrl+C.
  rl.on("SIGINT", () => process.exit(130));
  return {
    // Asks until the answer is one of the choices' keys.
    choose: async (question: string, choices: Record<string, string>) => {
      const line = Object.entries(choices)
        .map(([k, label]) => `[${k}] ${label}`)
        .join("  ");
      for (;;) {
        const answer = (await rl.question(`${question}  ${line}\n> `)).trim().toLowerCase();
        if (Object.hasOwn(choices, answer)) return answer;
      }
    },
    ask: (question: string) => rl.question(question),
    close: () => rl.close(),
  };
};

export type Session = ReturnType<typeof session>;

// The size the apps get the background at: 1440 × 2560 or 2560 × 1440.
const appSize = (scene: Scene) => (isLandscape(scene) ? { width: 2560 } : { width: 1440 });

// A scene's folder holds it all: its texts, its converted images, and their
// originals in sources/.
const save = async (game: string, id: string, scene: Scene, background: Buffer) => {
  const dir = sceneDir(game, id);
  const sources = join(dir, "sources");
  mkdirSync(sources, { recursive: true });
  const texts = {
    [join(dir, "scene.json")]: scene,
    [join(dir, "objects.json")]: {},
    [join(dir, "characters.json")]: {},
  };
  for (const [file, value] of Object.entries(texts)) writeFileSync(file, json(value));
  format(Object.keys(texts));
  writeFileSync(join(sources, "fond.jpg"), background);
  await sharp(background)
    .resize(appSize(scene))
    .webp({ quality: 90 })
    .toFile(join(dir, "fond.webp"));
  writeRegistries();
  console.log(`✓ Saved: /game/${game}/scene/${id} in both apps`);
};

type Paint = {
  session: Session;
  geminiKey: string;
  game: string;
  id: string;
  format: Format;
  brief: string;
  writer: ReturnType<typeof baseWriter>;
  // false: the scene has no opening (see Scene).
  opening?: boolean;
};

// The background written from the brief, painted, and shown, until the author
// validates it, saved at once, or quits (undefined). Returns the scene and the
// changes asked on the way.
export const paintScene = async ({
  session,
  geminiKey,
  game,
  id,
  format: FORMAT,
  brief,
  writer,
  opening,
}: Paint) => {
  let base = await writer.write(brief);
  const changes: string[] = [];
  for (;;) {
    const scene: Scene = {
      brief,
      title: base.title,
      intro: base.intro,
      imageRatio: FORMAT.imageRatio,
      ...(opening === false ? { opening } : {}),
      safe: FORMAT.safe,
      style: base.style,
      light: base.light,
      background: base.background,
      objects: [],
      characters: [],
    };
    console.log(`\n${scene.title}\n${scene.intro}\n\nDécor : ${scene.background.prompt}\n`);
    console.log("Painting the background…");
    const background = await paintBackground(geminiKey, scene);
    const data: SceneData = { scene, objects: {}, aspects: {} };
    show(`${game}-${id}`, await render(data, background, {}));
    const answer = await session.choose("Le fond :", {
      v: "valider",
      r: "repeindre",
      m: "modifier",
      q: "quitter",
    });
    if (answer === "v") {
      await save(game, id, scene, background);
      return { scene, changes };
    }
    if (answer === "q") return undefined;
    if (answer === "m") {
      const change = await session.ask("Que changer ?\n> ");
      changes.push(change);
      base = await writer.revise(change);
    }
  }
};
