// The generator's commands, run by the studio as the terminal runs them: one
// child process each, in packages/generator, with ESQUISSE_STUDIO set (see
// packages/generator/src/studio.ts). What they print becomes events, their
// questions and their renders too; the answers go back on their stdin. A job
// lives as long as the studio's server, kept on globalThis so that a page
// reloaded by the dev server finds it again.

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type { JobEvent, JobRequest, JobStatus, JobSummary } from "../types.ts";
import { checkId, GENERATOR, HttpError } from "./content.ts";

const STUDIO = "@studio ";

// Distributes Omit over a union, to build an event without its seq.
type Draft<T> = T extends unknown ? Omit<T, "seq"> : never;

type Job = JobSummary & {
  events: JobEvent[];
  renders: string[];
  child: ChildProcessWithoutNullStreams;
  listeners: Set<(event: JobEvent) => void>;
  cancel(): void;
};

const store = globalThis as typeof globalThis & { __studioJobs?: Map<string, Job> };
store.__studioJobs ??= new Map();
const jobs = store.__studioJobs;

const summary = ({
  id,
  command,
  args,
  game,
  scene,
  status,
  waiting,
  started,
}: Job): JobSummary => ({ id, command, args, game, scene, status, waiting, started });

export const listJobs = () => [...jobs.values()].map(summary).sort((a, b) => b.started - a.started);

export const getJob = (id: string) => {
  const job = jobs.get(id);
  if (job === undefined) throw new HttpError(404, "No such job");
  return job;
};

const emit = (job: Job, draft: Draft<JobEvent>) => {
  const event = { ...draft, seq: job.events.length } as JobEvent;
  job.events.push(event);
  if (event.type === "choose" || event.type === "ask") job.waiting = true;
  if (event.type === "answer" || event.type === "end") job.waiting = false;
  for (const listener of job.listeners) listener(event);
};

// One line printed by the command: an event for the studio, or a line of log.
const line = (job: Job, text: string, error: boolean) => {
  if (text.startsWith(STUDIO)) {
    try {
      const event = JSON.parse(text.slice(STUDIO.length)) as Record<string, unknown>;
      if (event.type === "render" && typeof event.file === "string") {
        job.renders.push(event.file);
        emit(job, { type: "render", url: `/api/jobs/${job.id}/render/${job.renders.length - 1}` });
        return;
      }
      if (event.type === "choose" && typeof event.question === "string")
        return emit(job, {
          type: "choose",
          question: event.question,
          choices: (event.choices ?? {}) as Record<string, string>,
        });
      if (event.type === "ask" && typeof event.question === "string")
        return emit(job, { type: "ask", question: event.question });
    } catch {
      // Not ours after all: a line of log.
    }
  }
  if (text.trim() === "" && !error) return;
  emit(job, { type: "log", text, ...(error ? { error } : {}) });
};

// Splits a stream into lines, the last one kept until it ends.
const lines = (onLine: (text: string) => void) => {
  let rest = "";
  return {
    write: (chunk: Buffer) => {
      const parts = (rest + chunk.toString("utf8")).split("\n");
      rest = parts.pop() ?? "";
      for (const part of parts) onLine(part);
    },
    end: () => {
      if (rest !== "") onLine(rest);
      rest = "";
    },
  };
};

// What each command takes, checked here: the ids must not reach outside their
// folders, and the rest is passed as one argument each, never through a shell.
const ORIENTATIONS = new Set(["portrait", "landscape"]);
const MODEL = /^claude-[a-z0-9.-]+$/;

const argsOf = (r: JobRequest): { args: string[]; scene?: string } => {
  const game = checkId(r.game);
  const brief = (r.brief ?? "").trim();
  const art = (r.artDirection ?? "").trim();
  const artArgs = art === "" ? [] : ["--art", art];
  const needBrief = () => {
    if (brief === "") throw new HttpError(400, "The brief is missing");
    return brief;
  };
  switch (r.command) {
    case "generate-game": {
      const model = r.model?.trim();
      if (model && !MODEL.test(model)) throw new HttpError(400, `Unknown model: ${model}`);
      return {
        args: [game, needBrief(), ...(model ? ["--model", model] : []), ...artArgs],
      };
    }
    case "generate-scene": {
      const scene = checkId(r.scene ?? "");
      if (!ORIENTATIONS.has(r.orientation ?? ""))
        throw new HttpError(400, "The orientation is portrait or landscape");
      return { args: [game, scene, r.orientation as string, needBrief(), ...artArgs], scene };
    }
    case "link-game":
      return { args: [game] };
    case "generate-night": {
      const scenes = (r.scenes ?? []).map(checkId);
      return { args: [game, ...scenes], ...(scenes.length === 1 ? { scene: scenes[0] } : {}) };
    }
    case "remove-scene": {
      const scene = checkId(r.scene ?? "");
      return { args: [game, scene, "--yes"], scene };
    }
    case "remove-game":
      return { args: [game, "--yes"] };
    default:
      throw new HttpError(400, `Unknown command: ${String(r.command)}`);
  }
};

export const startJob = (request: JobRequest) => {
  const { args, scene } = argsOf(request);
  const { command, game } = request;
  for (const other of jobs.values())
    if (other.game === game && other.status === "running")
      throw new HttpError(409, `« ${other.command} » is already running on ${game}`);
  const script = `src/${command}.ts`;
  if (!existsSync(`${GENERATOR}/${script}`)) throw new HttpError(500, `No ${script}`);

  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, ...args],
    { cwd: GENERATOR, env: { ...process.env, ESQUISSE_STUDIO: "1", FORCE_COLOR: "0" } },
  );
  let cancelled = false;
  const job: Job = {
    id: randomUUID(),
    command,
    args,
    game,
    scene,
    status: "running",
    waiting: false,
    started: Date.now(),
    events: [],
    renders: [],
    child,
    listeners: new Set(),
    cancel: () => {
      cancelled = true;
      child.kill("SIGTERM");
    },
  };
  jobs.set(job.id, job);

  const out = lines((text) => line(job, text, false));
  const err = lines((text) => line(job, text, true));
  child.stdout.on("data", out.write);
  child.stderr.on("data", err.write);
  child.on("error", (error) => emit(job, { type: "log", text: error.message, error: true }));
  child.on("close", (code) => {
    out.end();
    err.end();
    const status: JobStatus = cancelled ? "cancelled" : code === 0 ? "done" : "failed";
    job.status = status;
    emit(job, { type: "end", status, code });
  });
  return summary(job);
};

export const answerJob = (id: string, text: string) => {
  const job = getJob(id);
  if (job.status !== "running" || !job.waiting) throw new HttpError(409, "It asks nothing now");
  // One line, as typed in the terminal.
  const answer = text.replace(/\s*\n\s*/g, " ").trim();
  emit(job, { type: "answer", text: answer });
  job.child.stdin.write(`${answer}\n`);
};

export const cancelJob = (id: string) => {
  const job = getJob(id);
  if (job.status === "running") job.cancel();
};

// Forgets the jobs that are over.
export const clearJobs = () => {
  for (const [id, job] of jobs) if (job.status !== "running") jobs.delete(id);
};

export const subscribe = (id: string, listener: (event: JobEvent) => void) => {
  const job = getJob(id);
  job.listeners.add(listener);
  return () => job.listeners.delete(listener);
};
