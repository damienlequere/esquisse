// The games, for both apps, written by hand for now: each one's game.json
// names its scenes, which must be in scenes/index.ts (pnpm check-game checks
// it all, in packages/generator).

import { type Game, type GameData, gameScenes, type SceneData } from "@esquisse/shared";
import { ITEMS } from "../items/index.ts";
import { scenes } from "../scenes/index.ts";
import tristramGame from "./tristram/game.json";

const sceneData = (id: string): SceneData => {
  if (!Object.hasOwn(scenes, id)) throw new Error(`No scene « ${id} » in scenes/index.ts`);
  return scenes[id as keyof typeof scenes];
};

const gameData = (game: Game): GameData => ({
  game,
  scenes: Object.fromEntries(gameScenes(game).map((id) => [id, sceneData(id)])),
  items: ITEMS,
});

export const games = {
  tristram: gameData(tristramGame),
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
