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
import tristramSceneRueAspects from "./tristram/scenes/rue/characters.json";
import tristramSceneRueObjects from "./tristram/scenes/rue/objects.json";
import tristramSceneRueScene from "./tristram/scenes/rue/scene.json";
import tristram2Game from "./tristram2/game.json";
import tristram2SceneCimetiereAspects from "./tristram2/scenes/cimetiere/characters.json";
import tristram2SceneCimetiereObjects from "./tristram2/scenes/cimetiere/objects.json";
import tristram2SceneCimetiereScene from "./tristram2/scenes/cimetiere/scene.json";
import tristram2ScenePlaceDuVillageAspects from "./tristram2/scenes/place-du-village/characters.json";
import tristram2ScenePlaceDuVillageObjects from "./tristram2/scenes/place-du-village/objects.json";
import tristram2ScenePlaceDuVillageScene from "./tristram2/scenes/place-du-village/scene.json";
import tristram2SceneRueAspects from "./tristram2/scenes/rue/characters.json";
import tristram2SceneRueObjects from "./tristram2/scenes/rue/objects.json";
import tristram2SceneRueScene from "./tristram2/scenes/rue/scene.json";
import tristram3Game from "./tristram3/game.json";
import tristram3SceneCimetiereAspects from "./tristram3/scenes/cimetiere/characters.json";
import tristram3SceneCimetiereObjects from "./tristram3/scenes/cimetiere/objects.json";
import tristram3SceneCimetiereScene from "./tristram3/scenes/cimetiere/scene.json";
import tristram3ScenePlaceDuVillageAspects from "./tristram3/scenes/place-du-village/characters.json";
import tristram3ScenePlaceDuVillageObjects from "./tristram3/scenes/place-du-village/objects.json";
import tristram3ScenePlaceDuVillageScene from "./tristram3/scenes/place-du-village/scene.json";
import tristram3SceneRueAspects from "./tristram3/scenes/rue/characters.json";
import tristram3SceneRueObjects from "./tristram3/scenes/rue/objects.json";
import tristram3SceneRueScene from "./tristram3/scenes/rue/scene.json";
import tristram4Game from "./tristram4/game.json";
import tristram4SceneParcCimetiereAbandonneAspects from "./tristram4/scenes/parc-cimetiere-abandonne/characters.json";
import tristram4SceneParcCimetiereAbandonneObjects from "./tristram4/scenes/parc-cimetiere-abandonne/objects.json";
import tristram4SceneParcCimetiereAbandonneScene from "./tristram4/scenes/parc-cimetiere-abandonne/scene.json";
import tristram4ScenePlaceDuVillageAspects from "./tristram4/scenes/place-du-village/characters.json";
import tristram4ScenePlaceDuVillageObjects from "./tristram4/scenes/place-du-village/objects.json";
import tristram4ScenePlaceDuVillageScene from "./tristram4/scenes/place-du-village/scene.json";
import tristram4SceneRueAspects from "./tristram4/scenes/rue/characters.json";
import tristram4SceneRueObjects from "./tristram4/scenes/rue/objects.json";
import tristram4SceneRueScene from "./tristram4/scenes/rue/scene.json";
import tristram5Game from "./tristram5/game.json";
import tristram5SceneParcCimetiereAbandonneAspects from "./tristram5/scenes/parc-cimetiere-abandonne/characters.json";
import tristram5SceneParcCimetiereAbandonneObjects from "./tristram5/scenes/parc-cimetiere-abandonne/objects.json";
import tristram5SceneParcCimetiereAbandonneScene from "./tristram5/scenes/parc-cimetiere-abandonne/scene.json";
import tristram5ScenePlaceDuVillageAspects from "./tristram5/scenes/place-du-village/characters.json";
import tristram5ScenePlaceDuVillageObjects from "./tristram5/scenes/place-du-village/objects.json";
import tristram5ScenePlaceDuVillageScene from "./tristram5/scenes/place-du-village/scene.json";
import tristram5SceneRueAspects from "./tristram5/scenes/rue/characters.json";
import tristram5SceneRueObjects from "./tristram5/scenes/rue/objects.json";
import tristram5SceneRueScene from "./tristram5/scenes/rue/scene.json";

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
      cimetiere: {
        scene: tristram2SceneCimetiereScene,
        objects: tristram2SceneCimetiereObjects,
        aspects: tristram2SceneCimetiereAspects,
      },
      "place-du-village": {
        scene: tristram2ScenePlaceDuVillageScene,
        objects: tristram2ScenePlaceDuVillageObjects,
        aspects: tristram2ScenePlaceDuVillageAspects,
      },
      rue: {
        scene: tristram2SceneRueScene,
        objects: tristram2SceneRueObjects,
        aspects: tristram2SceneRueAspects,
      },
    },
    items: {},
  },
  tristram3: {
    game: tristram3Game,
    scenes: {
      cimetiere: {
        scene: tristram3SceneCimetiereScene,
        objects: tristram3SceneCimetiereObjects,
        aspects: tristram3SceneCimetiereAspects,
      },
      "place-du-village": {
        scene: tristram3ScenePlaceDuVillageScene,
        objects: tristram3ScenePlaceDuVillageObjects,
        aspects: tristram3ScenePlaceDuVillageAspects,
      },
      rue: {
        scene: tristram3SceneRueScene,
        objects: tristram3SceneRueObjects,
        aspects: tristram3SceneRueAspects,
      },
    },
    items: {},
  },
  tristram4: {
    game: tristram4Game,
    scenes: {
      "parc-cimetiere-abandonne": {
        scene: tristram4SceneParcCimetiereAbandonneScene,
        objects: tristram4SceneParcCimetiereAbandonneObjects,
        aspects: tristram4SceneParcCimetiereAbandonneAspects,
      },
      "place-du-village": {
        scene: tristram4ScenePlaceDuVillageScene,
        objects: tristram4ScenePlaceDuVillageObjects,
        aspects: tristram4ScenePlaceDuVillageAspects,
      },
      rue: {
        scene: tristram4SceneRueScene,
        objects: tristram4SceneRueObjects,
        aspects: tristram4SceneRueAspects,
      },
    },
    items: {},
  },
  tristram5: {
    game: tristram5Game,
    scenes: {
      "parc-cimetiere-abandonne": {
        scene: tristram5SceneParcCimetiereAbandonneScene,
        objects: tristram5SceneParcCimetiereAbandonneObjects,
        aspects: tristram5SceneParcCimetiereAbandonneAspects,
      },
      "place-du-village": {
        scene: tristram5ScenePlaceDuVillageScene,
        objects: tristram5ScenePlaceDuVillageObjects,
        aspects: tristram5ScenePlaceDuVillageAspects,
      },
      rue: {
        scene: tristram5SceneRueScene,
        objects: tristram5SceneRueObjects,
        aspects: tristram5SceneRueAspects,
      },
    },
    items: {},
  },
} satisfies Record<string, GameData>;

export type GameId = keyof typeof games;

export const isGameId = (id: string): id is GameId => Object.hasOwn(games, id);
