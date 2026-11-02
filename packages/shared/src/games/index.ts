import type { Items } from "../scenes/items.ts";
import type { SceneData } from "../scenes/types.ts";
import type { Game, GameData } from "./types.ts";

export * from "./types.ts";

// The scenes a game goes through: its start, and every scene a link leaves or
// leads to.
export const gameScenes = ({ start, links }: Game) => [
  ...new Set([start, ...Object.keys(links), ...Object.values(links).flatMap(Object.values)]),
];

// A scene alone, as a game of its own: its exits all stay closed.
export const sceneGame = (id: string, data: SceneData, items: Items): GameData => ({
  game: { title: data.scene.title, start: id, links: {} },
  scenes: { [id]: data },
  items,
});
