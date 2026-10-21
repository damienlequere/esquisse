import fond from "@esquisse/shared/assets/scenes/phare/fond.webp";
import gardienne from "@esquisse/shared/assets/scenes/phare/gardienne.webp";
import mousse from "@esquisse/shared/assets/scenes/phare/mousse.webp";
import type { StaticImageData } from "next/image";

// The scenes' images, served from packages/shared/assets, like the mobile app's
// (apps/mobile/src/scenes.ts): a new scene's images are listed here by hand.
export type SceneImages = {
  background: StaticImageData;
  characters: Record<string, StaticImageData>;
};

export const sceneImages = {
  phare: { background: fond, characters: { gardienne, mousse } },
} satisfies Record<string, SceneImages>;

export type SceneId = keyof typeof sceneImages;

export const isSceneId = (id: string): id is SceneId => Object.hasOwn(sceneImages, id);
