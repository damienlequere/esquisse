"use client";

// A game's scenes, as cards in a grid: the start first, then the scenes in the
// order the links reach them, then the others, then the scenes of the plan not
// painted yet, to paint. Each card has its picture, its title, its exits, each
// one led by its select to a scene of the game or left closed, and the scenes
// that lead to it. A click on a card's picture selects it: it grows, its image
// whole, with a button to edit it.

import { type Game, sceneExits, sceneRatio } from "@esquisse/engine";
import Link from "next/link";
import { useMemo } from "react";
import type { StudioGame } from "../../lib/types.ts";
import { cx } from "../ui.tsx";

// The start, then breadth first along the links, then the scenes not reached.
const order = (ids: string[], game: Game) => {
  const seen = new Set<string>();
  const queue = ids.includes(game.start) ? [game.start] : [];
  for (const id of queue) seen.add(id);
  for (let i = 0; i < queue.length; i++)
    for (const to of Object.values(game.links[queue[i] as string] ?? {}))
      if (ids.includes(to) && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
  return [...queue, ...ids.filter((id) => !seen.has(id))];
};

export const SceneCards = ({
  studio,
  game,
  onChange,
  onPlay,
  onPaint,
  playing,
  selected,
  onSelect,
}: {
  studio: StudioGame;
  game: Game;
  onChange(game: Game): void;
  // Plays one scene alone, or the game (undefined).
  onPlay(scene: string | undefined): void;
  // Paints a planned scene.
  onPaint(scene: string): void;
  playing?: string;
  // The scene whose card is larger, with its Edit button.
  selected?: string;
  onSelect(scene: string | undefined): void;
}) => {
  const painted = Object.keys(studio.scenes);
  const planned = (studio.game.generation?.scenes ?? []).filter((s) => !painted.includes(s.id));
  const exits = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(studio.scenes).map(([id, s]) => [id, [...sceneExits(s.data.scene)]]),
      ),
    [studio.scenes],
  );
  // The scenes that lead to each one.
  const from: Record<string, string[]> = {};
  for (const [id, linked] of Object.entries(game.links))
    for (const to of new Set(Object.values(linked))) from[to] = [...(from[to] ?? []), id];

  const setLink = (scene: string, exit: string, to: string) => {
    const links = { ...game.links, [scene]: { ...game.links[scene] } };
    if (to === "") delete links[scene]?.[exit];
    else (links[scene] as Record<string, string>)[exit] = to;
    if (Object.keys(links[scene] ?? {}).length === 0) delete links[scene];
    onChange({ ...game, links });
  };

  if (painted.length === 0 && planned.length === 0)
    return <p className="text-sm text-zinc-500">No scene yet: + New scene paints one.</p>;

  return (
    <div className="grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-start gap-4">
      {order(painted, game).map((id) => {
        const s = studio.scenes[id];
        if (s === undefined) return null;
        const on = selected === id;
        const sceneExitList = exits[id] ?? [];
        return (
          <div
            key={id}
            className={cx(
              "overflow-hidden rounded-lg border bg-zinc-900",
              on
                ? "col-span-2 border-sky-400 ring-2 ring-sky-400/40"
                : playing === id
                  ? "border-zinc-300"
                  : "border-zinc-800",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(on ? undefined : id)}
              title={on ? "Click to let it go" : "Click to select it"}
              // Selected, the whole image, at its ratio, up to most of the screen.
              className={cx(
                "relative block w-full bg-zinc-950",
                on ? "max-h-[70vh]" : "aspect-video bg-zinc-800",
              )}
              style={on ? { aspectRatio: sceneRatio(s.data.scene) } : undefined}
            >
              {s.images.background && (
                <img
                  src={s.images.background}
                  alt=""
                  draggable={false}
                  className={cx("size-full", on ? "object-contain" : "object-cover")}
                />
              )}
              {game.start === id && (
                <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  START
                </span>
              )}
              {s.missing.length > 0 && (
                <span
                  title={`Missing: ${s.missing.join(", ")}`}
                  className="absolute top-1.5 right-1.5 rounded bg-red-950/90 px-1.5 py-0.5 text-[10px] text-red-200"
                >
                  not listed
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 px-3 pt-2">
              <p
                className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100"
                title={s.data.scene.title}
              >
                {s.data.scene.title}
              </p>
              <button
                type="button"
                title="Play this scene alone"
                onClick={() => onPlay(playing === id ? undefined : id)}
                className="rounded px-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ▶
              </button>
            </div>
            <p className="truncate px-3 text-xs text-zinc-500">
              {id}
              {from[id] ? ` · from ${from[id].join(", ")}` : ""}
            </p>
            <div className="flex flex-col gap-1 px-3 py-2">
              {sceneExitList.length === 0 && <p className="text-xs text-zinc-600">No exit</p>}
              {sceneExitList.map(([exit, by]) => (
                <div key={exit} className="flex items-center gap-2 text-xs" title={by}>
                  <span className="min-w-0 flex-1 truncate text-emerald-300">
                    {by === "the back button" ? "↩ " : ""}
                    {exit}
                  </span>
                  <select
                    value={game.links[id]?.[exit] ?? ""}
                    onChange={(e) => setLink(id, exit, e.target.value)}
                    className="w-28 px-1 py-0 text-xs"
                  >
                    <option value="">closed</option>
                    {(() => {
                      const to = game.links[id]?.[exit];
                      return to !== undefined && !painted.includes(to) ? (
                        <option value={to}>→ {to} (missing)</option>
                      ) : null;
                    })()}
                    {painted
                      .filter((t) => t !== id)
                      .map((t) => (
                        <option key={t} value={t}>
                          → {t}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>
            {on && (
              <div className="border-t border-zinc-800 p-2">
                <Link
                  href={`/games/${studio.id}/scenes/${id}`}
                  className="block w-full rounded-md bg-zinc-100 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 hover:bg-white"
                >
                  Edit the scene
                </Link>
              </div>
            )}
          </div>
        );
      })}
      {planned.map((plan) => (
        <div
          key={plan.id}
          className="overflow-hidden rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60"
        >
          <div
            className="aspect-video overflow-hidden p-3 text-xs text-zinc-500"
            title={plan.brief}
          >
            <p className="line-clamp-6">{plan.brief}</p>
          </div>
          <div className="flex items-center gap-2 border-t border-zinc-800 px-3 py-2">
            <span className="flex-1 truncate text-sm text-zinc-400">{plan.id}</span>
            <button
              type="button"
              onClick={() => onPaint(plan.id)}
              className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800"
            >
              Paint
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
