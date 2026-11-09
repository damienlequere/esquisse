// Makes a new game with its author, in the terminal, from one brief:
//
//   pnpm generate-game <game> "brief" [--model <id>]
//
// --model is the Claude model that writes the plan and the scenes, claude-opus-5-5
// by default; it is checked before anything is paid for.
//
// Claude writes the game's plan from the brief: its title, one style for all
// its images, and its scenes, each with its id, its orientation, whether it has
// an opening, and its own brief. The author validates the plan or asks for a
// change. Then each scene is made as pnpm generate-scene makes one, written
// within the game (its brief, its style) and validated on its render, then
// saved at once.
//
// game.json keeps the game's brief and, in "generation", how it was generated:
// the changes asked to the plan, and each scene's plan, then, once validated,
// what was painted, with the changes asked to it. It is written once, whatever
// the scenes become after (their scene.json). Quitting keeps the scenes
// validated: the others are in the plan, to make with pnpm generate-scene.
//
// The game must not exist: pnpm remove-game first. Needs ANTHROPIC_API_KEY and
// GEMINI_API_KEY, as pnpm generate-scene (see env.ts).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Game, Generation } from "@esquisse/engine";
import { apiKey } from "./env.ts";
import { IMAGE_MODEL } from "./paint.ts";
import { format, gameDir, ID } from "./registry.ts";
import { json, paintScene, session } from "./session.ts";
import { gameWriter, type Plan, planErrors } from "./write-game.ts";
import { baseWriter, checkModel, FORMATS, TEXT_MODEL } from "./write-scene.ts";

const USAGE = 'Usage: pnpm generate-game <game> "brief" [--model <id>]';
const argv = process.argv.slice(2);
// --model <id>, anywhere.
const flag = argv.indexOf("--model");
const model = flag === -1 ? TEXT_MODEL : argv[flag + 1];
if (model === undefined || model.startsWith("--"))
  throw new Error(`--model needs an id.\n${USAGE}`);
if (flag !== -1) argv.splice(flag, 2);
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
  console.log(`\n${p.title}\n\nStyle : ${p.style}\n`);
  for (const [i, s] of p.scenes.entries()) {
    const opening = s.opening ? ", avec ouverture" : "";
    console.log(`${i + 1}. ${s.id} (${s.orientation}${opening}) : ${s.brief}`);
  }
  console.log();
};

// The plan, until the author validates it.
const planner = gameWriter(anthropicKey, model);
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
  scenes: plan.scenes.map(({ id, orientation, opening, brief }) => ({
    id,
    orientation,
    opening,
    brief,
  })),
};
const first = plan.scenes[0]?.id ?? "";
const gameJson: Game = { brief, title: plan.title, start: first, links: {}, generation };
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
  const writer = baseWriter(anthropicKey, FORMAT, { brief, style: plan.style }, model);
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
console.log("  Its scenes are not linked: their exits go in game.json (see pnpm check-game).");
