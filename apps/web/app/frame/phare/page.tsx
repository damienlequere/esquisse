import { scenes } from "@esquisse/shared";
import type { Metadata } from "next";
import { Scene } from "../../../components/Scene.tsx";
import { sceneImages } from "../../../scenes.ts";

export const metadata: Metadata = { title: scenes.phare.scene.title };

export default function PharePage() {
  return <Scene data={scenes.phare} images={sceneImages.phare} />;
}
