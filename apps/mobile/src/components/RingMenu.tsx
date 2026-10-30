import {
  RING_BUTTON,
  type Ring,
  ringItemAt,
  ringItemOffset,
  ringSizes,
  sceneText,
} from "@esquisse/shared";
import { useEffect, useRef, useState } from "react";
import { type GestureResponderEvent, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// How long the chosen item stays, lit, before the menu folds.
const CHOSEN = 220;

// The circle's and the icons' strokes, as the arrow to enter is drawn: each
// over a darker, wider one which lifts it off the scene; `lit`, white (the
// web's has the same).
const ICON_SCALE = 0.8;
const Icon = ({ path, size, lit }: { path: string; size: number; lit: boolean }) => (
  <Svg width={size * ICON_SCALE} height={size * ICON_SCALE} viewBox="0 0 24 24">
    {[
      { stroke: "rgba(0,0,0,0.5)", width: 3.5 },
      { stroke: lit ? "#ffffff" : "rgba(245,245,244,0.9)", width: 1.5 },
    ].map(({ stroke, width }) => (
      <Path
        key={width}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </Svg>
);

// Behind the circle held, or an icon under the finger or chosen: a white glow, fading towards its edges.
const glow = (strength: number) =>
  `radial-gradient(closest-side, rgba(255,255,255,${strength}), rgba(255,255,255,0))`;

// The items move with an animated style that NativeWind breaks on the
// Animated.View it styles (see Scene's cssInterop): this one it does not know.
const Spread = Animated.createAnimatedComponent(View);

// One of its items: a circle showing `label`; with `icon`, that stroke instead,
// drawn as the arrow to enter is (a path in a 24 × 24 viewBox; the web's has
// the same).
export type RingItem<Id extends string> = { id: Id; label: string; icon?: string };

// A circle in the bottom right corner of the screen: held, it spreads `items`
// in a quarter of a circle around it, from its left to above it, and the one
// under the finger when it is let go is chosen (ringItemAt in packages/shared);
// let go anywhere else, it folds. A screen reader offers its items as actions.
// Its sizes follow the frame's, the scene's screen (ringSizes); a phone's until
// it is measured.
// The web has the same (apps/web/components/RingMenu.tsx).
export const RingMenu = <Id extends string>({
  items,
  frame = { width: 400, height: 400 },
  onChoose,
}: {
  items: RingItem<Id>[];
  frame?: { width: number; height: number };
  onChoose(item: Id): void;
}) => {
  const insets = useSafeAreaInsets();
  const ring = ringSizes(frame.width, frame.height);
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
      ring,
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
        width: ring.size,
        height: ring.size,
      }}
    >
      {items.map((item, i) => (
        <Item
          key={item.id}
          item={item}
          index={i}
          count={items.length}
          ring={ring}
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
            x: pageX - locationX + ring.size / 2,
            y: pageY - locationY + ring.size / 2,
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
        className="absolute inset-0 items-center justify-center"
        style={{ transform: [{ scale: open ? 0.9 : 1 }] }}
      >
        {/* Its stroke alone, as the items' icons; held, glowing. */}
        {open && (
          <View
            pointerEvents="none"
            className="absolute"
            style={{ width: ring.size, height: ring.size, backgroundImage: glow(0.35) }}
          />
        )}
        {/* At rest, half seen, not to draw the eye from the scene; held,
            fully seen. */}
        <View style={{ opacity: open ? 1 : 0.55 }}>
          <Icon path={RING_BUTTON} size={ring.size} lit={open} />
        </View>
      </View>
    </View>
  );
};

// An item: centered on the circle, folded into it; open, it goes to its place
// (ringItemOffset), a little after the one before. Neutral, as the arrow to
// enter: under the finger, larger, white and glowing; chosen, lit white. An
// icon alone glows behind it (the web's RingMenu.module.css has the same).
const Item = <Id extends string>({
  item,
  index,
  count,
  ring,
  open,
  hovered,
  chosen,
}: {
  item: RingItem<Id>;
  index: number;
  count: number;
  ring: Ring;
  open: boolean;
  hovered: boolean;
  chosen: boolean;
}) => {
  const { x, y } = ringItemOffset(index, count, ring);
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
  if (item.icon) {
    return (
      <Spread
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          {
            position: "absolute",
            left: (ring.size - ring.item) / 2,
            top: (ring.size - ring.item) / 2,
            width: ring.item,
            height: ring.item,
            alignItems: "center",
            justifyContent: "center",
          },
          spread,
        ]}
      >
        {(hovered || chosen) && (
          <View
            className="absolute"
            style={{
              width: ring.item,
              height: ring.item,
              backgroundImage: glow(chosen ? 0.6 : 0.35),
            }}
          />
        )}
        <Icon path={item.icon} size={ring.item} lit={hovered || chosen} />
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
          left: (ring.size - ring.item) / 2,
          top: (ring.size - ring.item) / 2,
          width: ring.item,
          height: ring.item,
          borderRadius: ring.item / 2,
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
