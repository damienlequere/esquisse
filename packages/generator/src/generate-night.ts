// Paints the night of a game's scenes, with its author, in the terminal:
//
//   pnpm generate-night <game> [<scene>…]
//
// Without scenes, every scene of the game on disk without its night yet, in
// the order of its plan (game.json's generation) if it has one.
//
// Each night is the scene's background painted again: Claude writes, from the
// game's world and the scene, its night light and what the night changes (the
// moon, on the same side of the world in every scene, the lanterns and windows
// lit); Gemini repaints the day's original with it, the same framing, each
// thing in its place, for the boxes of the objects to stay right. One
// conversation for the whole game, for its nights to agree. The render shows
// the night with the objects' boxes; the author validates it, has it painted
// again, asks for a change, passes the scene, or quits.
//
// What is validated is saved at once: nuit.webp in the scene's folder, its
// original in sources/nuit.jpg, the night in scene.json ("night": its light
// and its prompt), and the scene listed with its night for both apps. Needs
// ANTHROPIC_API_KEY and GEMINI_API_KEY (see env.ts).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Scene } from "@esquisse/engine";
import { isLandscape } from "@esquisse/engine/layout";
import sharp from "sharp";
import { z } from "zod";
import { apiKey } from "./env.ts";
import { generateImage } from "./gemini.ts";
import { IMAGE_MODEL, render, show } from "./paint.ts";
import { format, gameDir, ID, sceneDir, writeRegistries } from "./registry.ts";
import { appSize, json, session } from "./session.ts";
import { conversation } from "./write-scene.ts";

const USAGE = "Usage: pnpm generate-night <game> [<scene>…]";
const [game, ...only] = process.argv.slice(2);
if (game === undefined) throw new Error(USAGE);
for (const i of [game, ...only]) if (!ID.test(i)) throw new Error(`Invalid id: ${i} (kebab-case)`);

const GAME = join(gameDir(game), "game.json");
if (!existsSync(GAME)) throw new Error(`No game "${game}" (content/games/${game})`);
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const gameJson = read<Game>(GAME);
const onDisk = (id: string) => existsSync(join(sceneDir(game, id), "scene.json"));

// The scenes, in the order of the plan, then the others.
const folder = join(gameDir(game), "scenes");
const all = existsSync(folder)
  ? readdirSync(folder, { withFileTypes: true })
      .filter((d) => d.isDirectory() && onDisk(d.name))
      .map((d) => d.name)
  : [];
const order = (gameJson.generation?.scenes ?? []).map((s) => s.id);
const sorted = [
  ...order.filter((id) => all.includes(id)),
  ...all.filter((id) => !order.includes(id)).sort(),
];
for (const id of only) if (!all.includes(id)) throw new Error(`No scene "${id}" in "${game}"`);
const todo =
  only.length > 0
    ? only
    : sorted.filter(
        (id) => read<Scene>(join(sceneDir(game, id), "scene.json")).night === undefined,
      );
if (todo.length === 0) {
  console.log(`Every scene of "${game}" has its night: name one to paint it again.`);
  process.exit(0);
}

const anthropicKey = apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");

// ── The writing ──────────────────────────────────────────────────────────────

const night = z.object({ light: z.string(), prompt: z.string() });

const world = gameJson.generation?.world;
const system = `Tu écris la nuit des scènes d'un jeu pour Esquisse : des scènes cliquables, chacune une image peinte, que le joueur voit de jour ou de nuit selon qu'il attend. La nuit d'une scène est son image de jour repeinte par un modèle d'image : le même cadrage, le même décor, chaque chose à sa place et à sa taille, les mêmes portes, escaliers et passages, que le joueur clique. Seule l'heure change.

Pour chaque scène, tu écris :
- light : la lumière de la nuit en quelques mots (sources, couleur, direction).
- prompt : ce que la nuit change dans l'image, en un paragraphe, pour le modèle d'image : le ciel, la lune et d'où vient sa lumière, ce qui s'éteint (le soleil, ses reflets), ce qui s'allume (lanternes, chandelles, fenêtres, feux), les ombres et la couleur des matières. Rien n'apparaît, rien ne disparaît, rien ne bouge : pas de personne, pas d'animal, pas d'objet nouveau.

Les nuits du jeu s'accordent : la même nuit, la même heure, la lune du même côté du monde dans toutes les scènes, vue ou non selon où le regard porte ; un intérieur garde la nuit qu'il fait dehors, par ses fenêtres et ses portes.${
  world === undefined
    ? ""
    : `\n\nLe monde du jeu : ${world.setting}${world.landmarks
        .map((l) => `\n- ${l.id} : ${l.description} (${l.where})`)
        .join("")}`
}

Tout est en français.`;

