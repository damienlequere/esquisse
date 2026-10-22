// Writes a scene's scene.json from a brief, with Claude: the texts, the prompts
// for the images, and the composition. The composition is checked (see
// check-scene.ts) and sent back to the model to fix until it holds.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Box, Scene } from "@esquisse/shared";
import { z } from "zod";
import { CHARACTER_ASPECT, sceneProblems } from "./check-scene.ts";

const TEXT_MODEL = "claude-opus-5-5";
// The model writes, the script checks; after that many rounds, it gives up.
const ATTEMPTS = 3;

// Every scene is 9:16, so the safe zone is the same for all (see the README).
const IMAGE_RATIO = "9:16";
const SAFE: Box = { x0: 0.09, y0: 0.14, x1: 0.91, y1: 0.71 };

const box = z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() });

// The Scene type, minus what the script sets itself (brief, ratio, safe zone).
const written = z.object({
  title: z.string(),
  intro: z.string(),
  style: z.string(),
  light: z.string(),
  background: z.object({ prompt: z.string() }),
  objects: z.array(
    z.object({
      id: z.string(),
      zone: box,
      paint: z.string(),
      detect: z.string(),
      label: z.string(),
      text: z.string(),
    }),
  ),
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      anchor: z.object({ x: z.number(), y: z.number() }),
      height: z.number(),
      paint: z.string(),
      dialogue: z.object({
        greeting: z.string(),
        topics: z.array(z.object({ ask: z.string(), answer: z.string() })),
        farewell: z.string(),
      }),
    }),
  ),
});

const COUNTS = { objects: [1, 4], characters: [0, 3], topics: [1, 4] } as const;

const countProblems = (scene: Scene) => {
  const problems: string[] = [];
  const check = (what: string, n: number, [min, max]: readonly [number, number]) => {
    if (n < min || n > max) problems.push(`${what} : ${n}, il en faut de ${min} à ${max}.`);
  };
  check("objets", scene.objects.length, COUNTS.objects);
  check("personnages", scene.characters.length, COUNTS.characters);
  for (const c of scene.characters) {
    check(`sujets de "${c.id}"`, c.dialogue.topics.length, COUNTS.topics);
  }
  return problems;
};

// The lighthouse, as an example of what is expected, without what the script sets.
// Its images predate the pictorial realism, so its style is given as it would be now.
const EXAMPLE_STYLE =
  "Peinture à l'huile réaliste, dans l'esprit du concept art et du matte painting de cinéma : proportions et perspective justes, matières rendues avec précision (bois ciré et usé, laiton terni, verre épais, cordages effilochés, pierre chaulée), touche visible mais maîtrisée, profondeur de champ légère. Palette de bleus nuit et d'ocres chauds, clair-obscur : la lumière dorée d'une lampe à pétrole contre la nuit bleue au hublot. Atmosphère grave, calme, mystérieuse, un peu inquiète. Aucun texte, lettre, chiffre, signature ni logo ; pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse ; pas de cadre ni de bordure.";

const example = () => {
  const path = join(import.meta.dirname, "../../shared/src/scenes/phare/scene.json");
  const { brief, imageRatio, safe, notes, ...rest } = JSON.parse(readFileSync(path, "utf8"));
  return JSON.stringify({ ...rest, style: EXAMPLE_STYLE }, null, 2);
};

