import type { CSSProperties, ReactNode } from "react";
import { preload } from "react-dom";
import type { SceneImages } from "../scenes.ts";
import { Stage } from "./Stage.tsx";

// A scene's frame, the phone's, in a device frame when the screen allows it
// (see globals.css), on the scene's background, blurred. The frame is turned
// like the scene: portrait or landscape. Dialogs open in #device. The scene's
// images are asked for with it, the background first, and the stage waits for
// them (see Stage).
export const SceneFrame = ({
  images,
  landscape,
  children,
}: {
  images: SceneImages;
  landscape: boolean;
  children: ReactNode;
}) => {
  const style = { "--backdrop": `url(${images.background.src})` } as CSSProperties;
  const sources = [
    images.background.src,
    ...Object.values(images.characters).map((image) => image.src),
    ...Object.values(images.effects).flatMap((files) => files.map((image) => image.src)),
  ];
  sources.forEach((src, i) => {
    preload(src, { as: "image", fetchPriority: i === 0 ? "high" : "auto" });
  });

  return (
    <Stage images={sources} style={style}>
      <div
        id="device"
        data-orientation={landscape ? "landscape" : "portrait"}
        className="relative h-dvh overflow-hidden bg-stone-100 dark:bg-stone-950"
      >
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </Stage>
  );
};
