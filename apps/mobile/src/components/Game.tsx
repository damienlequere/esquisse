import { exitTo, type GameData, isLandscape, playGame, startGame } from "@esquisse/shared";
import { Stack } from "expo-router";
import { useMemo, useReducer } from "react";
import { isSceneId, sceneImages } from "../scenes.ts";
import { Scene } from "./Scene.tsx";

// A game, from scene to scene, as playGame in packages/shared plays it, like
// the web site's (apps/web/components/Game.tsx): the screen turns like each
// scene's image. A scene played alone is a game of its own (see sceneGame).
export const Game = ({ game }: { game: GameData }) => {
  const reducer = useMemo(() => playGame(game), [game]);
  const [state, dispatch] = useReducer(reducer, game, startGame);
  const data = game.scenes[state.at];
  if (data === undefined || !isSceneId(state.at)) throw new Error(`No scene « ${state.at} »`);
  // The back button, where the game links the scene's back exit.
  const { back } = data.scene;
  const onBack =
    back !== undefined && exitTo(game, state, back) !== undefined
      ? () => dispatch({ type: "exit", exit: back })
      : undefined;
  return (
    <>
      <Stack.Screen options={{ orientation: isLandscape(data.scene) ? "landscape" : "portrait" }} />
      <Scene
        key={state.at}
        data={data}
        images={sceneImages[state.at]}
        state={state}
        dispatch={dispatch}
        onBack={onBack}
      />
    </>
  );
};