const system = () =>
  `Tu écris des scènes cliquables pour Esquisse : une image peinte au format portrait 9:16, où chaque objet du décor est une action cliquable qui affiche un court texte, et où chaque personnage ouvre un dialogue. Les images sont ensuite générées par un modèle d'image à partir de tes descriptions, puis les objets sont repérés par un modèle de vision.

## La direction artistique

Les images sont du réalisme pictural : de la peinture réaliste et détaillée, comme le concept art ou le matte painting d'un film, pas une illustration jeunesse ni une bande dessinée.

- Les proportions, l'anatomie et la perspective sont justes ; les visages sont naturels, sans traits exagérés ni expressions de dessin animé.
- La lumière est crédible : des sources précises, des ombres qui en découlent, un clair-obscur qui sert l'atmosphère.
- Les matières se voient : bois, métal, pierre, tissu, verre, avec leur usure, leur patine, leur poussière.
- Le lieu est riche en détails secondaires qui racontent son histoire, sans prendre le pas sur les objets cliquables.
- Le ton est sérieux. Une scène comique ou légère le reste dans ses textes et ses dialogues ; ses images gardent cette direction.

## Ce que tu écris

- title : le titre de la scène, court.
- intro : 1 à 2 phrases, à la deuxième personne (« tu »), au présent, qui posent le lieu et l'ambiance quand le joueur arrive.
- style : un paragraphe de direction artistique commun à toutes les images de la scène (technique de peinture réaliste, rendu des matières, palette, lumière, atmosphère), qui suit la direction artistique ci-dessus. Il finit toujours par les interdits : aucun texte, lettre, chiffre, signature ni logo ; pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse ; pas de cadre ni de bordure.
- light : la lumière de la scène en quelques mots (sources, couleur, direction), pour que les personnages, générés à part, soient éclairés comme le décor.
- background.prompt : le décor seul, vu de face à hauteur d'homme. Il dit que le lieu est vide de toute personne et de tout animal, hormis ceux qui sont des objets de la scène, et que le sol occupe le tiers inférieur de l'image ; s'il y a des personnages, il dit que le sol reste dégagé là où ils se tiendront, et qu'entre les objets rien ne touche le sol à ces endroits. Il décrit le lieu en détail : ses matières, leur état, et les détails secondaires aux murs et au fond qui le font vivre.
- objects : chaque élément cliquable du décor.
  - id : kebab-case, a-z, 0-9 et tirets (ni « fond » ni « guide »).
  - zone : où l'élément doit apparaître dans l'image.
  - paint : sa description pour le modèle d'image, précise et visuelle, en une phrase : sa forme, sa matière, son état, un détail qui l'individualise ; s'il est au mur ou en hauteur, dis qu'il ne descend pas vers le sol.
  - detect : sa description pour le modèle de vision, en anglais, un groupe nominal court (« the spiral staircase »).
  - label : l'action proposée au joueur, à l'infinitif, 2 à 5 mots (« Lire le journal de bord »).
  - text : ce que le joueur découvre, 2 à 4 phrases à la deuxième personne, au présent, avec un détail qui relance le mystère.
- characters : chaque personnage (la liste peut être vide), généré comme un calque à part et posé sur le décor.
  - id : comme pour les objets, distinct d'eux.
  - name : « Prénom, rôle » (« Maïwenn, la gardienne »).
  - anchor : le milieu de ses pieds ; height : sa hauteur, en fraction de la hauteur de l'image.
  - paint : sa description en pied pour le modèle d'image (âge, visage, silhouette, vêtements et leurs matières, leur usure, ce qu'il tient, posture), debout, de trois quarts, avec des proportions réalistes. Jamais de vert dans ses vêtements ni dans ce qu'il tient : il est détouré sur fond vert.
  - dialogue : greeting (sa première réplique), topics (2 ou 3 questions que le joueur peut poser, ask, avec la réponse du personnage, answer, 1 à 3 phrases), farewell (sa dernière réplique). Chacun a sa voix.

Tout est en français, sauf detect, et sauf si la demande dit une autre langue. Les textes, les objets et les dialogues se répondent : ensemble ils posent une même énigme, sans la résoudre.

## La composition

Les coordonnées sont des fractions de l'image, de 0 à 1, depuis son coin en haut à gauche ; une zone est {x0, y0, x1, y1}.

- Zone sûre : ${JSON.stringify(SAFE)}. C'est la partie de l'image visible sur tous les écrans, moins la barre du haut et la bande de texte du bas. Les zones des objets et des personnages y tiennent entières.
- Les objets ne se recouvrent pas, et chacun fait au moins 0,12 de large et 0,08 de haut, pour se toucher du doigt sur un téléphone.
- Un personnage occupe la zone : x de anchor.x − w/2 à anchor.x + w/2, y de anchor.y − height à anchor.y, avec w = height × ${((CHARACTER_ASPECT * 16) / 9).toFixed(2)} (un personnage est environ ${CHARACTER_ASPECT} fois aussi large que haut, et l'image est 9:16). Ses pieds sont sur le sol, anchor.y entre 0,62 et 0,71 ; height entre 0,18 et 0,42, plus petit s'il est plus loin.
- Les zones des personnages ne recouvrent pas celles des objets : ils se tiennent dans le sol dégagé, et les objets sont au mur, en hauteur, ou sur les côtés. Deux personnages peuvent être proches, sans se recouvrir de plus de moitié.
- Entre 1 et 4 objets, entre 0 et 3 personnages : ce que dit la demande, sinon 3 objets et 2 personnages. Sans personnage, les objets peuvent aussi se trouver au sol, au premier plan.

## La demande

Elle peut ne donner qu'un thème, ou fixer des choses : le nombre d'objets ou de personnages, qui ils sont, le ton, le lieu, l'époque, le style. Ce qu'elle fixe, tu le respectes ; le reste, tu l'inventes. Le ton qu'elle donne vaut pour les textes ; les images ne changent de direction artistique que si elle demande un autre style en toutes lettres.

## Exemple

Une scène réussie :

${example()}`;

type Message = Anthropic.Beta.BetaMessageParam;

export const writeScene = async (
  brief: string,
  apiKey: string,
  log: (line: string) => void = console.log,
) => {
  const client = new Anthropic({ apiKey });
  const messages: Message[] = [{ role: "user", content: `Écris la scène : ${brief}` }];
  for (let attempt = 1; ; attempt++) {
    log(`Writing the scene with ${TEXT_MODEL}…`);
    const response = await client.beta.messages.parse({
      model: TEXT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: system(),
      output_config: { effort: "high", format: betaZodOutputFormat(written) },
      messages,
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`Claude refused: ${response.stop_details?.explanation ?? "no explanation"}`);
    }
    if (response.stop_reason === "max_tokens") throw new Error("Claude: the scene was cut short");
    const output = response.parsed_output;
    if (output == null) throw new Error("Claude: no scene in the response");

    // Keys in the lighthouse's order, for scene.json.
    const { title, intro, ...rest } = output;
    const scene: Scene = { brief, title, intro, imageRatio: IMAGE_RATIO, safe: SAFE, ...rest };
    const problems = [...countProblems(scene), ...sceneProblems(scene)];
    if (problems.length === 0 || attempt === ATTEMPTS) return { scene, problems };
    log(`⚠ ${problems.length} problem(s), sent back to fix:\n  ${problems.join("\n  ")}`);
    messages.push(
      {
        role: "assistant",
        // The parsed output stays here: the request only takes the text.
        content: response.content.map((block) =>
          block.type === "text" ? { type: "text", text: block.text } : block,
        ),
      },
      {
        role: "user",
        content: `La composition ne tient pas :\n- ${problems.join("\n- ")}\nCorrige-la et renvoie la scène entière ; ne change les textes que si la nouvelle composition l'exige.`,
      },
    );
  }
};
