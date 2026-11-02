import type { Items } from "../scenes/items.ts";
import type { SceneData } from "../scenes/types.ts";

// A game, as written in content/games/<id>/game.json: scenes, each composed alone,
// linked by their exits. An object's action with an exit (see ObjectAction)
// leads where the game says; an exit the game does not link stays closed, and
// the action does what it would without it.
export type Game = {
  title: string;
  // The scene it starts in.
  start: string;
  // Where each scene's exits lead: by scene, then by exit, a scene's id.
  links: Record<string, Record<string, string>>;
};

// A game, the scenes it goes through, by id, and what the player can carry in it.
export type GameData = { game: Game; scenes: Record<string, SceneData>; items: Items };
