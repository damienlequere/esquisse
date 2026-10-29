import { isLandscape, scenes } from "@esquisse/shared";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { Stage } from "../../../components/Stage.tsx";
import { isSceneId, type SceneImages, sceneImages } from "../../../scenes.ts";

// The scenes' layout, the phone's, in a device frame when the screen allows it
// (see globals.css), on the scene's background, blurred. The frame is turned
// like the scene: portrait or landscape. Dialogs open in #device. The scene's
// images are asked for with the page, the background first, and the stage waits
// for them (see Stage).
export default async function SceneLayout({ children, params }: LayoutProps<"/scene/[id]">) {
  const { id } = await params;
  const images: SceneImages | undefined = isSceneId(id) ? sceneImages[id] : undefined;
  const style = images
    ? ({ "--backdrop": `url(${images.background.src})` } as CSSProperties)
    : undefined;
  const orientation = isSceneId(id) && isLandscape(scenes[id].scene) ? "landscape" : "portrait";
  const sources = images
    ? [
        images.background.src,
        ...Object.values(images.characters).map((image) => image.src),
        ...Object.values(images.effects).flatMap((files) => files.map((image) => image.src)),
      ]
    : [];
  sources.forEach((src, i) => {
    preload(src, { as: "image", fetchPriority: i === 0 ? "high" : "auto" });
  });

  return (
    <Stage images={sources} style={style}>
      <div
        id="device"
        data-orientation={orientation}
        className="relative h-dvh overflow-hidden bg-stone-100 dark:bg-stone-950"
      >
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </Stage>
  );
}
