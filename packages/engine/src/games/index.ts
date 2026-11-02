import type { GameData } from "./types.ts";

export * from "./types.ts";

// A scene of a game alone, as a game of its own, with the game's items: its
// exits all stay closed.
export const sceneGame = ({ scenes, items }: GameData, id: string): GameData => {
  const data = scenes[id];
  if (data === undefined) throw new Error(`No scene « ${id} »`);
  return { game: { title: data.scene.title, start: id, links: {} }, scenes: { [id]: data }, items };
};
