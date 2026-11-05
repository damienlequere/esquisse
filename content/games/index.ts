// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { GameData } from "@esquisse/engine";
import montagnesGame from "./montagnes/game.json";
import montagnesScenePlateauAspects from "./montagnes/scenes/plateau/characters.json";
import montagnesScenePlateauObjects from "./montagnes/scenes/plateau/objects.json";
import montagnesScenePlateauScene from "./montagnes/scenes/plateau/scene.json";
import tristramGame from "./tristram/game.json";
import { ITEMS as tristramItems } from "./tristram/items/index.ts";
import tristramSceneAubergeAspects from "./tristram/scenes/auberge/characters.json";
import tristramSceneAubergeObjects from "./tristram/scenes/auberge/objects.json";
import tristramSceneAubergeScene from "./tristram/scenes/auberge/scene.json";
import tristramSceneEtageAspects from "./tristram/scenes/etage/characters.json";
import tristramSceneEtageObjects from "./tristram/scenes/etage/objects.json";
import tristramSceneEtageScene from "./tristram/scenes/etage/scene.json";
import tristramSceneRueAspects from "./tristram/scenes/rue/characters.json";
import tristramSceneRueObjects from "./tristram/scenes/rue/objects.json";
import tristramSceneRueScene from "./tristram/scenes/rue/scene.json";

// The games, by id: each one with all its scenes, by id, and its items.
export const games = {
  montagnes: {
    game: montagnesGame,
    scenes: {
      plateau: {
        scene: montagnesScenePlateauScene,
        objects: montagnesScenePlateauObjects,
        aspects: montagnesScenePlateauAspects,
      },
    },
    items: {},
  },
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
      rue: {
        scene: tristramSceneRueScene,
        objects: tristramSceneRueObjects,
        aspects: tristramSceneRueAspects,
      },
    },
    items: tristramItems,
  },
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
