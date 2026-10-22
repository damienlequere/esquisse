// Writes a scene with Claude, step by step: first its background (title, intro,
// style, light, the decor), then each element the author asks for, one at a
// time, seeing the current render. An element's composition is checked (see
// check-scene.ts) and sent back to the model to fix until it holds.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Box, Character, Scene, SceneData, SceneObject } from "@esquisse/shared";
import { characterBox, sceneRatio } from "@esquisse/shared/layout";
import { z } from "zod";
import { CHARACTER_ASPECT, sceneProblems } from "./check-scene.ts";

const TEXT_MODEL = "claude-opus-5-5";
// The model writes, the script checks; after that many rounds, it gives up.
const ATTEMPTS = 3;

// Every scene is 9:16, so the safe zone is the same for all (see the README).
export const IMAGE_RATIO = "9:16";
export const SAFE: Box = { x0: 0.09, y0: 0.14, x1: 0.91, y1: 0.71 };

const box = z.object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() });

const base = z.object({
  title: z.string(),
  intro: z.string(),
  style: z.string(),
  light: z.string(),
  background: z.object({ prompt: z.string() }),
  suggestions: z.array(z.string()),
});

const object = z.object({
  id: z.string(),
  zone: box,
  paint: z.string(),
  detect: z.string(),
  label: z.string(),
  text: z.string(),
});

const character = z.object({
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
});

// Structured outputs need an object at the root.
const element = z.object({
  element: z.union([
    z.object({ kind: z.literal("object"), object }),
    z.object({ kind: z.literal("character"), character }),
  ]),
});

