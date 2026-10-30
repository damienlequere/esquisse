// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app from packages/shared/assets, like the
// web site's (apps/web/scenes.ts): Metro needs each require spelled out.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
  effects: Record<string, ImageSourcePropType[]>;
};

export const sceneImages = {
  tristram: {
    background: require("@esquisse/shared/assets/scenes/tristram/fond.webp"),
    characters: {},
    effects: {
      ciel: [
        require("@esquisse/shared/assets/scenes/tristram/ciel.webp"),
        require("@esquisse/shared/assets/scenes/tristram/ciel-devant.webp"),
      ],
      lueur: [require("@esquisse/shared/assets/scenes/tristram/lueur.webp")],
      feu: [require("@esquisse/shared/assets/scenes/tristram/feu.webp")],
      pluie: [],
    },
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
