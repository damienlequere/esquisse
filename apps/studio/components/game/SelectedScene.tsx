"use client";

// The scene selected on a game's map: its whole image, with its safe zone and
// the objects the player can act on (their boxes, objects.json), the exits in
// green; beside it, each object's actions, then what it was generated from (its
// plan in game.json, when it has one). Hovering an object shows its box. It is
// only seen here: the scene's page edits it. The list goes beside the image
// when it has room, below it otherwise (a landscape scene).

import {
  type Box,
  type GeneratedScene,
  type ObjectBox,
  sceneRatio,
  type World,
} from "@esquisse/engine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { StudioScene } from "../../lib/types.ts";
import { isExit, svgPoints } from "../scene/Canvas.tsx";
import { cx } from "../ui.tsx";
import { PlannedScene } from "./Generation.tsx";

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
  plan,
  world,
}: {
  game: string;
  scene: StudioScene;
  // Its plan in game.json, and the world it stands in, when Generate a game made it.
  plan?: GeneratedScene;
  world?: World;
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
    <div ref={section} className="flex scroll-mt-28 flex-wrap items-start gap-4">
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
        <svg
          className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[
            ...placed.filter((o) => o.id !== hovered),
            ...placed.filter((o) => o.id === hovered),
          ].map((object) => {
            const box = objects[object.id] as ObjectBox;
            const exit = isExit(object);
            const on = hovered === object.id;
            return (
              <polygon
                key={object.id}
                points={svgPoints(box)}
                vectorEffect="non-scaling-stroke"
                strokeWidth={2}
                strokeLinejoin="round"
                onPointerEnter={() => setHovered(object.id)}
                onPointerLeave={() => setHovered(undefined)}
                className={cx(
                  "pointer-events-auto",
                  on
                    ? "fill-sky-400/15 stroke-sky-400"
                    : exit
                      ? "fill-emerald-400/5 stroke-emerald-400/80"
                      : "fill-white/5 stroke-white/80",
                )}
              />
            );
          })}
        </svg>
        {placed.map((object) => {
          const box = objects[object.id] as Box;
          const exit = isExit(object);
          const on = hovered === object.id;
          return (
            <span
              key={object.id}
              className={cx(
                "pointer-events-none absolute -translate-y-full rounded-sm px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-black",
                on ? "z-30 bg-sky-400" : exit ? "z-20 bg-emerald-400" : "z-20 bg-white/90",
              )}
              style={{ left: pct(box.x0), top: `calc(${pct(box.y0)} - 2px)` }}
            >
              {object.id}
            </span>
          );
        })}
      </div>

      <div className="flex min-w-80 flex-1 basis-80 flex-col gap-3">
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
        {plan ? (
          // Folded at first: opened to read what the scene was generated from.
          <details
            key={studioScene.id}
            className="rounded-md border border-zinc-800 bg-zinc-900/60"
          >
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase select-none hover:text-zinc-300">
              Prompts
            </summary>
            <div className="border-t border-zinc-800 px-3 py-3">
              <PlannedScene plan={plan} world={world} />
            </div>
          </details>
        ) : (
          <p className="text-sm text-zinc-500">
            Not in the game's plan: its prompts are on its page.
          </p>
        )}
      </div>
    </div>
  );
};
