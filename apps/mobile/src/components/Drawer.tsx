import type { ReactNode } from "react";
import { type GestureResponderEvent, Pressable, Text, View } from "react-native";
import Animated, {
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  SlideOutRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A touch on the drawer stops there, its parent never folds it.
const keepTouch = (event: GestureResponderEvent) => event.stopPropagation();

// One of the drawer's contents: its round button shows `icon`, named `label`.
export type DrawerTab<Id extends string> = {
  id: Id;
  icon: string;
  label: string;
  content: ReactNode;
};

// A panel over its parent, against its bottom or right edge, showing one of
// several contents, each opened by its round button on its edge (in a row,
// centered, at the bottom; in a column, centered, on the right);
// the open one's button folds it away, to see what is under it, and so does a
// touch anywhere else, which still reaches what it is on: its parent folds it in
// its onTouchStart, which the drawer's own touches never reach. Folded, it
// slides out; the buttons stay put.
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
  return (
    <>
      {shown &&
        (side === "right" ? (
          <Animated.View
            entering={SlideInRight.duration(300)}
            exiting={SlideOutRight.duration(300)}
            onTouchStart={keepTouch}
            className="absolute bottom-0 right-0 top-0 border-l border-amber-300/35 bg-stone-950/85"
            style={{ width: size }}
          >
            {shown.content}
          </Animated.View>
        ) : (
          <Animated.View
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(300)}
            onTouchStart={keepTouch}
            className="absolute bottom-0 left-0 right-0 border-t border-amber-300/35 bg-stone-950/85"
            style={{ height: size }}
          >
            {shown.content}
          </Animated.View>
        ))}

      {/* The round buttons: in a row, centered, at the bottom; in a column,
          centered, on the right. Their strip lets touches through between them.
          The open content's is lighter. */}
      <View
        pointerEvents="box-none"
        onTouchStart={keepTouch}
        className={`absolute justify-center gap-2 ${side === "right" ? "bottom-0 top-0 flex-col" : "left-0 right-0 flex-row"}`}
        style={
          side === "right"
            ? { right: Math.max(16, insets.right) }
            : { bottom: Math.max(16, insets.bottom) }
        }
      >
        {tabs.map((tab) => {
          const active = tab.id === open;
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
      </View>
    </>
  );
};
