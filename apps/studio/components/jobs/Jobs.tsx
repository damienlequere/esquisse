"use client";

// The generator's commands run by the studio (see lib/server/jobs.ts), on
// every page: the dock in the bottom right corner lists them, a press opens
// one's console, where its questions are answered. A page asks to be told when
// a job on its game is over, to read the game again.

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, send } from "../../lib/client/api.ts";
import type { JobRequest, JobSummary } from "../../lib/types.ts";
import { cx } from "../ui.tsx";
import { JobConsole } from "./JobConsole.tsx";

type JobsContext = {
  jobs: JobSummary[];
  // Starts a command and opens its console; throws what the server refused.
  start(request: JobRequest): Promise<JobSummary>;
  open(id: string | undefined): void;
  // Called when a job on that game is over.
  onDone(game: string, listener: (job: JobSummary) => void): () => void;
  running(game: string): JobSummary | undefined;
};

const Context = createContext<JobsContext | null>(null);

export const useJobs = () => {
  const context = useContext(Context);
  if (context === null) throw new Error("useJobs outside of Jobs");
  return context;
};

// What each command is, in words.
export const COMMANDS: Record<JobSummary["command"], string> = {
  "generate-game": "New game",
  "generate-scene": "Paint a scene",
  "link-game": "Link exits",
  "generate-night": "Paint nights",
  "remove-scene": "Remove scene",
  "remove-game": "Remove game",
};

export const jobLabel = (job: JobSummary) =>
  `${COMMANDS[job.command]} · ${job.game}${job.scene ? `/${job.scene}` : ""}`;

export const Jobs = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [openId, setOpenId] = useState<string>();
  const listeners = useRef(new Map<string, Set<(job: JobSummary) => void>>());
  const previous = useRef(new Map<string, JobSummary["status"]>());

  const refresh = useCallback(async () => {
    const list = await api<JobSummary[]>("/api/jobs").catch(() => undefined);
    if (list === undefined) return;
    for (const job of list) {
      const before = previous.current.get(job.id);
      if (before === "running" && job.status !== "running")
        for (const listener of listeners.current.get(job.game) ?? []) listener(job);
      previous.current.set(job.id, job.status);
    }
    setJobs(list);
  }, []);

  const anyRunning = jobs.some((j) => j.status === "running");
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, anyRunning ? 1500 : 5000);
    return () => clearInterval(timer);
  }, [refresh, anyRunning]);

  const value = useMemo<JobsContext>(
    () => ({
      jobs,
      start: async (request) => {
        const job = await send<JobSummary>("/api/jobs", "POST", request);
        previous.current.set(job.id, "running");
        setJobs((list) => [job, ...list]);
        setOpenId(job.id);
        return job;
      },
      open: setOpenId,
      onDone: (game, listener) => {
        const set = listeners.current.get(game) ?? new Set();
        set.add(listener);
        listeners.current.set(game, set);
        return () => set.delete(listener);
      },
      running: (game) => jobs.find((j) => j.game === game && j.status === "running"),
    }),
    [jobs],
  );

  const opened = jobs.find((j) => j.id === openId);
  const visible = jobs.filter((j) => j.status === "running" || j.id === openId).slice(0, 4);
  const over = jobs.filter((j) => j.status !== "running");

  return (
    <Context.Provider value={value}>
      {children}
      {opened && <JobConsole job={opened} onHide={() => setOpenId(undefined)} />}
      {(visible.length > 0 || over.length > 0) && (
        <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-1.5">
          {visible.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setOpenId(openId === job.id ? undefined : job.id)}
              className={cx(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg transition",
                job.id === openId
                  ? "border-zinc-400 bg-zinc-700 text-white"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
              )}
            >
              <StatusDot job={job} />
              {jobLabel(job)}
              {job.waiting && <span className="font-semibold text-sky-300">· waiting for you</span>}
            </button>
          ))}
          {over.length > 0 && (
            <HistoryMenu
              jobs={over}
              onOpen={setOpenId}
              onClear={() => api("/api/jobs", { method: "DELETE" }).then(refresh)}
            />
          )}
        </div>
      )}
    </Context.Provider>
  );
};

export const StatusDot = ({ job }: { job: JobSummary }) => (
  <span
    className={cx(
      "size-2 shrink-0 rounded-full",
      job.status === "running" && (job.waiting ? "bg-sky-400" : "animate-pulse bg-zinc-300"),
      job.status === "done" && "bg-emerald-500",
      job.status === "failed" && "bg-red-500",
      job.status === "cancelled" && "bg-zinc-600",
    )}
  />
);

const HistoryMenu = ({
  jobs,
  onOpen,
  onClear,
}: {
  jobs: JobSummary[];
  onOpen(id: string): void;
  onClear(): void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {open && (
        <div className="absolute right-0 bottom-full mb-1.5 w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
          {jobs.slice(0, 12).map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => {
                onOpen(job.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-800"
            >
              <StatusDot job={job} />
              <span className="flex-1 truncate">{jobLabel(job)}</span>
              <span className="text-zinc-500">
                {new Date(job.started).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-800"
          >
            Forget finished jobs
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500 shadow hover:text-zinc-300"
      >
        {jobs.length} finished
      </button>
    </div>
  );
};
