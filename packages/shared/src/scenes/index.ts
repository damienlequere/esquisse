// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import caveAspects from "./cave/characters.json";
import caveObjects from "./cave/objects.json";
import caveScene from "./cave/scene.json";
import phareAspects from "./phare/characters.json";
import phareObjects from "./phare/objects.json";
import phareScene from "./phare/scene.json";
import type { SceneData } from "./types.ts";

export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
  cave: { scene: caveScene, objects: caveObjects, aspects: caveAspects },
  phare: { scene: phareScene, objects: phareObjects, aspects: phareAspects },
} satisfies Record<string, SceneData>;
