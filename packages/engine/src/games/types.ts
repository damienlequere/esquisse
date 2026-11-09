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
  title: string;
  // The scene it starts in.
  start: string;
  // Where each scene's exits lead: by scene, then by exit, a scene's id.
  links: Record<string, Record<string, string>>;
  // How the game was first generated, kept as it was, whatever its scenes
  // become: their scene.json is what changes after.
  generation?: Generation;
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
  scenes: GeneratedScene[];
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
