// Links the scenes of a game made by pnpm generate-game, from its plan, in the
// terminal, with its author:
//
//   pnpm link-game <game>
//
// For each scene of the plan that is on disk, each of its exits becomes an
// object of the scene: Claude finds its threshold in the painted background
// (its box, a short name, what the detection reads, and the text shown when the
// exit stays closed, as when the scene is played alone). The render shows the
// boxes; the author validates the scene, has it detected again, or passes it.
// What is validated is saved at once: the objects in scene.json, their boxes in
// objects.json, its back button. Then the game's links are written from the
// plan, for the exits made whose scene is on disk, and the game is checked as
// pnpm check-game checks it.
//
// An exit already made (an object's action with that exit) is kept as it is,
// boxes adjusted by hand included: run it again after painting a scene again,
// or after passing one. Needs ANTHROPIC_API_KEY (see env.ts).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Box,
  CharacterAspects,
  Game,
  GeneratedScene,
  Items,
  ObjectBoxes,
  PlannedExit,
  Scene,
  SceneObject,
} from "@esquisse/engine";
import sharp from "sharp";
import { z } from "zod";
import { checkGame } from "./check-game.ts";
import { apiKey } from "./env.ts";
import { render, show } from "./paint.ts";
import { format, gameDir, ID, listGames, sceneDir } from "./registry.ts";
import { json, session } from "./session.ts";
import { conversation, zoneWords } from "./write-scene.ts";

const USAGE = "Usage: pnpm link-game <game>";
const [game, ...rest] = process.argv.slice(2);
if (game === undefined || rest.length > 0) throw new Error(USAGE);
if (!ID.test(game)) throw new Error(`Invalid id: ${game} (kebab-case)`);

const GAME = join(gameDir(game), "game.json");
if (!existsSync(GAME)) throw new Error(`No game "${game}" (content/games/${game})`);
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const gameJson = read<Game>(GAME);
const planned = gameJson.generation?.scenes ?? [];
if (gameJson.generation?.world === undefined || !planned.some((s) => s.exits !== undefined)) {
  throw new Error(
    `"${game}" has no map in its plan: only a game made by pnpm generate-game with exits can be linked.`,
  );
}

const anthropicKey = apiKey("ANTHROPIC_API_KEY");

// ── The detection ────────────────────────────────────────────────────────────

const found = z.object({
  found: z.boolean(),
  x0: z.number(),
  y0: z.number(),
  x1: z.number(),
  y1: z.number(),
  name: z.string(),
  detect: z.string(),
  text: z.string(),
});

const system = `Tu repères, dans l'image peinte d'une scène d'un jeu d'exploration à la première personne, le seuil d'une de ses sorties : ce que le joueur clique pour passer dans une autre scène (une porte, un escalier, un passage, le haut d'une rue).

Tu renvoies :
- found : true si ce seuil est dans l'image, false sinon (les autres champs sont alors ce que tu peux en dire).
- x0, y0, x1, y1 : le cadre serré autour du seuil, ce qu'on clique, en pixels de l'image jointe, x de gauche à droite, y de haut en bas, x0 < x1 et y0 < y1. Le cadre couvre le seuil entier (la porte avec son encadrement, l'escalier de la première à la dernière marche visible), sans le décor autour.
- name : son nom court en français, avec son article (« La porte de l'auberge », « L'escalier »).
- detect : a short description in English of what the box holds and where, to find it again (« the dark oak door on the left, under the stag sign »).
- text : une ou deux phrases, à la deuxième personne, au présent, montrées quand la sortie reste fermée (la scène jouée seule) : ce que le joueur perçoit de ce seuil et de ce qu'il y a au-delà, sans dire qu'il ne peut pas passer, dans le ton de la scène.

Tout est en français, sauf detect.`;

// The background as Claude sees it: at most 1568 pixels on its longest side,
// its size known, for the box to be read back as fractions of the image.
const LONGEST = 1568;
const forClaude = async (file: string) => {
  const { data, info } = await sharp(file)
    .resize(LONGEST, LONGEST, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });
  return { data: data.toString("base64"), width: info.width, height: info.height };
};

type Image = Awaited<ReturnType<typeof forClaude>>;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

// One exit's threshold found in the image, as an object of the scene, or why not.
const detectExit = async (image: Image, scene: Scene, exit: PlannedExit) => {
  const ask = conversation(found, anthropicKey, system);
  const answer = await ask([
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.data } },
    {
      type: "text",
      text: `L'image fait ${image.width} × ${image.height} pixels. C'est la scène « ${scene.title} » : ${scene.intro}\n\nLe seuil à trouver mène ailleurs (« ${exit.label} ») : ${exit.threshold}. Il devait être ${zoneWords(exit.zone)} de l'image.`,
    },
  ]);
  if (!answer.found) return undefined;
  const box: Box = {
    x0: round(clamp(Math.min(answer.x0, answer.x1) / image.width)),
    y0: round(clamp(Math.min(answer.y0, answer.y1) / image.height)),
    x1: round(clamp(Math.max(answer.x0, answer.x1) / image.width)),
    y1: round(clamp(Math.max(answer.y0, answer.y1) / image.height)),
  };
  if (box.x1 - box.x0 < 0.01 || box.y1 - box.y0 < 0.01) return undefined;
  const object: SceneObject = {
    id: exit.id,
    zone: box,
    paint: exit.threshold,
    detect: answer.detect,
    label: answer.name,
    actions: [{ label: exit.label, exit: exit.id, text: answer.text }],
  };
  return object;
};

