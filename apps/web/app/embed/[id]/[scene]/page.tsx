import { games, isGameId } from "@esquisse/content";
import { capsuleGame } from "@esquisse/engine";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Capsule } from "../../../../components/Capsule.tsx";

// One capsule per scene of each game, to be shown on another site by
// public/capsule.js (see capsuleGame), built ahead of time; any other is a 404.
export const dynamicParams = false;

export const generateStaticParams = () =>
  Object.entries(games).flatMap(([id, { scenes }]) =>
    Object.keys(scenes).map((scene) => ({ id, scene })),
  );

// The game and its scene, if both exist.
const find = async (params: PageProps<"/embed/[id]/[scene]">["params"]) => {
  const { id, scene } = await params;
  if (!isGameId(id) || !Object.hasOwn(games[id].scenes, scene)) return undefined;
  return { id, game: capsuleGame(games[id], scene) };
};

export async function generateMetadata({
  params,
}: PageProps<"/embed/[id]/[scene]">): Promise<Metadata> {
  const found = await find(params);
  return found ? { title: found.game.game.title } : {};
}

export default async function CapsulePage({ params }: PageProps<"/embed/[id]/[scene]">) {
  const found = await find(params);
  if (found === undefined) notFound();
  return <Capsule id={found.id} game={found.game} />;
}
