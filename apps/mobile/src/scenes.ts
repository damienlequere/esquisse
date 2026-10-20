import type { ImageSourcePropType } from "react-native";

// The scenes' images, bundled with the app: Metro needs each require spelled out,
// so a new scene's images are listed here by hand (the generator writes them to
// assets/scenes/<id>).
export type SceneImages = {
  background: ImageSourcePropType;
  characters: Record<string, ImageSourcePropType>;
};

export const sceneImages = {
  phare: {
    background: require("../assets/scenes/phare/fond.webp"),
    characters: {
      gardienne: require("../assets/scenes/phare/gardienne.webp"),
      mousse: require("../assets/scenes/phare/mousse.webp"),
    },
  },
} satisfies Record<string, SceneImages>;
