"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

// The stage of a scene's frame (see SceneFrame.tsx), shown only once
// the scene's images are loaded and decoded: the background blurred around the
// frame, and the scene, whose opening starts then. Until then, the stage stays
// hidden (see globals.css) and the frame empty. An image that fails to load does
// not hold it back.
export const Stage = ({
  images,
  style,
  capsule,
  reduced,
  children,
}: {
  images: string[];
  style?: CSSProperties;
  capsule?: boolean;
  reduced?: boolean;
  children: ReactNode;
}) => {
  const [ready, setReady] = useState(false);
  const key = images.join(" ");

  useEffect(() => {
    let live = true;
    Promise.allSettled(
      key.split(" ").map((src) => {
        const image = new Image();
        image.src = src;
        return image.decode();
      }),
    ).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [key]);

  return (
    <div
      id="stage"
      style={style}
      data-ready={ready || undefined}
      data-capsule={capsule || undefined}
      data-reduced={reduced || undefined}
    >
      {ready ? children : null}
    </div>
  );
};
