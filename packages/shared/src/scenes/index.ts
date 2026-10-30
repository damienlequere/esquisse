// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import tristramAspects from "./tristram/characters.json";
import tristramObjects from "./tristram/objects.json";
import tristramScene from "./tristram/scene.json";
import type { SceneData } from "./types.ts";

export * from "./effects.ts";
export * from "./items.ts";
export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
  tristram: { scene: tristramScene, objects: tristramObjects, aspects: tristramAspects },
} satisfies Record<string, SceneData>;
