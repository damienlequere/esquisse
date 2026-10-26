import type { Box, Character, Scene, SceneData, SceneObject } from "./types.ts";

// Where each element of a scene goes, in fractions of the image: computed once
// for both apps, which only draw the boxes.

export type SceneLayout = {
  // Width / height of the image.
  ratio: number;
  // The screen is turned to match: a landscape scene is played sideways.
  landscape: boolean;
  objects: { object: SceneObject; box: Box }[];
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
