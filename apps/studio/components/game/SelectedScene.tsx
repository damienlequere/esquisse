"use client";

// The scene selected on a game's map: its whole image, with its safe zone and
// the objects the player can act on (their boxes, objects.json), the exits in
// green; beside it, each object's actions. Hovering one shows its box. It is
// only seen here: the scene's page edits it.

import { type Box, sceneRatio } from "@esquisse/engine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { StudioScene } from "../../lib/types.ts";
import { isExit } from "../scene/Canvas.tsx";
import { cx } from "../ui.tsx";

const pct = (v: number) => `${v * 100}%`;
const place = (b: Box) => ({
  left: pct(b.x0),
  top: pct(b.y0),
  width: pct(b.x1 - b.x0),
  height: pct(b.y1 - b.y0),
});

export const SelectedScene = ({
  game,
  scene: studioScene,
  links,
}: {
  game: string;
  scene: StudioScene;
  // Where its exits lead, as the game is being edited.
  links: Record<string, string>;
}) => {
  const { scene, objects } = studioScene.data;
  const [hovered, setHovered] = useState<string>();
  const section = useRef<HTMLDivElement>(null);
  // Brought into view once selected: it is below the map.
  useEffect(() => {
    section.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [studioScene.id]);
  const placed = scene.objects.filter((o) => objects[o.id] !== undefined);
  const unplaced = scene.objects.filter((o) => objects[o.id] === undefined);

  return (
    <div ref={section} className="flex scroll-mt-28 flex-col gap-4 lg:flex-row lg:items-start">
      <div className="relative inline-block max-w-full shrink-0 self-start overflow-visible">
        {studioScene.images.background ? (
          <img
            src={studioScene.images.background}
            alt={scene.title}
            draggable={false}
            className="block max-h-[75vh] max-w-full rounded-md"
            style={{ aspectRatio: sceneRatio(scene) }}
          />
        ) : (
          <div
            className="h-[75vh] max-w-full rounded-md bg-zinc-800"
            style={{ aspectRatio: sceneRatio(scene) }}
          />
        )}
        <div
          className="pointer-events-none absolute border-2 border-dashed border-white/70"
          style={place(scene.safe)}
        >
          <span className="absolute top-1 left-1 text-[10px] font-medium text-white/70 uppercase">
            safe zone
          </span>
        </div>
        {placed.map((object) => {
          const box = objects[object.id] as Box;
          const exit = isExit(object);
          const on = hovered === object.id;
          return (
            <div
              key={object.id}
              onPointerEnter={() => setHovered(object.id)}
              onPointerLeave={() => setHovered(undefined)}
              className={cx(
                "absolute border-2",
                on
                  ? "z-20 border-sky-400 bg-sky-400/15"
                  : exit
                    ? "z-10 border-emerald-400/80 bg-emerald-400/5"
                    : "z-10 border-white/80 bg-white/5",
              )}
              style={place(box)}
            >
              <span
                className={cx(
                  "pointer-events-none absolute -top-5 left-[-2px] rounded-sm px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-black",
                  on ? "bg-sky-400" : exit ? "bg-emerald-400" : "bg-white/90",
                )}
              >
                {object.id}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-zinc-100">
            {scene.title}
          </h3>
          <Link
            href={`/games/${game}/scenes/${studioScene.id}`}
            className="text-sm text-sky-300 hover:underline"
          >
            Edit the scene →
          </Link>
        </div>
        {scene.objects.length === 0 && <p className="text-sm text-zinc-500">No object.</p>}
        <ul className="flex flex-col gap-1.5">
          {[...placed, ...unplaced].map((object) => {
            const box = objects[object.id];
            const actions = object.actions ?? [{ label: object.label, text: object.text }];
            return (
              <li
                key={object.id}
                onPointerEnter={() => setHovered(object.id)}
                onPointerLeave={() => setHovered(undefined)}
                className={cx(
                  "rounded-md border px-3 py-2 text-sm",
                  hovered === object.id
                    ? "border-sky-400/70 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-900/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      "font-medium",
                      isExit(object) ? "text-emerald-300" : "text-zinc-100",
                    )}
                  >
                    {object.id}
                  </span>
                  {object.actions && (
                    <span className="truncate text-xs text-zinc-500">{object.label}</span>
                  )}
                  {box === undefined && (
                    <span className="ml-auto rounded bg-red-950/90 px-1.5 py-0.5 text-[10px] text-red-200">
                      no box
                    </span>
                  )}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-400">
                  {actions.map((a, i) => (
                    <li key={`${a.label}-${i}`} className="flex flex-wrap gap-x-2">
                      <span className="text-zinc-300">{a.label}</span>
                      {"exit" in a && a.exit !== undefined && (
                        <span className="text-emerald-300">
                          exit {a.exit} → {links[a.exit] ?? "closed"}
                        </span>
                      )}
                      {"search" in a && a.search && <span>search</span>}
                      {"sets" in a && a.sets && <span>sets {a.sets}</span>}
                      {"requires" in a && a.requires && <span>requires {a.requires}</span>}
                    </li>
                  ))}
                </ul>
                {object.contents && object.contents.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">holds {object.contents.join(", ")}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
