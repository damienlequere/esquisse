// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import foretAspects from "./foret/characters.json";
import foretObjects from "./foret/objects.json";
import foretScene from "./foret/scene.json";
import foret2Aspects from "./foret2/characters.json";
import foret2Objects from "./foret2/objects.json";
import foret2Scene from "./foret2/scene.json";
import foret3Aspects from "./foret3/characters.json";
import foret3Objects from "./foret3/objects.json";
import foret3Scene from "./foret3/scene.json";
import phareAspects from "./phare/characters.json";
import phareObjects from "./phare/objects.json";
import phareScene from "./phare/scene.json";
import type { SceneData } from "./types.ts";

export * from "./layout.ts";
export * from "./play.ts";
export * from "./summary.ts";
export * from "./types.ts";

export const scenes = {
  foret: { scene: foretScene, objects: foretObjects, aspects: foretAspects },
  foret2: { scene: foret2Scene, objects: foret2Objects, aspects: foret2Aspects },
  foret3: { scene: foret3Scene, objects: foret3Objects, aspects: foret3Aspects },
  phare: { scene: phareScene, objects: phareObjects, aspects: phareAspects },
} satisfies Record<string, SceneData>;
