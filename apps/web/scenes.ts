// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import chateauFond from "@esquisse/shared/assets/scenes/chateau/fond.webp";
import foretFond from "@esquisse/shared/assets/scenes/foret/fond.webp";
import tristramCiel from "@esquisse/shared/assets/scenes/tristram/ciel.webp";
import tristramCielDevant from "@esquisse/shared/assets/scenes/tristram/ciel-devant.webp";
import tristramFeu from "@esquisse/shared/assets/scenes/tristram/feu.webp";
import tristramFond from "@esquisse/shared/assets/scenes/tristram/fond.webp";
import tristramLueur from "@esquisse/shared/assets/scenes/tristram/lueur.webp";
import type { StaticImageData } from "next/image";

// The scenes' images, served from packages/shared/assets, like the mobile app's
// (apps/mobile/src/scenes.ts): the background, the characters' layers, and the
// images of the background's animations, by effect (see effectFiles).
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
  effects: Record<string, StaticImageData[]>;
};

export const sceneImages = {
  chateau: {
    background: chateauFond,
    characters: {},
    effects: {},
  },
  foret: {
    background: foretFond,
    characters: {},
    effects: {},
  },
  tristram: {
    background: tristramFond,
    characters: {},
    effects: {
      ciel: [tristramCiel, tristramCielDevant],
      lueur: [tristramLueur],
      feu: [tristramFeu],
    },
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
