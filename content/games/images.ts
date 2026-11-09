// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import tristramItemCouteau from "./tristram/items/couteau.webp";
import tristramItemLanterne from "./tristram/items/lanterne.webp";
import tristramItemPelle from "./tristram/items/pelle.webp";
import tristramSceneAubergeFond from "./tristram/scenes/auberge/fond.webp";
import tristramSceneEtageFond from "./tristram/scenes/etage/fond.webp";
import tristramSceneRueCiel from "./tristram/scenes/rue/ciel.webp";
import tristramSceneRueCielDevant from "./tristram/scenes/rue/ciel-devant.webp";
import tristramSceneRueFeu from "./tristram/scenes/rue/feu.webp";
import tristramSceneRueFond from "./tristram/scenes/rue/fond.webp";
import tristramSceneRueLueur from "./tristram/scenes/rue/lueur.webp";
import tristram2SceneCimetiereFond from "./tristram2/scenes/cimetiere/fond.webp";
import tristram2ScenePlaceDuVillageFond from "./tristram2/scenes/place-du-village/fond.webp";
import tristram2SceneRueFond from "./tristram2/scenes/rue/fond.webp";
import tristram3SceneCimetiereFond from "./tristram3/scenes/cimetiere/fond.webp";
import tristram3ScenePlaceDuVillageFond from "./tristram3/scenes/place-du-village/fond.webp";
import tristram3SceneRueFond from "./tristram3/scenes/rue/fond.webp";
import tristram4SceneParcCimetiereAbandonneFond from "./tristram4/scenes/parc-cimetiere-abandonne/fond.webp";
import tristram4ScenePlaceDuVillageFond from "./tristram4/scenes/place-du-village/fond.webp";
import tristram4SceneRueFond from "./tristram4/scenes/rue/fond.webp";
import tristram5SceneParcCimetiereAbandonneFond from "./tristram5/scenes/parc-cimetiere-abandonne/fond.webp";
import tristram5ScenePlaceDuVillageFond from "./tristram5/scenes/place-du-village/fond.webp";
import tristram5SceneRueFond from "./tristram5/scenes/rue/fond.webp";

// The games' images, for both apps: each scene's background, its characters'
// layers, and the images of its background's animations, by effect (see
// effectFiles); and the items', by id. Each app's bundler makes each import
// what it shows: Next a StaticImageData, Metro an ImageSourcePropType. Each
// app gives that type as Image, and its own declaration of *.webp checks it
// (next/image-types/global, apps/mobile/webp.d.ts).
export type SceneImages<Image> = {
  background: Image;
  characters: Record<string, Image>;
  effects: Record<string, Image[]>;
};
export type GameImages<Image> = {
  scenes: Record<string, SceneImages<Image>>;
  items: Record<string, Image>;
};

export const gameImages = {
  tristram: {
    scenes: {
      auberge: {
        background: tristramSceneAubergeFond,
        characters: {},
        effects: {},
      },
      etage: {
        background: tristramSceneEtageFond,
        characters: {},
        effects: {},
      },
      rue: {
        background: tristramSceneRueFond,
        characters: {},
        effects: {
          ciel: [tristramSceneRueCiel, tristramSceneRueCielDevant],
          lueur: [tristramSceneRueLueur],
          feu: [tristramSceneRueFeu],
          pluie: [],
        },
      },
    },
    items: {
      couteau: tristramItemCouteau,
      lanterne: tristramItemLanterne,
      pelle: tristramItemPelle,
    },
  },
  tristram2: {
    scenes: {
      cimetiere: {
        background: tristram2SceneCimetiereFond,
        characters: {},
        effects: {},
      },
      "place-du-village": {
        background: tristram2ScenePlaceDuVillageFond,
        characters: {},
        effects: {},
      },
      rue: {
        background: tristram2SceneRueFond,
        characters: {},
        effects: {},
      },
    },
    items: {},
  },
  tristram3: {
    scenes: {
      cimetiere: {
        background: tristram3SceneCimetiereFond,
        characters: {},
        effects: {},
      },
      "place-du-village": {
        background: tristram3ScenePlaceDuVillageFond,
        characters: {},
        effects: {},
      },
      rue: {
        background: tristram3SceneRueFond,
        characters: {},
        effects: {},
      },
    },
    items: {},
  },
  tristram4: {
    scenes: {
      "parc-cimetiere-abandonne": {
        background: tristram4SceneParcCimetiereAbandonneFond,
        characters: {},
        effects: {},
      },
      "place-du-village": {
        background: tristram4ScenePlaceDuVillageFond,
        characters: {},
        effects: {},
      },
      rue: {
        background: tristram4SceneRueFond,
        characters: {},
        effects: {},
      },
    },
    items: {},
  },
  tristram5: {
    scenes: {
      "parc-cimetiere-abandonne": {
        background: tristram5SceneParcCimetiereAbandonneFond,
        characters: {},
        effects: {},
      },
      "place-du-village": {
        background: tristram5ScenePlaceDuVillageFond,
        characters: {},
        effects: {},
      },
      rue: {
        background: tristram5SceneRueFond,
        characters: {},
        effects: {},
      },
    },
    items: {},
  },
};
