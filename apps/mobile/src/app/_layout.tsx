import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        {/* The home screen stays upright; each scene turns the screen like its
            image (scene/[id].tsx). */}
        <Stack.Screen name="index" options={{ headerShown: false, orientation: "portrait" }} />
        <Stack.Screen name="scene/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
