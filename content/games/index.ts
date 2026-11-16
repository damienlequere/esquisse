// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { GameData } from "@esquisse/engine";
import testCarteGame from "./test-carte/game.json";
import testCarteSceneAubergeAspects from "./test-carte/scenes/auberge/characters.json";
import testCarteSceneAubergeObjects from "./test-carte/scenes/auberge/objects.json";
import testCarteSceneAubergeScene from "./test-carte/scenes/auberge/scene.json";
import testCarteSceneEtageAspects from "./test-carte/scenes/etage/characters.json";
import testCarteSceneEtageObjects from "./test-carte/scenes/etage/objects.json";
import testCarteSceneEtageScene from "./test-carte/scenes/etage/scene.json";
import testCarteSceneRueAspects from "./test-carte/scenes/rue/characters.json";
import testCarteSceneRueObjects from "./test-carte/scenes/rue/objects.json";
import testCarteSceneRueScene from "./test-carte/scenes/rue/scene.json";
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
import tristram2Game from "./tristram2/game.json";
import tristram2SceneAubergeAspects from "./tristram2/scenes/auberge/characters.json";
import tristram2SceneAubergeObjects from "./tristram2/scenes/auberge/objects.json";
import tristram2SceneAubergeScene from "./tristram2/scenes/auberge/scene.json";
import tristram2SceneCimetiereAspects from "./tristram2/scenes/cimetiere/characters.json";
import tristram2SceneCimetiereObjects from "./tristram2/scenes/cimetiere/objects.json";
import tristram2SceneCimetiereScene from "./tristram2/scenes/cimetiere/scene.json";
import tristram2ScenePlaceAspects from "./tristram2/scenes/place/characters.json";
import tristram2ScenePlaceObjects from "./tristram2/scenes/place/objects.json";
import tristram2ScenePlaceScene from "./tristram2/scenes/place/scene.json";
import tristram2SceneRueAspects from "./tristram2/scenes/rue/characters.json";
import tristram2SceneRueObjects from "./tristram2/scenes/rue/objects.json";
import tristram2SceneRueScene from "./tristram2/scenes/rue/scene.json";

// The games, by id: each one with all its scenes, by id, and its items.
export const games = {
  "test-carte": {
    game: testCarteGame,
    scenes: {
      auberge: {
        scene: testCarteSceneAubergeScene,
        objects: testCarteSceneAubergeObjects,
        aspects: testCarteSceneAubergeAspects,
      },
      etage: {
        scene: testCarteSceneEtageScene,
        objects: testCarteSceneEtageObjects,
        aspects: testCarteSceneEtageAspects,
      },
      rue: {
        scene: testCarteSceneRueScene,
        objects: testCarteSceneRueObjects,
        aspects: testCarteSceneRueAspects,
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
  tristram2: {
    game: tristram2Game,
    scenes: {
      auberge: {
        scene: tristram2SceneAubergeScene,
        objects: tristram2SceneAubergeObjects,
        aspects: tristram2SceneAubergeAspects,
      },
      cimetiere: {
        scene: tristram2SceneCimetiereScene,
        objects: tristram2SceneCimetiereObjects,
        aspects: tristram2SceneCimetiereAspects,
      },
      place: {
        scene: tristram2ScenePlaceScene,
        objects: tristram2ScenePlaceObjects,
        aspects: tristram2ScenePlaceAspects,
      },
      rue: {
        scene: tristram2SceneRueScene,
        objects: tristram2SceneRueObjects,
        aspects: tristram2SceneRueAspects,
      },
    },
    items: {},
  },
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
