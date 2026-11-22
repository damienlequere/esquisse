import { readGame, writeGame } from "../../../../lib/server/content.ts";
import { handle } from "../../../../lib/server/http.ts";

// A game with all its scenes, as they are on disk; its game.json, saved.
export const GET = (_: Request, { params }: RouteContext<"/api/games/[game]">) =>
  handle(async () => readGame((await params).game));

export const PUT = (request: Request, { params }: RouteContext<"/api/games/[game]">) =>
  handle(async () => {
    const { game } = await params;
    await writeGame(game, await request.json());
    return readGame(game);
  });
