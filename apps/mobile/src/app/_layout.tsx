import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        {/* The home screen stays upright; each scene turns the screen like its
            image (components/Game.tsx). */}
        <Stack.Screen name="index" options={{ headerShown: false, orientation: "portrait" }} />
        <Stack.Screen name="game/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="game/[id]/scene/[scene]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
