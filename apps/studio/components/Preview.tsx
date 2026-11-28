"use client";

// The game as it is being edited, played in a window of its own the size of a
// phone (usePlayWindow), on app/(preview)/preview. Each change is sent to it as
// it is made, saved or not.

import type { GameData } from "@esquisse/engine";
import { useEffect, useState } from "react";
import type { PreviewMessage, StudioGame } from "../lib/types.ts";

// A phone's screen, below the web site's device frame (see
// apps/web/app/globals.css): the scene fills the window, as on a phone.
const PHONE = { portrait: [390, 845], landscape: [845, 390] } as const;

// The window the game is played in, when not in a panel: one for the studio,
// kept from page to page (the studio's pages change without reloading), until
// it is closed.
let popup: Window | null = null;
const POPUP = "esquisse-preview";
const open = () => popup !== null && !popup.closed;

// A window sized for its page to be width × height.
const resize = (w: Window, width: number, height: number) =>
  w.resizeTo(width + w.outerWidth - w.innerWidth, height + w.outerHeight - w.innerHeight);

// The game as edited: its game.json and its scenes' data.
export const draftGame = (studio: StudioGame, overrides?: Partial<GameData>): GameData => ({
  game: studio.game,
  scenes: Object.fromEntries(Object.entries(studio.scenes).map(([id, s]) => [id, s.data])),
  items: studio.items,
  ...overrides,
});

// Until a page has loaded its game, it has none to send.
type Played = {
  studio: StudioGame | undefined;
  game: GameData | undefined;
  // One scene alone; without it, the game from its start.
  scene?: string;
  landscape: boolean;
};

// Sends the game to the player in target once it is ready (counted: it says so
// at each load), a moment after the last change, not at each key.
const useSend = (
  target: () => Window | null | undefined,
  ready: number,
  { studio, game, scene }: Played,
  restart: number,
) => {
  useEffect(() => {
    if (ready === 0 || studio === undefined || game === undefined) return;
    const timer = setTimeout(() => {
      const message: PreviewMessage = {
        type: "esquisse:preview",
        id: studio.id,
        game,
        images: Object.fromEntries(Object.entries(studio.scenes).map(([id, s]) => [id, s.images])),
        itemImages: studio.itemImages,
        ...(scene !== undefined ? { scene } : {}),
        restart,
      };
      target()?.postMessage(message, window.location.origin);
    }, 200);
    return () => clearTimeout(timer);
  }, [target, ready, studio, game, scene, restart]);
};

// Counts the times the player in source() says it is ready.
const useReady = (source: () => Window | null | undefined) => {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "esquisse:preview-ready" && event.source === source())
        setReady((n) => n + 1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [source]);
  return [ready, setReady] as const;
};

const popupWindow = () => popup;

// The game played in its window, the size of a phone: opened (or brought to the
// front) by play, from a click; it follows the edits until it is closed.
export const usePlayWindow = (played: Played) => {
  const [ready, setReady] = useReady(popupWindow);
  const [playing, setPlaying] = useState(false);
  const [restart, setRestart] = useState(0);
  // Already open, from another page: it is ready.
  useEffect(() => {
    if (!open()) return;
    setPlaying(true);
    setReady((n) => Math.max(n, 1));
  }, [setReady]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (open()) return;
      popup = null;
      setReady(0);
      setPlaying(false);
    }, 500);
    return () => clearInterval(timer);
  }, [playing, setReady]);
  useSend(popupWindow, playing ? ready : 0, played, restart);

  const [width, height] = PHONE[played.landscape ? "landscape" : "portrait"];
  useEffect(() => {
    if (playing && popup && !popup.closed) resize(popup, width, height);
  }, [playing, width, height]);

  return {
    playing,
    play: () => {
      if (open()) {
        popup?.focus();
        return;
      }
      const w = window.open("/preview", POPUP, `popup,width=${width},height=${height}`);
      if (w === null) return;
      popup = w;
      setReady(0);
      setPlaying(true);
    },
    restart: () => setRestart((n) => n + 1),
    stop: () => {
      popup?.close();
      popup = null;
      setReady(0);
      setPlaying(false);
    },
  };
};
