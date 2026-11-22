"use client";

// A game: its title and first scene, its map where its scenes are linked, the
// check of what is being edited, and the game played beside it. Its scenes are
// painted, linked and lit by night from here, by the generator's commands.

import type { Game } from "@esquisse/engine";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { send } from "../../lib/client/api.ts";
import { useGame } from "../../lib/client/useGame.ts";
import type { StudioGame } from "../../lib/types.ts";
import { useJobs } from "../jobs/Jobs.tsx";
import { draftGame, Preview } from "../Preview.tsx";
import { Button, cx, Dialog, Field, Section, TextArea } from "../ui.tsx";
import { CheckReport, useCheck } from "./CheckReport.tsx";
import { GameMap } from "./GameMap.tsx";
import { GameGeneration } from "./Generation.tsx";

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const GameWorkspace = ({ id }: { id: string }) => {
  const [draft, setDraft] = useState<Game>();
  const [savedJson, setSavedJson] = useState("");
  const dirty = draft !== undefined && JSON.stringify(draft) !== savedJson;
  const { game: studio, setGame, error, reload, stale } = useGame(id, dirty);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [playing, setPlaying] = useState<string>();
  // The panel on the left, with what the game was generated from.
  const [prompts, setPrompts] = useState(true);
  const [dialog, setDialog] = useState<"scene" | "remove">();
  const jobs = useJobs();
  const running = jobs.running(id);
  const router = useRouter();

  // The draft follows the disk, unless it holds changes.
  useEffect(() => {
    if (studio === undefined) return;
    const json = JSON.stringify(studio.game);
    setSavedJson(json);
    setDraft(JSON.parse(json));
  }, [studio]);

  const report = useCheck(studio, draft);
  const preview = useMemo(
    () => (studio && draft ? draftGame(studio, { game: draft }) : undefined),
    [studio, draft],
  );

  const save = async () => {
    if (draft === undefined) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      setGame(await send<StudioGame>(`/api/games/${id}`, "PUT", draft));
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (error) return <p className="p-6 text-sm text-red-300">{error}</p>;
  if (studio === undefined || draft === undefined || preview === undefined)
    return <p className="p-6 text-sm text-zinc-500">Loading…</p>;

  const painted = Object.keys(studio.scenes);
  const canLink =
    studio.game.generation?.world !== undefined &&
    studio.game.generation.scenes.some((s) => s.exits !== undefined);
  const start = async (request: Parameters<typeof jobs.start>[0]) => {
    try {
      await jobs.start(request);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };
  const paintPlanned = (scene: string) => {
    const plan = studio.game.generation?.scenes.find((s) => s.id === scene);
    if (plan === undefined) return;
    start({
      command: "generate-scene",
      game: id,
      scene,
      orientation: plan.orientation,
      brief: plan.brief,
    });
  };
  const playingScene = playing !== undefined ? studio.scenes[playing] : undefined;
  const landscape = (playingScene ?? studio.scenes[draft.start])?.data.scene.imageRatio === "16:9";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-200">
          Studio
        </Link>
        <span className="text-zinc-700">/</span>
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="w-64 border-transparent bg-transparent text-base font-semibold hover:border-zinc-700"
          aria-label="Title"
        />
        <span className="text-xs text-zinc-600">{id}</span>
        <label className="ml-2 flex items-center gap-1.5 text-xs text-zinc-400">
          Starts in
          <select
            value={draft.start}
            onChange={(e) => setDraft({ ...draft, start: e.target.value })}
          >
            {!painted.includes(draft.start) && (
              <option value={draft.start}>{draft.start} (missing)</option>
            )}
            {painted.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <span className="flex-1" />
        {stale && (
          <Button variant="ghost" onClick={reload} className="text-xs text-sky-300">
            Changed on disk: reload, losing edits
          </Button>
        )}
        {saveError && <span className="max-w-80 truncate text-xs text-red-300">{saveError}</span>}
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(JSON.parse(savedJson))}>
          Revert
        </Button>
        <Button variant="primary" disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </Button>
      </header>
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-1.5">
        <Button
          variant="ghost"
          onClick={() => setPrompts(!prompts)}
          className={cx("text-xs", prompts && "bg-zinc-800 text-zinc-100")}
          title="What the game was generated from (game.json)"
        >
          Prompts
        </Button>
        <span className="h-4 w-px bg-zinc-800" />
        <Button onClick={() => setDialog("scene")} disabled={running !== undefined}>
          + New scene
        </Button>
        <Button
          onClick={() => start({ command: "link-game", game: id })}
          disabled={running !== undefined || !canLink || dirty}
          title={
            canLink
              ? "Finds each planned exit in its scene, makes it an object, and writes the links"
              : "Only a game made by Generate a game has a plan with exits"
          }
        >
          Link exits from the plan
        </Button>
        <Button
          onClick={() => start({ command: "generate-night", game: id })}
          disabled={running !== undefined || painted.length === 0}
          title="Paints the night of every scene without one"
        >
          Paint missing nights
        </Button>
        <span className="flex-1" />
        <Button
          variant="danger"
          onClick={() => setDialog("remove")}
          disabled={running !== undefined}
        >
          Remove game
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        {prompts && (
          <aside className="w-[26rem] shrink-0 overflow-y-auto border-r border-zinc-800 px-4 py-3">
            <GameGeneration game={studio.game} />
          </aside>
        )}
        <GameMap
          studio={studio}
          game={draft}
          onChange={setDraft}
          onPlay={setPlaying}
          onPaint={paintPlanned}
          playing={playing}
        />
        <aside className="flex w-[26rem] shrink-0 flex-col border-l border-zinc-800">
          <Section
            title={`Check${dirty ? " (unsaved)" : ""}`}
            className="max-h-[40%] overflow-y-auto"
          >
            <CheckReport report={report} />
          </Section>
          <div className="flex items-center justify-between px-4 pt-2 text-xs text-zinc-500">
            <span>{playing ? `Playing « ${playing} » alone` : "Playing the game"}</span>
            {playing && (
              <button
                type="button"
                className="hover:text-zinc-200"
                onClick={() => setPlaying(undefined)}
              >
                Play the game
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <Preview studio={studio} game={preview} scene={playing} landscape={landscape} />
          </div>
        </aside>
      </div>
      <Dialog open={dialog === "scene"} onClose={() => setDialog(undefined)} wide>
        <NewScene
          taken={painted}
          onSubmit={(scene, orientation, brief) => {
            setDialog(undefined);
            start({ command: "generate-scene", game: id, scene, orientation, brief });
          }}
        />
      </Dialog>
      <Dialog open={dialog === "remove"} onClose={() => setDialog(undefined)}>
        <p className="text-sm">
          Remove <b>{studio.game.title}</b> entirely: its game.json, its items, and its{" "}
          {painted.length} scene(s) with their images and originals? Only git can bring it back.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              setDialog(undefined);
              await start({ command: "remove-game", game: id });
              const off = jobs.onDone(id, () => {
                off();
                router.push("/");
              });
            }}
          >
            Remove it
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

const NewScene = ({
  taken,
  onSubmit,
}: {
  taken: string[];
  onSubmit(id: string, orientation: string, brief: string): void;
}) => {
  const [id, setId] = useState("");
  const [orientation, setOrientation] = useState("portrait");
  const [brief, setBrief] = useState("");
  const invalid = !ID.test(id) ? "kebab-case: a-z, 0-9, dashes" : taken.includes(id) ? "taken" : "";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(id, orientation, brief);
      }}
    >
      <p className="text-sm text-zinc-400">
        Claude writes the background from the brief, Gemini paints it, and you validate it on its
        render, as <code>pnpm generate-scene</code> does. A game with a plan keeps its style.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Scene id" hint={id && invalid}>
          {(fid) => <input id={fid} value={id} onChange={(e) => setId(e.target.value)} />}
        </Field>
        <Field label="Orientation">
          {(fid) => (
            <select id={fid} value={orientation} onChange={(e) => setOrientation(e.target.value)}>
              <option value="portrait">portrait 9:16</option>
              <option value="landscape">landscape 16:9</option>
            </select>
          )}
        </Field>
      </div>
      <Field label="Brief">
        {(fid) => <TextArea id={fid} value={brief} onChange={setBrief} rows={5} />}
      </Field>
      <div>
        <Button type="submit" variant="primary" disabled={invalid !== "" || brief.trim() === ""}>
          Paint it
        </Button>
      </div>
    </form>
  );
};
