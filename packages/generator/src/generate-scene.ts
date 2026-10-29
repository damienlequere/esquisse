// Builds a scene step by step, with its author, in the terminal:
//
//   pnpm generate <id> portrait|landscape "brief"   a new scene, from its brief
//   pnpm generate <id>                              an existing scene, to add to it
//
// The orientation is the image's: portrait (9:16) or landscape (16:9), played
// with the screen turned to match.
//
// First the background: Claude writes the decor from the brief, Gemini paints
// it, and the author validates it, has it painted again, or asks for a change.
// Then, if the author wants, details for realism: Claude suggests them from the
// render, the author keeps some, and Gemini retouches them into the background,
// never clickable. Then, one at a time, the elements the author asks for: Claude writes each one
// from the current render, Gemini adds it (an object by retouching the
// validated background, a character as a layer), and the author validates it
// on the new render, has it redone, changes it, or drops it. A character's
// dialogue is then written one line at a time, each validated the same way:
// its greeting, the questions the author wants, its farewell. The background can
// be animated too: lights lit by a fire (windows, a lantern), and a red glow
// that comes back from time to time, which Gemini finds from what the author
// describes, and the author validates their zone; and the
// sky, replaced by another one that Gemini paints and that drifts behind the
// rest, once the author has validated what stands in front of it and the new
// sky. Each render opens in the image viewer.
//
// What is validated is saved at once, so the session can stop at any time: the
// scene and the positions in packages/shared/src/scenes/<id>, the converted
// images in packages/shared/assets/scenes/<id>, the originals in
// packages/generator/sources/<id>, and the scene listed for both apps (see
// registry.ts). Needs ANTHROPIC_API_KEY (to write) and GEMINI_API_KEY (for the
// images), in packages/generator/.env.local or .env (see env.ts).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import type {
  Character,
  Detail,
  Effect,
  EffectKind,
  Scene,
  SceneData,
  SceneObject,
} from "@esquisse/shared";
import { isLandscape } from "@esquisse/shared/layout";
import sharp from "sharp";
import { inside } from "./check-scene.ts";
import { apiKey } from "./env.ts";
import { glowMask, lightsMask } from "./lights.ts";
import {
  addDetails,
  addObject,
  detectEvery,
  detectObjects,
  paintBackground,
  paintCharacter,
  paintSky,
  render,
  renderFront,
  renderMask,
  renderStill,
  show,
  where,
} from "./paint.ts";
import { writeRegistries } from "./registry.ts";
import { loopSky, skyMatte, stillWithSky } from "./sky.ts";
import {
  type Base,
  baseWriter,
  detailWriter,
  type Element,
  elementId,
  elementWriter,
  FORMATS,
  type Format,
  type Line,
  type LineKind,
  lineWriter,
  type Orientation,
} from "./write-scene.ts";

const GENERATOR = join(import.meta.dirname, "..");
const ROOT = join(GENERATOR, "../..");

const USAGE = 'Usage: pnpm generate <id> [portrait|landscape "brief"]';
const [id, ...args] = process.argv.slice(2);
if (id === undefined) throw new Error(USAGE);
// The id is a folder, a URL and a name in the registries' imports.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid id: ${id} (kebab-case)`);
const isOrientation = (o: string | undefined): o is Orientation =>
  o !== undefined && Object.hasOwn(FORMATS, o);
if (args.length > 0 && !isOrientation(args[0])) {
  throw new Error(`The orientation comes first, portrait or landscape.\n${USAGE}`);
}
if (args.length === 1) throw new Error(`The brief is missing, in quotes.\n${USAGE}`);
if (args.length > 2) throw new Error(`Only one brief, in quotes.\n${USAGE}`);
const orientation = args[0] as Orientation | undefined;
const brief = args[1];

const DIR = join(ROOT, "packages/shared/src/scenes", id);
const SOURCES = join(GENERATOR, "sources", id);
const MEDIA = join(ROOT, "packages/shared/assets/scenes", id);
const SCENE = join(DIR, "scene.json");

// Both are checked before anything is paid for.
const anthropicKey = apiKey("ANTHROPIC_API_KEY");
const geminiKey = apiKey("GEMINI_API_KEY");

const rl = createInterface({ input: process.stdin, output: process.stdout });
// Without a listener, readline only pauses on Ctrl+C: what is validated is saved.
rl.on("SIGINT", () => process.exit(130));

