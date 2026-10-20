// A clickable scene, as written in scenes/<id>/scene.json. Coordinates are
// fractions of the image (0 to 1), from its top left corner.

export type Box = { x0: number; y0: number; x1: number; y1: number };

export type Topic = { ask: string; answer: string };

export type SceneObject = {
  id: string;
  // Where the composition must put it; the real box is detected after generation.
  zone: Box;
  paint: string;
  detect: string;
  label: string;
  text: string;
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

export type Scene = {
  title: string;
  intro: string;
  imageRatio: string;
  // The part of the image visible in every frame, minus the top bar and the text band.
  safe: Box;
  style: string;
  background: { prompt: string };
  objects: SceneObject[];
  characters: Character[];
};

// Written by the generator: the detected boxes of the objects, by id, and the
// width / height ratio of each character's layer.
export type ObjectBoxes = Record<string, Box>;
export type CharacterAspects = Record<string, number>;
