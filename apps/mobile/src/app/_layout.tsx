import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="frame" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ presentation: "modal", title: "About" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
