import type { SceneData } from "../scenes/types.ts";
import type { GameData } from "./types.ts";

export * from "./types.ts";

// A scene of a game alone, as a game of its own, with the game's items: its
// exits all stay closed.
export const sceneGame = ({ scenes, items }: GameData, id: string): GameData => {
  const data = scenes[id];
  if (data === undefined) throw new Error(`No scene « ${id} »`);
  return { game: { title: data.scene.title, start: id, links: {} }, scenes: { [id]: data }, items };
};

// A scene of a game to be shown on another site: sceneGame, without its opening,
// its objects or its characters, so that nothing of them reaches the page, nor
// any item.
export const capsuleGame = (game: GameData, id: string): GameData => {
  const alone = sceneGame(game, id);
  const data = alone.scenes[id] as SceneData;
  const scene = { ...data.scene, opening: false, objects: [], characters: [] };
  return { ...alone, scenes: { [id]: { scene, objects: {}, aspects: {} } }, items: {} };
};
