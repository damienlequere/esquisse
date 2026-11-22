// Makes a new game with its author, in the terminal, from one brief:
//
//   pnpm generate-game <game> "brief" [--model <id>] [--art <id>|"direction"]
//
// --model is the Claude model that writes the plan and the scenes, claude-opus-5-5
// by default; it is checked before anything is paid for. --art is the images'
// direction, one of art.ts's by its id or a text of its own, in place of the
// default one (matte-painting), kept in game.json's artDirection for the
// scenes added later.
//
// Claude writes the game's plan from the brief, a map of the game: its title,
// one style for all its images, the world its scenes are viewpoints of (its
// setting, its landmarks), and its scenes, each with its id, its orientation,
// whether it has an opening, its viewpoint, its own brief, the landmarks seen
// from it, its exits (each a threshold, where in the image, the scene it leads
// to) and the one its back button takes. The author validates the plan or asks
// for a change. Then each scene is made as pnpm generate-scene makes one,
// written within the game (its brief, its style, its world, its place in it,
// and its neighbors already painted) and validated on its render, then saved at
// once.
//
// game.json keeps the game's brief and, in "generation", how it was generated:
// the changes asked to the plan, the world, and each scene's plan (its map), then, once validated,
// what was painted, with the changes asked to it. It is written once, whatever
// the scenes become after (their scene.json). Quitting keeps the scenes
// validated: the others are in the plan, to make with pnpm generate-scene.
//
// The game must not exist: pnpm remove-game first. Needs ANTHROPIC_API_KEY and
// GEMINI_API_KEY, as pnpm generate-scene (see env.ts).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Generation } from "@esquisse/engine";
import { keptArt } from "./art.ts";
import { apiKey } from "./env.ts";
import { artOption, option } from "./options.ts";
import { IMAGE_MODEL } from "./paint.ts";
import { format, gameDir, ID } from "./registry.ts";
import { json, paintScene, session } from "./session.ts";
import { gameWriter, type Plan, planErrors } from "./write-game.ts";
import { baseWriter, checkModel, FORMATS, TEXT_MODEL, zoneWords } from "./write-scene.ts";

const USAGE = 'Usage: pnpm generate-game <game> "brief" [--model <id>] [--art <id>|"direction"]';
const argv = process.argv.slice(2);
const model = option(argv, "--model", USAGE) ?? TEXT_MODEL;
const artDirection = artOption(argv, USAGE);
const [game, brief, ...rest] = argv;
if (game === undefined || brief === undefined) throw new Error(USAGE);
if (!ID.test(game)) throw new Error(`Invalid id: ${game} (kebab-case)`);
if (rest.length > 0) throw new Error(`Only one brief, in quotes.\n${USAGE}`);

const GAME = join(gameDir(game), "game.json");
if (existsSync(gameDir(game))) {
  throw new Error(
    `The game "${game}" exists: pnpm remove-game ${game} first, or pnpm generate-scene to add a scene to it.`,
  );
}

// Both are checked before anything is paid for.
const anthropicKey = apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");
await checkModel(anthropicKey, model);

const author = session();

const showPlan = (p: Plan) => {
  console.log(`\n${p.title}\n\nStyle : ${p.style}\n\nMonde : ${p.world.setting}`);
  for (const l of p.world.landmarks) console.log(`  ◆ ${l.id} : ${l.description} (${l.where})`);
  console.log();
  for (const [i, s] of p.scenes.entries()) {
    const opening = s.opening ? ", avec ouverture" : "";
    console.log(`${i + 1}. ${s.id} (${s.orientation}${opening}) — ${s.viewpoint}`);
    console.log(`   Décor : ${s.brief}`);
    if (s.landmarks.length > 0)
      console.log(`   Repères : ${s.landmarks.map((l) => `${l.id} (${l.where})`).join(" ; ")}`);
    for (const e of s.exits) {
      const marks = [e.id === s.back ? "retour" : "", e.oneWay ? "sans retour" : ""].filter(
        Boolean,
      );
      const tail = marks.length > 0 ? ` [${marks.join(", ")}]` : "";
      console.log(`   → ${e.to} « ${e.label} » par ${e.threshold} (${zoneWords(e.zone)})${tail}`);
    }
  }
  console.log();
};

