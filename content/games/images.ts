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
};
