// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import foretAspects from "./foret/characters.json";
import foretObjects from "./foret/objects.json";
import foretScene from "./foret/scene.json";
import type { SceneData } from "./types.ts";

export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
  foret: { scene: foretScene, objects: foretObjects, aspects: foretAspects },
} satisfies Record<string, SceneData>;
