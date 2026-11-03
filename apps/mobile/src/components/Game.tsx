import { type GameImages, gameImages } from "@esquisse/content/games/images.ts";
import { exitTo, type GameData, isLandscape, playGame, startGame } from "@esquisse/engine";
import { Stack } from "expo-router";
import { useMemo, useReducer } from "react";
import type { ImageSourcePropType } from "react-native";
import { Scene } from "./Scene.tsx";

const IMAGES: Record<string, GameImages<ImageSourcePropType>> = gameImages;

// A game, from scene to scene, as playGame in packages/engine plays it, like
// the web site's (apps/web/components/Game.tsx): the screen turns like each
// scene's image. A scene played alone is a game of its own (see sceneGame),
// with the images of the game it is in, `id`.
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
    <>
      <Stack.Screen options={{ orientation: isLandscape(data.scene) ? "landscape" : "portrait" }} />
      <Scene
        key={state.at}
        data={data}
        images={images}
        state={state}
        dispatch={dispatch}
        onBack={onBack}
        items={game.items}
        itemImages={IMAGES[id]?.items ?? {}}
      />
    </>
  );
};
