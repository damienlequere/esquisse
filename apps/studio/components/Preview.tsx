"use client";

// The game as it is being edited, played in an iframe the size of a phone or a
// tablet (app/(preview)/preview), scaled to fit its panel. Each change is sent
// to it as it is made, saved or not.

import type { GameData } from "@esquisse/engine";
import { useEffect, useRef, useState } from "react";
import type { PreviewMessage, StudioGame } from "../lib/types.ts";
import { Button, cx } from "./ui.tsx";

// Below the web site's device frame (see apps/web/app/globals.css): the scene
// fills the iframe, as on a phone or a tablet.
const DEVICES = {
  phone: { portrait: [390, 845], landscape: [845, 390] },
  tablet: { portrait: [558, 744], landscape: [744, 558] },
} as const;
type Device = keyof typeof DEVICES;

// The game as edited: its game.json and its scenes' data.
export const draftGame = (studio: StudioGame, overrides?: Partial<GameData>): GameData => ({
  game: studio.game,
  scenes: Object.fromEntries(Object.entries(studio.scenes).map(([id, s]) => [id, s.data])),
  items: studio.items,
  ...overrides,
});

export const Preview = ({
  studio,
  game,
  scene,
  landscape,
}: {
  studio: StudioGame;
  game: GameData;
  // One scene alone; without it, the game from its start.
  scene?: string;
  landscape: boolean;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [restart, setRestart] = useState(0);
  const [device, setDevice] = useState<Device>("phone");
  const [space, setSpace] = useState({ width: 300, height: 600 });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.data?.type === "esquisse:preview-ready"
      )
        setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (el === null) return;
    const observer = new ResizeObserver(() =>
      setSpace({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sent a moment after the last change, not at each key.
  useEffect(() => {
    if (!ready) return;
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
      frame.current?.contentWindow?.postMessage(message, window.location.origin);
    }, 200);
    return () => clearTimeout(timer);
  }, [ready, studio, game, scene, restart]);

  const [width, height] = DEVICES[device][landscape ? "landscape" : "portrait"];
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
        <Button variant="ghost" className="text-xs" onClick={() => setRestart((n) => n + 1)}>
          ↺ Restart
        </Button>
      </div>
      <div
        ref={box}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        <div style={{ width: width * scale, height: height * scale }}>
          <iframe
            ref={frame}
            src="/preview"
            title="Preview"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="rounded-xl border border-zinc-700 bg-black"
          />
        </div>
      </div>
    </div>
  );
};
