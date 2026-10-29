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

      // The shaders' images, fitted once to the background's own size: the
      // effects are drawn at that size, scaled to the canvas's.
      const W = image.naturalWidth;
      const H = image.naturalHeight;
      const fit = (i: SkImage) =>
        i.makeShaderOptions(
          CK.TileMode.Clamp,
          CK.TileMode.Clamp,
          CK.FilterMode.Linear,
          CK.MipmapMode.None,
          CK.Matrix.scaled(W / i.width(), H / i.height()),
        );
      // Each layer's: the background, then the effect's own images.
      const children = layers.map((l) => [skImage, ...l.images].map(fit));

      // One WebGL context for the scene's whole life: only its surface is made
      // again when the canvas's size changes. Without WebGL (turned off, or no
      // graphics card), drawn by the processor.
      const gl = CK.GetWebGLContext(element);
      const gpu = gl ? CK.MakeWebGLContext(gl) : null;
      let surface: ReturnType<CanvasKit["MakeSWCanvasSurface"]> = null;
      const resize = (w: number, h: number) => {
        element.width = w;
        element.height = h;
        surface?.delete();
        surface = gpu
          ? CK.MakeOnScreenGLSurface(gpu, w, h, CK.ColorSpace.SRGB)
          : CK.MakeSWCanvasSurface(element);
      };

      const paint = new CK.Paint();
      const start = performance.now();
      let frame = 0;
      // Each frame, the canvas takes its size on screen (the screen's pixels,
      // but never more than the image's) then is drawn at once: resizing the
      // window never shows it empty.
      const draw = () => {
        frame = requestAnimationFrame(draw);
        const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
        const w = Math.max(1, Math.min(Math.round(element.clientWidth * dpr), W));
        const h = Math.max(1, Math.min(Math.round(element.clientHeight * dpr), H));
        if (w !== element.width || h !== element.height || surface === null) resize(w, h);
        if (surface === null) return;
        const time = (performance.now() - start) / 1000;
        const canvas = surface.getCanvas();
        canvas.clear(CK.TRANSPARENT);
        canvas.save();
        canvas.scale(w / W, h / H);
        layers.forEach((l, k) => {
          const c = children[k];
          if (c === undefined) return;
          const shader = l.runtime.makeShaderWithChildren([W, H, time], c);
          paint.setShader(shader);
          canvas.drawRect(CK.LTRBRect(0, 0, W, H), paint);
          shader.delete();
        });
        canvas.restore();
        surface.flush();
      };
      draw();
      element.dataset.ready = "";
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        paint.delete();
        for (const c of children.flat()) c.delete();
        surface?.delete();
        gpu?.delete();
      });
    })().catch((error: unknown) => console.warn("Effects:", error));

    return () => {
      stopped = true;
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [effects, background, files]);

  return <canvas ref={canvas} className={styles.effects} />;
};