// The share of a box inside the scene's safe zone, what every frame shows.
const inSafe = (b: Box, safe: Box) => {
  const w = Math.max(0, Math.min(b.x1, safe.x1) - Math.max(b.x0, safe.x0));
  const h = Math.max(0, Math.min(b.y1, safe.y1) - Math.max(b.y0, safe.y0));
  return (w * h) / ((b.x1 - b.x0) * (b.y1 - b.y0));
};

// ── The scenes ───────────────────────────────────────────────────────────────

const author = session();
const onDisk = (id: string) => existsSync(join(sceneDir(game, id), "scene.json"));
// A scene's exits made, by an object's action or its back button.
const exitsOf = (scene: Scene) =>
  new Set([
    ...(scene.back !== undefined ? [scene.back] : []),
    ...scene.objects.flatMap((o) => (o.actions ?? []).flatMap((a) => (a.exit ? [a.exit] : []))),
  ]);

const linkScene = async (plan: GeneratedScene) => {
  const dir = sceneDir(game, plan.id);
  const SCENE = join(dir, "scene.json");
  const OBJECTS = join(dir, "objects.json");
  const scene = read<Scene>(SCENE);
  const boxes = read<ObjectBoxes>(OBJECTS);
  const made = exitsOf(scene);
  const todo = (plan.exits ?? []).filter((e) => {
    if (scene.objects.some((o) => (o.actions ?? []).some((a) => a.exit === e.id))) return false;
    if (scene.objects.some((o) => o.id === e.id)) {
      console.log(`  ⚠ an object « ${e.id} » is already in the scene: the exit is not made`);
      return false;
    }
    return true;
  });
  const back = plan.back !== undefined && scene.back !== plan.back ? plan.back : undefined;
  if (todo.length === 0 && back === undefined) {
    console.log(`  Its exits are made: ${[...made].join(", ") || "none"}`);
    return;
  }
  // The original, or the app's image if the original is gone.
  const original = join(dir, "sources", "fond.jpg");
  const background = existsSync(original) ? original : join(dir, "fond.webp");
  const image = await forClaude(background);
  for (;;) {
    const objects: SceneObject[] = [];
    for (const exit of todo) {
      console.log(`  Finding « ${exit.id} » → ${exit.to}: ${exit.threshold}`);
      const object = await detectExit(image, scene, exit);
      if (object === undefined) {
        console.log("    ✗ not found in the image: not made");
        continue;
      }
      const share = inSafe(object.zone, scene.safe);
      const where =
        share < 0.8 ? `, ⚠ ${Math.round((1 - share) * 100)} % outside the safe zone` : "";
      console.log(`    ${object.label}: ${JSON.stringify(object.zone)}${where}`);
      objects.push(object);
    }
    if (back !== undefined) console.log(`  Back button: « ${back} »`);
    const next: Scene = {
      ...scene,
      objects: [...scene.objects, ...objects],
      ...(back !== undefined ? { back } : {}),
    };
    const nextBoxes = { ...boxes, ...Object.fromEntries(objects.map((o) => [o.id, o.zone])) };
    const aspects = read<CharacterAspects>(join(dir, "characters.json"));
    const data = { scene: next, objects: nextBoxes, aspects };
    show(`${game}-${plan.id}-exits`, await render(data, readFileSync(background), {}));
    const answer = await author.choose("Les sorties :", {
      v: "valider",
      r: "redétecter",
      p: "passer",
      q: "quitter",
    });
    if (answer === "q") {
      author.close();
      process.exit(0);
    }
    if (answer === "p") return;
    if (answer === "r") continue;
    writeFileSync(SCENE, json(next));
    writeFileSync(OBJECTS, json(nextBoxes));
    format([SCENE, OBJECTS]);
    console.log(`  ✓ Saved: ${objects.length} exit(s) in ${plan.id}`);
    return;
  }
};

for (const plan of planned) {
  console.log(`\n── ${plan.id}`);
  if (!onDisk(plan.id)) {
    console.log("  Not made yet (pnpm generate-scene): passed");
    continue;
  }
  await linkScene(plan);
}
author.close();

// ── The links ────────────────────────────────────────────────────────────────

const links: Game["links"] = { ...gameJson.links };
for (const plan of planned) {
  if (!onDisk(plan.id)) continue;
  const made = exitsOf(read<Scene>(join(sceneDir(game, plan.id), "scene.json")));
  for (const exit of plan.exits ?? []) {
    if (!made.has(exit.id) || !onDisk(exit.to)) continue;
    links[plan.id] = { ...links[plan.id], [exit.id]: exit.to };
  }
}
writeFileSync(GAME, json({ ...gameJson, links }));
format([GAME]);
console.log(`\nLinks: ${GAME}`);

// The game checked as pnpm check-game checks it.
const scenes = Object.fromEntries(
  planned
    .filter((s) => onDisk(s.id))
    .map((s) => [s.id, read<Scene>(join(sceneDir(game, s.id), "scene.json"))]),
);
const catalog = join(gameDir(game), "items/index.ts");
const items: Items = existsSync(catalog) ? (await import(catalog)).ITEMS : {};
const listed = new Set(
  listGames()
    .find((g) => g.id === game)
    ?.scenes.map((s) => s.id) ?? [],
);
const { errors, warnings } = checkGame(read(GAME), scenes, listed, items);
console.log(`${errors.length > 0 ? "✗" : "✓"} ${game}`);
for (const e of errors) console.log(`  ✗ ${e}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
if (errors.length > 0) process.exit(1);
