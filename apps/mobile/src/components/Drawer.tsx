import type { ReactNode } from "react";
import {
  type GestureResponderEvent,
  Image,
  type ImageSourcePropType,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutRight,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Between the buttons and the open panel.
const GAP = 8;

// An image as a button (see DrawerTab), 4.5rem wide as on the web.
const IMAGE_SIZE = 72;

// The buttons' strip slides, with an animated style that NativeWind breaks on
// the Animated.View it styles (see Scene's cssInterop): this one it does not know.
const Strip = Animated.createAnimatedComponent(View);

// A touch on the drawer stops there, its parent never folds it.
const keepTouch = (event: GestureResponderEvent) => event.stopPropagation();

// One of the drawer's contents: its round button shows `icon`, named `label`;
// with `image`, its button is that image alone, which sinks a little when pressed
// (the web's has the same).
export type DrawerTab<Id extends string> = {
  id: Id;
  icon?: string;
  image?: ImageSourcePropType;
  label: string;
  content: ReactNode;
};

// A panel over its parent, against its bottom or right edge, showing one of
// several contents, each opened by its round button. The buttons stand toward
// the bottom right corner, just out of the panel: in a row above it, or in a
// column on its left; folded, it slides out and they slide with it to the edge.
// The open content's button folds it away, to see what is under it, and so
// does a touch anywhere else, which still reaches what it is on: its parent
// folds it in its onTouchStart, which the drawer's own touches never reach.
// `size` is its height at the bottom, or its width on the right. The web has
// the same (apps/web/components/Drawer.tsx).
export const Drawer = <Id extends string>({
  side,
  size,
  tabs,
  open,
  onOpen,
}: {
  side: "bottom" | "right";
  size: number;
  tabs: DrawerTab<Id>[];
  // The open content, none when folded.
  open: Id | undefined;
  onOpen(tab: Id | undefined): void;
}) => {
  const insets = useSafeAreaInsets();
  const shown = tabs.find((tab) => tab.id === open);

  // The buttons stand just out of the panel; folded, they slide to the edge.
  const right = side === "right";
  const beside = size + GAP;
  const edge = Math.max(16, right ? insets.right : insets.bottom);
  const away = shown ? 0 : beside - edge;
  const slide = useAnimatedStyle(() => ({
    transform: right
      ? [{ translateX: withTiming(away, { duration: 300 }) }]
      : [{ translateY: withTiming(away, { duration: 300 }) }],
  }));
  return (
    <>
      {shown &&
        (right ? (
          <Animated.View
            entering={SlideInRight.duration(300)}
            exiting={SlideOutRight.duration(300)}
            onTouchStart={keepTouch}
            className="absolute bottom-0 right-0 top-0 bg-stone-950/95"
            style={{ width: size }}
          >
            {shown.content}
          </Animated.View>
        ) : (
          <Animated.View
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(300)}
            onTouchStart={keepTouch}
            className="absolute bottom-0 left-0 right-0 bg-stone-950/95"
            style={{ height: size }}
          >
            {shown.content}
          </Animated.View>
        ))}

      {/* The round buttons, toward the bottom right corner: in a row at the
          bottom; in a column on the right. Their strip lets touches through between them.
          The open content's is lighter. */}
      <Strip
        pointerEvents="box-none"
        onTouchStart={keepTouch}
        style={[
          { position: "absolute", justifyContent: "flex-end", alignItems: "flex-end", gap: 8 },
          right
            ? {
                top: 0,
                bottom: 0,
                right: beside,
                flexDirection: "column",
                paddingBottom: Math.max(16, insets.bottom),
              }
            : {
                left: 0,
                right: 0,
                bottom: beside,
                flexDirection: "row",
                paddingRight: Math.max(16, insets.right),
              },
          slide,
        ]}
      >
        {tabs.map((tab) => {
          const active = tab.id === open;
          if (tab.image) {
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ expanded: active }}
                onPress={() => onOpen(active ? undefined : tab.id)}
              >
                {({ pressed }) => (
                  <Image
                    source={tab.image}
                    resizeMode="contain"
                    style={{
                      width: IMAGE_SIZE,
                      height: IMAGE_SIZE,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    }}
                  />
                )}
              </Pressable>
            );
          }
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ expanded: active }}
              onPress={() => onOpen(active ? undefined : tab.id)}
              className={`h-11 w-11 items-center justify-center rounded-full border active:bg-stone-900 ${active ? "border-amber-300/80 bg-stone-900" : "border-amber-300/35 bg-stone-950"}`}
            >
              <Text className="font-serif text-lg text-amber-200">{tab.icon}</Text>
            </Pressable>
          );
        })}
      </Strip>
    </>
  );
};
