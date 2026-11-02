// The games, for both apps, written by hand for now: each one's game.json
// names its scenes, which must be in scenes/index.ts.

import { scenes } from "../scenes/index.ts";
import type { SceneData } from "../scenes/types.ts";
import tristramGame from "./tristram/game.json";
import type { Game, GameData } from "./types.ts";

export * from "./types.ts";

// The scenes a game goes through: its start, and every scene a link leaves or
// leads to.
export const gameScenes = ({ start, links }: Game) => [
  ...new Set([start, ...Object.keys(links), ...Object.values(links).flatMap(Object.values)]),
];

const sceneData = (id: string): SceneData => {
  if (!Object.hasOwn(scenes, id)) throw new Error(`No scene « ${id} » in scenes/index.ts`);
  return scenes[id as keyof typeof scenes];
};

const gameData = (game: Game): GameData => ({
  game,
  scenes: Object.fromEntries(gameScenes(game).map((id) => [id, sceneData(id)])),
});

// A scene alone, as a game of its own: its exits all stay closed.
export const sceneGame = (id: string, data: SceneData): GameData => ({
  game: { title: data.scene.title, start: id, links: {} },
  scenes: { [id]: data },
});

export const games = {
  tristram: gameData(tristramGame),
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
