// The art directions a game or a scene is generated with, to pick from with
// --art <id> (or in the studio); --art "text" gives one of its own (see
// customArt). Each says to Claude what the images are (direction), what a
// style is about (technique) and what it bans, besides the bans of any image
// (see styleRules in write-scene.ts). A game generated with another one than
// the default keeps it whole in its game.json (artDirection), as it was.
//
// Read by the studio too (@esquisse/generator/art): no import but types.

import type { ArtDirection } from "@esquisse/engine";

export const ART_DIRECTIONS = [
  {
    id: "matte-painting",
    label: "Matte painting de cinéma",
    direction: `Les images sont du matte painting numérique de cinéma : des décors peints numériquement, réalistes et très détaillés, comme ceux d'un film, pas une illustration jeunesse ni une bande dessinée.

- Les proportions, l'anatomie et la perspective sont justes ; les visages sont naturels, sans traits exagérés ni expressions de dessin animé.
- La lumière est crédible : des sources précises, des ombres qui en découlent, un clair-obscur qui sert l'atmosphère.
- Les matières se voient : bois, métal, pierre, tissu, verre, avec leur usure, leur patine, leur poussière.
- Le lieu est riche en détails secondaires qui racontent son histoire, sans prendre le pas sur les éléments cliquables.
- Le ton est sérieux. Une scène comique ou légère le reste dans ses textes et ses dialogues ; ses images gardent cette direction.`,
    technique: "matte painting numérique",
    bans: "pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse",
  },
  {
    id: "huile",
    label: "Peinture à l'huile classique",
    direction: `Les images sont des tableaux peints à l'huile, à la manière des maîtres anciens : une peinture de chevalet, figurative, dont on voit la matière.

- La touche est visible : empâtements dans les lumières, glacis transparents dans les ombres, grain de la toile par endroits.
- Le clair-obscur est profond : une lumière dorée et chaude qui sculpte les volumes, des fonds qui se perdent dans des bruns et des verts sombres.
- Les proportions, l'anatomie et la perspective sont justes ; les visages sont graves et naturels.
- Les matières sont rendues en peintre : le reflet d'un étain, le velours d'une étoffe, la pierre d'un mur, sans détail photographique.
- La composition est celle d'un tableau, équilibrée, mais les éléments cliquables restent lisibles et dégagés.
- Le ton est sérieux, contemplatif.`,
    technique: "peinture à l'huile, touche et glacis",
    bans: "pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ; pas de photographie ni de rendu 3D lisse ; pas de vernis craquelé ni de cadre doré",
  },
  {
    id: "aquarelle",
    label: "Aquarelle et encre",
    direction: `Les images sont des illustrations à l'aquarelle rehaussée d'encre : des lavis transparents sur un papier dont on voit le grain, comme les planches d'un carnet de voyage ou d'un livre illustré soigné.

- Un trait d'encre fin et vivant, parfois interrompu, pose les architectures et les objets ; la couleur déborde un peu, sans les noyer.
- Les couleurs sont posées en lavis superposés, avec leurs auréoles, leurs fondus mouillés et des réserves de papier blanc pour les plus fortes lumières.
- La perspective et les proportions sont justes, le dessin assuré ; les visages sont simples mais expressifs.
- La lumière vient de sources précises ; les ombres sont des lavis froids et transparents.
- Le lieu garde des détails qui racontent son histoire, plus suggérés que décrits vers les bords de l'image ; les éléments cliquables sont nets et lisibles.
- Le ton peut être grave ou léger, comme la demande le dit.`,
    technique: "aquarelle et encre, lavis, grain du papier",
    bans: "pas d'aplats opaques ni de dégradés numériques lisses ; pas de style anime ni manga ; pas de photographie ni de rendu 3D",
  },
  {
    id: "gravure",
    label: "Gravure à l'eau-forte",
    direction: `Les images sont des gravures à l'eau-forte et au burin, imprimées à l'encre noire ou sépia sur un papier crème : des illustrations de livre ancien, faites uniquement de traits.

- Les valeurs naissent des hachures : simples, croisées, en pointillés, serrées dans les ombres, absentes dans les lumières.
- La perspective et les proportions sont justes, le dessin précis et minutieux, à la manière des planches d'architecture et des illustrations romantiques.
- La lumière est franche et vient d'une source précise ; le contraste entre le papier et l'encre la fait sentir.
- Les matières se lisent dans la direction et la densité des tailles : le bois veiné, la pierre grenue, l'étoffe souple.
- Les éléments cliquables se détachent nettement du fond, par leur contraste et leur trait.
- Le ton est grave, un peu étrange, celui d'un vieux livre.`,
    technique: "gravure à l'eau-forte, hachures, encre et papier",
    bans: "pas de couleurs vives ni de lavis colorés ; pas d'aplats numériques ni de dégradés lisses ; pas de photographie ni de rendu 3D ; pas de style cartoon ni anime",
  },
  {
    id: "ligne-claire",
    label: "Bande dessinée ligne claire",
    direction: `Les images sont des cases de bande dessinée franco-belge en ligne claire : un contour encré net et régulier autour de chaque forme, des aplats de couleur, une lisibilité parfaite.

- Le trait est d'épaisseur constante, sans hachures ; les ombres sont rares, en aplats discrets d'une teinte plus sombre.
- Les couleurs sont franches et harmonieuses, en aplats ou en dégradés très doux ; le ciel et les fonds sont simples.
- Les décors sont documentés et précis : architectures, objets et matières justes, dessinés avec soin, la perspective rigoureuse.
- Les personnages ont des proportions réalistes, des visages simplifiés mais expressifs.
- Chaque élément cliquable se lit au premier coup d'œil, détaché du fond par son contour.
- Le ton peut être sérieux ou léger, comme la demande le dit ; les images gardent cette clarté.`,
    technique: "ligne claire, contour encré, aplats de couleur",
    bans: "pas de hachures ni de modelé réaliste ; pas de style anime, manga ni caricature ; pas de photographie ni de rendu 3D ; pas de bulles, de cases ni de lettrage",
  },
  {
    id: "animation",
    label: "Décor d'animation peint",
    direction: `Les images sont des décors de film d'animation traditionnel, peints à la gouache : les fonds sur lesquels les personnages d'un long métrage dessiné à la main se déplacent.

- Les formes sont simplifiées et généreuses, sans contours encrés : la couleur et la lumière dessinent les volumes.
- La palette est riche et lumineuse, la lumière douce et chaleureuse, avec des ciels travaillés et des ombres colorées.
- La gouache se voit : coups de pinceau, petites irrégularités, nuages et feuillages peints en masses.
- La perspective est juste ; les proportions peuvent être légèrement poétisées, jamais caricaturales.
- Le lieu fourmille de détails qui donnent envie d'y entrer, sans prendre le pas sur les éléments cliquables.
- Le ton peut être merveilleux, mélancolique ou drôle, comme la demande le dit.`,
    technique: "décor d'animation peint à la gouache",
    bans: "pas de contours encrés autour du décor ; pas de photographie ni de rendu 3D lisse ; pas de texture numérique bruitée",
  },
] as const satisfies readonly (ArtDirection & { id: string; label: string })[];

export type ArtId = (typeof ART_DIRECTIONS)[number]["id"];

export const DEFAULT_ART: ArtDirection = ART_DIRECTIONS[0];

export const artById = (id: string): ArtDirection | undefined =>
  ART_DIRECTIONS.find((a) => a.id === id);

// What a game.json keeps of a direction: nothing for the default one.
export const keptArt = (art: ArtDirection | undefined) =>
  art === undefined || art.id === DEFAULT_ART.id ? {} : { artDirection: { ...art } };

// A direction of the author's own, in their words: its bans are the ones it
// gives itself.
export const customArt = (direction: string): ArtDirection => ({
  direction,
  technique: "technique",
  bans: "ce que la direction artistique exclut",
});

// The direction an --art value names: a preset's id, or else a text of its own.
// A word that looks like an id but is none is a mistake, not a direction.
export const artOf = (value: string): ArtDirection => {
  const preset = artById(value);
  if (preset !== undefined) return preset;
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value))
    throw new Error(
      `Unknown art direction: ${value}. Known: ${ART_DIRECTIONS.map((a) => a.id).join(", ")}, or a text of your own, in quotes.`,
    );
  return customArt(value);
};
