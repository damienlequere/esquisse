"use client";

// A game's map: each scene a card, at a place the author drags it to (kept in
// the browser, not in game.json), its exits listed on it, each one led by its
// select to a scene of the game or left closed; the links drawn between the
// cards. The scenes of the plan not painted yet are cards of their own, to
// paint.

import { type Game, sceneExits } from "@esquisse/engine";
import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StudioGame } from "../../lib/types.ts";
import { cx } from "../ui.tsx";

const CARD = { width: 200, thumb: 112, title: 40, row: 26, gap: 90, vgap: 40 };

type Point = { x: number; y: number };

// Columns by distance from the start, following the links both ways; the
// scenes not reached after.
const autoLayout = (ids: string[], game: Game, heights: Record<string, number>) => {
  const neighbors = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]));
  for (const [from, exits] of Object.entries(game.links))
    for (const to of Object.values(exits)) {
      neighbors.get(from)?.add(to);
      neighbors.get(to)?.add(from);
    }
  const depth = new Map<string, number>();
  const queue = ids.includes(game.start) ? [game.start] : ids.slice(0, 1);
  for (const id of queue) depth.set(id, 0);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const n of neighbors.get(id) ?? [])
      if (!depth.has(n)) {
        depth.set(n, (depth.get(id) ?? 0) + 1);
        queue.push(n);
      }
  }
  const last = Math.max(0, ...depth.values());
  const columns = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id) ?? last + 1;
    columns.set(d, [...(columns.get(d) ?? []), id]);
  }
  const positions: Record<string, Point> = {};
  for (const [d, column] of columns) {
    let y = 24;
    for (const id of column) {
      positions[id] = { x: 24 + d * (CARD.width + CARD.gap), y };
      y += (heights[id] ?? 200) + CARD.vgap;
    }
  }
  return positions;
};

