import phareAspects from "./phare/characters.json";
import phareObjects from "./phare/objects.json";
import phareScene from "./phare/scene.json";
import type { SceneData } from "./types.ts";

export * from "./layout.ts";
export * from "./play.ts";
export * from "./types.ts";

export const scenes = {
  phare: { scene: phareScene, objects: phareObjects, aspects: phareAspects },
} satisfies Record<string, SceneData>;
