// The studio's API answers in JSON; an HttpError gives its status, any other
// error a 500 with its message, shown by the page that asked.

import { HttpError } from "./content.ts";

export const handle = async (run: () => unknown | Promise<unknown>) => {
  try {
    const value = await run();
    return value instanceof Response ? value : Response.json(value ?? { ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    if (status === 500) console.error(error);
    return Response.json({ error: message }, { status });
  }
};
