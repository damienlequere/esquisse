// What the studio's server sends its pages: the games as they are on disk.

import type { Game, GameData, Items, SceneData } from "@esquisse/engine";

// A scene's images, by URL (see media in lib/server/content.ts), as
// content/games/images.ts lists them for the apps.
export type StudioImages = {
  background: string;
  night?: string;
  characters: Record<string, string>;
  effects: Record<string, string[]>;
};

export type StudioScene = {
  id: string;
  data: SceneData;
  images: StudioImages;
  // The files the apps need to list it, not there yet: none, it is listed.
  missing: string[];
};

export type StudioGame = {
  id: string;
  game: Game;
  scenes: Record<string, StudioScene>;
  items: Items;
  // Each item's image, by its id.
  itemImages: Record<string, string>;
};

// What the studio sends its preview (see components/Preview.tsx): the game as
// it is being edited, not saved yet, and what to play: one scene alone, or the
// game from its start. restart changes to play it again from the beginning.
export type PreviewMessage = {
  type: "esquisse:preview";
  id: string;
  game: GameData;
  images: Record<string, StudioImages>;
  itemImages: Record<string, string>;
  scene?: string;
  restart: number;
};

export type StudioSummary = {
  id: string;
  title: string;
  start: string;
  scenes: string[];
  // The scenes of its plan, if generate-game made it.
  planned: string[];
  thumbnail?: string;
};

// ── The generator's commands, run by the studio (see lib/server/jobs.ts) ─────

export type Command =
  | "generate-game"
  | "generate-scene"
  | "link-game"
  | "generate-night"
  | "remove-scene"
  | "remove-game";

export type JobEvent = { seq: number } & (
  | { type: "log"; text: string; error?: boolean }
  | { type: "choose"; question: string; choices: Record<string, string> }
  | { type: "ask"; question: string }
  | { type: "answer"; text: string }
  | { type: "render"; url: string }
  | { type: "end"; status: JobStatus; code: number | null }
);

export type JobStatus = "running" | "done" | "failed" | "cancelled";

export type JobSummary = {
  id: string;
  command: Command;
  args: string[];
  game: string;
  scene?: string;
  status: JobStatus;
  // What it waits for, if it asks something.
  waiting: boolean;
  started: number;
};

// What the studio asks the server to run (see argsOf in lib/server/jobs.ts).
export type JobRequest = {
  command: Command;
  game: string;
  scene?: string;
  scenes?: string[];
  orientation?: string;
  brief?: string;
  model?: string;
};
