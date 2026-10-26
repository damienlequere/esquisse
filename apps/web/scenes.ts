// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import foretFond from "@esquisse/shared/assets/scenes/foret/fond.webp";
import foret2Fond from "@esquisse/shared/assets/scenes/foret2/fond.webp";
import foret3Fond from "@esquisse/shared/assets/scenes/foret3/fond.webp";
import phareFond from "@esquisse/shared/assets/scenes/phare/fond.webp";
import phareGardienne from "@esquisse/shared/assets/scenes/phare/gardienne.webp";
import phareMousse from "@esquisse/shared/assets/scenes/phare/mousse.webp";
import type { StaticImageData } from "next/image";

// The scenes' images, served from packages/shared/assets, like the mobile app's
// (apps/mobile/src/scenes.ts).
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
};

export const sceneImages = {
  foret: {
    background: foretFond,
    characters: {},
  },
  foret2: {
    background: foret2Fond,
    characters: {},
  },
  foret3: {
    background: foret3Fond,
    characters: {},
  },
  phare: {
    background: phareFond,
    characters: {
      gardienne: phareGardienne,
      mousse: phareMousse,
    },
  },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
