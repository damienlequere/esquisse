"use client";

// A scene's image, with what is placed on it: the objects' boxes (objects.json,
// what the player clicks), the characters by their feet, the safe zone, and
// what a phone and a tablet crop. Boxes are drawn, moved and resized here, in
// fractions of the image, as the apps place them. An object's box can be made a
// polygon (see ObjectBox): its corners are then dragged one by one, the handle
// in the middle of an edge adds one, a double click on one removes it.

import {
  type Box,
  boxPoints,
  type Character,
  characterBox,
  type ObjectBox,
  type Point,
  pointsBounds,
  type SceneData,
  sceneRatio,
} from "@esquisse/engine";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import type { StudioImages } from "../../lib/types.ts";
import { cx } from "../ui.tsx";

export type Selection = { kind: "object" | "character"; id: string } | undefined;
export type Tool = "select" | "object" | "character";
export type Guides = { safe: boolean; phone: boolean; tablet: boolean; night: boolean };

const DEFAULT_ASPECT = 0.4;
const round = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const normalize = (b: Box): Box => ({
  x0: round(clamp(Math.min(b.x0, b.x1))),
  y0: round(clamp(Math.min(b.y0, b.y1))),
  x1: round(clamp(Math.max(b.x0, b.x1))),
  y1: round(clamp(Math.max(b.y0, b.y1))),
});

// A polygon, its points rounded, its box around them.
export const polygonBox = (points: Point[]): ObjectBox => {
  const rounded = points.map((p) => ({ x: round(clamp(p.x)), y: round(clamp(p.y)) }));
  return { ...pointsBounds(rounded), points: rounded };
};

// The box moved, its polygon with it, kept inside the image.
export const translateBox = (b: ObjectBox, dx: number, dy: number): ObjectBox => {
  const x = clamp(dx, -b.x0, 1 - b.x1);
  const y = clamp(dy, -b.y0, 1 - b.y1);
  const moved = {
    x0: round(b.x0 + x),
    y0: round(b.y0 + y),
    x1: round(b.x1 + x),
    y1: round(b.y1 + y),
  };
  return b.points
    ? { ...moved, points: b.points.map((p) => ({ x: round(p.x + x), y: round(p.y + y) })) }
    : moved;
};

// Its polygon's points, for an SVG in fractions of the image.
export const svgPoints = (b: ObjectBox) =>
  boxPoints(b)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

const DOUBLE_CLICK = 350;

const pct = (v: number) => `${v * 100}%`;
const place = (b: Box) => ({
  left: pct(b.x0),
  top: pct(b.y0),
  width: pct(b.x1 - b.x0),
  height: pct(b.y1 - b.y0),
});

// What each device shows of the image (see the README): the rest is cropped.
const crops = (landscape: boolean) =>
  landscape
    ? {
        phone: { x0: 0, y0: 0.09, x1: 1, y1: 0.91 },
        tablet: { x0: 0.125, y0: 0, x1: 0.875, y1: 1 },
      }
    : {
        phone: { x0: 0.09, y0: 0, x1: 0.91, y1: 1 },
        tablet: { x0: 0, y0: 0.125, x1: 1, y1: 0.875 },
      };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];
const handlePlace: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: "0%", top: "0%", cursor: "nwse-resize" },
  n: { left: "50%", top: "0%", cursor: "ns-resize" },
  ne: { left: "100%", top: "0%", cursor: "nesw-resize" },
  e: { left: "100%", top: "50%", cursor: "ew-resize" },
  se: { left: "100%", top: "100%", cursor: "nwse-resize" },
  s: { left: "50%", top: "100%", cursor: "ns-resize" },
  sw: { left: "0%", top: "100%", cursor: "nesw-resize" },
  w: { left: "0%", top: "50%", cursor: "ew-resize" },
};

const resize = (b: Box, handle: Handle, dx: number, dy: number): Box => ({
  x0: handle.includes("w") ? b.x0 + dx : b.x0,
  x1: handle.includes("e") ? b.x1 + dx : b.x1,
  y0: handle.includes("n") ? b.y0 + dy : b.y0,
  y1: handle.includes("s") ? b.y1 + dy : b.y1,
});

