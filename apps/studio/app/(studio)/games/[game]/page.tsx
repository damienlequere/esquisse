import { GameWorkspace } from "../../../../components/game/GameWorkspace.tsx";

export default async function GamePage({ params }: PageProps<"/games/[game]">) {
  const { game } = await params;
  return <GameWorkspace id={game} />;
}
