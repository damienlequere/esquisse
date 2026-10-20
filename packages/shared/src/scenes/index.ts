import phareAspects from "./phare/characters.json";
import phareObjects from "./phare/objects.json";
import phareScene from "./phare/scene.json";
import type { CharacterAspects, ObjectBoxes, Scene } from "./types.ts";

export * from "./types.ts";

// A scene and what the generator found in its images (see
// apps/web/scripts/generate-scene.ts). The images themselves are per app.
export type SceneData = { scene: Scene; objects: ObjectBoxes; aspects: CharacterAspects };

export const scenes = {
  phare: { scene: phareScene, objects: phareObjects, aspects: phareAspects },
} satisfies Record<string, SceneData>;
