// A clickable scene, as written in scenes/<id>/scene.json. Coordinates are
// fractions of the image (0 to 1), from its top left corner.

export type Box = { x0: number; y0: number; x1: number; y1: number };

export type Topic = { ask: string; answer: string };

// What can be done with an object, offered in its menu: the action's label, and
// what the player then finds out; with search, it shows what the object holds
// instead (see contents).
export type ObjectAction = { label: string; text?: string; search?: boolean };

export type SceneObject = {
  id: string;
  // Where the composition must put it; the real box is detected after generation.
  zone: Box;
  paint: string;
  detect: string;
  // With actions, the object's name (for screen readers); without, its only
  // action, as the generator writes it, with its text.
  label: string;
  text?: string;
  actions?: ObjectAction[];
  // What it holds, by item (see ITEMS), up to CONTAINER_SLOTS: shown by an
  // action with search, taken one by one into the inventory.
  contents?: string[];
};

// A detail for realism, retouched into the background, never clickable.
export type Detail = {
  paint: string;
  // Where it must appear, inside the safe zone.
  zone: Box;
};

export type Character = {
  id: string;
  name: string;
  // Middle of the feet.
  anchor: { x: number; y: number };
  height: number;
  paint: string;
  dialogue: { greeting: string; topics: Topic[]; farewell: string };
};

// An animation of the background: the shader of its kind is in effects.ts, its
// images are assets/scenes/<scene>/<file>.webp (see effectFiles there). Its
// kind is one of EffectKind, but read from scene.json it is only a string.
// Firelight and glow are found by the generator from what detect describes;
// the rain has nothing to find.
export type EffectKind = "firelight" | "sky" | "glow" | "rain";
export type Effect = { id: string; kind: string; detect?: string };

export type Scene = {
  // What the scene was written from, by the generator (packages/generator).
  brief?: string;
  title: string;
  intro: string;
  imageRatio: string;
  // The part of the image visible in every frame, minus a margin.
  safe: Box;
  style: string;
  // The scene's light, for the characters' layers to match the background.
  light: string;
  background: { prompt: string; details?: Detail[] };
  objects: SceneObject[];
  characters: Character[];
  effects?: Effect[];
};

// Written by the generator: the detected boxes of the objects, by id, and the
// width / height ratio of each character's layer.
export type ObjectBoxes = Record<string, Box>;
export type CharacterAspects = Record<string, number>;

// A scene and what the generator found in its images (see
// packages/generator/src/generate-scene.ts). The images are in packages/shared/assets,
// listed by each app (apps/web/scenes.ts, apps/mobile/src/scenes.ts).
export type SceneData = { scene: Scene; objects: ObjectBoxes; aspects: CharacterAspects };
