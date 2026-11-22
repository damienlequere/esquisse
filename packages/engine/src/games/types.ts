import type { Items } from "../scenes/items.ts";
import type { SceneData } from "../scenes/types.ts";

// A game, as written in content/games/<id>/game.json: its scenes, in its
// scenes/ folder, each composed alone, linked by their exits. An object's action with an exit (see ObjectAction)
// leads where the game says; an exit the game does not link stays closed, and
// the action does what it would without it.
export type Game = {
  // What the game was asked for, in its author's words: the text given to
  // generate its scenes, kept as it was.
  brief?: string;
  // The images' direction its scenes are generated with (--art), when it is
  // not the default one (see packages/generator/src/art.ts), kept as it was.
  artDirection?: ArtDirection;
  title: string;
  // The scene it starts in.
  start: string;
  // Where each scene's exits lead: by scene, then by exit, a scene's id.
  links: Record<string, Record<string, string>>;
  // How the game was first generated, kept as it was, whatever its scenes
  // become: their scene.json is what changes after.
  generation?: Generation;
};

// What Claude is told of the images: what they are (direction), what a style
// is about (technique), and what it bans besides the bans of any image. A
// preset has its id and its label (see packages/generator/src/art.ts); a
// direction of the author's own has neither.
export type ArtDirection = {
  id?: string;
  label?: string;
  direction: string;
  technique: string;
  bans: string;
};

// Written by pnpm generate-game (packages/generator/src/generate-game.ts), once.
// Read from game.json, its strings are only strings.
export type Generation = {
  // The command that wrote the scenes: generate-game, or generate-scene when
  // the block was written after, from their scene.json.
  command: string;
  // YYYY-MM-DD.
  date: string;
  textModel: string;
  imageModel: string;
  // The changes asked to the plan, in order, after the brief.
  changes?: string[];
  // The world the scenes are viewpoints of, for a game whose plan is a map.
  world?: World;
  scenes: GeneratedScene[];
};

// The whole place a game's scenes are seen from: what they share, and the
// landmarks seen from afar, the same wherever they are seen from.
export type World = {
  setting: string;
  landmarks: { id: string; description: string; where: string }[];
};

// Where an exit is in its scene's image: a cell of a 3 × 2 grid, in its safe
// zone. Read from game.json, they are only strings.
export type ExitZone = { x: string; y: string };

// An exit of a scene as planned: its id (its name in the scene and in the
// game's links), the label of its action, the scene it leads to, the threshold
// it goes through, painted in the decor, where, and whether it has no way back.
export type PlannedExit = {
  id: string;
  label: string;
  to: string;
  threshold: string;
  zone: ExitZone;
  oneWay: boolean;
};

// A scene as planned, then as painted once validated: Gemini got its style, its
// background and its format ("Format portrait." or "Format paysage."), one per
// line (see paintBackground). A scene not painted yet has only its plan.
export type GeneratedScene = {
  id: string;
  // portrait or landscape.
  orientation: string;
  opening: boolean;
  brief: string;
  // In a game whose plan is a map: where the player stands and looks, the
  // landmarks seen from there and where, its exits, and the one the back
  // button takes.
  viewpoint?: string;
  landmarks?: { id: string; where: string }[];
  exits?: PlannedExit[];
  back?: string;
  // The changes asked to its background, in order, after the brief.
  changes?: string[];
  title?: string;
  intro?: string;
  style?: string;
  light?: string;
  background?: string;
};

// A game, its scenes, by id, and what the player can carry in it.
export type GameData = { game: Game; scenes: Record<string, SceneData>; items: Items };
