// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import chateauAspects from "./chateau/characters.json";
import chateauObjects from "./chateau/objects.json";
import chateauScene from "./chateau/scene.json";
import foretAspects from "./foret/characters.json";
import foretObjects from "./foret/objects.json";
import foretScene from "./foret/scene.json";
import tristramAspects from "./tristram/characters.json";
import tristramObjects from "./tristram/objects.json";
import tristramScene from "./tristram/scene.json";
import type { SceneData } from "./types.ts";

export * from "./effects.ts";
export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
  chateau: { scene: chateauScene, objects: chateauObjects, aspects: chateauAspects },
  foret: { scene: foretScene, objects: foretObjects, aspects: foretAspects },
  tristram: { scene: tristramScene, objects: tristramObjects, aspects: tristramAspects },
} satisfies Record<string, SceneData>;
