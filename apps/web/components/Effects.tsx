"use client";

import { type Effect, effectShader } from "@esquisse/shared";
import type { CanvasKit, Image as SkImage } from "canvaskit-wasm";
import type { StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import styles from "./Scene.module.css";

// The background's animations (see effects.ts in packages/shared), drawn by
// CanvasKit, Skia in WebAssembly, in a canvas over the background: only what
// moves, transparent elsewhere. CanvasKit is about 3 MB: it is loaded once,
// after the page, and the background shows still until it is there, or if it
// fails. Nothing moves for whom asks for less motion.

let canvasKit: Promise<CanvasKit> | undefined;
const loadCanvasKit = () => {
  canvasKit ??= import("canvaskit-wasm").then(({ default: init }) =>
    init({ locateFile: () => new URL("canvaskit-wasm/bin/canvaskit.wasm", import.meta.url).href }),
  );
  return canvasKit;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

// The canvas's pixels: the screen's, but never more than the image's.
const MAX_DPR = 2;

export const Effects = ({
  effects,
  background,
  files,
}: {
  effects: Effect[];
  background: StaticImageData;
  // Each effect's own images, by its id (see effectFiles).
  files: Record<string, StaticImageData[]>;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (element === null || effects.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stopped = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      const [CK, image, ...own] = await Promise.all([
        loadCanvasKit(),
        loadImage(background.src),
        ...effects.map((e) => Promise.all((files[e.id] ?? []).map((f) => loadImage(f.src)))),
      ]);
      if (stopped) return;
      const sk = (i: HTMLImageElement) => CK.MakeImageFromCanvasImageSource(i);
      const skImage = sk(image);
      const layers = effects.flatMap((e, k) => {
        const shader = effectShader(e.kind);
        const runtime = shader === undefined ? null : CK.RuntimeEffect.Make(shader);
        return runtime ? [{ runtime, images: (own[k] ?? []).map(sk) }] : [];
      });
      cleanups.push(() => {
        skImage.delete();
        for (const l of layers) {
          l.runtime.delete();
          for (const i of l.images) i.delete();
        }
      });

      // The image shaders, fitted to the canvas's size: made again when it changes.
      const fit = (i: SkImage, w: number, h: number) =>
        i.makeShaderOptions(
          CK.TileMode.Clamp,
          CK.TileMode.Clamp,
          CK.FilterMode.Linear,
          CK.MipmapMode.None,
          CK.Matrix.scaled(w / i.width(), h / i.height()),
        );
      type Shader = ReturnType<typeof fit>;
      let surface: ReturnType<CanvasKit["MakeWebGLCanvasSurface"]> = null;
      // Each layer's: the background, then the effect's own images.
      let children: Shader[][] = [];
      const deleteChildren = () => {
        for (const c of children.flat()) c.delete();
      };
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
        element.width = Math.min(Math.round(element.clientWidth * dpr), image.naturalWidth);
        element.height = Math.min(Math.round(element.clientHeight * dpr), image.naturalHeight);
        surface?.delete();
        // Without WebGL (turned off, or no graphics card), drawn by the processor.
        surface = CK.MakeWebGLCanvasSurface(element) ?? CK.MakeSWCanvasSurface(element);
        deleteChildren();
        children = layers.map((l) =>
          [skImage, ...l.images].map((i) => fit(i, element.width, element.height)),
        );
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const paint = new CK.Paint();
      const start = performance.now();
      let frame = 0;
      const draw = () => {
        frame = requestAnimationFrame(draw);
        if (surface === null) return;
        const w = element.width;
        const h = element.height;
        const time = (performance.now() - start) / 1000;
        const canvas = surface.getCanvas();
        canvas.clear(CK.TRANSPARENT);
        layers.forEach((l, k) => {
          const c = children[k];
          if (c === undefined) return;
          const shader = l.runtime.makeShaderWithChildren([w, h, time], c);
          paint.setShader(shader);
          canvas.drawRect(CK.LTRBRect(0, 0, w, h), paint);
          shader.delete();
        });
        surface.flush();
      };
      draw();
      element.dataset.ready = "";
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        paint.delete();
        deleteChildren();
        surface?.delete();
      });
    })().catch((error: unknown) => console.warn("Effects:", error));

    return () => {
      stopped = true;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [effects, background, files]);

  return <canvas ref={canvas} className={styles.effects} />;
};