type Drag =
  | { type: "move-object"; id: string; start: ObjectBox; from: { x: number; y: number } }
  | {
      type: "vertex";
      id: string;
      index: number;
      start: ObjectBox;
      from: { x: number; y: number };
    }
  | {
      type: "resize-object";
      id: string;
      handle: Handle;
      start: Box;
      from: { x: number; y: number };
    }
  | { type: "draw"; from: { x: number; y: number }; id?: string }
  | {
      type: "move-character";
      id: string;
      start: Character["anchor"];
      from: { x: number; y: number };
    }
  | { type: "height-character"; id: string; start: number; from: { x: number; y: number } };

export const isExit = (object: SceneData["scene"]["objects"][number]) =>
  (object.actions ?? []).some((a) => a.exit !== undefined);

export const Canvas = ({
  doc,
  images,
  selection,
  tool,
  guides,
  onSelect,
  onChange,
  onCreateObject,
  onCreateCharacter,
}: {
  doc: SceneData;
  images: StudioImages;
  selection: Selection;
  tool: Tool;
  guides: Guides;
  onSelect(selection: Selection): void;
  // key: the gesture, one step of the history (see useHistory).
  onChange(doc: SceneData, key: string): void;
  onCreateObject(box: Box): void;
  onCreateCharacter(anchor: { x: number; y: number }): void;
}) => {
  const { scene, objects, aspects } = doc;
  const ratio = sceneRatio(scene);
  const landscape = ratio > 1;
  const outer = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<Drag>();
  const [drawn, setDrawn] = useState<Box>();
  const gesture = useRef(0);
  // The last corner pressed, and when: pressed again soon, it is removed.
  const lastVertex = useRef<{ id: string; index: number; time: number }>(undefined);

  // The image as large as its space allows, in its proportions.
  useEffect(() => {
    const el = outer.current;
    if (el === null) return;
    const measure = () => {
      const w = el.clientWidth - 32;
      const h = el.clientHeight - 32;
      setSize(w / h > ratio ? { width: h * ratio, height: h } : { width: w, height: w / ratio });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio]);

  const at = (e: { clientX: number; clientY: number }) => {
    const r = image.current?.getBoundingClientRect();
    if (r === undefined) return { x: 0, y: 0 };
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const begin = (e: ReactPointerEvent, next: Drag) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    image.current?.setPointerCapture(e.pointerId);
    gesture.current += 1;
    setDrag(next);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (drag === undefined) return;
    const p = at(e);
    const dx = p.x - drag.from.x;
    const dy = p.y - drag.from.y;
    const key = `gesture-${gesture.current}`;
    switch (drag.type) {
      case "move-object":
        onChange(
          { ...doc, objects: { ...objects, [drag.id]: translateBox(drag.start, dx, dy) } },
          key,
        );
        break;
      case "vertex": {
        const points = boxPoints(drag.start).map((q, i) =>
          i === drag.index ? { x: q.x + dx, y: q.y + dy } : q,
        );
        onChange({ ...doc, objects: { ...objects, [drag.id]: polygonBox(points) } }, key);
        break;
      }
      case "resize-object":
        onChange(
          {
            ...doc,
            objects: { ...objects, [drag.id]: normalize(resize(drag.start, drag.handle, dx, dy)) },
          },
          key,
        );
        break;
      case "draw":
        setDrawn(normalize({ x0: drag.from.x, y0: drag.from.y, x1: p.x, y1: p.y }));
        break;
      case "move-character":
        onChange(
          {
            ...doc,
            scene: {
              ...scene,
              characters: scene.characters.map((c) =>
                c.id === drag.id
                  ? {
                      ...c,
                      anchor: {
                        x: round(clamp(drag.start.x + dx)),
                        y: round(clamp(drag.start.y + dy)),
                      },
                    }
                  : c,
              ),
            },
          },
          key,
        );
        break;
      case "height-character":
        onChange(
          {
            ...doc,
            scene: {
              ...scene,
              characters: scene.characters.map((c) =>
                c.id === drag.id ? { ...c, height: round(clamp(drag.start - dy, 0.02, 1)) } : c,
              ),
            },
          },
          key,
        );
        break;
    }
  };

  const onPointerUp = () => {
    if (drag?.type === "draw" && drawn !== undefined) {
      const big = drawn.x1 - drawn.x0 > 0.01 && drawn.y1 - drawn.y0 > 0.01;
      if (big && drag.id !== undefined)
        onChange({ ...doc, objects: { ...objects, [drag.id]: drawn } }, `draw-${gesture.current}`);
      else if (big) onCreateObject(drawn);
    }
    setDrag(undefined);
    setDrawn(undefined);
  };

  // A press on the image itself: draws, places, or lets go of the selection.
  const onBackground = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const p = at(e);
    const unplaced =
      selection?.kind === "object" && objects[selection.id] === undefined
        ? selection.id
        : undefined;
    if (tool === "object" || unplaced !== undefined) {
      begin(e, { type: "draw", from: p, ...(unplaced ? { id: unplaced } : {}) });
      return;
    }
    if (tool === "character") {
      onCreateCharacter({ x: round(p.x), y: round(p.y) });
      return;
    }
    onSelect(undefined);
  };

  const selected = (kind: "object" | "character", id: string) =>
    selection?.kind === kind && selection.id === id;
  const crop = crops(landscape);
  const background = guides.night && images.night ? images.night : images.background;
  const selectedObject =
    selection?.kind === "object" ? scene.objects.find((o) => o.id === selection.id) : undefined;
  const selectedBox = selectedObject && objects[selectedObject.id];
  const placed = scene.objects.filter((o) => objects[o.id] !== undefined);
  // The selected one drawn last, over the others.
  const ordered = [
    ...placed.filter((o) => o !== selectedObject),
    ...placed.filter((o) => o === selectedObject),
  ];

  return (
    <div
      ref={outer}
      className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-zinc-950"
    >
      <div
        ref={image}
        onPointerDown={onBackground}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cx(
          "relative touch-none select-none",
          tool === "select" ? "cursor-default" : "cursor-crosshair",
        )}
        style={{ width: size.width, height: size.height }}
      >
        {background && (
          <img src={background} alt="" draggable={false} className="absolute inset-0 size-full" />
        )}

        {/* What each device crops, darkened. */}
        {(["phone", "tablet"] as const).map(
          (d) =>
            guides[d] && (
              <div
                key={d}
                className="pointer-events-none absolute"
                style={{ ...place(crop[d]), boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)" }}
              >
                <span className="absolute top-1 left-1 text-[10px] font-medium text-white/60 uppercase">
                  {d}
                </span>
              </div>
            ),
        )}
        {guides.safe && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-white/60"
            style={place(scene.safe)}
          />
        )}

        {/* Where the generator was asked to put the selected object. */}
        {selectedObject && (
          <div
            className="pointer-events-none absolute border border-dashed border-sky-300/70"
            style={place(selectedObject.zone)}
          />
        )}

        {/* The objects' polygons (a box is one with four corners), the
            selected one on top. */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {ordered.map((object) => {
            const box = objects[object.id] as ObjectBox;
            const on = selected("object", object.id);
            const exit = isExit(object);
            return (
              <polygon
                key={object.id}
                points={svgPoints(box)}
                vectorEffect="non-scaling-stroke"
                strokeWidth={2}
                strokeLinejoin="round"
                onPointerDown={(e) => {
                  onSelect({ kind: "object", id: object.id });
                  if (tool === "select" || on)
                    begin(e, { type: "move-object", id: object.id, start: box, from: at(e) });
                  else e.stopPropagation();
                }}
                className={cx(
                  "pointer-events-auto",
                  on
                    ? "fill-sky-400/10 stroke-sky-400"
                    : exit
                      ? "fill-emerald-400/5 stroke-emerald-400/80 hover:fill-emerald-400/15"
                      : "fill-white/5 stroke-white/80 hover:fill-white/15",
                  tool === "select" ? "cursor-move" : "",
                )}
              />
            );
          })}
        </svg>

        {placed.map((object) => {
          const box = objects[object.id] as ObjectBox;
          const on = selected("object", object.id);
          const exit = isExit(object);
          return (
            <span
              key={object.id}
              className={cx(
                "pointer-events-none absolute -translate-y-full rounded-sm px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-black",
                on ? "z-30 bg-sky-400" : "z-20",
                !on && (exit ? "bg-emerald-400" : "bg-white/90"),
              )}
              style={{ left: pct(box.x0), top: `calc(${pct(box.y0)} - 2px)` }}
            >
              {object.id}
            </span>
          );
        })}

        {/* The selected object's handles: the box's sides and corners, or its
            polygon's corners and, in the middle of each edge, one to add. */}
        {selectedBox !== undefined &&
          selection !== undefined &&
          (selectedBox.points === undefined ? (
            <div className="pointer-events-none absolute z-30" style={place(selectedBox)}>
              {HANDLES.map((h) => (
                <span
                  key={h}
                  onPointerDown={(e) =>
                    begin(e, {
                      type: "resize-object",
                      id: selection.id,
                      handle: h,
                      start: selectedBox,
                      from: at(e),
                    })
                  }
                  className="pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-sky-900 bg-sky-300"
                  style={handlePlace[h]}
                />
              ))}
            </div>
          ) : (
            (() => {
              const points = boxPoints(selectedBox);
              const id = selection.id;
              return (
                <>
                  {points.map((p, i) => {
                    const q = points[(i + 1) % points.length] as Point;
                    return (
                      <span
                        key={`mid-${i}`}
                        title="Drag to add a corner"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          const next = [
                            ...points.slice(0, i + 1),
                            { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 },
                            ...points.slice(i + 1),
                          ];
                          const box = polygonBox(next);
                          begin(e, { type: "vertex", id, index: i + 1, start: box, from: at(e) });
                          onChange(
                            { ...doc, objects: { ...objects, [id]: box } },
                            `gesture-${gesture.current}`,
                          );
                        }}
                        className="absolute z-30 size-2 -translate-x-1/2 -translate-y-1/2 cursor-copy rounded-full border border-sky-300 bg-sky-950/80"
                        style={{ left: pct((p.x + q.x) / 2), top: pct((p.y + q.y) / 2) }}
                      />
                    );
                  })}
                  {points.map((p, i) => (
                    <span
                      key={`corner-${i}`}
                      title={points.length > 3 ? "Double click to remove" : undefined}
                      onPointerDown={(e) => {
                        const now = Date.now();
                        const last = lastVertex.current;
                        lastVertex.current = { id, index: i, time: now };
                        if (
                          last?.id === id &&
                          last.index === i &&
                          now - last.time < DOUBLE_CLICK &&
                          points.length > 3
                        ) {
                          e.stopPropagation();
                          lastVertex.current = undefined;
                          onChange(
                            {
                              ...doc,
                              objects: {
                                ...objects,
                                [id]: polygonBox(points.filter((_, j) => j !== i)),
                              },
                            },
                            `remove-${now}`,
                          );
                          return;
                        }
                        begin(e, { type: "vertex", id, index: i, start: selectedBox, from: at(e) });
                      }}
                      className="absolute z-30 size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-sm border border-sky-900 bg-sky-300"
                      style={{ left: pct(p.x), top: pct(p.y) }}
                    />
                  ))}
                </>
              );
            })()
          ))}

        {scene.characters.map((character) => {
          const box = characterBox(character, aspects[character.id] ?? DEFAULT_ASPECT, ratio);
          const on = selected("character", character.id);
          const layer = images.characters[character.id];
          return (
            <div
              key={character.id}
              onPointerDown={(e) => {
                onSelect({ kind: "character", id: character.id });
                begin(e, {
                  type: "move-character",
                  id: character.id,
                  start: character.anchor,
                  from: at(e),
                });
              }}
              className={cx(
                "absolute z-10 cursor-move",
                on
                  ? "z-20 outline-2 outline-sky-400"
                  : "outline-2 outline-violet-400/80 hover:outline-violet-300",
                !layer && "border-2 border-dashed border-violet-300/60 bg-violet-400/10",
              )}
              style={place(box)}
            >
              {layer && <img src={layer} alt="" draggable={false} className="size-full" />}
              <span
                className={cx(
                  "pointer-events-none absolute -top-5 left-0 rounded-sm px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-black",
                  on ? "bg-sky-400" : "bg-violet-300",
                )}
              >
                {character.name || character.id}
              </span>
              {/* Its feet, and its height. */}
              <span className="pointer-events-none absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-300" />
              {on && (
                <span
                  onPointerDown={(e) =>
                    begin(e, {
                      type: "height-character",
                      id: character.id,
                      start: character.height,
                      from: at(e),
                    })
                  }
                  className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-sm border border-sky-900 bg-sky-300"
                />
              )}
            </div>
          );
        })}

        {drawn && (
          <div
            className="pointer-events-none absolute z-30 border-2 border-sky-300 bg-sky-300/15"
            style={place(drawn)}
          />
        )}
      </div>
    </div>
  );
};
