import { scenes } from "@esquisse/shared";
import { Scene } from "../components/Scene.tsx";
import { sceneImages } from "../scenes.ts";

export default function Phare() {
  return <Scene data={scenes.phare} images={sceneImages.phare} />;
}
