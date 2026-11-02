// Written by packages/generator/src/generate-scene.ts: do not edit by hand.

import type { SceneData } from "@esquisse/shared";
import aubergeAspects from "./auberge/characters.json";
import aubergeObjects from "./auberge/objects.json";
import aubergeScene from "./auberge/scene.json";
import tristramAspects from "./tristram/characters.json";
import tristramObjects from "./tristram/objects.json";
import tristramScene from "./tristram/scene.json";

export const scenes = {
  auberge: { scene: aubergeScene, objects: aubergeObjects, aspects: aubergeAspects },
  tristram: { scene: tristramScene, objects: tristramObjects, aspects: tristramAspects },
} satisfies Record<string, SceneData>;