// The plan, until the author validates it.
if (artDirection !== undefined)
  console.log(`Art direction: ${artDirection.label ?? "the author's own (--art)"}`);
const planner = gameWriter(anthropicKey, model, artDirection);
const planChanges: string[] = [];
let plan = await planner.write(brief);
for (;;) {
  const errors = planErrors(plan);
  if (errors.length > 0) {
    console.log(`The plan is not valid (${errors.join(" ; ")}): asking again.`);
    plan = await planner.revise(`Corrige le plan : ${errors.join(" ; ")}.`);
    continue;
  }
  showPlan(plan);
  const answer = await author.choose("Le plan :", { v: "valider", m: "modifier", q: "quitter" });
  if (answer === "v") break;
  if (answer === "q") process.exit(0);
  const change = await author.ask("Que changer ?\n> ");
  planChanges.push(change);
  plan = await planner.revise(change);
}

// The game, written at once with its plan, then again as each scene is saved.
const generation: Generation = {
  command: "generate-game",
  date: new Date().toISOString().slice(0, 10),
  textModel: model,
  imageModel: IMAGE_MODEL,
  ...(planChanges.length > 0 ? { changes: planChanges } : {}),
  world: plan.world,
  scenes: plan.scenes.map(
    ({ id, orientation, opening, viewpoint, brief, landmarks, exits, back }) => ({
      id,
      orientation,
      opening,
      brief,
      viewpoint,
      landmarks,
      exits,
      ...(back !== null ? { back } : {}),
    }),
  ),
};
const first = plan.scenes[0]?.id ?? "";
const gameJson: Game = {
  brief,
  ...keptArt(artDirection),
  title: plan.title,
  start: first,
  links: {},
  generation,
};
const writeGame = () => {
  writeFileSync(GAME, json(gameJson));
  format([GAME]);
};
mkdirSync(gameDir(game), { recursive: true });
writeGame();
console.log(`New game "${game}", starting in "${first}": ${GAME}`);

for (const [i, planned] of generation.scenes.entries()) {
  const { id, brief: sceneBrief } = planned;
  console.log(`\n── ${i + 1}/${generation.scenes.length} : ${id} (${planned.orientation})`);
  const FORMAT = FORMATS[planned.orientation as keyof typeof FORMATS];
  // Its neighbors already painted: the scenes its exits lead to, or come from.
  const neighbors = generation.scenes.filter(
    (n) =>
      n.background !== undefined &&
      n.id !== id &&
      ((planned.exits ?? []).some((e) => e.to === n.id) ||
        (n.exits ?? []).some((e) => e.to === id)),
  );
  if (neighbors.length > 0) console.log(`Next to: ${neighbors.map((n) => n.id).join(", ")}`);
  const writer = baseWriter(
    anthropicKey,
    FORMAT,
    { brief, style: plan.style, world: plan.world, scene: planned, neighbors },
    model,
    artDirection,
  );
  const painted = await paintScene({
    session: author,
    geminiKey,
    game,
    id,
    format: FORMAT,
    brief: sceneBrief,
    writer,
    opening: planned.opening,
  });
  if (painted === undefined) {
    const left = generation.scenes.slice(i).map((s) => s.id);
    console.log(`Stopped: ${left.join(", ")} not made, their plan is in ${GAME}.`);
    process.exit(0);
  }
  const { scene, changes } = painted;
  Object.assign(planned, {
    ...(changes.length > 0 ? { changes } : {}),
    title: scene.title,
    intro: scene.intro,
    style: scene.style,
    light: scene.light,
    background: scene.background.prompt,
  });
  writeGame();
}
author.close();
console.log(`\n✓ ${plan.title}: /game/${game}, run pnpm dev to see it`);
console.log(
  "  Its scenes are not linked yet: their exits are in the plan, in game.json's generation.",
);
