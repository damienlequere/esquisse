// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app from packages/shared/assets, like the
// web site's (apps/web/scenes.ts): Metro needs each require spelled out.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
};

export const sceneImages = {
  foret: {
    background: require("@esquisse/shared/assets/scenes/foret/fond.webp"),
    characters: {},
  },
  foret2: {
    background: require("@esquisse/shared/assets/scenes/foret2/fond.webp"),
    characters: {},
  },
  foret3: {
    background: require("@esquisse/shared/assets/scenes/foret3/fond.webp"),
    characters: {},
  },
  foret4: {
    background: require("@esquisse/shared/assets/scenes/foret4/fond.webp"),
    characters: {},
  },
  phare: {
    background: require("@esquisse/shared/assets/scenes/phare/fond.webp"),
    characters: {
      gardienne: require("@esquisse/shared/assets/scenes/phare/gardienne.webp"),
      mousse: require("@esquisse/shared/assets/scenes/phare/mousse.webp"),
    },
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
