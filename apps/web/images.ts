// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import tristramItemCouteau from "@esquisse/content/games/tristram/items/couteau.webp";
import tristramItemLanterne from "@esquisse/content/games/tristram/items/lanterne.webp";
import tristramItemPelle from "@esquisse/content/games/tristram/items/pelle.webp";
import tristramSceneAubergeFond from "@esquisse/content/games/tristram/scenes/auberge/fond.webp";
import tristramSceneEtageFond from "@esquisse/content/games/tristram/scenes/etage/fond.webp";
import tristramSceneRueCiel from "@esquisse/content/games/tristram/scenes/rue/ciel.webp";
import tristramSceneRueCielDevant from "@esquisse/content/games/tristram/scenes/rue/ciel-devant.webp";
import tristramSceneRueFeu from "@esquisse/content/games/tristram/scenes/rue/feu.webp";
import tristramSceneRueFond from "@esquisse/content/games/tristram/scenes/rue/fond.webp";
import tristramSceneRueLueur from "@esquisse/content/games/tristram/scenes/rue/lueur.webp";
import type { StaticImageData } from "next/image";

// The games' images, served from content/games, like the mobile app's
// (apps/mobile/src/images.ts): each scene's background, its characters'
// layers, and the images of its background's animations, by effect (see
// effectFiles); and the items', by id.
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
  effects: Record<string, StaticImageData[]>;
};
export type GameImages = {
  scenes: Record<string, SceneImages>;
  items: Record<string, StaticImageData>;
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
} satisfies Record<string, GameImages>;
