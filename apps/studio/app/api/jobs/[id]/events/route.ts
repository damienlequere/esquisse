import { handle } from "../../../../../lib/server/http.ts";
import { getJob, subscribe } from "../../../../../lib/server/jobs.ts";
import type { JobEvent } from "../../../../../lib/types.ts";

// A job's events as Server-Sent Events: those already there, from the one the
// browser has not seen (Last-Event-ID, when it comes back), then each new one,
// until it ends.
export const GET = (request: Request, { params }: RouteContext<"/api/jobs/[id]/events">) =>
  handle(async () => {
    const { id } = await params;
    const job = getJob(id);
    const last = Number(request.headers.get("last-event-id") ?? -1);
    const encoder = new TextEncoder();
    let unsubscribe = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let open = true;
        const close = () => {
          if (!open) return;
          open = false;
          unsubscribe();
          controller.close();
        };
        const send = (event: JobEvent) => {
          if (!open) return;
          controller.enqueue(
            encoder.encode(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`),
          );
          if (event.type === "end") close();
        };
        for (const event of job.events.slice(last + 1)) send(event);
        if (open) {
          const off = subscribe(id, send);
          unsubscribe = () => void off();
        }
        request.signal.addEventListener("abort", close);
      },
      cancel() {
        unsubscribe();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });
