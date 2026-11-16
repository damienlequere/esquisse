// Writes a scene's background with Claude: its title, its intro, its style, its
// light and its decor, then changed as the author asks.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Box, GeneratedScene, World } from "@esquisse/engine";
import { z } from "zod";

// The default; pnpm generate-game takes another with --model.
export const TEXT_MODEL = "claude-opus-5-5";

// The models the API can hand a refused request over to another, by itself.
const FALLBACKS = new Set([
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

// Fails, before anything is paid for, if the API does not know the model, and
// lists those it knows.
export const checkModel = async (apiKey: string, model: string) => {
  const client = new Anthropic({ apiKey });
  try {
    await client.models.retrieve(model);
  } catch (error) {
    if (!(error instanceof Anthropic.NotFoundError)) throw error;
    const known: string[] = [];
    for await (const m of client.models.list()) known.push(m.id);
    throw new Error(`Unknown model: ${model}. The API knows: ${known.join(", ")}`);
  }
};

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

// The images' direction, the same for a scene and for a game (see write-game.ts).
export const ART_DIRECTION = `## La direction artistique

Les images sont du matte painting numérique de cinéma : des décors peints numériquement, réalistes et très détaillés, comme ceux d'un film, pas une illustration jeunesse ni une bande dessinée.

- Les proportions, l'anatomie et la perspective sont justes ; les visages sont naturels, sans traits exagérés ni expressions de dessin animé.
- La lumière est crédible : des sources précises, des ombres qui en découlent, un clair-obscur qui sert l'atmosphère.
- Les matières se voient : bois, métal, pierre, tissu, verre, avec leur usure, leur patine, leur poussière.
- Le lieu est riche en détails secondaires qui racontent son histoire, sans prendre le pas sur les éléments cliquables.
- Le ton est sérieux. Une scène comique ou légère le reste dans ses textes et ses dialogues ; ses images gardent cette direction.`;

// How a style ends.
export const STYLE_LIMITS =
  "Il finit toujours par les interdits : aucun texte, lettre, chiffre, signature ni logo ; pas de style cartoon, bande dessinée, anime ni caricature, pas de contours encrés ni d'aplats ; pas de photographie ni de rendu 3D lisse ; pas de cadre ni de bordure.";

const system = (format: Format) =>
  `Tu crées des scènes cliquables pour Esquisse : une image peinte au format ${format.words}, où chaque objet du décor, cliquable, propose quelques actions qui affichent chacune un court texte, et où chaque personnage ouvre un dialogue. Les images sont générées par un modèle d'image à partir de tes descriptions, puis les objets sont repérés par un modèle de vision.

Tu écris ici le fond de la scène, que son auteur valide ; les objets et les personnages y sont ajoutés ensuite, à part.

${ART_DIRECTION}

## Le fond

À partir de la demande de l'auteur, tu écris :

- title : le titre de la scène, court.
- intro : 1 à 2 phrases, à la deuxième personne (« tu »), au présent, qui posent le lieu et l'ambiance quand le joueur arrive.
- style : un paragraphe de direction artistique commun à toutes les images de la scène (matte painting numérique, rendu des matières, palette, lumière, atmosphère), qui suit la direction artistique ci-dessus. ${STYLE_LIMITS}
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
export const conversation = <T extends z.ZodType>(
  schema: T,
  apiKey: string,
  instructions: string,
  model = TEXT_MODEL,
) => {
  const client = new Anthropic({ apiKey });
  const messages: Message[] = [];
  return async (content: Content): Promise<z.infer<T>> => {
    messages.push({ role: "user", content });
    console.log(`Writing with ${model}…`);
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      ...(FALLBACKS.has(model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      cache_control: { type: "ephemeral" },
      system: instructions,
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

// The game a scene is written for by pnpm generate-game: its brief, for the
// scene to fit in it, and its style, the same for all its scenes. A game whose
// plan is a map adds its world, the scene's plan (its viewpoint, its landmarks,
// its exits) and its neighbors already painted, those its exits lead to or
// come from.
export type GameContext = {
  brief: string;
  style: string;
  world?: World;
  scene?: GeneratedScene;
  neighbors?: GeneratedScene[];
};

// An exit's cell of the grid, in words (see PlannedExit).
const X = { left: "à gauche", center: "au centre", right: "à droite" };
const Y = { middle: "à mi-hauteur", bottom: "en bas" };
export const zoneWords = ({ x, y }: { x: string; y: string }) =>
  `${X[x as keyof typeof X] ?? x}, ${Y[y as keyof typeof Y] ?? y}`;

// What Claude is told of the world, the scene's place in it, and its neighbors.
const mapContext = ({ world, scene, neighbors = [] }: GameContext) => {
  if (world === undefined || scene === undefined) return "";
  const lines = [`\n\nLe monde du jeu : ${world.setting}`];
  if (world.landmarks.length > 0) {
    lines.push("Ses repères, visibles de loin :");
    for (const l of world.landmarks) lines.push(`- ${l.id} : ${l.description} (${l.where})`);
  }
  lines.push(`\nCette scène est un point de vue sur ce monde : ${scene.viewpoint ?? ""}`);
  const seen = scene.landmarks ?? [];
  lines.push(
    seen.length === 0
      ? "Aucun repère du monde n'est visible d'ici."
      : `Les repères visibles d'ici, à leur place dans l'image : ${seen.map((l) => `${l.id} (${l.where})`).join(" ; ")}.`,
  );
  const exits = scene.exits ?? [];
  if (exits.length > 0) {
    lines.push("Ses sorties, chacune un seuil peint dans le décor, à sa place dans l'image :");
    for (const e of exits)
      lines.push(`- « ${e.label} », vers ${e.to} : ${e.threshold} (${zoneWords(e.zone)})`);
  }
  for (const n of neighbors) {
    const there = n.exits?.find((e) => e.to === scene.id);
    const here = exits.find((e) => e.to === n.id);
    lines.push(
      `\nLa scène voisine « ${n.title ?? n.id} » (${n.id}) est déjà peinte.` +
        (here !== undefined ? ` On y va d'ici par ${here.threshold}.` : "") +
        (there !== undefined ? ` On en vient par ${there.threshold}, vu de son côté.` : "") +
        `\nSon décor : ${n.background ?? ""}\nSa lumière : ${n.light ?? ""}`,
    );
  }
  lines.push(
    "\nDans background.prompt, chaque sortie est son seuil, décrit à sa place dans l'image, loin des bords, bien visible et reconnaissable, sans personne devant ; chaque repère visible est à sa place, avec sa description. Un seuil qu'une scène voisine montre de l'autre côté garde ses matières, sa couleur et son usure. La lumière (light) est celle de la même heure que les scènes voisines, venant du même côté du monde ; un intérieur garde l'heure qu'il fait dehors. Rien dans le décor ne contredit le monde ni les scènes voisines.",
  );
  return lines.join("\n");
};

export const baseWriter = (
  apiKey: string,
  format: Format,
  game?: GameContext,
  model = TEXT_MODEL,
) => {
  const ask = conversation(base, apiKey, system(format), model);
  // The game's style is kept as it is, whatever Claude sends back.
  const write = async (content: string) => {
    const output = await ask(content);
    return game === undefined ? output : { ...output, style: game.style };
  };
  const context =
    game === undefined
      ? ""
      : `\n\nLa scène fait partie d'un jeu, demandé ainsi : ${game.brief}\n\nSon style est celui de tout le jeu ; renvoie-le tel quel : ${game.style}${mapContext(game)}`;
  return {
    write: (brief: string) => write(`Écris le fond de la scène : ${brief}${context}`),
    revise: (change: string) => write(`Modifie le fond ainsi : ${change}`),
  };
};
