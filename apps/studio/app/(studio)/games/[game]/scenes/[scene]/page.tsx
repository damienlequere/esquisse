import { SceneEditor } from "../../../../../../components/scene/SceneEditor.tsx";

export default async function ScenePage({ params }: PageProps<"/games/[game]/scenes/[scene]">) {
  const { game, scene } = await params;
  return <SceneEditor gameId={game} sceneId={scene} />;
}
