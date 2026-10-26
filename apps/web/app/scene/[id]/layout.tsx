import { isLandscape, scenes } from "@esquisse/shared";
import type { CSSProperties } from "react";
import { isSceneId, sceneImages } from "../../../scenes.ts";

// The scenes' layout, the phone's, in a device frame when the screen allows it
// (see globals.css), on the scene's background, blurred. The frame is turned
// like the scene: portrait or landscape. Dialogs open in #device.
export default async function SceneLayout({ children, params }: LayoutProps<"/scene/[id]">) {
  const { id } = await params;
  const style = isSceneId(id)
    ? ({ "--backdrop": `url(${sceneImages[id].background.src})` } as CSSProperties)
    : undefined;
  const orientation = isSceneId(id) && isLandscape(scenes[id].scene) ? "landscape" : "portrait";

  return (
    <div id="stage" style={style}>
      <div
        id="device"
        data-orientation={orientation}
        className="relative h-dvh overflow-hidden bg-stone-100 dark:bg-stone-950"
      >
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
