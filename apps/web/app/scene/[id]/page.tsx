import { scenes } from "@esquisse/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Scene } from "../../../components/Scene.tsx";
import { isSceneId, sceneImages } from "../../../scenes.ts";

// One page per scene, built ahead of time; any other id is a 404.
export const dynamicParams = false;

export const generateStaticParams = () => Object.keys(sceneImages).map((id) => ({ id }));

export async function generateMetadata({ params }: PageProps<"/scene/[id]">): Promise<Metadata> {
  const { id } = await params;
  return isSceneId(id) ? { title: scenes[id].scene.title } : {};
}

export default async function ScenePage({ params }: PageProps<"/scene/[id]">) {
  const { id } = await params;
  if (!isSceneId(id)) notFound();
  return <Scene id={id} data={scenes[id]} images={sceneImages[id]} />;
}
