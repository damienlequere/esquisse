import { games, isGameId } from "@esquisse/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Game } from "../../../components/Game.tsx";

// One page per game, from its first scene to the others, built ahead of time;
// any other id is a 404.
export const dynamicParams = false;

export const generateStaticParams = () => Object.keys(games).map((id) => ({ id }));

export async function generateMetadata({ params }: PageProps<"/game/[id]">): Promise<Metadata> {
  const { id } = await params;
  return isGameId(id) ? { title: games[id].game.title } : {};
}

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  if (!isGameId(id)) notFound();
  return <Game id={id} game={games[id]} />;
}
