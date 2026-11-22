"use client";

// The game as it is being edited, played in an iframe the size of a phone or a
// tablet (app/(preview)/preview), scaled to fit its panel, or in a window of
// its own (usePlayWindow). Each change is sent to it as it is made, saved or not.

import type { GameData } from "@esquisse/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewMessage, StudioGame } from "../lib/types.ts";
import { Button, cx } from "./ui.tsx";

// Below the web site's device frame (see apps/web/app/globals.css): the scene
// fills the iframe, as on a phone or a tablet.
const DEVICES = {
  phone: { portrait: [390, 845], landscape: [845, 390] },
  tablet: { portrait: [558, 744], landscape: [744, 558] },
} as const;
type Device = keyof typeof DEVICES;

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

  const [width, height] = DEVICES.phone[played.landscape ? "landscape" : "portrait"];
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

// The game played in a panel, in a device's frame, or in its window.
export const Preview = (played: Played) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const frameWindow = useCallback(() => frame.current?.contentWindow, []);
  const [ready] = useReady(frameWindow);
  const own = usePlayWindow(played);
  const [restart, setRestart] = useState(0);
  const [device, setDevice] = useState<Device>("phone");
  const [space, setSpace] = useState({ width: 300, height: 600 });
  useSend(frameWindow, own.playing ? 0 : ready, played, restart);

  useEffect(() => {
    const el = box.current;
    if (el === null) return;
    const observer = new ResizeObserver(() =>
      setSpace({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [width, height] = DEVICES[device][played.landscape ? "landscape" : "portrait"];
  const scale = Math.min(1, (space.width - 8) / width, (space.height - 8) / height);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-zinc-800 px-2 py-1.5">
        {(Object.keys(DEVICES) as Device[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDevice(d)}
            className={cx(
              "rounded px-2 py-0.5 text-xs capitalize",
              d === device ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {d}
          </button>
        ))}
        <span className="flex-1" />
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => (own.playing ? own.restart() : setRestart((n) => n + 1))}
        >
          ↺ Restart
        </Button>
        <Button variant="ghost" className="text-xs" onClick={own.playing ? own.stop : own.play}>
          {own.playing ? "Bring it back" : "⧉ Own window"}
        </Button>
      </div>
      <div
        ref={box}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {own.playing ? (
          <p className="text-xs text-zinc-500">Played in its own window.</p>
        ) : (
          <div style={{ width: width * scale, height: height * scale }}>
            <iframe
              ref={frame}
              src="/preview"
              title="Preview"
              style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
              className="rounded-xl border border-zinc-700 bg-black"
            />
          </div>
        )}
      </div>
    </div>
  );
};
