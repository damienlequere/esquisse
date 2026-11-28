"use client";

// A game: its title and first scene, its scenes as cards, where they are linked, the
// check of what is being edited, and the game played in its own window. Its scenes are
// painted, linked and lit by night from here, by the generator's commands.

import type { Game } from "@esquisse/engine";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { send } from "../../lib/client/api.ts";
import { useGame } from "../../lib/client/useGame.ts";
import type { StudioGame } from "../../lib/types.ts";
import { useJobs } from "../jobs/Jobs.tsx";
import { draftGame, usePlayWindow } from "../Preview.tsx";
import { Button, cx, Dialog, Field, PAGE, TextArea } from "../ui.tsx";
import { CheckReport, useCheck } from "./CheckReport.tsx";
import { GameGeneration } from "./Generation.tsx";
import { SceneCards } from "./SceneCards.tsx";

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const GameWorkspace = ({ id }: { id: string }) => {
  const [draft, setDraft] = useState<Game>();
  const [savedJson, setSavedJson] = useState("");
  const dirty = draft !== undefined && JSON.stringify(draft) !== savedJson;
  const { game: studio, setGame, error, reload, stale } = useGame(id, dirty);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [playing, setPlaying] = useState<string>();
  // The selected scene: its card grows, with a button to edit it.
  const [selected, setSelected] = useState<string>();
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
  const playingScene = playing !== undefined ? studio?.scenes[playing] : undefined;
  const startScene = draft !== undefined ? studio?.scenes[draft.start] : undefined;
  const player = usePlayWindow({
    studio,
    game: preview,
    scene: playing,
    landscape: (playingScene ?? startScene)?.data.scene.imageRatio === "16:9",
  });
  // Its window closed, the scene played alone is forgotten.
  useEffect(() => {
    if (!player.playing) setPlaying(undefined);
  }, [player.playing]);
  // Plays one scene alone, or the game, in its window, opened from the click.
  const play = (scene: string | undefined) => {
    setPlaying(scene);
    player.play();
  };

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
      if (e.key === "Escape" && selected !== undefined && dialog === undefined) {
        setSelected(undefined);
        return;
      }
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

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <header className={cx(PAGE, "flex items-center gap-3 px-6 py-2")}>
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
        <div className={cx(PAGE, "flex items-center gap-2 px-6 pb-2")}>
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
            onClick={() =>
              player.playing && playing === undefined ? player.restart() : play(undefined)
            }
            disabled={painted.length === 0}
            title="Plays the game from its start in its own window, as it is edited"
          >
            {player.playing && playing === undefined ? "↺ Play again" : "▶ Play the game"}
          </Button>
          <Button
            variant="danger"
            onClick={() => setDialog("remove")}
            disabled={running !== undefined}
          >
            Remove game
          </Button>
        </div>
      </div>
      <main className={cx(PAGE, "flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="flex flex-col gap-2">
            <Heading>Scenes</Heading>
            <SceneCards
              studio={studio}
              game={draft}
              onChange={setDraft}
              onPlay={play}
              onPaint={paintPlanned}
              playing={playing}
              selected={selected}
              onSelect={setSelected}
            />
          </section>
        </div>
        {/* On the right, kept in view below the bars: the check, then the game's prompts. */}
        <aside className="flex shrink-0 flex-col gap-6 lg:sticky lg:top-[6.75rem] lg:max-h-[calc(100dvh-8.25rem)] lg:w-[26rem] lg:overflow-y-auto lg:border-l lg:border-zinc-800 lg:pl-6">
          <section className="flex flex-col gap-2">
            <Heading>Check{dirty ? " (unsaved)" : ""}</Heading>
            <CheckReport report={report} />
          </section>
          <section className="flex flex-col gap-2">
            <Heading>Prompts</Heading>
            <GameGeneration game={studio.game} />
          </section>
        </aside>
      </main>
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
        <p className="text-sm font-medium text-zinc-100">Are you sure?</p>
        <p className="mt-2 text-sm text-zinc-400">
          <b className="text-zinc-200">{studio.game.title}</b> will be removed entirely: its
          game.json, its items, and its {painted.length} scene(s) with their images and originals.
          Only git can bring it back.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button autoFocus onClick={() => setDialog(undefined)}>
            Cancel
          </Button>
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
            Yes, remove it
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

const Heading = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{children}</h2>
);

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
