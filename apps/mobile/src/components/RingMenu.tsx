import { RING, ringItemAt, ringItemOffset, sceneText } from "@esquisse/shared";
import { useEffect, useRef, useState } from "react";
import {
  type GestureResponderEvent,
  Image,
  type ImageSourcePropType,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// How long the chosen item stays, lit, before the menu folds.
const CHOSEN = 220;

// The items move with an animated style that NativeWind breaks on the
// Animated.View it styles (see Scene's cssInterop): this one it does not know.
const Spread = Animated.createAnimatedComponent(View);

// One of its items: a circle showing `label`; with `image`, that image alone
// (the web's has the same).
export type RingItem<Id extends string> = {
  id: Id;
  label: string;
  image?: ImageSourcePropType;
};

// An image as an item, larger than a circle, as on the web.
const IMAGE_SCALE = 1.4;

// Behind an image item under the finger, or chosen: a white glow, fading towards its edges.
const glow = (strength: number) =>
  `radial-gradient(closest-side, rgba(255,255,255,${strength}), rgba(255,255,255,0))`;

// A circle in the bottom right corner of the screen: held, it spreads `items`
// in a quarter of a circle around it, from its left to above it, and the one
// under the finger when it is let go is chosen (ringItemAt in packages/shared);
// let go anywhere else, it folds. A screen reader offers its items as actions.
// The web has the same (apps/web/components/RingMenu.tsx).
export const RingMenu = <Id extends string>({
  items,
  onChoose,
}: {
  items: RingItem<Id>[];
  onChoose(item: Id): void;
}) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number>();
  const [chosen, setChosen] = useState<number>();
  // The circle's center, in the screen, from where it was first touched.
  const center = useRef({ x: 0, y: 0 });

  const at = (event: GestureResponderEvent) =>
    ringItemAt(
      {
        x: event.nativeEvent.pageX - center.current.x,
        y: event.nativeEvent.pageY - center.current.y,
      },
      items.length,
    );
  const choose = (index: number) => {
    setChosen(index);
    const item = items[index];
    if (item) onChoose(item.id);
  };

  // The chosen item stays a moment, then the menu folds.
  useEffect(() => {
    if (chosen === undefined) return;
    const timer = setTimeout(() => {
      setChosen(undefined);
      setOpen(false);
      setHovered(undefined);
    }, CHOSEN);
    return () => clearTimeout(timer);
  }, [chosen]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: Math.max(16, insets.right),
        bottom: Math.max(16, insets.bottom),
        width: RING.size,
        height: RING.size,
      }}
    >
      {items.map((item, i) => (
        <Item
          key={item.id}
          item={item}
          index={i}
          count={items.length}
          open={open}
          hovered={hovered === i}
          chosen={chosen === i}
        />
      ))}
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={sceneText.ringMenu}
        accessibilityActions={items.map((item) => ({ name: item.id, label: item.label }))}
        onAccessibilityAction={(event) => {
          const item = items.find(({ id }) => id === event.nativeEvent.actionName);
          if (item) onChoose(item.id);
        }}
        onStartShouldSetResponder={() => chosen === undefined}
        // Held, it keeps the finger, even out of it.
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          const { pageX, pageY, locationX, locationY } = event.nativeEvent;
          center.current = {
            x: pageX - locationX + RING.size / 2,
            y: pageY - locationY + RING.size / 2,
          };
          setOpen(true);
        }}
        onResponderMove={(event) => setHovered(at(event))}
        onResponderRelease={(event) => {
          const index = at(event);
          if (index !== undefined) return choose(index);
          setOpen(false);
          setHovered(undefined);
        }}
        onResponderTerminate={() => {
          setOpen(false);
          setHovered(undefined);
        }}
        className={`absolute inset-0 items-center justify-center rounded-full border ${open ? "border-white/80 bg-stone-950/85" : "border-stone-100/30 bg-stone-950/85"}`}
        style={{
          transform: [{ scale: open ? 0.9 : 1 }],
          boxShadow: open ? "0 0 10px rgba(255,255,255,0.35)" : undefined,
        }}
      >
        {/* A smaller circle in it. */}
        <View
          pointerEvents="none"
          className={`rounded-full border ${open ? "border-white" : "border-stone-100/60"}`}
          style={{ width: RING.size * 0.36, height: RING.size * 0.36 }}
        />
      </View>
    </View>
  );
};

// An item: centered on the circle, folded into it; open, it goes to its place
// (ringItemOffset), a little after the one before. Neutral, as the arrow to
// enter: under the finger, larger, white and glowing; chosen, lit white. An
// image alone glows behind it (the web's RingMenu.module.css has the same).
const Item = <Id extends string>({
  item,
  index,
  count,
  open,
  hovered,
  chosen,
}: {
  item: RingItem<Id>;
  index: number;
  count: number;
  open: boolean;
  hovered: boolean;
  chosen: boolean;
}) => {
  const { x, y } = ringItemOffset(index, count);
  const scale = chosen ? 1.2 : hovered ? 1.15 : 1;
  const spread = useAnimatedStyle(() => {
    const timing = (to: number) =>
      open
        ? withDelay(index * 30, withTiming(to, { duration: 200 }))
        : withTiming(to, { duration: 160 });
    return {
      opacity: timing(open ? 1 : 0),
      transform: [
        { translateX: timing(open ? x : 0) },
        { translateY: timing(open ? y : 0) },
        { scale: withTiming(open ? scale : 0.4, { duration: open ? 140 : 160 }) },
      ],
    };
  });
  const place = {
    position: "absolute" as const,
    left: (RING.size - RING.item) / 2,
    top: (RING.size - RING.item) / 2,
    width: RING.item,
    height: RING.item,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  if (item.image) {
    const size = RING.item * IMAGE_SCALE;
    return (
      <Spread
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[place, spread]}
      >
        {(hovered || chosen) && (
          <View
            className="absolute"
            style={{ width: size, height: size, backgroundImage: glow(chosen ? 0.6 : 0.35) }}
          />
        )}
        <Image source={item.image} resizeMode="contain" style={{ width: size, height: size }} />
      </Spread>
    );
  }
  return (
    <Spread
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        {
          position: "absolute",
          left: (RING.size - RING.item) / 2,
          top: (RING.size - RING.item) / 2,
          width: RING.item,
          height: RING.item,
          borderRadius: RING.item / 2,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: chosen ? "#f5f5f4" : "rgba(12,10,9,0.85)",
          borderColor: chosen
            ? "#fff"
            : hovered
              ? "rgba(255,255,255,0.8)"
              : "rgba(245,245,244,0.3)",
          boxShadow: chosen
            ? "0 0 14px rgba(255,255,255,0.6)"
            : hovered
              ? "0 0 10px rgba(255,255,255,0.35)"
              : undefined,
        },
        spread,
      ]}
    >
      <Text
        className={`font-serif text-lg ${chosen ? "text-stone-950" : hovered ? "text-white" : "text-stone-100/70"}`}
      >
        {item.label}
      </Text>
    </Spread>
  );
};
