import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { GAMES, HttpError } from "../../../../lib/server/content.ts";
import { handle } from "../../../../lib/server/http.ts";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

// An image of a game, from content/games: never outside it. Its URL carries
// its time (see media in lib/server/content.ts), so it can be kept.
export const GET = (_: Request, { params }: RouteContext<"/api/media/[...path]">) =>
  handle(async () => {
    const { path } = await params;
    const file = resolve(join(GAMES, ...path));
    const type = TYPES[extname(file)];
    if (!file.startsWith(GAMES + sep) || type === undefined || !existsSync(file))
      throw new HttpError(404, "No such image");
    return new Response(readFileSync(file), {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  });
