// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { ImageSourcePropType } from "react-native";

// The games' images, bundled with the app from content/games, like the web
// site's (apps/web/images.ts): Metro needs each require spelled out.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
  effects: Record<string, ImageSourcePropType[]>;
};
export type GameImages = {
  scenes: Record<string, SceneImages>;
  items: Record<string, ImageSourcePropType>;
};

export const gameImages = {
  tristram: {
    scenes: {
      auberge: {
        background: require("@esquisse/content/games/tristram/scenes/auberge/fond.webp"),
        characters: {},
        effects: {},
      },
      etage: {
        background: require("@esquisse/content/games/tristram/scenes/etage/fond.webp"),
        characters: {},
        effects: {},
      },
      tristram: {
        background: require("@esquisse/content/games/tristram/scenes/tristram/fond.webp"),
        characters: {},
        effects: {
          ciel: [
            require("@esquisse/content/games/tristram/scenes/tristram/ciel.webp"),
            require("@esquisse/content/games/tristram/scenes/tristram/ciel-devant.webp"),
          ],
          lueur: [require("@esquisse/content/games/tristram/scenes/tristram/lueur.webp")],
          feu: [require("@esquisse/content/games/tristram/scenes/tristram/feu.webp")],
          pluie: [],
        },
      },
    },
    items: {
      couteau: require("@esquisse/content/games/tristram/items/couteau.webp"),
      lanterne: require("@esquisse/content/games/tristram/items/lanterne.webp"),
      pelle: require("@esquisse/content/games/tristram/items/pelle.webp"),
    },
  },
} satisfies Record<string, GameImages>;
