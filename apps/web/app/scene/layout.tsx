import type { ReactNode } from "react";

// The scenes' layout, the phone's, in a device frame when the screen allows it
// (see globals.css). Dialogs open in #device.
export default function SceneLayout({ children }: { children: ReactNode }) {
  return (
    <div id="stage">
      <div id="device" className="relative h-dvh overflow-hidden bg-stone-100 dark:bg-stone-950">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
