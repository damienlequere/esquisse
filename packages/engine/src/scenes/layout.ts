import type { Box, Character, ObjectBox, Point, Scene, SceneData, SceneObject } from "./types.ts";

// Where each element of a scene goes, in fractions of the image: computed once
// for both apps, which only draw the boxes.

export type SceneLayout = {
  // Width / height of the image.
  ratio: number;
  // The screen is turned to match: a landscape scene is played sideways.
  landscape: boolean;
  objects: { object: SceneObject; box: ObjectBox }[];
  characters: { character: Character; box: Box }[];
};

// Width / height of a layer whose proportions are not known yet.
const DEFAULT_ASPECT = 0.4;

// Width / height of a scene's image, from its "9:16" or "16:9" ratio.
export const sceneRatio = (scene: Pick<Scene, "imageRatio">) => {
  const [rw = 9, rh = 16] = scene.imageRatio.split(":").map(Number);
  return rw / rh;
};

export const isLandscape = (scene: Pick<Scene, "imageRatio">) => sceneRatio(scene) > 1;

// A character is placed by its feet. Its width, as a fraction of the image's
// width, follows from its height and its layer's proportions (aspect): the image
// is not square.
export const characterBox = ({ anchor, height }: Character, aspect: number, ratio: number) => {
  const width = (height * aspect) / ratio;
  return {
    x0: anchor.x - width / 2,
    y0: anchor.y - height,
    x1: anchor.x + width / 2,
    y1: anchor.y,
  } satisfies Box;
};

export const sceneLayout = ({ scene, objects, aspects }: SceneData): SceneLayout => {
  const ratio = sceneRatio(scene);
  return {
    ratio,
    landscape: ratio > 1,
    // An object not found in the image is left out.
    objects: scene.objects.flatMap((object) => {
      const box = objects[object.id];
      return box === undefined ? [] : [{ object, box }];
    }),
    characters: scene.characters.map((character) => ({
      character,
      box: characterBox(character, aspects[character.id] ?? DEFAULT_ASPECT, ratio),
    })),
  };
};

const pct = (v: number) => `${v * 100}%` as const;

// A box as a style in % of the image, valid in React DOM as in React Native
// (where it also needs position: absolute). In %, it follows the cropping.
export const placeStyle = (box: Box) => ({
  left: pct(box.x0),
  top: pct(box.y0),
  width: pct(box.x1 - box.x0),
  height: pct(box.y1 - box.y0),
});

// The polygon of an object's box: its points, or the box's four corners.
export const boxPoints = (box: ObjectBox): Point[] =>
  box.points && box.points.length >= 3
    ? box.points
    : [
        { x: box.x0, y: box.y0 },
        { x: box.x1, y: box.y0 },
        { x: box.x1, y: box.y1 },
        { x: box.x0, y: box.y1 },
      ];

// The smallest box around some points.
export const pointsBounds = (points: Point[]): Box => ({
  x0: Math.min(...points.map((p) => p.x)),
  y0: Math.min(...points.map((p) => p.y)),
  x1: Math.max(...points.map((p) => p.x)),
  y1: Math.max(...points.map((p) => p.y)),
});

// The point, in fractions of the box (0 to 1 from its top left corner), is in
// its polygon: always, without points.
export const inObjectBox = (box: ObjectBox, at: Point) => {
  if (!box.points || box.points.length < 3) return true;
  const w = box.x1 - box.x0 || 1;
  const h = box.y1 - box.y0 || 1;
  const x = box.x0 + at.x * w;
  const y = box.y0 + at.y * h;
  const pts = box.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i] as Point;
    const b = pts[j] as Point;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

// Its polygon as a CSS clip-path, in % of its box, or nothing without points:
// on the web, a click outside it goes through, to what is under it.
export const clipPathStyle = (box: ObjectBox) => {
  if (!box.points || box.points.length < 3) return undefined;
  const w = box.x1 - box.x0 || 1;
  const h = box.y1 - box.y0 || 1;
  const at = (p: Point) =>
    `${Math.round(((p.x - box.x0) / w) * 10000) / 100}% ${Math.round(((p.y - box.y0) / h) * 10000) / 100}%`;
  return `polygon(${box.points.map(at).join(", ")})`;
};
