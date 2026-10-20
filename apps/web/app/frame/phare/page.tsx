import type { Metadata } from "next";
import { Scene } from "../../../components/Scene.tsx";
import aspects from "../../../scenes/phare/characters.json";
import objects from "../../../scenes/phare/objects.json";
import scene from "../../../scenes/phare/scene.json";

export const metadata: Metadata = { title: scene.title };

export default function PharePage() {
  return <Scene scene={scene} objects={objects} aspects={aspects} media="/scenes/phare" />;
}
