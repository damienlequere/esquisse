"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useJobs } from "../../components/jobs/Jobs.tsx";
import { Button, Dialog, Field, TextArea } from "../../components/ui.tsx";
import { api } from "../../lib/client/api.ts";
import type { StudioSummary } from "../../lib/types.ts";

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const MODELS = ["claude-opus-5-5", "claude-fable-5-2", "claude-sonnet-5-5", "claude-haiku-5-5"];

// The games on disk, each to open; a new one, generated from a brief.
export default function Home() {
  const [games, setGames] = useState<StudioSummary[]>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState<"game" | "scene">();
  const { onDone, jobs } = useJobs();

  const reload = useCallback(
    () =>
      api<StudioSummary[]>("/api/games")
        .then(setGames)
        .catch((e: Error) => setError(e.message)),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  // A new game appears as soon as its plan is written; refreshed at each job's end.
  const ids = [...new Set(jobs.map((j) => j.game))].join(" ");
  useEffect(() => {
    const offs = ids.split(" ").map((id) => onDone(id, reload));
    return () => {
      for (const off of offs) off();
    };
  }, [ids, onDone, reload]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Esquisse Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">
            content/games, edited in place. Commit as usual when you are done.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreating("scene")}>New game from one scene</Button>
          <Button variant="primary" onClick={() => setCreating("game")}>
            Generate a game
          </Button>
        </div>
      </header>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
        {games?.map((g) => (
          <li key={g.id}>
            <Link
              href={`/games/${g.id}`}
              className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-zinc-600"
            >
              <div className="aspect-[4/3] overflow-hidden bg-zinc-800">
                {g.thumbnail && (
                  <img
                    src={g.thumbnail}
                    alt=""
                    className="size-full object-cover opacity-80 transition group-hover:opacity-100"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-zinc-100">{g.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {g.id} · {g.scenes.length} scene{g.scenes.length === 1 ? "" : "s"}
                  {g.planned.length > g.scenes.length &&
                    ` · ${g.planned.length - g.scenes.length} planned`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Dialog open={creating !== undefined} onClose={() => setCreating(undefined)} wide>
        {creating === "game" && (
          <NewGame taken={games?.map((g) => g.id) ?? []} onStarted={() => setCreating(undefined)} />
        )}
        {creating === "scene" && (
          <NewSceneGame
            taken={games?.map((g) => g.id) ?? []}
            onStarted={() => setCreating(undefined)}
          />
        )}
      </Dialog>
    </main>
  );
}

const NewGame = ({ taken, onStarted }: { taken: string[]; onStarted(): void }) => {
  const { start } = useJobs();
  const [id, setId] = useState("");
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState(MODELS[0] ?? "");
  const [error, setError] = useState<string>();
  const invalid = !ID.test(id) ? "kebab-case: a-z, 0-9, dashes" : taken.includes(id) ? "taken" : "";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await start({ command: "generate-game", game: id, brief, model });
          onStarted();
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <p className="text-sm text-zinc-400">
        Claude writes the plan (its world, its scenes, their exits), you validate it, then each
        scene is painted and validated in turn, as <code>pnpm generate-game</code> does. Then link
        its exits and paint its nights from the game&apos;s page.
      </p>
      <div className="grid grid-cols-[1fr_14rem] gap-3">
        <Field label="Game id" hint={id && invalid}>
          {(fid) => (
            <input
              id={fid}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="tristram6"
            />
          )}
        </Field>
        <Field label="Model">
          {(fid) => (
            <select id={fid} value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field
        label="Brief"
        hint="Say what matters to you: how many scenes, their ids and orientations, which one opens on its title, how they follow one another and through which thresholds."
      >
        {(fid) => <TextArea id={fid} value={brief} onChange={setBrief} rows={6} />}
      </Field>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div>
        <Button type="submit" variant="primary" disabled={invalid !== "" || brief.trim() === ""}>
          Write the plan
        </Button>
      </div>
    </form>
  );
};

const NewSceneGame = ({ taken, onStarted }: { taken: string[]; onStarted(): void }) => {
  const { start } = useJobs();
  const [id, setId] = useState("");
  const [scene, setScene] = useState("");
  const [orientation, setOrientation] = useState("portrait");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string>();
  const invalid =
    !ID.test(id) || !ID.test(scene)
      ? "kebab-case: a-z, 0-9, dashes"
      : taken.includes(id)
        ? "taken"
        : "";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await start({ command: "generate-scene", game: id, scene, orientation, brief });
          onStarted();
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <p className="text-sm text-zinc-400">
        A new game starting in its first scene, painted from its brief, as{" "}
        <code>pnpm generate-scene</code> does. Add more scenes from the game&apos;s page.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Game id">
          {(fid) => <input id={fid} value={id} onChange={(e) => setId(e.target.value)} />}
        </Field>
        <Field label="First scene id">
          {(fid) => <input id={fid} value={scene} onChange={(e) => setScene(e.target.value)} />}
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
      {(id || scene) && invalid && <p className="text-xs text-zinc-500">{invalid}</p>}
      <Field label="Brief">
        {(fid) => <TextArea id={fid} value={brief} onChange={setBrief} rows={5} />}
      </Field>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div>
        <Button type="submit" variant="primary" disabled={invalid !== "" || brief.trim() === ""}>
          Paint it
        </Button>
      </div>
    </form>
  );
};
