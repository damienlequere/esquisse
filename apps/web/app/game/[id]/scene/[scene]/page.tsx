import { games, isGameId } from "@esquisse/content";
import { sceneGame } from "@esquisse/engine";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Game } from "../../../../../components/Game.tsx";

// One page per scene of each game, played alone (its exits stay closed), built
// ahead of time; any other is a 404.
export const dynamicParams = false;

export const generateStaticParams = () =>
  Object.entries(games).flatMap(([id, { scenes }]) =>
    Object.keys(scenes).map((scene) => ({ id, scene })),
  );

// The game and its scene, if both exist.
const find = async (params: PageProps<"/game/[id]/scene/[scene]">["params"]) => {
  const { id, scene } = await params;
  if (!isGameId(id) || !Object.hasOwn(games[id].scenes, scene)) return undefined;
  return { id, game: sceneGame(games[id], scene) };
};

export async function generateMetadata({
  params,
}: PageProps<"/game/[id]/scene/[scene]">): Promise<Metadata> {
  const found = await find(params);
  return found ? { title: found.game.game.title } : {};
}

export default async function ScenePage({ params }: PageProps<"/game/[id]/scene/[scene]">) {
  const found = await find(params);
  if (found === undefined) notFound();
  return <Game id={found.id} game={found.game} />;
}
