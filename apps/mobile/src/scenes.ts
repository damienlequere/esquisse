// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app from content/scenes, like the
// web site's (apps/web/scenes.ts): Metro needs each require spelled out.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
  effects: Record<string, ImageSourcePropType[]>;
};

export const sceneImages = {
  auberge: {
    background: require("@esquisse/content/scenes/auberge/fond.webp"),
    characters: {},
    effects: {},
  },
  tristram: {
    background: require("@esquisse/content/scenes/tristram/fond.webp"),
    characters: {},
    effects: {
      ciel: [
        require("@esquisse/content/scenes/tristram/ciel.webp"),
        require("@esquisse/content/scenes/tristram/ciel-devant.webp"),
      ],
      lueur: [require("@esquisse/content/scenes/tristram/lueur.webp")],
      feu: [require("@esquisse/content/scenes/tristram/feu.webp")],
      pluie: [],
    },
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
