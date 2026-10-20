import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app from packages/shared/assets, like the
// web site's (apps/web/scenes.ts): Metro needs each require spelled out, so a new
// scene's images are listed here by hand.
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
};

export const sceneImages = {
  phare: {
    background: require("@esquisse/shared/assets/scenes/phare/fond.webp"),
    characters: {
      gardienne: require("@esquisse/shared/assets/scenes/phare/gardienne.webp"),
      mousse: require("@esquisse/shared/assets/scenes/phare/mousse.webp"),
    },
  },
} satisfies Record<string, SceneImages>;