// Asks until the answer is one of the choices' keys.
const choose = async (question: string, choices: Record<string, string>) => {
  const line = Object.entries(choices)
    .map(([k, label]) => `[${k}] ${label}`)
    .join("  ");
  for (;;) {
    const answer = (await rl.question(`${question}  ${line}\n> `)).trim().toLowerCase();
    if (Object.hasOwn(choices, answer)) return answer;
  }
};

// ── What is validated ────────────────────────────────────────────────────────

// The scene and its images: the background, and each character's keyed layer.
type State = { data: SceneData; background: Buffer; layers: Record<string, Buffer> };

// A state not validated yet, with the new files it brings.
type Candidate = State & {
  backgroundChanged: boolean;
  character?: { id: string; jpg: Buffer; layer: Buffer };
  // The animations' images, by file (see effectFiles), as they were validated.
  files?: Record<string, Buffer>;
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// What each kind of animation finds in the background, by file (see
// effectFiles): the lights' mask; what stands in front of the sky (the painted
// sky is not found: it stays).
const FOUND: Record<
  EffectKind,
  (background: Buffer, e: Effect) => Promise<Record<string, Buffer>>
> = {
  firelight: async (background, e) => {
    console.log("Detecting the lights…");
    const boxes = await detectEvery(geminiKey, background, e.detect ?? "");
    if (boxes.length === 0) console.log("⚠ No light found in the image");
    return { [e.id]: await lightsMask(background, boxes) };
  },
  glow: async (background, e) => {
    console.log("Detecting the glow…");
    const boxes = await detectEvery(geminiKey, background, e.detect ?? "");
    if (boxes.length === 0) console.log("⚠ No glow found in the image");
    return { [e.id]: await glowMask(background, boxes) };
  },
  sky: async (background, e) => {
    console.log("Finding the sky…");
    return { [`${e.id}-devant`]: (await skyMatte(background)).front };
  },
};
const find = (e: Effect, background: Buffer) => {
  if (!Object.hasOwn(FOUND, e.kind)) throw new Error(`Unknown kind of effect: ${e.kind}`);
  return FOUND[e.kind as EffectKind](background, e);
};

// The size the apps get the background at, and its animations' images but the
// painted sky: 1440 × 2560 or 2560 × 1440.
const appSize = (scene: Scene) => (isLandscape(scene) ? { width: 2560 } : { width: 1440 });

const save = async ({ data, background, backgroundChanged, character, files }: Candidate) => {
  const { scene } = data;
  for (const dir of [DIR, SOURCES, MEDIA]) mkdirSync(dir, { recursive: true });
  writeFileSync(SCENE, json(scene));
  writeFileSync(join(DIR, "objects.json"), json(data.objects));
  writeFileSync(join(DIR, "characters.json"), json(data.aspects));
  if (backgroundChanged) writeFileSync(join(SOURCES, "fond.jpg"), background);

  // A retouch may move what the animations move: it is found again.
  const changed: Record<string, Buffer> = { ...files };
  if (backgroundChanged) {
    for (const e of scene.effects ?? []) {
      for (const [file, image] of Object.entries(await find(e, background))) {
        changed[file] ??= image;
      }
    }
  }
  const skies = new Set((scene.effects ?? []).filter((e) => e.kind === "sky").map((e) => e.id));
  for (const [file, image] of Object.entries(changed)) {
    await (skies.has(file) ? sharp(image) : sharp(image).resize(appSize(scene)))
      .webp({ quality: 90, alphaQuality: 90 })
      .toFile(join(MEDIA, `${file}.webp`));
  }

  // The background as the apps show it still: with its new sky, if it has one.
  const sky = [...skies][0];
  if (backgroundChanged || Object.keys(changed).length > 0) {
    const media = (file: string) => changed[file] ?? readFileSync(join(MEDIA, `${file}.webp`));
    const still =
      sky === undefined
        ? background
        : await stillWithSky(
            await sharp(media(`${sky}-devant`))
              .resize(appSize(scene))
              .png()
              .toBuffer(),
            media(sky),
          );
    await sharp(still)
      .resize(appSize(scene))
      .webp({ quality: 90 })
      .toFile(join(MEDIA, "fond.webp"));
  }
  if (character !== undefined) {
    writeFileSync(join(SOURCES, `${character.id}.jpg`), character.jpg);
    await sharp(character.layer)
      .resize({ height: 1000, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 90 })
      .toFile(join(MEDIA, `${character.id}.webp`));
  }
  writeRegistries();
  console.log(`✓ Saved: /scene/${id} in both apps`);
};

const load = (): State => {
  const read = (file: string) => JSON.parse(readFileSync(join(DIR, file), "utf8"));
  const data: SceneData = {
    scene: read("scene.json"),
    objects: existsSync(join(DIR, "objects.json")) ? read("objects.json") : {},
    aspects: existsSync(join(DIR, "characters.json")) ? read("characters.json") : {},
  };
  const layers = Object.fromEntries(
    data.scene.characters
      .filter((c) => existsSync(join(MEDIA, `${c.id}.webp`)))
      .map((c) => [c.id, readFileSync(join(MEDIA, `${c.id}.webp`))]),
  );
  return { data, background: readFileSync(join(SOURCES, "fond.jpg")), layers };
};

const showState = async (s: State) => show(id, await render(s.data, s.background, s.layers));

// ── The background ───────────────────────────────────────────────────────────

const createBackground = async (
  brief: string,
  format: Format,
): Promise<{ state: State; suggestions: string[] }> => {
  const writer = baseWriter(anthropicKey, format);
  let base: Base = await writer.write(brief);
  for (;;) {
    const { suggestions, ...written } = base;
    const scene = {
      brief,
      title: written.title,
      intro: written.intro,
      imageRatio: format.imageRatio,
      safe: format.safe,
      style: written.style,
      light: written.light,
      background: written.background,
      objects: [],
      characters: [],
    };
    console.log(`\n${scene.title}\n${scene.intro}\n\nDécor : ${scene.background.prompt}\n`);
    console.log("Painting the background…");
    const background = await paintBackground(geminiKey, scene);
    const candidate: Candidate = {
      data: { scene, objects: {}, aspects: {} },
      background,
      layers: {},
      backgroundChanged: true,
    };
    await showState(candidate);
    const answer = await choose("Le fond :", {
      v: "valider",
      r: "repeindre",
      m: "modifier",
      q: "quitter",
    });
    if (answer === "v") {
      await save(candidate);
      return { state: candidate, suggestions };
    }
    if (answer === "q") process.exit(0);
    if (answer === "m") base = await writer.revise(await rl.question("Que changer ?\n> "));
  }
};

// ── The elements ─────────────────────────────────────────────────────────────

// Every object is found again after a retouch: it may have moved them a little.
const findObjects = async (scene: Scene, background: Buffer, objects: SceneObject[]) => {
  if (objects.length === 0) return {};
  console.log("Detecting the objects…");
  const boxes = await detectObjects(geminiKey, background, objects);
  for (const { id: oid } of objects) {
    const box = boxes[oid];
    if (box === undefined) console.log(`⚠ ${oid}: not found in the image`);
    else if (!inside(box, scene.safe)) console.log(`⚠ ${oid}: outside the safe zone`);
  }
  return boxes;
};

const withObject = async (state: State, o: SceneObject): Promise<Candidate> => {
  const { scene } = state.data;
  console.log(`Adding ${o.id} to the background…`);
  const background = await addObject(geminiKey, scene, state.background, o);
  const objects = [...scene.objects, o];
  const boxes = await findObjects(scene, background, objects);
  return {
    data: { ...state.data, scene: { ...scene, objects }, objects: boxes },
    background,
    layers: state.layers,
    backgroundChanged: true,
  };
};

const withDetails = async (state: State, details: Detail[]): Promise<Candidate> => {
  const { scene } = state.data;
  console.log("Adding the details to the background…");
  const background = await addDetails(geminiKey, scene, state.background, details);
  const boxes = await findObjects(scene, background, scene.objects);
  const all = [...(scene.background.details ?? []), ...details];
  return {
    data: {
      ...state.data,
      scene: { ...scene, background: { ...scene.background, details: all } },
      objects: boxes,
    },
    background,
    layers: state.layers,
    backgroundChanged: true,
  };
};

const withCharacter = async (state: State, c: Character): Promise<Candidate> => {
  const { scene, aspects } = state.data;
  console.log(`Painting ${c.id}…`);
  const { jpg, layer, aspect } = await paintCharacter(geminiKey, scene, state.background, c);
  return {
    data: {
      ...state.data,
      scene: { ...scene, characters: [...scene.characters, c] },
      aspects: { ...aspects, [c.id]: aspect },
    },
    background: state.background,
    layers: { ...state.layers, [c.id]: layer },
    backgroundChanged: false,
    character: { id: c.id, jpg, layer },
  };
};

const summary = (e: Element) =>
  e.kind === "object"
    ? `Objet « ${e.object.id} », ${where(e.object.zone)}\n  ${e.object.paint}\n  ${e.object.label} : ${e.object.text}`
    : `Personnage « ${e.character.name} » (${e.character.id})\n  ${e.character.paint}`;

// Returns the new state if the element is validated, the same one otherwise.
const addElement = async (state: State, request: string): Promise<State> => {
  const writer = elementWriter(
    anthropicKey,
    state.data,
    await render(state.data, state.background, state.layers),
  );
  let { element, problems } = await writer.write(request);
  for (;;) {
    console.log(`\n${summary(element)}\n`);
    if (problems.length > 0) {
      console.log(`⚠ The composition still does not hold:\n  ${problems.join("\n  ")}`);
    }
    const candidate =
      element.kind === "object"
        ? await withObject(state, element.object)
        : await withCharacter(state, element.character);
    await showState(candidate);
    const answer = await choose(`« ${elementId(element)} » :`, {
      v: "valider",
      r: "refaire",
      m: "modifier",
      a: "abandonner",
    });
    if (answer === "v") {
      await save(candidate);
      return element.kind === "character"
        ? writeDialogue(candidate, element.character.id)
        : candidate;
    }
    if (answer === "a") return state;
    if (answer === "m") {
      ({ element, problems } = await writer.revise(await rl.question("Que changer ?\n> ")));
    }
  }
};

// ── The dialogues ────────────────────────────────────────────────────────────

const character = (state: State, cid: string) => {
  const c = state.data.scene.characters.find((c) => c.id === cid);
  if (c === undefined) throw new Error(`No character "${cid}"`);
  return c;
};

const LINE_NAMES: Record<LineKind, string> = {
  greeting: "L'accueil",
  topic: "La question",
  farewell: "L'au revoir",
};

const showLine = (l: Line) => ("ask" in l ? `— ${l.ask}\n  « ${l.answer} »` : `« ${l.text} »`);

// The state with the line in the character's dialogue, saved: only texts change.
const withLine = async (state: State, cid: string, kind: LineKind, l: Line) => {
  const { scene } = state.data;
  const characters = scene.characters.map((c) => {
    if (c.id !== cid) return c;
    const { dialogue } = c;
    if ("ask" in l) return { ...c, dialogue: { ...dialogue, topics: [...dialogue.topics, l] } };
    return { ...c, dialogue: { ...dialogue, [kind]: l.text } };
  });
  const candidate: Candidate = {
    ...state,
    data: { ...state.data, scene: { ...scene, characters } },
    backgroundChanged: false,
  };
  await save(candidate);
  return candidate;
};

// One line, written then validated, rewritten or changed until the author keeps
// or drops it. Returns the new state if it is validated, the same one otherwise.
const addLine = async (state: State, cid: string, kind: LineKind, request: string) => {
  const c = character(state, cid);
  const writer = lineWriter(anthropicKey, state.data, c, kind);
  let l = await writer.write(request);
  for (;;) {
    console.log(`\n${LINE_NAMES[kind]} de ${c.name} :\n  ${showLine(l)}\n`);
    const answer = await choose(`${LINE_NAMES[kind]} :`, {
      v: "valider",
      r: "réécrire",
      m: "modifier",
      a: kind === "topic" ? "abandonner" : "plus tard",
    });
    if (answer === "v") return withLine(state, cid, kind, l);
    if (answer === "a") return state;
    l = await writer.revise(
      answer === "r"
        ? "Propose une autre version, différente."
        : await rl.question("Que changer ?\n> "),
    );
  }
};

// The character's greeting if it has none, then the questions the author wants,
// one at a time, then its farewell if it has none.
const writeDialogue = async (start: State, cid: string): Promise<State> => {
  let state = start;
  console.log(`\nLe dialogue de ${character(state, cid).name}`);
  if (character(state, cid).dialogue.greeting === "") {
    state = await addLine(state, cid, "greeting", "");
  }
  for (;;) {
    const { topics } = character(state, cid).dialogue;
    console.log(
      topics.length === 0
        ? "\nAucune question pour l'instant."
        : `\nLes questions : ${topics.map((t, i) => `\n  ${i + 1}. ${t.ask}`).join("")}`,
    );
    const answer = (
      await rl.question(
        "Une question à ajouter ? (ce que le joueur demande, n pour que Claude en propose une, ou Entrée pour finir)\n> ",
      )
    ).trim();
    if (answer === "") break;
    state = await addLine(state, cid, "topic", answer.toLowerCase() === "n" ? "" : answer);
  }
  if (character(state, cid).dialogue.farewell === "") {
    state = await addLine(state, cid, "farewell", "");
  }
  return state;
};

// Picks a character of the scene, by number, to go on with its dialogue.
const pickCharacter = async (state: State) => {
  const { characters } = state.data.scene;
  if (characters.length === 0) {
    console.log("Aucun personnage dans la scène.");
    return undefined;
  }
  console.log(characters.map((c, i) => `  ${i + 1}. ${c.name}`).join("\n"));
  const answer = (await rl.question("Lequel ? (un numéro, ou Entrée pour revenir)\n> ")).trim();
  return characters[Number(answer) - 1]?.id;
};

// ── The animations ───────────────────────────────────────────────────────────

// An id not taken yet in the scene: base, then base-2, base-3…
const freeId = (scene: Scene, base: string) => {
  const taken = new Set((scene.effects ?? []).map((e) => e.id));
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

// What the author describes for Gemini to find, and the effect's id.
const DESCRIBED = {
  firelight: {
    question:
      "Quelles lumières ? (ce que Gemini doit trouver, par exemple « les fenêtres éclairées de la maison de gauche », ou Entrée pour revenir)",
    id: "feu",
  },
  glow: {
    question:
      "Quelle lueur rouge ? (ce que Gemini doit trouver, avec la lueur autour, par exemple « la cathédrale en ruine sur la colline, avec la lueur rouge autour », ou Entrée pour revenir)",
    id: "lueur",
  },
};

// Lights lit by a fire, or a red glow. Returns the new state if their zone is
// validated, the same one otherwise.
const animateDescribed = async (state: State, kind: keyof typeof DESCRIBED): Promise<State> => {
  const { scene } = state.data;
  const detect = (await rl.question(`${DESCRIBED[kind].question}\n> `)).trim();
  if (detect === "") return state;
  const effect: Effect = { id: freeId(scene, DESCRIBED[kind].id), kind, detect };
  for (;;) {
    const found = await find(effect, state.background);
    const mask = found[effect.id] as Buffer;
    show(id, await renderMask(state.background, mask));
    const answer = await choose("Ce qui est animé (en rouge) :", {
      v: "valider",
      r: "refaire",
      a: "abandonner",
    });
    if (answer === "a") return state;
    if (answer === "r") continue;
    const candidate: Candidate = {
      ...state,
      data: { ...state.data, scene: { ...scene, effects: [...(scene.effects ?? []), effect] } },
      backgroundChanged: false,
      files: found,
    };
    await save(candidate);
    return candidate;
  }
};

// Another sky, drifting behind the rest: what stands in front of it is found
// and validated, then Gemini paints the sky, validated on the scene. Returns
// the new state if both are, the same one otherwise.
const animateSky = async (state: State): Promise<State> => {
  const { scene } = state.data;
  if (scene.effects?.some((e) => e.kind === "sky")) {
    console.log("Le ciel est déjà animé.");
    return state;
  }
  const effect: Effect = { id: freeId(scene, "ciel"), kind: "sky" };
  console.log("Finding the sky…");
  const { front } = await skyMatte(state.background);
  show(id, await renderFront(front));
  const kept = await choose("Ce qui reste devant le ciel (sur le vert) :", {
    v: "valider",
    a: "abandonner",
  });
  if (kept === "a") return state;
  for (;;) {
    console.log("Painting the sky…");
    const painted = await paintSky(geminiKey, scene, state.background);
    const sky = await loopSky(painted);
    show(id, await renderStill(await stillWithSky(front, sky)));
    const answer = await choose("Le nouveau ciel :", {
      v: "valider",
      r: "repeindre",
      a: "abandonner",
    });
    if (answer === "a") return state;
    if (answer === "r") continue;
    // Under the other animations: they are drawn over it.
    const candidate: Candidate = {
      ...state,
      data: { ...state.data, scene: { ...scene, effects: [effect, ...(scene.effects ?? [])] } },
      backgroundChanged: false,
      files: { [effect.id]: sky, [`${effect.id}-devant`]: front },
    };
    await save(candidate);
    writeFileSync(join(SOURCES, `${effect.id}.jpg`), painted);
    return candidate;
  }
};

// ── The details ──────────────────────────────────────────────────────────────

// Returns the new state if the details are validated, the same one otherwise.
const addRealism = async (state: State): Promise<State> => {
  const writer = detailWriter(
    anthropicKey,
    state.data,
    await render(state.data, state.background, state.layers),
  );
  const list = (details: Detail[]) =>
    details.map((d, i) => `\n  ${i + 1}. ${d.paint}\n     ${where(d.zone)}`).join("");
  const suggested = await writer.suggest();
  console.log(`\nDétails de réalisme : ${list(suggested)}`);
  let details: Detail[] = [];
  while (details.length === 0) {
    const answer = (
      await rl.question(
        "Lesquels ajouter ? (des numéros, « tous », une description, ou Entrée pour passer)\n> ",
      )
    ).trim();
    if (answer === "") return state;
    const numbers = answer.split(/[\s,]+/);
    if (answer.toLowerCase() === "tous") details = suggested;
    else if (numbers.every((n) => /^\d+$/.test(n))) {
      details = numbers.flatMap((n) => suggested[Number(n) - 1] ?? []);
    } else details = await writer.write(answer);
  }
  for (;;) {
    console.log(`\nLes détails : ${list(details)}\n`);
    const candidate = await withDetails(state, details);
    await showState(candidate);
    const answer = await choose("Les détails :", {
      v: "valider",
      r: "refaire",
      m: "modifier",
      a: "abandonner",
    });
    if (answer === "v") {
      await save(candidate);
      return candidate;
    }
    if (answer === "a") return state;
    if (answer === "m") {
      const revised = await writer.revise(details, await rl.question("Que changer ?\n> "));
      // All of them out of the safe zone: the previous ones stay.
      if (revised.length > 0) details = revised;
    }
  }
};

// ── Run ──────────────────────────────────────────────────────────────────────

const exists = existsSync(SCENE);
let state: State;
let suggestions: string[] = [];
if (orientation !== undefined && brief !== undefined) {
  if (exists) {
    const answer = await choose(`The scene "${id}" exists: start it over, losing it?`, {
      o: "oui",
      n: "non",
    });
    if (answer === "n") process.exit(0);
    for (const dir of [DIR, SOURCES, MEDIA]) rmSync(dir, { recursive: true, force: true });
  }
  ({ state, suggestions } = await createBackground(brief, FORMATS[orientation]));
  state = await addRealism(state);
} else {
  if (!exists) throw new Error(`No scene "${id}": pnpm generate ${id} portrait|landscape "brief"`);
  state = load();
  console.log(
    `${state.data.scene.title}: ${state.data.scene.objects.length} object(s), ${state.data.scene.characters.length} character(s)`,
  );
  await showState(state);
}

for (;;) {
  if (suggestions.length > 0) {
    console.log(`\nIdées : ${suggestions.map((s, i) => `\n  ${i + 1}. ${s}`).join("")}`);
  }
  const answer = (
    await rl.question(
      "\nQue veux-tu ajouter ? (une description, un numéro d'idée, d pour des détails de réalisme, p pour le dialogue d'un personnage, f pour animer des lumières de feu, l pour une lueur rouge qui revient de temps en temps, c pour animer le ciel, ou Entrée pour finir)\n> ",
    )
  ).trim();
  if (answer === "") break;
  if (answer.toLowerCase() === "d") {
    state = await addRealism(state);
    continue;
  }
  if (answer.toLowerCase() === "f" || answer.toLowerCase() === "l") {
    state = await animateDescribed(state, answer.toLowerCase() === "f" ? "firelight" : "glow");
    continue;
  }
  if (answer.toLowerCase() === "c") {
    state = await animateSky(state);
    continue;
  }
  if (answer.toLowerCase() === "p") {
    const cid = await pickCharacter(state);
    if (cid !== undefined) state = await writeDialogue(state, cid);
    continue;
  }
  const picked = /^\d+$/.test(answer) ? suggestions[Number(answer) - 1] : undefined;
  if (/^\d+$/.test(answer) && picked === undefined) continue;
  const request = picked ?? answer;
  const before = state;
  state = await addElement(state, request);
  if (state !== before && picked !== undefined)
    suggestions = suggestions.filter((s) => s !== picked);
}
rl.close();
for (const c of state.data.scene.characters) {
  const missing = [
    c.dialogue.greeting === "" && "son accueil",
    c.dialogue.farewell === "" && "son au revoir",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.log(`⚠ ${c.name} n'a pas encore ${missing.join(" ni ")} : pnpm generate ${id}, puis p`);
  }
}
console.log(`✓ ${state.data.scene.title}: /scene/${id}, run pnpm dev to play it`);
