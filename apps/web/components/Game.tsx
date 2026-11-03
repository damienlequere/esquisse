"use client";

import { type GameImages, gameImages } from "@esquisse/content/games/images.ts";
import { exitTo, type GameData, isLandscape, playGame, startGame } from "@esquisse/engine";
import type { StaticImageData } from "next/image";
import { useMemo, useReducer } from "react";
import { Scene } from "./Scene.tsx";
import { SceneFrame } from "./SceneFrame.tsx";

const IMAGES: Record<string, GameImages<StaticImageData>> = gameImages;

// A game, from scene to scene, as playGame in packages/engine plays it: each
// scene in its own frame, which waits for its images, then shows it. A scene
// played alone is a game of its own (see sceneGame), with the images of the
// game it is in, `id`. The mobile app has the same
// (apps/mobile/src/components/Game.tsx).
export const Game = ({ id, game }: { id: string; game: GameData }) => {
  const reducer = useMemo(() => playGame(game), [game]);
  const [state, dispatch] = useReducer(reducer, game, startGame);
  const data = game.scenes[state.at];
  const images = IMAGES[id]?.scenes[state.at];
  if (data === undefined || images === undefined) throw new Error(`No scene « ${state.at} »`);
  // The back button, where the game links the scene's back exit.
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
        itemImages={IMAGES[id]?.items ?? {}}
      />
    </SceneFrame>
  );
};
