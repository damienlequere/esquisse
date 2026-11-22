// Writes a game's plan with Claude, from its author's brief: its title, one
// style for all its images, the world its scenes are viewpoints of, and its
// scenes, each with its own brief for write-scene.ts, its landmarks and its
// exits, a map of the game; then changed as the author asks.

import type { ArtDirection } from "@esquisse/engine";
import { z } from "zod";
import { DEFAULT_ART } from "./art.ts";
import { ID } from "./registry.ts";
import { artPrompt, conversation, TEXT_MODEL, zoneWords } from "./write-scene.ts";

const exit = z.object({
  id: z.string(),
  label: z.string(),
  to: z.string(),
  threshold: z.string(),
  zone: z.object({
    x: z.enum(["left", "center", "right"]),
    y: z.enum(["middle", "bottom"]),
  }),
  oneWay: z.boolean(),
});

const plan = z.object({
  title: z.string(),
  style: z.string(),
  world: z.object({
    setting: z.string(),
    landmarks: z.array(z.object({ id: z.string(), description: z.string(), where: z.string() })),
  }),
  scenes: z.array(
    z.object({
      id: z.string(),
      orientation: z.enum(["portrait", "landscape"]),
      opening: z.boolean(),
      viewpoint: z.string(),
      brief: z.string(),
      landmarks: z.array(z.object({ id: z.string(), where: z.string() })),
      exits: z.array(exit),
      back: z.string().nullable(),
    }),
  ),
});

export type Plan = z.infer<typeof plan>;
export type PlanScene = Plan["scenes"][number];
export type PlanExit = z.infer<typeof exit>;

const system = ({
  direction,
  about,
  limits,
}: ReturnType<
  typeof artPrompt
>) => `Tu prépares un jeu pour Esquisse : un jeu d'exploration à la première personne, en point and click, fait de scènes cliquables, chacune une image peinte au format portrait 9:16 ou paysage 16:9, où le joueur passe d'une scène à l'autre par leurs sorties. Chaque scène est écrite à part, à partir de ce que tu écris pour elle, puis peinte par un modèle d'image ; tu n'écris ici que le plan du jeu : son monde, et ses scènes comme autant de points de vue sur ce monde.

${direction}

## Le plan

À partir de la demande de l'auteur, tu écris :

- title : le titre du jeu, court.
- style : un paragraphe de direction artistique commun à toutes les images du jeu (${about}), qui suit la direction artistique ci-dessus et ne dit rien qui ne vaille que pour une scène. ${limits}
- world : le monde dont les scènes sont des points de vue.
  - setting : un paragraphe sur le lieu entier : l'époque, l'heure, le temps qu'il fait, d'où vient la lumière (le soleil couchant à l'ouest, la lune au-dessus de la colline), la disposition des lieux les uns par rapport aux autres, et les matières qu'ils partagent.
  - landmarks : les repères visibles de loin (une cathédrale, une tour, un arbre mort sur une crête), deux à quatre, chacun avec son id (minuscules, chiffres et tirets), sa description, toujours la même, et where, sa place dans le monde (« au nord, en haut de la colline »).
- scenes : les scènes, dans l'ordre où la demande les donne ; le jeu commence par la première. Pour chacune :
  - id : son nom dans le jeu et dans son adresse, en minuscules sans accents, chiffres et tirets (« place-du-village »), différent des autres.
  - orientation : portrait ou landscape.
  - opening : true si la scène s'ouvre sur son titre et son intro sur fond noir, false si elle s'affiche aussitôt. Sans indication, seule la première en a une.
  - viewpoint : où se tient le joueur dans le monde et vers où il regarde (« en bas de la rue, dos à la porte du village, face au nord »).
  - brief : la demande de la scène, en une ou deux phrases : le lieu, ce qu'on y voit et ce qui en est absent, avec ce qu'elle partage avec le jeu (l'époque, l'heure, l'ambiance), pour qu'elle se comprenne seule. Le décor seulement : les objets et les personnages sont ajoutés ensuite.
  - landmarks : les repères du monde visibles d'ici, chacun avec son id et where, sa place dans l'image (« au fond, au centre, au-dessus des toits »). Aucun si le regard ne va pas vers eux, ou si la scène est un intérieur sans ouverture sur eux.
  - exits : ses sorties, chacune avec :
    - id : son nom dans la scène, en minuscules, chiffres et tirets, différent des autres sorties de la scène (souvent l'id de la scène où elle mène).
    - label : le verbe de son action, court (« Entrer », « Monter », « Sortir », « Descendre »).
    - to : l'id de la scène où elle mène, une autre scène du plan.
    - threshold : le seuil qu'elle franchit, peint dans le décor, décrit précisément (« la porte basse de l'auberge, en chêne cerclé de fer, sous une lanterne »).
    - zone : sa place dans l'image : x left, center ou right, y middle ou bottom.
    - oneWay : true seulement si elle n'a pas de retour (une trappe qui se referme, un éboulement) ; sinon false.
  - back : l'id de la sortie prise par la flèche retour, celle par où l'on revient d'où l'on vient, ou null (la première scène, le plus souvent).

## L'espace

Le joueur doit pouvoir se représenter le monde en le parcourant :

- Chaque sortie franchit un seuil : une porte, un portail, un escalier, une arche, un passage, un coin de rue. Deux scènes ne montrent jamais le même espace sous deux angles ; chacune est un lieu à part, séparé des autres par ses seuils.
- Une sortie de A vers B a son retour dans B : une sortie vers A, sauf si elle est oneWay. Le seuil est le même des deux côtés, décrit avec les mêmes matières.
- On arrive dans une scène par le seuil qu'on vient de franchir : son point de vue est celui de qui vient de le passer, le dos tourné vers lui, et sa sortie de retour est derrière ou sur le côté (la flèche retour, back, la prend le plus souvent).
- Un repère n'est visible d'une scène que si le regard va vers lui ; il garde alors sa description, et sa place dans l'image suit sa place dans le monde. La lumière vient du même côté du monde dans toutes les scènes, à la même heure.
- Toutes les scènes sont atteignables depuis la première.
- Les zones des sorties d'une scène sont différentes, et leurs seuils sont dans la partie de l'image qui reste visible : ni collés aux bords, ni dans le ciel.

Si l'auteur demande une modification, tu renvoies le plan entier, modifié.

## La demande

Ce qu'elle fixe (le nombre de scènes, leurs noms, leurs orientations, ce qu'on y voit ou non, celles qui ont une ouverture, comment elles s'enchaînent), tu le respectes ; le reste, tu l'inventes. Tout est en français, sauf si la demande dit une autre langue.`;

