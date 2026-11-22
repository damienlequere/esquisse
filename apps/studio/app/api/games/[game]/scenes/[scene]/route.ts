import { readGame, writeScene } from "../../../../../../lib/server/content.ts";
import { handle } from "../../../../../../lib/server/http.ts";

// A scene saved: its scene.json, objects.json and characters.json, then the
// lists of both apps; the game sent back as it now is.
export const PUT = (
  request: Request,
  { params }: RouteContext<"/api/games/[game]/scenes/[scene]">,
) =>
  handle(async () => {
    const { game, scene } = await params;
    await writeScene(game, scene, await request.json());
    return readGame(game);
  });
