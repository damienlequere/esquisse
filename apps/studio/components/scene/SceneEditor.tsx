"use client";

// A scene, edited: its image with its objects and characters on it, what is
// selected in fields, and the scene played beside it as it is being edited.
// Saved, it is its scene.json, objects.json and characters.json, and the lists
// of both apps. Its background and its night are painted again from here.

import type { Box, Character, SceneData, SceneObject } from "@esquisse/engine";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, send } from "../../lib/client/api.ts";
import { useGame } from "../../lib/client/useGame.ts";
import type { StudioGame } from "../../lib/types.ts";
import { CheckReport, useCheck } from "../game/CheckReport.tsx";
import { PlannedScene } from "../game/Generation.tsx";
import { useJobs } from "../jobs/Jobs.tsx";
import { draftGame, usePlayWindow } from "../Preview.tsx";
import { Button, cx, Dialog, Field, PAGE, Section, TextArea } from "../ui.tsx";
import { Canvas, type Guides, isExit, type Selection, type Tool, translateBox } from "./Canvas.tsx";
import { useHistory } from "./history.ts";
import { CharacterForm, ObjectForm, SceneForm } from "./Inspector.tsx";

const EMPTY: SceneData = {
  scene: {
    title: "",
    intro: "",
    imageRatio: "9:16",
    safe: { x0: 0, y0: 0, x1: 1, y1: 1 },
    style: "",
    light: "",
    background: { prompt: "" },
    objects: [],
    characters: [],
  },
  objects: {},
  aspects: {},
};

// A free id: base, then base-2, base-3…
const freeId = (base: string, taken: string[]) => {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) if (!taken.includes(`${base}-${n}`)) return `${base}-${n}`;
};

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return (
    t !== null &&
    (t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable)
  );
};

