import { games, isGameId } from "@esquisse/content";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Game } from "../../../components/Game.tsx";

// One screen per game, like the web site's app/game/[id]; any other id goes
// home. The screen turns like each scene's image, and turns back on leaving it.
export default function GamePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isGameId(id)) return <Redirect href="/" />;
  return <Game id={id} game={games[id]} />;
}
