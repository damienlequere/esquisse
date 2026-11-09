// Writes a game's plan with Claude, from its author's brief: its title, one
// style for all its images, and its scenes, each with its own brief for
// write-scene.ts; then changed as the author asks.

import { z } from "zod";
import { ID } from "./registry.ts";
import { ART_DIRECTION, conversation, STYLE_LIMITS } from "./write-scene.ts";

const plan = z.object({
  title: z.string(),
  style: z.string(),
  scenes: z.array(
    z.object({
      id: z.string(),
      orientation: z.enum(["portrait", "landscape"]),
      opening: z.boolean(),
      brief: z.string(),
    }),
  ),
});

export type Plan = z.infer<typeof plan>;

const system = `Tu prépares un jeu pour Esquisse : des scènes cliquables, chacune une image peinte au format portrait 9:16 ou paysage 16:9, reliées ensuite par leurs sorties. Chaque scène est écrite à part, à partir de la demande que tu écris pour elle, puis peinte par un modèle d'image ; tu n'écris ici que le plan du jeu.

${ART_DIRECTION}

## Le plan

À partir de la demande de l'auteur, tu écris :

- title : le titre du jeu, court.
- style : un paragraphe de direction artistique commun à toutes les images du jeu (matte painting numérique, rendu des matières, palette, lumière, atmosphère), qui suit la direction artistique ci-dessus et ne dit rien qui ne vaille que pour une scène. ${STYLE_LIMITS}
- scenes : les scènes, dans l'ordre où la demande les donne ; le jeu commence par la première. Pour chacune :
  - id : son nom dans le jeu et dans son adresse, en minuscules sans accents, chiffres et tirets (« place-du-village »), différent des autres.
  - orientation : portrait ou landscape.
  - opening : true si la scène s'ouvre sur son titre et son intro sur fond noir, false si elle s'affiche aussitôt. Sans indication, seule la première en a une.
  - brief : la demande de la scène, en une ou deux phrases : le lieu, ce qu'on y voit et ce qui en est absent, avec ce qu'elle partage avec le jeu (l'époque, l'heure, l'ambiance), pour qu'elle se comprenne seule. Le décor seulement : les objets et les personnages sont ajoutés ensuite.

Si l'auteur demande une modification, tu renvoies le plan entier, modifié.

## La demande

Ce qu'elle fixe (le nombre de scènes, leurs noms, leurs orientations, ce qu'on y voit ou non, celles qui ont une ouverture), tu le respectes ; le reste, tu l'inventes. Tout est en français, sauf si la demande dit une autre langue.`;

// What is wrong with a plan, if anything: an id that cannot be a folder, two
// scenes with the same one, no scene.
export const planErrors = ({ scenes }: Plan) => {
  const errors: string[] = [];
  if (scenes.length === 0) errors.push("le plan n'a aucune scène");
  const seen = new Set<string>();
  for (const { id } of scenes) {
    if (!ID.test(id)) errors.push(`l'id « ${id} » n'est pas en minuscules, chiffres et tirets`);
    else if (seen.has(id)) errors.push(`l'id « ${id} » est donné à deux scènes`);
    seen.add(id);
  }
  return errors;
};

export const gameWriter = (apiKey: string) => {
  const ask = conversation(plan, apiKey, system);
  return {
    write: (brief: string) => ask(`Écris le plan du jeu : ${brief}`),
    revise: (change: string) => ask(`Modifie le plan ainsi : ${change}`),
  };
};