export const SceneEditor = ({ gameId, sceneId }: { gameId: string; sceneId: string }) => {
  const history = useHistory<SceneData>(EMPTY);
  const doc = history.value;
  const [base, setBase] = useState<string>();
  const dirty = base !== undefined && JSON.stringify(doc) !== base;
  const { game: studio, setGame, error, reload, stale } = useGame(gameId, dirty);
  const [selection, setSelection] = useState<Selection>();
  const [tool, setTool] = useState<Tool>("select");
  const [guides, setGuides] = useState<Guides>({
    safe: true,
    phone: false,
    tablet: false,
    night: false,
  });
  const [tab, setTab] = useState<"selection" | "scene" | "check">("scene");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [dialog, setDialog] = useState<"repaint" | "remove">();
  const jobs = useJobs();
  const running = jobs.running(gameId);
  const router = useRouter();

  const studioScene = studio?.scenes[sceneId];

  // The scene as on disk: taken as it is unless it is being edited.
  useEffect(() => {
    if (studioScene === undefined) return;
    const json = JSON.stringify(studioScene.data);
    if (!dirty || base === undefined) history.reset(JSON.parse(json));
    setBase(json);
  }, [studioScene]);

  const change = useCallback(
    (next: SceneData, key?: string) => history.set(next, key),
    [history.set],
  );

  const select = (next: Selection) => {
    setSelection(next);
    if (next !== undefined) setTab("selection");
  };

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(undefined);
    try {
      const next = await send<StudioGame>(`/api/games/${gameId}/scenes/${sceneId}`, "PUT", doc);
      // Taken back as written: what it now is on disk.
      setBase(undefined);
      setGame(next);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [doc, gameId, sceneId, setGame]);

  const objectIds = doc.scene.objects.map((o) => o.id);
  const characterIds = doc.scene.characters.map((c) => c.id);

  const createObject = (box: Box) => {
    const id = freeId("objet", objectIds);
    const object: SceneObject = { id, zone: box, paint: "", detect: "", label: "Objet", text: "" };
    change({
      ...doc,
      scene: { ...doc.scene, objects: [...doc.scene.objects, object] },
      objects: { ...doc.objects, [id]: box },
    });
    select({ kind: "object", id });
    setTool("select");
  };

  const createCharacter = (anchor: { x: number; y: number }) => {
    const id = freeId("personnage", characterIds);
    const character: Character = {
      id,
      name: "Personnage",
      anchor,
      height: 0.3,
      paint: "",
      dialogue: { greeting: "", topics: [], farewell: "" },
    };
    change({ ...doc, scene: { ...doc.scene, characters: [...doc.scene.characters, character] } });
    select({ kind: "character", id });
    setTool("select");
  };

  const remove = (target: Selection) => {
    if (target === undefined) return;
    if (target.kind === "object") {
      const { [target.id]: _, ...objects } = doc.objects;
      change({
        ...doc,
        scene: { ...doc.scene, objects: doc.scene.objects.filter((o) => o.id !== target.id) },
        objects,
      });
    } else {
      const { [target.id]: _, ...aspects } = doc.aspects;
      change({
        ...doc,
        scene: { ...doc.scene, characters: doc.scene.characters.filter((c) => c.id !== target.id) },
        aspects,
      });
    }
    setSelection(undefined);
  };

  const duplicate = (target: Selection) => {
    if (target?.kind !== "object") return;
    const object = doc.scene.objects.find((o) => o.id === target.id);
    const box = doc.objects[target.id];
    if (object === undefined) return;
    const id = freeId(object.id, objectIds);
    const moved = box && translateBox(box, 0.02, 0.02);
    change({
      ...doc,
      scene: { ...doc.scene, objects: [...doc.scene.objects, { ...structuredClone(object), id }] },
      objects: moved ? { ...doc.objects, [id]: moved } : doc.objects,
    });
    select({ kind: "object", id });
  };

  const nudge = (dx: number, dy: number) => {
    if (selection?.kind === "object") {
      const b = doc.objects[selection.id];
      if (b === undefined) return;
      change(
        { ...doc, objects: { ...doc.objects, [selection.id]: translateBox(b, dx, dy) } },
        `nudge:${selection.id}`,
      );
    } else if (selection?.kind === "character") {
      change(
        {
          ...doc,
          scene: {
            ...doc.scene,
            characters: doc.scene.characters.map((c) =>
              c.id === selection.id
                ? {
                    ...c,
                    anchor: {
                      x: Math.round((c.anchor.x + dx) * 1000) / 1000,
                      y: Math.round((c.anchor.y + dy) * 1000) / 1000,
                    },
                  }
                : c,
            ),
          },
        },
        `nudge:${selection.id}`,
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) save();
        return;
      }
      if (typing(e)) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key === "y") {
        e.preventDefault();
        history.redo();
      } else if (mod && e.key === "d") {
        e.preventDefault();
        duplicate(selection);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(selection);
      } else if (e.key === "Escape") {
        setSelection(undefined);
        setTool("select");
      } else if (e.key.startsWith("Arrow") && selection) {
        e.preventDefault();
        const step = e.shiftKey ? 0.01 : 0.002;
        nudge(
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0,
        );
      } else if (!mod && e.key === "v") setTool("select");
      else if (!mod && e.key === "o") setTool("object");
      else if (!mod && e.key === "c") setTool("character");
      else if (!mod && e.key === "n") setGuides((g) => ({ ...g, night: !g.night }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Leaving with changes not saved asks first.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const sceneTexts = useMemo(
    () =>
      studio
        ? {
            ...Object.fromEntries(
              Object.entries(studio.scenes).map(([id, s]) => [id, s.data.scene]),
            ),
            [sceneId]: doc.scene,
          }
        : undefined,
    [studio, sceneId, doc.scene],
  );
  const report = useCheck(studio, studio?.game, sceneTexts);
  const flags = useMemo(
    () =>
      [
        ...new Set(
          Object.values(sceneTexts ?? {}).flatMap((s) =>
            s.objects.flatMap((o) =>
              (o.actions ?? []).flatMap((a) =>
                [a.sets, a.requires].filter((f): f is string => !!f),
              ),
            ),
          ),
        ),
      ].sort(),
    [sceneTexts],
  );
  const preview = useMemo(
    () =>
      studio
        ? draftGame(studio, { scenes: { ...draftGame(studio).scenes, [sceneId]: doc } })
        : undefined,
    [studio, sceneId, doc],
  );
  // The scene played alone in its own window, as it is edited.
  const player = usePlayWindow({
    studio,
    game: preview,
    scene: sceneId,
    landscape: doc.scene.imageRatio === "16:9",
  });

  if (error) return <p className="p-6 text-sm text-red-300">{error}</p>;
  if (studio === undefined || preview === undefined)
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  if (studioScene === undefined)
    return (
      <p className="p-6 text-sm text-zinc-400">
        No scene « {sceneId} » in {gameId}.{" "}
        <Link className="underline" href={`/games/${gameId}`}>
          Back to the game
        </Link>
      </p>
    );

  const selectedObject =
    selection?.kind === "object" ? doc.scene.objects.find((o) => o.id === selection.id) : undefined;
  const selectedCharacter =
    selection?.kind === "character"
      ? doc.scene.characters.find((c) => c.id === selection.id)
      : undefined;
  const landscape = doc.scene.imageRatio === "16:9";
  // What the game's plan says of this scene, if generate-game made it.
  const plan = studio.game.generation?.scenes.find((s) => s.id === sceneId);

  const upload = async (id: string, file: File) => {
    setMessage(undefined);
    try {
      const next = await api<StudioGame>(`/api/games/${gameId}/scenes/${sceneId}/layers/${id}`, {
        method: "PUT",
        body: file,
      });
      const aspect = next.scenes[sceneId]?.data.aspects[id];
      if (aspect !== undefined) change({ ...doc, aspects: { ...doc.aspects, [id]: aspect } });
      setGame(next);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const start = async (request: Parameters<typeof jobs.start>[0]) => {
    setMessage(undefined);
    try {
      await jobs.start(request);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const toolButton = (t: Tool, label: string, key: string) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      title={`${label} (${key})`}
      className={cx(
        "rounded px-2 py-1 text-xs",
        tool === t ? "bg-zinc-200 text-zinc-900" : "text-zinc-300 hover:bg-zinc-800",
      )}
    >
      {label}
    </button>
  );
  const guide = (g: keyof Guides, label: string, disabled?: boolean) => (
    <label
      className={cx("flex items-center gap-1 text-xs text-zinc-400", disabled && "opacity-40")}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={guides[g]}
        onChange={(e) => setGuides({ ...guides, [g]: e.target.checked })}
      />
      {label}
    </label>
  );

  return (
    <div className={cx(PAGE, "flex h-dvh flex-col border-x border-zinc-800")}>
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-200">
          Studio
        </Link>
        <span className="text-zinc-700">/</span>
        <Link href={`/games/${gameId}`} className="text-sm text-zinc-400 hover:text-zinc-100">
          {studio.game.title}
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="truncate text-sm font-semibold text-zinc-100">
          {doc.scene.title || sceneId}
        </span>
        <span className="text-xs text-zinc-600">{sceneId}</span>
        {studioScene.missing.length > 0 && (
          <span
            className="rounded bg-red-950 px-1.5 py-0.5 text-[11px] text-red-200"
            title={studioScene.missing.join(", ")}
          >
            not listed by the apps: {studioScene.missing.join(", ")}
          </span>
        )}
        <span className="flex-1" />
        {stale && (
          <Button variant="ghost" onClick={reload} className="text-xs text-sky-300">
            Changed on disk: reload, losing edits
          </Button>
        )}
        {message && (
          <span className="max-w-96 truncate text-xs text-red-300" title={message}>
            {message}
          </span>
        )}
        <Button
          variant="ghost"
          disabled={!history.canUndo}
          onClick={history.undo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </Button>
        <Button
          variant="ghost"
          disabled={!history.canRedo}
          onClick={history.redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty}
          onClick={() => base && history.reset(JSON.parse(base))}
        >
          Revert
        </Button>
        <Button variant="primary" disabled={!dirty || saving} onClick={save} title="Ctrl+S">
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </Button>
      </header>
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-1.5">
        <div className="flex gap-0.5">
          {toolButton("select", "Select", "V")}
          {toolButton("object", "+ Object", "O")}
          {toolButton("character", "+ Character", "C")}
        </div>
        <span className="h-4 w-px bg-zinc-800" />
        {guide("safe", "Safe zone")}
        {guide("phone", "Phone crop")}
        {guide("tablet", "Tablet crop")}
        {guide("night", "Night (N)", studioScene.images.night === undefined)}
        <span className="flex-1" />
        <Button onClick={() => setDialog("repaint")} disabled={running !== undefined}>
          Repaint…
        </Button>
        <Button
          onClick={() => start({ command: "generate-night", game: gameId, scenes: [sceneId] })}
          disabled={running !== undefined || dirty}
          title={
            dirty ? "Save first: it rewrites scene.json" : "Paints its night from its background"
          }
        >
          {doc.scene.night ? "Repaint night" : "Paint night"}
        </Button>
        <Button
          onClick={player.playing ? player.restart : player.play}
          title="Plays the scene alone in its own window, as it is edited, saved or not"
        >
          {player.playing ? "↺ Play again" : "▶ Play scene"}
        </Button>
        <Button
          variant="danger"
          onClick={() => setDialog("remove")}
          disabled={running !== undefined}
        >
          Remove
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <Outline
          doc={doc}
          selection={selection}
          onSelect={select}
          missingLayers={(id) => studioScene.images.characters[id] === undefined}
        />
        <Canvas
          doc={doc}
          images={studioScene.images}
          selection={selection}
          tool={tool}
          guides={guides}
          onSelect={select}
          onChange={change}
          onCreateObject={createObject}
          onCreateCharacter={createCharacter}
        />
        <aside className="flex w-[24rem] shrink-0 flex-col border-l border-zinc-800">
          <nav className="flex border-b border-zinc-800 px-2">
            {(
              [
                ["selection", "Selection"],
                ["scene", "Scene"],
                ["check", `Check${report.errors.length ? ` (${report.errors.length} ✗)` : ""}`],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cx(
                  "border-b-2 px-3 py-2 text-xs font-medium",
                  tab === t
                    ? "border-zinc-200 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "selection" &&
              (selectedObject ? (
                <ObjectForm
                  key={selectedObject.id}
                  doc={doc}
                  object={selectedObject}
                  items={studio.items}
                  flags={flags}
                  links={studio.game.links[sceneId] ?? {}}
                  onChange={change}
                  onSelect={(id) => setSelection({ kind: "object", id })}
                />
              ) : selectedCharacter ? (
                <CharacterForm
                  key={selectedCharacter.id}
                  doc={doc}
                  character={selectedCharacter}
                  hasLayer={studioScene.images.characters[selectedCharacter.id] !== undefined}
                  onChange={change}
                  onSelect={(id) => setSelection({ kind: "character", id })}
                  onUpload={(file) => upload(selectedCharacter.id, file)}
                />
              ) : (
                <p className="p-4 text-sm text-zinc-500">
                  Select an object or a character, on the image or in the list. Draw a new object
                  with <b>+ Object</b> (O); place a character with <b>+ Character</b> (C).
                </p>
              ))}
            {tab === "scene" && (
              <>
                <SceneForm doc={doc} onChange={change} />
                {plan && (
                  <Section title="In the game's plan (game.json)">
                    <p className="mb-3 text-xs text-zinc-500">
                      As Generate a game wrote it, once: read-only.
                    </p>
                    <PlannedScene plan={plan} world={studio.game.generation?.world} />
                  </Section>
                )}
              </>
            )}
            {tab === "check" && (
              <Section title={`The game${dirty ? ", with this scene unsaved" : ""}`}>
                <CheckReport report={report} />
              </Section>
            )}
          </div>
          {selection && tab === "selection" && (
            <div className="flex gap-2 border-t border-zinc-800 px-4 py-2">
              {selection.kind === "object" && (
                <Button variant="ghost" className="text-xs" onClick={() => duplicate(selection)}>
                  Duplicate (Ctrl+D)
                </Button>
              )}
              <span className="flex-1" />
              <Button variant="danger" className="text-xs" onClick={() => remove(selection)}>
                Delete
              </Button>
            </div>
          )}
        </aside>
      </div>

      <Dialog open={dialog === "repaint"} onClose={() => setDialog(undefined)} wide>
        <Repaint
          brief={doc.scene.brief ?? ""}
          landscape={landscape}
          onSubmit={(orientation, brief) => {
            setDialog(undefined);
            start({ command: "generate-scene", game: gameId, scene: sceneId, orientation, brief });
          }}
        />
      </Dialog>
      <Dialog open={dialog === "remove"} onClose={() => setDialog(undefined)}>
        <p className="text-sm font-medium text-zinc-100">Are you sure?</p>
        <p className="mt-2 text-sm text-zinc-400">
          <b className="text-zinc-200">{doc.scene.title || sceneId}</b> will be removed: its texts,
          its images and their originals. Only git can bring it back.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button autoFocus onClick={() => setDialog(undefined)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              setDialog(undefined);
              await start({ command: "remove-scene", game: gameId, scene: sceneId });
              const off = jobs.onDone(gameId, () => {
                off();
                router.push(`/games/${gameId}`);
              });
            }}
          >
            Yes, remove it
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

// The scene's objects and characters, listed; those without a box, or without
// a layer, said so.
const Outline = ({
  doc,
  selection,
  onSelect,
  missingLayers,
}: {
  doc: SceneData;
  selection: Selection;
  onSelect(s: Selection): void;
  missingLayers(id: string): boolean;
}) => {
  const row = (
    kind: "object" | "character",
    id: string,
    label: string,
    note: string | undefined,
    color: string,
  ) => {
    const on = selection?.kind === kind && selection.id === id;
    return (
      <li key={`${kind}:${id}`}>
        <button
          type="button"
          onClick={() => onSelect({ kind, id })}
          className={cx(
            "flex w-full items-center gap-2 px-3 py-1 text-left text-xs",
            on ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-900",
          )}
        >
          <span className={cx("size-2 shrink-0 rounded-sm", color)} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {note && <span className="shrink-0 text-[10px] text-red-300">{note}</span>}
        </button>
      </li>
    );
  };
  return (
    <aside className="w-52 shrink-0 overflow-y-auto border-r border-zinc-800 py-2">
      <h3 className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        Objects ({doc.scene.objects.length})
      </h3>
      <ul className="mb-3">
        {doc.scene.objects.map((o) =>
          row(
            "object",
            o.id,
            o.id,
            doc.objects[o.id] ? undefined : "no box",
            isExit(o) ? "bg-emerald-400" : "bg-zinc-300",
          ),
        )}
      </ul>
      <h3 className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        Characters ({doc.scene.characters.length})
      </h3>
      <ul className="mb-3">
        {doc.scene.characters.map((c) =>
          row(
            "character",
            c.id,
            c.name || c.id,
            missingLayers(c.id) ? "no layer" : undefined,
            "bg-violet-400",
          ),
        )}
      </ul>
      <p className="px-3 text-[11px] leading-snug text-zinc-600">
        <span className="text-emerald-400">■</span> exit · <span className="text-zinc-300">■</span>{" "}
        object · <span className="text-violet-400">■</span> character
        <br />
        Arrows nudge (Shift: more), Delete removes, Ctrl+Z undoes.
      </p>
    </aside>
  );
};

const Repaint = ({
  brief: initial,
  landscape,
  onSubmit,
}: {
  brief: string;
  landscape: boolean;
  onSubmit(orientation: string, brief: string): void;
}) => {
  const [brief, setBrief] = useState(initial);
  const [orientation, setOrientation] = useState(landscape ? "landscape" : "portrait");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(orientation, brief);
      }}
    >
      <p className="text-sm text-zinc-300">
        The scene is started over from its brief, as <code>pnpm generate-scene</code> does: once you
        confirm in the console, its objects, characters and night are lost. Link its exits and paint
        its night again from the game&apos;s page after.
      </p>
      <Field label="Orientation">
        {(id) => (
          <select
            id={id}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="w-48"
          >
            <option value="portrait">portrait 9:16</option>
            <option value="landscape">landscape 16:9</option>
          </select>
        )}
      </Field>
      <Field label="Brief">
        {(id) => <TextArea id={id} value={brief} onChange={setBrief} rows={5} />}
      </Field>
      <div>
        <Button type="submit" variant="primary" disabled={brief.trim() === ""}>
          Repaint
        </Button>
      </div>
    </form>
  );
};
