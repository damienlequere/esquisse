import type { GameData } from "../games/types.ts";

// A game's line on the home page, in both apps.

const WORDS = ["no", "one", "two", "three", "four", "five"];

const count = (n: number, thing: string) => `${WORDS[n] ?? n} ${thing}${n === 1 ? "" : "s"}`;

export const gameSummary = ({ scenes }: GameData) =>
  `A game: ${count(Object.keys(scenes).length, "scene")}, linked by their exits.`;
