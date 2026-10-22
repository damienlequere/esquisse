import type { Scene } from "./types.ts";

// A scene's line on the home page, in both apps.

const WORDS = ["no", "one", "two", "three", "four", "five"];

const count = (n: number, thing: string) => `${WORDS[n] ?? n} ${thing}${n === 1 ? "" : "s"}`;

export const sceneSummary = (scene: Scene) =>
  `A clickable scene: ${count(scene.objects.length, "object")}, ${count(scene.characters.length, "character")} to talk to.`;
