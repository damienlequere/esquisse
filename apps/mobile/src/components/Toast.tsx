import { TOAST } from "@esquisse/shared";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastMessage = { text: string; key: number };

// A short message at the bottom of the screen: it slides in, stays, and fades out
// by itself (TOAST in packages/shared). A new message, with a new key, replaces
// it and shows again. Screen readers hear it. The web has the same
// (apps/web/components/Toast.tsx). NativeWind styles its Animated.View through
// Scene's cssInterop.
export const Toast = ({ message }: { message: ToastMessage | undefined }) => {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(message);
  useEffect(() => {
    setShown(message);
    if (message === undefined) return;
    AccessibilityInfo.announceForAccessibility(message.text);
    const timer = setTimeout(() => setShown(undefined), TOAST.duration - TOAST.fade);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 items-center"
      style={{ bottom: Math.max(24, insets.bottom) }}
    >
      {shown && (
        <Animated.View
          key={shown.key}
          entering={FadeInDown.duration(TOAST.fade)}
          exiting={FadeOut.duration(TOAST.fade)}
          className="rounded-full border border-white/15 bg-stone-950/85 px-4 py-2"
        >
          <Text className="font-serif text-base text-stone-100">{shown.text}</Text>
        </Animated.View>
      )}
    </View>
  );
};
