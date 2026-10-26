// What a scene's scene.json must respect for the generator to make it work: ids
// usable as file names, and a composition that fits in the safe zone, with the
// characters standing clear of the objects; the details for realism in the safe
// zone too. Used when the scene is written
// (write-scene.ts) and when the objects are detected (generate-scene.ts).

import type { Box, Detail, Scene } from "@esquisse/shared";
import { characterBox, sceneRatio } from "@esquisse/shared/layout";

// Tolerance on the safe zone's edges.
export const MARGIN = 0.02;

// Width / height assumed for a character's layer before it exists.
export const CHARACTER_ASPECT = 0.38;

export const inside = (b: Box, s: Box) =>
  b.x0 >= s.x0 - MARGIN && b.y0 >= s.y0 - MARGIN && b.x1 <= s.x1 + MARGIN && b.y1 <= s.y1 + MARGIN;

// Share of a's area covered by b.
export const overlap = (a: Box, b: Box) => {
  const w = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const h = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  return (w * h) / ((a.x1 - a.x0) * (a.y1 - a.y0));
};

export const pct = (v: number) => `${Math.round(v * 100)} %`;

const round = (v: number) => Math.round(v * 1000) / 1000;
const box = (b: Box) =>
  `{x0: ${round(b.x0)}, y0: ${round(b.y0)}, x1: ${round(b.x1)}, y1: ${round(b.y1)}}`;

// Ids are file names (<id>.webp) next to fond.webp and guide.png.
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const RESERVED = new Set(["fond", "guide"]);

// Smallest object, to stay easy to tap on a phone.
const MIN_OBJECT = { width: 0.12, height: 0.08 };
const MAX_OBJECTS_OVERLAP = 0.05;
const MAX_CHARACTER_ON_OBJECT = 0.1;
const MAX_CHARACTERS_OVERLAP = 0.5;
const HEIGHT = { min: 0.18, max: 0.42 };

// The zone a character will take, from its feet and height.
export const characterZone = (scene: Scene, c: Scene["characters"][number]) =>
  characterBox(c, CHARACTER_ASPECT, sceneRatio(scene));

// The details' problems, numbered as in their list.
export const detailProblems = (safe: Box, details: Detail[]): string[] =>
  details.flatMap(({ zone: z }, i) => {
    if (z.x0 >= z.x1 || z.y0 >= z.y1) {
      return [`détail ${i + 1} : zone ${box(z)} vide ou inversée (x0 < x1 et y0 < y1).`];
    }
    if (!inside(z, safe)) {
      return [`détail ${i + 1} : zone ${box(z)} hors de la zone sûre ${box(safe)}.`];
    }
    return [];
  });

// The problems found, in words the model that wrote the scene can act on.
export const sceneProblems = (scene: Scene): string[] => {
  const problems: string[] = [];
  const { safe } = scene;
  const ids = [...scene.objects, ...scene.characters].map((e) => e.id);
  for (const id of ids) {
    if (!ID.test(id)) problems.push(`id "${id}" : uniquement a-z, 0-9 et tirets (kebab-case).`);
    if (RESERVED.has(id)) problems.push(`id "${id}" : réservé, choisis-en un autre.`);
    if (ids.indexOf(id) !== ids.lastIndexOf(id)) problems.push(`id "${id}" : utilisé deux fois.`);
  }

  for (const o of scene.objects) {
    const z = o.zone;
    if (z.x0 >= z.x1 || z.y0 >= z.y1) {
      problems.push(`objet "${o.id}" : zone ${box(z)} vide ou inversée (x0 < x1 et y0 < y1).`);
      continue;
    }
    if (!inside(z, safe)) {
      problems.push(`objet "${o.id}" : zone ${box(z)} hors de la zone sûre ${box(safe)}.`);
    }
    if (z.x1 - z.x0 < MIN_OBJECT.width || z.y1 - z.y0 < MIN_OBJECT.height) {
      problems.push(
        `objet "${o.id}" : zone ${box(z)} trop petite (au moins ${MIN_OBJECT.width} de large et ${MIN_OBJECT.height} de haut).`,
      );
    }
  }
  scene.objects.forEach((a, i) => {
    for (const b of scene.objects.slice(i + 1)) {
      const share = Math.max(overlap(a.zone, b.zone), overlap(b.zone, a.zone));
      if (share > MAX_OBJECTS_OVERLAP) {
        problems.push(`objets "${a.id}" et "${b.id}" : leurs zones se recouvrent (${pct(share)}).`);
      }
    }
  });

  const zones = scene.characters.map((c) => ({ c, zone: characterZone(scene, c) }));
  for (const { c, zone } of zones) {
    if (c.height < HEIGHT.min || c.height > HEIGHT.max) {
      problems.push(
        `personnage "${c.id}" : height ${c.height} hors de ${HEIGHT.min} à ${HEIGHT.max}.`,
      );
    }
    if (!inside(zone, safe)) {
      problems.push(
        `personnage "${c.id}" : sa zone ${box(zone)} (pieds en anchor, height vers le haut, largeur ≈ height × ${round(CHARACTER_ASPECT / sceneRatio(scene))}) sort de la zone sûre ${box(safe)}.`,
      );
    }
    for (const o of scene.objects) {
      const share = overlap(zone, o.zone);
      if (share > MAX_CHARACTER_ON_OBJECT) {
        problems.push(
          `personnage "${c.id}" : sa zone ${box(zone)} recouvre l'objet "${o.id}" ${box(o.zone)} (${pct(share)} du personnage).`,
        );
      }
    }
  }
  zones.forEach((a, i) => {
    for (const b of zones.slice(i + 1)) {
      const share = Math.max(overlap(a.zone, b.zone), overlap(b.zone, a.zone));
      if (share > MAX_CHARACTERS_OVERLAP) {
        problems.push(`personnages "${a.c.id}" et "${b.c.id}" : trop serrés (${pct(share)}).`);
      }
    }
  });
  return problems;
};
