import type { Box, Character, SceneData, SceneObject } from "./types.ts";

// Where each element of a scene goes, in fractions of the image: computed once
// for both apps, which only draw the boxes.

export type SceneLayout = {
  // Width / height of the image.
  ratio: number;
  objects: { object: SceneObject; box: Box }[];
  characters: { character: Character; box: Box }[];
};

// Width / height of a layer whose proportions are not known yet.
const DEFAULT_ASPECT = 0.4;

export const sceneLayout = ({ scene, objects, aspects }: SceneData): SceneLayout => {
  const [rw = 9, rh = 16] = scene.imageRatio.split(":").map(Number);
  const ratio = rw / rh;
  return {
    ratio,
    // An object not found in the image is left out.
    objects: scene.objects.flatMap((object) => {
      const box = objects[object.id];
      return box === undefined ? [] : [{ object, box }];
    }),
    // A character is placed by its feet. Its width, as a fraction of the image's
    // width, follows from its height and its layer's proportions: the image is
    // not square.
    characters: scene.characters.map((character) => {
      const { anchor, height } = character;
      const width = (height * (aspects[character.id] ?? DEFAULT_ASPECT)) / ratio;
      return {
        character,
        box: {
          x0: anchor.x - width / 2,
          y0: anchor.y - height,
          x1: anchor.x + width / 2,
          y1: anchor.y,
        },
      };
    }),
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
