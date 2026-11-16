// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import testCarteSceneAubergeFond from "./test-carte/scenes/auberge/fond.webp";
import testCarteSceneAubergeNuit from "./test-carte/scenes/auberge/nuit.webp";
import testCarteSceneEtageFond from "./test-carte/scenes/etage/fond.webp";
import testCarteSceneEtageNuit from "./test-carte/scenes/etage/nuit.webp";
import testCarteSceneRueFond from "./test-carte/scenes/rue/fond.webp";
import testCarteSceneRueNuit from "./test-carte/scenes/rue/nuit.webp";
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

// The games' images, for both apps: each scene's background, its night if it
// has one, its characters' layers, and the images of its background's
// animations, by effect (see effectFiles); and the items', by id. Each app's bundler makes each import
// what it shows: Next a StaticImageData, Metro an ImageSourcePropType. Each
// app gives that type as Image, and its own declaration of *.webp checks it
// (next/image-types/global, apps/mobile/webp.d.ts).
export type SceneImages<Image> = {
  background: Image;
  night?: Image;
  characters: Record<string, Image>;
  effects: Record<string, Image[]>;
};
export type GameImages<Image> = {
  scenes: Record<string, SceneImages<Image>>;
  items: Record<string, Image>;
};

export const gameImages = {
  "test-carte": {
    scenes: {
      auberge: {
        background: testCarteSceneAubergeFond,
        night: testCarteSceneAubergeNuit,
        characters: {},
        effects: {},
      },
      etage: {
        background: testCarteSceneEtageFond,
        night: testCarteSceneEtageNuit,
        characters: {},
        effects: {},
      },
      rue: {
        background: testCarteSceneRueFond,
        night: testCarteSceneRueNuit,
        characters: {},
        effects: {},
      },
    },
    items: {},
  },
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
};