export type Base = z.infer<typeof base>;
export type Element =
  | { kind: "object"; object: SceneObject }
  | { kind: "character"; character: Character };

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
  `Tu crées des scènes cliquables pour Esquisse : une image peinte au format portrait 9:16, où chaque objet du décor est une action cliquable qui affiche un court texte, et où chaque personnage ouvre un dialogue. Les images sont générées par un modèle d'image à partir de tes descriptions, puis les objets sont repérés par un modèle de vision.

La scène se construit pas à pas, avec son auteur : d'abord le fond, qu'il valide ; puis, un par un, les éléments qu'il demande, chacun validé sur le rendu.

## La direction artistique

Les images sont du réalisme pictural : de la peinture réaliste et détaillée, comme le concept art ou le matte painting d'un film, pas une illustration jeunesse ni une bande dessinée.

- Les proportions, l'anatomie et la perspective sont justes ; les visages sont naturels, sans traits exagérés ni expressions de dessin animé.
- La lumière est crédible : des sources précises, des ombres qui en découlent, un clair-obscur qui sert l'atmosphère.
- Les matières se voient : bois, métal, pierre, tissu, verre, avec leur usure, leur patine, leur poussière.
- Le lieu est riche en détails secondaires qui racontent son histoire, sans prendre le pas sur les éléments cliquables.
- Le ton est sérieux. Une scène comique ou légère le reste dans ses textes et ses dialogues ; ses images gardent cette direction.

## Le fond

À partir de la demande de l'auteur, tu écris :

- title : le titre de la scène, court.
- intro : 1 à 2 phrases, à la deuxième personne (« tu »), au présent, qui posent le lieu et l'ambiance quand le joueur arrive.
- style : un paragraphe de direction artistique commun à toutes les images de la scène (technique de peinture réaliste, rendu des matières, palette, lumière, atmosphère), qui suit la direction artistique ci-dessus. Il finit toujours par les interdits : aucun texte, lettre, chiffre, signature ni logo ; pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse ; pas de cadre ni de bordure.
- light : la lumière de la scène en quelques mots (sources, couleur, direction), pour que les éléments ajoutés ensuite soient éclairés comme le décor.
- background.prompt : le décor seul, vu de face à hauteur d'homme, vide de toute personne et de tout animal. Le sol occupe le tiers inférieur de l'image et reste dégagé, pour recevoir ensuite des objets et des personnages. Il décrit le lieu en détail : ses matières, leur état, et les détails secondaires aux murs et au fond qui le font vivre. Les objets et les personnages que la demande cite n'y sont pas : ils seront ajoutés un à un.
- suggestions : 3 à 5 ajouts possibles, objets ou personnages, en quelques mots chacun (« un feu de camp au premier plan »), dans l'esprit de la demande, en commençant par ceux qu'elle cite.

Si l'auteur demande une modification, tu renvoies le fond entier, modifié.

## Les éléments

Ensuite, on t'envoie le rendu actuel (le fond avec les éléments déjà validés ; les zones des objets sont encadrées en orange, celles des personnages en bleu, avec leur id ; la zone sûre est en pointillés), la scène telle qu'elle est, et ce que l'auteur veut ajouter. Tu renvoies un seul élément, qui s'intègre à ce que tu vois : un objet posé sur le sol, accroché au mur, appuyé contre un arbre, là où il serait vraiment.

- Un objet (kind « object ») est peint dans le fond par retouche. Une chose, un animal, un détail du décor sont des objets.
  - id : kebab-case, a-z, 0-9 et tirets (ni « fond » ni « guide »), distinct de ceux de la scène.
  - zone : où il doit apparaître dans l'image.
  - paint : sa description pour le modèle d'image, précise et visuelle, en une phrase : sa forme, sa matière, son état, un détail qui l'individualise ; s'il est au mur ou en hauteur, dis qu'il ne descend pas vers le sol.
  - detect : sa description pour le modèle de vision, en anglais, un groupe nominal court (« the spiral staircase »).
  - label : l'action proposée au joueur, à l'infinitif, 2 à 5 mots (« Lire le journal de bord »).
  - text : ce que le joueur découvre, 2 à 4 phrases à la deuxième personne, au présent, avec un détail qui relance le mystère.
- Un personnage (kind « character ») est quelqu'un à qui parler, généré comme un calque à part et posé sur le fond.
  - id : comme pour un objet.
  - name : « Prénom, rôle » (« Maïwenn, la gardienne »).
  - anchor : le milieu de ses pieds ; height : sa hauteur, en fraction de la hauteur de l'image.
  - paint : sa description en pied pour le modèle d'image (âge, visage, silhouette, vêtements et leurs matières, leur usure, ce qu'il tient, posture), debout, de trois quarts, avec des proportions réalistes. Jamais de vert dans ses vêtements ni dans ce qu'il tient : il est détouré sur fond vert.
  - dialogue : greeting (sa première réplique), topics (2 ou 3 questions que le joueur peut poser, ask, avec la réponse du personnage, answer, 1 à 3 phrases), farewell (sa dernière réplique). Il a sa voix.

Si l'auteur demande une modification, tu renvoies l'élément entier, modifié.

Tout est en français, sauf detect, et sauf si la demande dit une autre langue. Les textes, les objets et les dialogues se répondent : chaque nouvel élément tient compte de ceux qui sont déjà là, et ensemble ils posent une même énigme, sans la résoudre.

## La composition

Les coordonnées sont des fractions de l'image, de 0 à 1, depuis son coin en haut à gauche ; une zone est {x0, y0, x1, y1}.

- Zone sûre : ${JSON.stringify(SAFE)}. C'est la partie de l'image visible sur tous les écrans, moins la barre du haut et la bande de texte du bas. Les zones des objets et des personnages y tiennent entières.
- Les objets ne se recouvrent pas, et chacun fait au moins 0,12 de large et 0,08 de haut, pour se toucher du doigt sur un téléphone.
- Un personnage occupe la zone : x de anchor.x − w/2 à anchor.x + w/2, y de anchor.y − height à anchor.y, avec w = height × ${((CHARACTER_ASPECT * 16) / 9).toFixed(2)} (un personnage est environ ${CHARACTER_ASPECT} fois aussi large que haut, et l'image est 9:16). Ses pieds sont sur le sol, anchor.y entre 0,62 et 0,71 ; height entre 0,18 et 0,42, plus petit s'il est plus loin.
- Les zones des personnages ne recouvrent pas celles des objets. Deux personnages peuvent être proches, sans se recouvrir de plus de moitié.

## La demande

Elle peut ne donner qu'un thème, ou fixer des choses : le lieu, l'époque, le ton, le style, ce qu'elle veut voir. Ce qu'elle fixe, tu le respectes ; le reste, tu l'inventes. Le ton qu'elle donne vaut pour les textes ; les images ne changent de direction artistique que si elle demande un autre style en toutes lettres.

## Exemple

Une scène finie, pour le ton et le niveau de détail :

${example()}`;

