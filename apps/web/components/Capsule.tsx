"use client";

import type { GameData } from "@esquisse/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Game } from "./Game.tsx";

// What a capsule and public/capsule.js, on the other site, tell each other: any
// site may embed a capsule, and it is told nothing but where to show itself.
const MESSAGE = "esquisse-capsule";
const tell = (event: string) => window.parent.postMessage({ type: MESSAGE, event }, "*");

// The movement between the square and the frame, in ms, and its pace: symmetrical,
// as it is played both ways, slow as it leaves and as it arrives. The site's
// background color fades in as long, at the same pace (see public/capsule.js).
const DURATION = 500;
const EASING = "cubic-bezier(0.45, 0, 0.55, 1)";

type Rect = { x: number; y: number; width: number; height: number };
const place = ({ x, y, width, height }: Rect) => ({
  left: `${x}px`,
  top: `${y}px`,
  width: `${width}px`,
  height: `${height}px`,
});

// The square, where it is on the page, whatever the iframe's size: at the corner of
// an iframe as small as it, at its place on the page (`view`) in an iframe spread. A
// browser may show an iframe at its new size before telling its page (see resize):
// laid out this way, by CSS alone, it is right in both, and whatever comes between.
type View = { width: number; height: number };
const pin = (device: HTMLElement, { x, y, width, height }: Rect, view: View) => {
  const along = (at: number, size: number, full: number) =>
    full === size ? 0 : at / (full - size);
  Object.assign(device.style, {
    position: "fixed",
    width: `${width}px`,
    height: `${height}px`,
    left: `calc((100vw - ${width}px) * ${along(x, width, view.width)})`,
    top: `calc((100vh - ${height}px) * ${along(y, height, view.height)})`,
  });
};
const unpin = (device: HTMLElement) => {
  for (const name of ["position", "width", "height", "left", "top"]) {
    device.style.removeProperty(name);
  }
};

// The square's look, which the frame's has nothing of.
type Look = { borderRadius: string };
const lookOf = (device: HTMLElement): Look => ({
  borderRadius: getComputedStyle(device).borderRadius,
});

// From the square, where it is on the page, to the frame as it is laid out, or
// back: over the iframe already spread, the frame's own place and look reached in
// real sizes, so the scene follows as it would. It stays at the end, until settled.
const move = (from: Rect, look: Look, back: boolean) => {
  const device = document.getElementById("device");
  if (device === null) return [];
  const style = getComputedStyle(device);
  const frame = {
    ...place(device.getBoundingClientRect()),
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
  };
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const options: KeyframeAnimationOptions = {
    duration: still ? 0 : DURATION,
    easing: EASING,
    fill: "both",
    direction: back ? "reverse" : "normal",
  };
  device.style.position = "fixed";
  device.dataset.moving = "";
  return [device.animate([{ ...place(from), ...look, boxShadow: "none" }, frame], options)];
};

// A scene on another site (see capsuleGame): reduced, it fills a square; expanded,
// from its icon, it is framed as on this site, in an iframe public/capsule.js
// spreads over the whole page. A press around its frame, or Escape, reduces it. The
// iframe changes size between two movements, the square pinned in place meanwhile.
// In an iframe alone, it stays a square: it has no icon.
export const Capsule = ({ id, game }: { id: string; game: GameData }) => {
  const [expanded, setExpanded] = useState(false);
  const [linked, setLinked] = useState(false);

  const open = useRef(false);
  const moving = useRef(false);
  const opening = useRef<Rect>(undefined);
  const closing = useRef(false);
  const look = useRef<Look>(undefined);
  const animations = useRef<Animation[]>([]);

  const toggle = useCallback(() => {
    if (moving.current) return;
    moving.current = true;
    tell("measure");
  }, []);

  useEffect(() => {
    const settle = () => {
      for (const animation of animations.current) animation.cancel();
      animations.current = [];
      const device = document.getElementById("device");
      if (device) unpin(device);
      delete device?.dataset.moving;
      moving.current = false;
    };
    const finished = (then: () => void) => {
      Promise.all(animations.current.map(({ finished }) => finished)).then(then, () => undefined);
    };
    const reduced = () => {
      flushSync(() => setExpanded(false));
      open.current = false;
      settle();
    };

    const onMessage = ({ source, data }: MessageEvent) => {
      if (source !== window.parent || data?.type !== MESSAGE) return;
      if (data.event === "hello") setLinked(true);
      if (data.event === "reduce" && open.current) toggle();
      if (data.event === "closed" && open.current && !closing.current) reduced();
      if (data.event === "rect") {
        const device = document.getElementById("device");
        if (device === null) return;
        if (open.current && look.current) {
          animations.current = move(data.rect, look.current, true);
          finished(() => {
            pin(device, data.rect, data.view);
            flushSync(() => setExpanded(false));
            for (const animation of animations.current) animation.cancel();
            animations.current = [];
            closing.current = true;
            tell("close");
          });
        } else {
          pin(device, data.rect, data.view);
          opening.current = data.rect;
          tell("open");
        }
      }
    };

    const onResize = () => {
      const device = document.getElementById("device");
      if (opening.current && device) {
        const from = opening.current;
        opening.current = undefined;
        const square = lookOf(device);
        look.current = square;
        unpin(device);
        flushSync(() => setExpanded(true));
        open.current = true;
        animations.current = move(from, square, false);
        finished(settle);
      } else if (closing.current) {
        closing.current = false;
        open.current = false;
        settle();
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open.current) toggle();
    };
    const onPress = ({ target }: globalThis.MouseEvent) => {
      if (open.current && target instanceof Element && target.id === "stage") toggle();
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onPress);
    tell("ready");
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onPress);
    };
  }, [toggle]);

  return <Game id={id} game={game} capsule={{ expanded, onToggle: linked ? toggle : undefined }} />;
};