// What is wrong with a plan, if anything: an id that cannot be a folder, two
// scenes with the same one, no scene; an exit that leads nowhere, or with no
// way back; a back button that takes no exit; a landmark not in the world; a
// scene the player cannot reach from the first.
export const planErrors = ({ world, scenes }: Plan) => {
  const errors: string[] = [];
  if (scenes.length === 0) errors.push("le plan n'a aucune scène");
  const seen = new Set<string>();
  for (const { id } of scenes) {
    if (!ID.test(id)) errors.push(`l'id « ${id} » n'est pas en minuscules, chiffres et tirets`);
    else if (seen.has(id)) errors.push(`l'id « ${id} » est donné à deux scènes`);
    seen.add(id);
  }
  const landmarks = new Set<string>();
  for (const { id } of world.landmarks) {
    if (landmarks.has(id)) errors.push(`le repère « ${id} » est donné deux fois`);
    landmarks.add(id);
  }
  const byId = new Map(scenes.map((s) => [s.id, s]));
  for (const scene of scenes) {
    const exits = new Set<string>();
    const zones = new Set<string>();
    for (const e of scene.exits) {
      const where = `${scene.id} : la sortie « ${e.id} »`;
      if (!ID.test(e.id)) errors.push(`${where} n'est pas en minuscules, chiffres et tirets`);
      else if (exits.has(e.id)) errors.push(`${where} est donnée deux fois`);
      exits.add(e.id);
      const zone = `${e.zone.x}-${e.zone.y}`;
      if (zones.has(zone))
        errors.push(`${where} a la même zone qu'une autre (${zoneWords(e.zone)})`);
      zones.add(zone);
      const target = byId.get(e.to);
      if (target === undefined) errors.push(`${where} mène à « ${e.to} », qui n'est pas une scène`);
      else if (e.to === scene.id) errors.push(`${where} mène à sa propre scène`);
      else if (!e.oneWay && !target.exits.some((r) => r.to === scene.id))
        errors.push(`${where} mène à « ${e.to} », qui n'a pas de sortie vers « ${scene.id} »`);
    }
    if (scene.back !== null && !exits.has(scene.back))
      errors.push(`${scene.id} : back « ${scene.back} » n'est pas une de ses sorties`);
    for (const { id } of scene.landmarks)
      if (!landmarks.has(id))
        errors.push(`${scene.id} : le repère « ${id} » n'est pas dans le monde`);
  }
  // The scenes reached from the first, by their exits.
  const reached = new Set<string>();
  const next = scenes.slice(0, 1).map((s) => s.id);
  for (let id = next.pop(); id !== undefined; id = next.pop()) {
    if (reached.has(id)) continue;
    reached.add(id);
    next.push(...(byId.get(id)?.exits.map((e) => e.to) ?? []));
  }
  for (const { id } of scenes)
    if (byId.has(id) && !reached.has(id))
      errors.push(`« ${id} » n'est atteignable par aucune sortie depuis la première scène`);
  return errors;
};

export const gameWriter = (apiKey: string, model = TEXT_MODEL, art: ArtDirection = DEFAULT_ART) => {
  const ask = conversation(plan, apiKey, system(artPrompt(art)), model);
  return {
    write: (brief: string) => ask(`Écris le plan du jeu : ${brief}`),
    revise: (change: string) => ask(`Modifie le plan ainsi : ${change}`),
  };
};
