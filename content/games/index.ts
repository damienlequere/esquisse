// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { GameData } from "@esquisse/engine";
import tristramGame from "./tristram/game.json";
import { ITEMS as tristramItems } from "./tristram/items/index.ts";
import tristramSceneAubergeAspects from "./tristram/scenes/auberge/characters.json";
import tristramSceneAubergeObjects from "./tristram/scenes/auberge/objects.json";
import tristramSceneAubergeScene from "./tristram/scenes/auberge/scene.json";
import tristramSceneEtageAspects from "./tristram/scenes/etage/characters.json";
import tristramSceneEtageObjects from "./tristram/scenes/etage/objects.json";
import tristramSceneEtageScene from "./tristram/scenes/etage/scene.json";
import tristramSceneTristramAspects from "./tristram/scenes/tristram/characters.json";
import tristramSceneTristramObjects from "./tristram/scenes/tristram/objects.json";
import tristramSceneTristramScene from "./tristram/scenes/tristram/scene.json";

// The games, by id: each one with all its scenes, by id, and its items.
export const games = {
  tristram: {
    game: tristramGame,
    scenes: {
      auberge: {
        scene: tristramSceneAubergeScene,
        objects: tristramSceneAubergeObjects,
        aspects: tristramSceneAubergeAspects,
      },
      etage: {
        scene: tristramSceneEtageScene,
        objects: tristramSceneEtageObjects,
        aspects: tristramSceneEtageAspects,
      },
      tristram: {
        scene: tristramSceneTristramScene,
        objects: tristramSceneTristramObjects,
        aspects: tristramSceneTristramAspects,
      },
    },
    items: tristramItems,
  },
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
