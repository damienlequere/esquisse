"use client";

import { type GameData, isLandscape, playGame, startGame } from "@esquisse/shared";
import { useMemo, useReducer } from "react";
import { isSceneId, sceneImages } from "../scenes.ts";
import { Scene } from "./Scene.tsx";
import { SceneFrame } from "./SceneFrame.tsx";

// A game, from scene to scene, as playGame in packages/shared plays it: each
// scene in its own frame, which waits for its images, then shows it. A scene
// played alone is a game of its own (see sceneGame). The mobile app has the
// same (apps/mobile/src/components/Game.tsx).
export const Game = ({ game }: { game: GameData }) => {
  const reducer = useMemo(() => playGame(game), [game]);
  const [state, dispatch] = useReducer(reducer, game, startGame);
  const data = game.scenes[state.at];
  if (data === undefined || !isSceneId(state.at)) throw new Error(`No scene « ${state.at} »`);
  const images = sceneImages[state.at];
  return (
    <SceneFrame key={state.at} images={images} landscape={isLandscape(data.scene)}>
      <Scene data={data} images={images} state={state} dispatch={dispatch} />
    </SceneFrame>
  );
};
