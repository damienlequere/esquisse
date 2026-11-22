"use client";

import type { SceneImages } from "@esquisse/content/games/images.ts";
import {
  exitTo,
  type GameData,
  isLandscape,
  playGame,
  sceneGame,
  startGame,
} from "@esquisse/engine";
import { Scene } from "@esquisse/web/components/Scene.tsx";
import { SceneFrame } from "@esquisse/web/components/SceneFrame.tsx";
import type { StaticImageData } from "next/image";
import { useEffect, useMemo, useReducer, useState } from "react";
import type { PreviewMessage, StudioImages } from "../../../lib/types.ts";

// An image by its URL, as Next gives one to the web site: only src is read.
const image = (src: string): StaticImageData => ({ src, width: 1440, height: 2560 });

const sceneImages = (urls: StudioImages): SceneImages<StaticImageData> => ({
  background: image(urls.background),
  ...(urls.night ? { night: image(urls.night) } : {}),
  characters: Object.fromEntries(Object.entries(urls.characters).map(([k, v]) => [k, image(v)])),
  effects: Object.fromEntries(Object.entries(urls.effects).map(([k, v]) => [k, v.map(image)])),
});

// What the studio sends, played as the web site's Game plays it
// (apps/web/components/Game.tsx), with its images by URL. The game it plays
// changes as it is edited: the player stays where it is, with what it holds,
// unless it is played again from the start (restart).
export const Player = () => {
  const [message, setMessage] = useState<PreviewMessage>();
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as PreviewMessage;
      if (data?.type === "esquisse:preview") setMessage(data);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "esquisse:preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  if (message === undefined) return null;
  const { game, scene } = message;
  if (scene !== undefined && game.scenes[scene] === undefined) return null;
  const played = scene === undefined ? game : sceneGame(game, scene);
  return <Played key={`${message.restart} ${scene ?? ""}`} game={played} message={message} />;
};

const Played = ({ game, message }: { game: GameData; message: PreviewMessage }) => {
  const reducer = useMemo(() => playGame(game), [game]);
  const [state, dispatch] = useReducer(reducer, game, startGame);
  const data = game.scenes[state.at];
  const urls = message.images[state.at];
  const images = useMemo(() => (urls ? sceneImages(urls) : undefined), [urls]);
  const itemImages = useMemo(
    () => Object.fromEntries(Object.entries(message.itemImages).map(([k, v]) => [k, image(v)])),
    [message.itemImages],
  );
  if (data === undefined || images === undefined)
    return <p className="p-6 text-sm text-stone-500">No scene « {state.at} » any more.</p>;
  const { back } = data.scene;
  const onBack =
    back !== undefined && exitTo(game, state, back) !== undefined
      ? () => dispatch({ type: "exit", exit: back })
      : undefined;
  return (
    <SceneFrame key={state.at} images={images} landscape={isLandscape(data.scene)}>
      <Scene
        data={data}
        images={images}
        state={state}
        dispatch={dispatch}
        onBack={onBack}
        items={game.items}
        itemImages={itemImages}
      />
    </SceneFrame>
  );
};
