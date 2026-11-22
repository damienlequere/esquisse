import { existsSync, readFileSync } from "node:fs";
import { HttpError } from "../../../../../../lib/server/content.ts";
import { handle } from "../../../../../../lib/server/http.ts";
import { getJob } from "../../../../../../lib/server/jobs.ts";

// A render the command made (see show in packages/generator/src/paint.ts).
export const GET = (_: Request, { params }: RouteContext<"/api/jobs/[id]/render/[n]">) =>
  handle(async () => {
    const { id, n } = await params;
    const file = getJob(id).renders[Number(n)];
    if (file === undefined || !existsSync(file)) throw new HttpError(404, "No such render");
    return new Response(readFileSync(file), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
    });
  });
