// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import chateauFond from "@esquisse/shared/assets/scenes/chateau/fond.webp";
import foretFond from "@esquisse/shared/assets/scenes/foret/fond.webp";
import tristramFond from "@esquisse/shared/assets/scenes/tristram/fond.webp";
import type { StaticImageData } from "next/image";

// The scenes' images, served from packages/shared/assets, like the mobile app's
// (apps/mobile/src/scenes.ts).
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
};

export const sceneImages = {
  chateau: {
    background: chateauFond,
    characters: {},
  },
  foret: {
    background: foretFond,
    characters: {},
  },
  tristram: {
    background: tristramFond,
    characters: {},
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
