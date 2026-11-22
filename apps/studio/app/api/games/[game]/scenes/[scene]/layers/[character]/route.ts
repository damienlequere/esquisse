import { readGame, writeLayer } from "../../../../../../../../lib/server/content.ts";
import { handle } from "../../../../../../../../lib/server/http.ts";

// A character's layer, uploaded: an image with its transparency.
export const PUT = (
  request: Request,
  { params }: RouteContext<"/api/games/[game]/scenes/[scene]/layers/[character]">,
) =>
  handle(async () => {
    const { game, scene, character } = await params;
    await writeLayer(game, scene, character, Buffer.from(await request.arrayBuffer()));
    return readGame(game);
  });
