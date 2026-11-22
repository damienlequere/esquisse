import { handle } from "../../../lib/server/http.ts";
import { clearJobs, listJobs, startJob } from "../../../lib/server/jobs.ts";
import type { JobRequest } from "../../../lib/types.ts";

// The generator's commands run by the studio: those running and those over.
export const GET = () => handle(listJobs);

export const POST = (request: Request) =>
  handle(async () => startJob((await request.json()) as JobRequest));

// Forgets those over.
export const DELETE = () => handle(clearJobs);
