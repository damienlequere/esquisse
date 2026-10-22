import { scenes } from "@esquisse/shared";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Scene } from "../../components/Scene.tsx";
import { isSceneId, sceneImages } from "../../scenes.ts";

// One screen per scene, like the web site's app/scene/[id]; any other id goes home.
export default function ScenePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isSceneId(id)) return <Redirect href="/" />;
  return <Scene data={scenes[id]} images={sceneImages[id]} />;
}
