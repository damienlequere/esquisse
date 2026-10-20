import { scenes } from "@esquisse/shared";
import type { Metadata } from "next";
import { Scene } from "../../../components/Scene.tsx";
import { sceneImages } from "../../../scenes.ts";

const { scene, objects, aspects } = scenes.phare;

export const metadata: Metadata = { title: scene.title };

export default function PharePage() {
  return <Scene scene={scene} objects={objects} aspects={aspects} images={sceneImages.phare} />;
}
