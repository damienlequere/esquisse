import { handle } from "../../../../lib/server/http.ts";
import { answerJob, cancelJob } from "../../../../lib/server/jobs.ts";

// An answer to what the command asks, as typed in the terminal.
export const POST = (request: Request, { params }: RouteContext<"/api/jobs/[id]">) =>
  handle(async () => {
    const { answer } = (await request.json()) as { answer?: unknown };
    answerJob((await params).id, String(answer ?? ""));
  });

// Stops it, as Ctrl+C would: what it saved stays saved.
export const DELETE = (_: Request, { params }: RouteContext<"/api/jobs/[id]">) =>
  handle(async () => cancelJob((await params).id));
