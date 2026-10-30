import { TOAST } from "@esquisse/shared";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastMessage = { text: string; key: number };

// Short messages at the bottom of the screen: each one slides in, stays, and
// fades out by itself (TOAST in packages/shared). A new message, with a new
// key, goes under those still shown, which it pushes up. Screen readers hear
// it. The web has the same (apps/web/components/Toast.tsx). NativeWind styles
// its Animated.View through Scene's cssInterop.
export const Toast = ({ message }: { message: ToastMessage | undefined }) => {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<ToastMessage[]>([]);
  useEffect(() => {
    if (message === undefined) return;
    AccessibilityInfo.announceForAccessibility(message.text);
    setShown((all) => (all.some(({ key }) => key === message.key) ? all : [...all, message]));
  }, [message]);
  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 items-center gap-2"
      style={{ bottom: Math.max(24, insets.bottom) }}
    >
      {shown.map((m) => (
        <Line
          key={m.key}
          message={m}
          onDone={() => setShown((all) => all.filter(({ key }) => key !== m.key))}
        />
      ))}
    </View>
  );
};

// One of them, which goes by itself once it has stayed its time.
const Line = ({ message, onDone }: { message: ToastMessage; onDone(): void }) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: its own time, from when it shows.
  useEffect(() => {
    const timer = setTimeout(onDone, TOAST.duration - TOAST.fade);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Animated.View
      entering={FadeInDown.duration(TOAST.fade)}
      exiting={FadeOut.duration(TOAST.fade)}
      layout={LinearTransition.duration(TOAST.fade)}
      className="rounded-full border border-stone-100/30 bg-stone-950/85 px-4 py-2"
    >
      <Text className="font-serif text-base text-stone-100">{message.text}</Text>
    </Animated.View>
  );
};
