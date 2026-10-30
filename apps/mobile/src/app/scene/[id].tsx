import { isLandscape, scenes } from "@esquisse/shared";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { Scene } from "../../components/Scene.tsx";
import { isSceneId, sceneImages } from "../../scenes.ts";

// One screen per scene, like the web site's app/scene/[id]; any other id goes home.
// The screen turns like the scene's image, and turns back on leaving it.
export default function ScenePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isSceneId(id)) return <Redirect href="/" />;
  const data = scenes[id];
  return (
    <>
      <Stack.Screen options={{ orientation: isLandscape(data.scene) ? "landscape" : "portrait" }} />
      <Scene id={id} data={data} images={sceneImages[id]} />
    </>
  );
}
