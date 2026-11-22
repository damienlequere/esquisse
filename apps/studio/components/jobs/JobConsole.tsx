"use client";

// A job's console, on the right of the page: what the command prints, its
// renders, and its questions, as buttons (its choices) or a text field. The
// page stays usable beside it; the dock's button, or Escape, hides it.

import { useEffect, useRef, useState } from "react";
import { api, send } from "../../lib/client/api.ts";
import type { JobEvent, JobSummary } from "../../lib/types.ts";
import { Button, TextArea } from "../ui.tsx";
import { jobLabel, StatusDot } from "./Jobs.tsx";

const useEvents = (id: string) => {
  const [events, setEvents] = useState<JobEvent[]>([]);
  useEffect(() => {
    setEvents([]);
    const source = new EventSource(`/api/jobs/${id}/events`);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as JobEvent;
      setEvents((list) => (list.some((e) => e.seq === event.seq) ? list : [...list, event]));
      if (event.type === "end") source.close();
    };
    return () => source.close();
  }, [id]);
  return events;
};

export const JobConsole = ({ job, onHide }: { job: JobSummary; onHide(): void }) => {
  const events = useEvents(job.id);
  const bottom = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [text, setText] = useState("");
  const [zoom, setZoom] = useState<string>();

  // The question asked last, if nothing answered it since.
  const last = events.at(-1);
  const question = last?.type === "choose" || last?.type === "ask" ? last : undefined;
  const end = events.find((e) => e.type === "end");

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [events.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoom === undefined) onHide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHide, zoom]);

  const answer = async (value: string) => {
    setError(undefined);
    try {
      await send(`/api/jobs/${job.id}`, "POST", { answer: value });
      setText("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <aside className="fixed top-0 right-0 bottom-0 z-30 flex w-[min(44rem,100vw)] flex-col border-l border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur">
      <header className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
        <StatusDot job={job} />
        <span className="flex-1 truncate text-sm font-medium">{jobLabel(job)}</span>
        {job.status === "running" && (
          <Button variant="danger" onClick={() => api(`/api/jobs/${job.id}`, { method: "DELETE" })}>
            Stop
          </Button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
        <p className="mb-2 break-all text-zinc-500">
          $ pnpm {job.command}{" "}
          {job.args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}
        </p>
        {events.map((event) => {
          switch (event.type) {
            case "log":
              return (
                <p
                  key={event.seq}
                  className={
                    event.error ? "whitespace-pre-wrap text-red-300" : "whitespace-pre-wrap"
                  }
                >
                  {event.text}
                </p>
              );
            case "render":
              return (
                <button
                  key={event.seq}
                  type="button"
                  onClick={() => setZoom(event.url)}
                  className="my-2 block w-full cursor-zoom-in"
                >
                  <img
                    src={event.url}
                    alt="Render"
                    className="mx-auto max-h-[60vh] rounded border border-zinc-700"
                  />
                </button>
              );
            case "choose":
            case "ask":
              return (
                <p key={event.seq} className="mt-2 font-sans text-sm font-semibold text-zinc-100">
                  {event.question.trim()}
                </p>
              );
            case "answer":
              return (
                <p key={event.seq} className="text-sky-300">
                  › {event.text}
                </p>
              );
            case "end":
              return (
                <p
                  key={event.seq}
                  className={
                    event.status === "done" ? "mt-2 text-emerald-400" : "mt-2 text-red-300"
                  }
                >
                  {event.status === "done"
                    ? "✓ Done"
                    : event.status === "cancelled"
                      ? "Stopped"
                      : `✗ Failed (exit ${event.code})`}
                </p>
              );
            default:
              return null;
          }
        })}
        <div ref={bottom} />
      </div>
      {question && !end && (
        <footer className="border-t border-zinc-800 px-4 py-3">
          {question.type === "choose" ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(question.choices).map(([key, label]) => (
                <Button
                  key={key}
                  variant={key === "v" || key === "o" ? "primary" : "default"}
                  onClick={() => answer(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim() !== "") answer(text);
              }}
            >
              <TextArea value={text} onChange={setText} rows={3} placeholder="Your answer…" />
              <div>
                <Button type="submit" variant="primary" disabled={text.trim() === ""}>
                  Send
                </Button>
              </div>
            </form>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </footer>
      )}
      {zoom && (
        <button
          type="button"
          onClick={() => setZoom(undefined)}
          onKeyDown={(e) => e.key === "Escape" && setZoom(undefined)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
        >
          <img src={zoom} alt="Render" className="max-h-full max-w-full" />
        </button>
      )}
    </aside>
  );
};
