import { ITEMS, scenes } from "@esquisse/content";
import { sceneGame } from "@esquisse/shared";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Game } from "../../components/Game.tsx";
import { isSceneId } from "../../scenes.ts";

// One screen per scene, played alone (its exits stay closed), like the web
// site's app/scene/[id]; any other id goes home. The screen turns like the
// scene's image, and turns back on leaving it.
export default function ScenePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isSceneId(id)) return <Redirect href="/" />;
  return <Game game={sceneGame(id, scenes[id], ITEMS)} />;
}
