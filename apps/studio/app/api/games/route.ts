import { listGames } from "../../../lib/server/content.ts";
import { handle } from "../../../lib/server/http.ts";

// The games on disk, for the home page.
export const GET = () => handle(listGames);
