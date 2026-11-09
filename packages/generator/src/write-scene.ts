// Writes a scene's background with Claude: its title, its intro, its style, its
// light and its decor, then changed as the author asks.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Box } from "@esquisse/engine";
import { z } from "zod";

const TEXT_MODEL = "claude-opus-5-5";

// A scene is portrait (9:16) or landscape (16:9), chosen when it is created.
// Each has its safe zone, from the frames it is played in (see the README).
export type Orientation = "portrait" | "landscape";

export const FORMATS = {
  portrait: {
    imageRatio: "9:16",
    safe: { x0: 0.09, y0: 0.14, x1: 0.91, y1: 0.86 },
    words: "portrait 9:16",
    floor: "le tiers inférieur de l'image",
  },
  landscape: {
    imageRatio: "16:9",
    safe: { x0: 0.14, y0: 0.14, x1: 0.86, y1: 0.86 },
    words: "paysage 16:9",
    floor: "la moitié inférieure de l'image",
  },
} satisfies Record<Orientation, { imageRatio: string; safe: Box; [k: string]: unknown }>;

export type Format = (typeof FORMATS)[Orientation];

const base = z.object({
  title: z.string(),
  intro: z.string(),
  style: z.string(),
  light: z.string(),
  background: z.object({ prompt: z.string() }),
});

export type Base = z.infer<typeof base>;

const system = (format: Format) =>
  `Tu crées des scènes cliquables pour Esquisse : une image peinte au format ${format.words}, où chaque objet du décor, cliquable, propose quelques actions qui affichent chacune un court texte, et où chaque personnage ouvre un dialogue. Les images sont générées par un modèle d'image à partir de tes descriptions, puis les objets sont repérés par un modèle de vision.

Tu écris ici le fond de la scène, que son auteur valide ; les objets et les personnages y sont ajoutés ensuite, à part.

## La direction artistique

Les images sont du matte painting numérique de cinéma : des décors peints numériquement, réalistes et très détaillés, comme ceux d'un film, pas une illustration jeunesse ni une bande dessinée.

- Les proportions, l'anatomie et la perspective sont justes ; les visages sont naturels, sans traits exagérés ni expressions de dessin animé.
- La lumière est crédible : des sources précises, des ombres qui en découlent, un clair-obscur qui sert l'atmosphère.
- Les matières se voient : bois, métal, pierre, tissu, verre, avec leur usure, leur patine, leur poussière.
- Le lieu est riche en détails secondaires qui racontent son histoire, sans prendre le pas sur les éléments cliquables.
- Le ton est sérieux. Une scène comique ou légère le reste dans ses textes et ses dialogues ; ses images gardent cette direction.

## Le fond

À partir de la demande de l'auteur, tu écris :

- title : le titre de la scène, court.
- intro : 1 à 2 phrases, à la deuxième personne (« tu »), au présent, qui posent le lieu et l'ambiance quand le joueur arrive.
- style : un paragraphe de direction artistique commun à toutes les images de la scène (matte painting numérique, rendu des matières, palette, lumière, atmosphère), qui suit la direction artistique ci-dessus. Il finit toujours par les interdits : aucun texte, lettre, chiffre, signature ni logo ; pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse ; pas de cadre ni de bordure.
- light : la lumière de la scène en quelques mots (sources, couleur, direction), pour que les éléments ajoutés ensuite soient éclairés comme le décor.
- background.prompt : le décor seul, vu de face à hauteur d'homme, vide de toute personne et de tout animal. Le sol occupe ${format.floor} et reste dégagé, pour recevoir ensuite des objets et des personnages. Il décrit le lieu en détail : ses matières, leur état, et les détails secondaires aux murs et au fond qui le font vivre. Les objets et les personnages que la demande cite n'y sont pas : ils seront ajoutés ensuite.

Si l'auteur demande une modification, tu renvoies le fond entier, modifié.

Tout est en français, sauf si la demande dit une autre langue.

## La demande

Elle peut ne donner qu'un thème, ou fixer des choses : le lieu, l'époque, le ton, le style, ce qu'elle veut voir. Ce qu'elle fixe, tu le respectes ; le reste, tu l'inventes. Le ton qu'elle donne vaut pour les textes ; les images ne changent de direction artistique que si elle demande un autre style en toutes lettres.`;

type Message = Anthropic.Beta.BetaMessageParam;
type Content = Message["content"];

// One conversation with Claude, one structured answer per turn: what was
// written stays in the conversation, for the changes asked next.
const conversation = <T extends z.ZodType>(schema: T, apiKey: string, format: Format) => {
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
      system: system(format),
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

export const baseWriter = (apiKey: string, format: Format) => {
  const ask = conversation(base, apiKey, format);
  return {
    write: (brief: string) => ask(`Écris le fond de la scène : ${brief}`),
    revise: (change: string) => ask(`Modifie le fond ainsi : ${change}`),
  };
};
