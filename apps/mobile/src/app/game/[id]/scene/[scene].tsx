import { games, isGameId } from "@esquisse/content";
import { sceneGame } from "@esquisse/engine";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Game } from "../../../../components/Game.tsx";

// One screen per scene of each game, played alone (its exits stay closed), like
// the web site's app/game/[id]/scene/[scene]; any other goes home. The screen
// turns like the scene's image, and turns back on leaving it.
export default function ScenePage() {
  const { id, scene } = useLocalSearchParams<{ id: string; scene: string }>();
  if (!isGameId(id) || !Object.hasOwn(games[id].scenes, scene)) return <Redirect href="/" />;
  return <Game id={id} game={sceneGame(games[id], scene)} />;
}