const writer = conversation(night, anthropicKey, system);
const ask = (scene: Scene, id: string) => {
  const plan = gameJson.generation?.scenes.find((s) => s.id === id);
  return writer(
    `Écris la nuit de la scène « ${scene.title} » (${id}).${plan?.viewpoint ? `\nSon point de vue : ${plan.viewpoint}` : ""}\nSon décor de jour : ${scene.background.prompt}\nSa lumière de jour : ${scene.light}`,
  );
};

// ── The painting ─────────────────────────────────────────────────────────────

const paintNight = (scene: Scene, day: Buffer, n: z.infer<typeof night>) =>
  generateImage(geminiKey, {
    model: IMAGE_MODEL,
    prompt: [
      scene.style,
      "L'image jointe est le décor de jour. Repeins exactement la même image : le même cadrage, la même composition, chaque élément à la même place, à la même taille et dans le même état, sans rien ajouter ni retirer ; seule l'heure change, la nuit est tombée.",
      n.prompt,
      `Lumière : ${n.light}`,
      isLandscape(scene) ? "Format paysage." : "Format portrait.",
    ].join("\n"),
    references: [{ mimeType: "image/jpeg", data: day }],
    aspectRatio: scene.imageRatio,
    imageSize: "2K",
  });

const author = session();
for (const [i, id] of todo.entries()) {
  console.log(`\n── ${i + 1}/${todo.length} : ${id}`);
  const dir = sceneDir(game, id);
  const SCENE = join(dir, "scene.json");
  const scene = read<Scene>(SCENE);
  const original = join(dir, "sources", "fond.jpg");
  const day = existsSync(original)
    ? readFileSync(original)
    : await sharp(join(dir, "fond.webp")).jpeg({ quality: 95 }).toBuffer();
  const data = {
    scene,
    objects: read<Record<string, never>>(join(dir, "objects.json")),
    aspects: read<Record<string, number>>(join(dir, "characters.json")),
  };
  let n = await ask(scene, id);
  for (;;) {
    console.log(`\nLumière : ${n.light}\nNuit : ${n.prompt}\n`);
    console.log("Painting the night…");
    const image = await paintNight(scene, day, n);
    show(`${game}-${id}-nuit`, await render(data, image, {}));
    const answer = await author.choose("La nuit :", {
      v: "valider",
      r: "repeindre",
      m: "modifier",
      p: "passer",
      q: "quitter",
    });
    if (answer === "q") {
      author.close();
      process.exit(0);
    }
    if (answer === "p") break;
    if (answer === "m") {
      const change = await author.ask("Que changer ?\n> ");
      n = await writer(`Modifie la nuit de « ${scene.title} » ainsi : ${change}`);
      continue;
    }
    if (answer === "r") continue;
    mkdirSync(join(dir, "sources"), { recursive: true });
    writeFileSync(join(dir, "sources", "nuit.jpg"), image);
    await sharp(image).resize(appSize(scene)).webp({ quality: 90 }).toFile(join(dir, "nuit.webp"));
    writeFileSync(SCENE, json({ ...scene, night: { light: n.light, prompt: n.prompt } }));
    format([SCENE]);
    writeRegistries();
    console.log(`✓ Saved: the night of ${id}, in both apps`);
    break;
  }
}
author.close();