const usePositions = (key: string) => {
  const [saved, setSaved] = useState<Record<string, Point>>({});
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      setSaved({});
    }
  }, [key]);
  const save = (next: Record<string, Point>) => {
    setSaved(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [saved, save] as const;
};

export const GameMap = ({
  studio,
  game,
  onChange,
  onPlay,
  onPaint,
  playing,
}: {
  studio: StudioGame;
  game: Game;
  onChange(game: Game): void;
  // Plays one scene alone in the preview, or the game (undefined).
  onPlay(scene: string | undefined): void;
  // Paints a planned scene.
  onPaint(scene: string): void;
  playing?: string;
}) => {
  const painted = Object.keys(studio.scenes);
  const planned = (studio.game.generation?.scenes ?? []).filter((s) => !painted.includes(s.id));
  const ids = [...painted, ...planned.map((s) => s.id)];
  const exits = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(studio.scenes).map(([id, s]) => [id, [...sceneExits(s.data.scene)]]),
      ),
    [studio.scenes],
  );
  const heights = Object.fromEntries(
    ids.map((id) => [
      id,
      CARD.thumb + CARD.title + Math.max(1, exits[id]?.length ?? 0) * CARD.row + 8,
    ]),
  );
  const [saved, save] = usePositions(`esquisse-studio:map:${studio.id}`);
  const auto = autoLayout(ids, game, heights);
  const position = (id: string) => saved[id] ?? auto[id] ?? { x: 0, y: 0 };

  // ── Dragging a card ─────────────────────────────────────────────────────────
  const drag = useRef<{ id: string; from: Point; start: Point; moved: boolean }>(null);
  const [dragged, setDragged] = useState<Record<string, Point>>({});
  const onPointerDown = (id: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, from: { x: e.clientX, y: e.clientY }, start: position(id), moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d === null) return;
    const dx = e.clientX - d.from.x;
    const dy = e.clientY - d.from.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    setDragged({ [d.id]: { x: Math.max(0, d.start.x + dx), y: Math.max(0, d.start.y + dy) } });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && dragged[d.id]) {
      save({ ...Object.fromEntries(ids.map((id) => [id, position(id)])), ...dragged });
    }
    setDragged({});
  };
  const at = (id: string) => dragged[id] ?? position(id);

  const setLink = (from: string, exit: string, to: string) => {
    const links = { ...game.links, [from]: { ...game.links[from] } };
    if (to === "") delete links[from]?.[exit];
    else (links[from] as Record<string, string>)[exit] = to;
    if (Object.keys(links[from] ?? {}).length === 0) delete links[from];
    onChange({ ...game, links });
  };

  // ── The links, drawn from their exit's row to the card they lead to ─────────
  const edges = Object.entries(game.links).flatMap(([from, linked]) =>
    Object.entries(linked).flatMap(([exit, to]) => {
      const row = (exits[from] ?? []).findIndex(([e]) => e === exit);
      if (!ids.includes(from) || !ids.includes(to)) return [];
      const a = at(from);
      const b = at(to);
      const y = a.y + CARD.thumb + CARD.title + (Math.max(0, row) + 0.5) * CARD.row;
      const rightward = b.x >= a.x + CARD.width / 2;
      const start = { x: rightward ? a.x + CARD.width : a.x, y };
      const end = {
        x: rightward ? b.x : b.x + CARD.width,
        y: b.y + CARD.thumb / 2,
      };
      if (from === to) return [];
      const bend = Math.max(40, Math.abs(end.x - start.x) / 2);
      const c1 = { x: start.x + (rightward ? bend : -bend), y: start.y };
      const c2 = { x: end.x + (rightward ? -bend : bend), y: end.y };
      return [
        {
          key: `${from}:${exit}`,
          d: `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`,
          broken: row === -1,
        },
      ];
    }),
  );

  const width = Math.max(...ids.map((id) => at(id).x + CARD.width), 600) + 40;
  const height = Math.max(...ids.map((id) => at(id).y + (heights[id] ?? 200)), 280) + 40;

  return (
    // As tall as its cards, up to most of the screen; it scrolls past that.
    <div
      className="relative max-h-[70vh] overflow-auto rounded-lg border border-zinc-800 bg-[radial-gradient(circle,#27272a_1px,transparent_1px)] [background-size:20px_20px]"
      style={{ height: height + 2 }}
    >
      <div className="relative" style={{ width, height }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#a1a1aa" />
            </marker>
          </defs>
          {edges.map((e) => (
            <path
              key={e.key}
              d={e.d}
              fill="none"
              stroke={e.broken ? "#f87171" : "#a1a1aa"}
              strokeWidth={1.5}
              strokeDasharray={e.broken ? "4 4" : undefined}
              markerEnd="url(#arrow)"
            />
          ))}
        </svg>
        {painted.map((id) => {
          const s = studio.scenes[id];
          if (s === undefined) return null;
          const p = at(id);
          const sceneExitList = exits[id] ?? [];
          return (
            <div
              key={id}
              className={cx(
                "absolute overflow-hidden rounded-lg border bg-zinc-900 shadow-lg",
                playing === id ? "border-zinc-300" : "border-zinc-700",
              )}
              style={{ left: p.x, top: p.y, width: CARD.width }}
            >
              <div
                onPointerDown={(e) => onPointerDown(id, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="relative cursor-grab touch-none bg-zinc-800 active:cursor-grabbing"
                style={{ height: CARD.thumb }}
              >
                {s.images.background && (
                  <img
                    src={s.images.background}
                    alt=""
                    draggable={false}
                    className="size-full object-cover"
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
              </div>
              <div
                className="flex items-center gap-1 border-b border-zinc-800 px-2"
                style={{ height: CARD.title }}
              >
                <Link
                  href={`/games/${studio.id}/scenes/${id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100 hover:underline"
                  title={s.data.scene.title}
                >
                  {s.data.scene.title}
                </Link>
                <button
                  type="button"
                  title="Play this scene alone"
                  onClick={() => onPlay(playing === id ? undefined : id)}
                  className="rounded px-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  ▶
                </button>
              </div>
              <div className="py-1">
                {sceneExitList.length === 0 && (
                  <p className="px-2 text-xs text-zinc-600" style={{ lineHeight: `${CARD.row}px` }}>
                    No exit
                  </p>
                )}
                {sceneExitList.map(([exit, by]) => (
                  <div
                    key={exit}
                    className="flex items-center gap-1 px-2 text-xs"
                    style={{ height: CARD.row }}
                    title={by}
                  >
                    <span className="min-w-0 flex-1 truncate text-emerald-300">
                      {by === "the back button" ? "↩ " : ""}
                      {exit}
                    </span>
                    <select
                      value={game.links[id]?.[exit] ?? ""}
                      onChange={(e) => setLink(id, exit, e.target.value)}
                      className="w-24 px-1 py-0 text-xs"
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
            </div>
          );
        })}
        {planned.map((plan) => {
          const p = at(plan.id);
          return (
            <div
              key={plan.id}
              className="absolute overflow-hidden rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60"
              style={{ left: p.x, top: p.y, width: CARD.width }}
            >
              <div
                onPointerDown={(e) => onPointerDown(plan.id, e)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className="cursor-grab touch-none overflow-hidden p-3 text-xs text-zinc-500"
                style={{ height: CARD.thumb }}
                title={plan.brief}
              >
                <p className="line-clamp-5">{plan.brief}</p>
              </div>
              <div className="flex items-center gap-2 border-t border-zinc-800 px-2 py-2">
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
          );
        })}
      </div>
    </div>
  );
};