type Message = Anthropic.Beta.BetaMessageParam;
type Content = Message["content"];

// One conversation with Claude, one structured answer per turn: what was
// written stays in the conversation, for the changes asked next.
const conversation = <T extends z.ZodType>(schema: T, apiKey: string) => {
  const client = new Anthropic({ apiKey });
  const messages: Message[] = [];
  return async (content: Content): Promise<z.infer<T>> => {
    messages.push({ role: "user", content });
    console.log(`Writing with ${TEXT_MODEL}…`);
    const response = await client.beta.messages.parse({
      model: TEXT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: system(),
      output_config: { effort: "high", format: betaZodOutputFormat(schema) },
      messages,
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`Claude refused: ${response.stop_details?.explanation ?? "no explanation"}`);
    }
    if (response.stop_reason === "max_tokens") throw new Error("Claude: the answer was cut short");
    const output = response.parsed_output;
    if (output == null) throw new Error("Claude: no answer in the response");
    messages.push({
      role: "assistant",
      // The parsed output stays here: the request only takes the text.
      content: response.content.map((block) =>
        block.type === "text" ? { type: "text", text: block.text } : block,
      ),
    });
    return output;
  };
};

export const baseWriter = (apiKey: string) => {
  const ask = conversation(base, apiKey);
  return {
    write: (brief: string) => ask(`Écris le fond de la scène : ${brief}`),
    revise: (change: string) => ask(`Modifie le fond ainsi : ${change}`),
  };
};

// The scene with an element added, the objects already there at the place
// where they were found in the image, for the checks.
export const withElement = ({ scene, objects }: SceneData, e: Element): Scene => {
  const found = scene.objects.map((o) => ({ ...o, zone: objects[o.id] ?? o.zone }));
  return e.kind === "object"
    ? { ...scene, objects: [...found, e.object] }
    : { ...scene, objects: found, characters: [...scene.characters, e.character] };
};

export const elementId = (e: Element) => (e.kind === "object" ? e.object.id : e.character.id);

const round = (v: number) => Math.round(v * 1000) / 1000;
const rounded = (b: Box) =>
  JSON.stringify({ x0: round(b.x0), y0: round(b.y0), x1: round(b.x1), y1: round(b.y1) });

// What is already in the scene, for Claude: its texts and where each element is.
const describe = ({ scene, objects, aspects }: SceneData) => {
  const { brief, imageRatio, safe, ...rest } = scene;
  const ratio = sceneRatio(scene);
  return [
    `La demande de l'auteur pour la scène : ${brief ?? "(aucune)"}`,
    `La scène telle qu'elle est :\n${JSON.stringify(rest, null, 2)}`,
    "Où sont les éléments dans l'image :",
    ...scene.objects.map((o) => `- objet "${o.id}" : ${rounded(objects[o.id] ?? o.zone)}`),
    ...scene.characters.map(
      (c) =>
        `- personnage "${c.id}" : ${rounded(characterBox(c, aspects[c.id] ?? CHARACTER_ASPECT, ratio))}`,
    ),
  ].join("\n");
};

// One conversation per element: written from the current render, its
// composition checked and sent back, then changed as the author asks.
export const elementWriter = (apiKey: string, data: SceneData, render: Buffer) => {
  const ask = conversation(element, apiKey);
  const checked = async (first: Content) => {
    let content = first;
    for (let attempt = 1; ; attempt++) {
      const e = (await ask(content)).element as Element;
      const id = elementId(e);
      // The problems of this element: those already in the scene are not its own.
      const problems = sceneProblems(withElement(data, e)).filter((p) => p.includes(`"${id}"`));
      if (problems.length === 0 || attempt === ATTEMPTS) return { element: e, problems };
      console.log(`⚠ ${problems.length} problem(s), sent back to fix:\n  ${problems.join("\n  ")}`);
      content = `La composition ne tient pas :\n- ${problems.join("\n- ")}\nCorrige l'élément et renvoie-le en entier ; ne change ses textes que si la nouvelle composition l'exige.`;
    }
  };
  return {
    write: (request: string) =>
      checked([
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: render.toString("base64") },
        },
        { type: "text", text: `${describe(data)}\n\nL'auteur veut ajouter : ${request}` },
      ]),
    revise: (change: string) => checked(`Modifie l'élément ainsi : ${change}`),
  };
};
