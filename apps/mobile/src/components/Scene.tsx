import {
  type Box,
  CONTAINER_COLUMNS,
  CONTAINER_SLOTS,
  ENTER_ARROW,
  INTRO,
  INTRO_HOLD,
  INVENTORY_COLUMNS,
  INVENTORY_SLOTS,
  initialSceneState,
  itemName,
  type ObjectAction,
  objectAction,
  objectActions,
  objectMenuPlace,
  placeStyle,
  playScene,
  RING_ITEMS,
  remainingTopics,
  type SceneData,
  type SceneObject,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  type ImageSourcePropType,
  type LayoutRectangle,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { SceneImages } from "../scenes.ts";
import { Drawer } from "./Drawer.tsx";
import { Effects } from "./Effects.tsx";
import { RingMenu } from "./RingMenu.tsx";

// Same scene as the web one (apps/web/components/Scene.tsx): the background
// covers the screen, each object is one action, each character opens a dialogue.
// Everything is placed in % of the image (see sceneLayout in packages/shared),
// so it follows the cropping. What it shows as it is played is playScene's,
// shared with the web site.

// The text is a band at the bottom, 22% of the screen's height; in landscape, a
// panel on the right, 256 wide but never more than 30% of the screen. Both are
// over the image (the web's Scene.module.css has the same): the safe zones
// leave them free (see packages/generator). Either can be folded, to see the
// whole image.
const BAND = 0.22;

// Between the inventory's slots, and what the band keeps for its padding and
// the title.
const SLOT_GAP = 8;
const SLOTS_ROOM = 64;

// A slot of what an object searched holds (the web's Scene.module.css has the same).
const CONTAINER_SLOT = 72;

type DrawerTabId = "inventory";

// The items' images, by id (see ITEMS in packages/shared).
const ITEM_IMAGES: Record<string, ImageSourcePropType> = {
  pelle: require("@esquisse/shared/assets/items/pelle.webp"),
};

// An item in a slot, the whole slot (the web's Scene.module.css has the same).
const ItemImage = ({ item }: { item: string }) => (
  <Image
    source={ITEM_IMAGES[item]}
    resizeMode="contain"
    style={{ width: "76%", height: "76%", margin: "12%" }}
  />
);

const panelWidth = (screenWidth: number) => Math.min(256, screenWidth * 0.3);

const place = (box: Box) => ({ position: "absolute" as const, ...placeStyle(box) });

// A pressed object: a slight overexposure of the image, no outline (the web's
// Scene.module.css has the same).
const OVEREXPOSED = "radial-gradient(closest-side, rgba(255,255,255,0.18), rgba(255,255,255,0))";

// NativeWind styles only the components it knows.
cssInterop(Animated.View, { className: "style" });
cssInterop(Animated.Text, { className: "style" });

// The arrow to enter fades in, with an animated style that NativeWind breaks on
// the Animated.View it styles: this one it does not know (Drawer has the same).
const Fading = Animated.createAnimatedComponent(View);

// The action's label, above what it names, centered and on one line even when
// wider than it.
const Tip = ({ label }: { label: string }) => (
  <View
    pointerEvents="none"
    className="absolute bottom-full mb-1.5 items-center"
    style={{ left: -200, right: -200 }}
  >
    <Text className="rounded-full bg-stone-950/85 px-2.5 py-1 font-serif text-sm text-amber-200">
      {label}
    </Text>
  </View>
);

export const Scene = ({ data, images }: { data: SceneData; images: SceneImages }) => {
  const { scene } = data;
  const layout = sceneLayout(data);
  const insets = useSafeAreaInsets();

  // The image covers the screen, centered: cropped on the sides of a phone, at
  // the top and bottom of a tablet.
  const [screen, setScreen] = useState<LayoutRectangle>();
  const image = screen && {
    width: Math.max(screen.width, screen.height * layout.ratio),
    height: Math.max(screen.height, screen.width / layout.ratio),
  };

  const [{ conversation, inventory, contents, searching }, dispatch] = useReducer(
    playScene,
    data,
    initialSceneState,
  );

  // ── Dialogue: an open conversation, until it is left ─────────────────────────

  const lines = useRef<ScrollViewInstance>(null);
  const close = () => dispatch({ type: "leave" });

  // An object's menu: its actions, where it was pressed. Android's back button
  // closes it.
  const [menu, setMenu] = useState<{ object: SceneObject; x: number; y: number }>();
  const menuOpen = menu !== undefined;
  useEffect(() => {
    if (!menuOpen || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setMenu(undefined);
      return true;
    });
    return () => sub.remove();
  }, [menuOpen]);

  // Android's back button leaves the conversation, not the scene.
  const inConversation = conversation !== undefined;
  useEffect(() => {
    if (!inConversation || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      dispatch({ type: "leave" });
      return true;
    });
    return () => sub.remove();
  }, [inConversation]);

  // What an object searched holds, until it is closed: Android's back button
  // closes it too.
  const isSearching = searching !== undefined;
  const stopSearching = () => dispatch({ type: "stopSearching" });
  useEffect(() => {
    if (!isSearching || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      dispatch({ type: "stopSearching" });
      return true;
    });
    return () => sub.remove();
  }, [isSearching]);

  const panel = screen ? panelWidth(screen.width) : 0;
  const band = screen ? screen.height * BAND : 0;

  // The drawer shows the inventory, opened by the ring menu's satchel; it can be
  // folded to see the whole image. It starts folded.
  const [drawerTab, setDrawerTab] = useState<DrawerTabId | undefined>(undefined);

  // Opening the scene: its title on black, then its intro fading in under it;
  // shortly after it has appeared, the arrow to enter fades in, in the bottom
  // right corner, and the scene waits for it. Pressed, everything fades out to
  // show the scene (the web's Scene.module.css has the same). It cannot be skipped.
  const [intro, setIntro] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIntroReady(true), INTRO_HOLD);
    return () => clearTimeout(timer);
  }, []);

  // The panel's padding, inside the screen's safe area.
  const panelPadding = {
    paddingTop: Math.max(20, insets.top),
    paddingRight: Math.max(20, insets.right),
    paddingBottom: Math.max(20, insets.bottom),
    paddingLeft: 20,
  };

  // The inventory: its title, then its slots, rounded squares, holding the
  // items carried (see INVENTORY_COLUMNS): in the band, two rows, as wide as the band allows
  // and no taller than it (SLOTS_ROOM is what the band keeps for its padding and
  // the title); on the right, three columns (the web's Scene.module.css has the same).
  const columns = layout.landscape ? INVENTORY_COLUMNS.right : INVENTORY_COLUMNS.bottom;
  const [slotsWidth, setSlotsWidth] = useState(0);
  const slotWidth = Math.max(
    0,
    Math.min(
      (slotsWidth - SLOT_GAP * (columns - 1)) / columns,
      layout.landscape ? Number.POSITIVE_INFINITY : (band - SLOTS_ROOM - SLOT_GAP) / 2,
    ),
  );
  const inventoryPanel = (
    <ScrollView
      contentContainerClassName={layout.landscape ? undefined : "px-5 pt-4"}
      contentContainerStyle={
        layout.landscape ? panelPadding : { paddingBottom: Math.max(16, insets.bottom) }
      }
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text className="mb-2.5 font-serif text-xs uppercase tracking-widest text-stone-300">
          {sceneText.inventory}
        </Text>
        {/* Each slot as high as it is wide, set, not stretched by its row. */}
        <View
          className="flex-row flex-wrap items-start"
          style={{ gap: SLOT_GAP }}
          onLayout={(event) => setSlotsWidth(event.nativeEvent.layout.width)}
        >
          {INVENTORY_SLOTS.map((slot, i) => {
            const item = inventory[i];
            return (
              <View
                key={slot}
                accessible
                accessibilityLabel={item === undefined ? sceneText.emptySlot : itemName(item)}
                className="rounded-[10px] border border-white/10 bg-white/5"
                style={{ width: slotWidth, height: slotWidth }}
              >
                {item !== undefined && <ItemImage item={item} />}
              </View>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );

  return (
    <View
      className="flex-1 overflow-hidden bg-stone-950"
      onLayout={(event) => setScreen(event.nativeEvent.layout)}
      // A touch out of the drawer folds it (see Drawer).
      onTouchStart={() => {
        if (drawerTab !== undefined) setDrawerTab(undefined);
      }}
    >
      <StatusBar style="light" />

      {screen && image && (
        <View
          importantForAccessibility={inConversation || isSearching ? "no-hide-descendants" : "auto"}
          accessibilityElementsHidden={inConversation || isSearching}
          style={{
            position: "absolute",
            width: image.width,
            height: image.height,
            left: (screen.width - image.width) / 2,
            top: (screen.height - image.height) / 2,
          }}
        >
          <Image source={images.background} style={{ width: "100%", height: "100%" }} />
          {scene.effects && Platform.OS !== "web" && (
            <Effects
              effects={scene.effects}
              background={images.background}
              files={images.effects}
              size={image}
            />
          )}

          {layout.objects.map(({ object, box }) => (
            <Pressable
              key={object.id}
              accessibilityRole="button"
              accessibilityLabel={object.label}
              onPress={(event) =>
                setMenu({ object, x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
              }
              style={place(box)}
            >
              {({ pressed }) => (
                <>
                  {/* Pressed, or its menu open, a slight overexposure, fading
                      towards its edges. */}
                  {(pressed || menu?.object === object) && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(300)}
                      className="absolute inset-0"
                      style={{ backgroundImage: OVEREXPOSED }}
                    />
                  )}
                </>
              )}
            </Pressable>
          ))}

          {/* Characters: layers placed by their feet. */}
          {layout.characters.map(({ character, box }) => {
            const source = images.characters[character.id];
            if (source === undefined) return null;
            const label = sceneText.talkTo(character.name);
            return (
              <Pressable
                key={character.id}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => dispatch({ type: "talk", character })}
                style={place(box)}
              >
                {({ pressed }) => (
                  <>
                    {/* Shadow on the floor, under the feet. */}
                    <View
                      className="absolute rounded-full bg-black/40"
                      style={{ left: "10%", right: "10%", bottom: "-1.5%", height: "4%" }}
                    />
                    <Image
                      source={source}
                      resizeMode="contain"
                      style={{ width: "100%", height: "100%", opacity: pressed ? 0.85 : 1 }}
                    />
                    {pressed && <Tip label={label} />}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* The inventory: the bottom band, over the image; in landscape, the panel
          on the right, the whole height (see BAND and panelWidth). */}
      <Drawer<DrawerTabId>
        side={layout.landscape ? "right" : "bottom"}
        size={layout.landscape ? panel : band}
        // The ring menu takes their place (see below).
        hideButtons
        open={drawerTab}
        onOpen={setDrawerTab}
        tabs={[{ id: "inventory", label: sceneText.inventory, content: inventoryPanel }]}
      />

      {/* The ring menu, in the bottom right corner: pressing it folds the
          drawer, its satchel opens the inventory; what its other items do is
          to come. */}
      <RingMenu
        items={[
          {
            id: "inventory",
            label: sceneText.inventory,
            image: require("@esquisse/shared/assets/ui/besace.webp"),
          },
          ...RING_ITEMS.map((item) => ({ id: item, label: item })),
        ]}
        onChoose={(item) => {
          if (item === "inventory") setDrawerTab("inventory");
        }}
      />

      {menu && screen && (
        <ObjectMenu
          object={menu.object}
          x={menu.x}
          y={menu.y}
          screen={screen}
          onClose={() => setMenu(undefined)}
          onAction={(action) => {
            dispatch(objectAction(menu.object, action));
            setMenu(undefined);
          }}
        />
      )}

      {/* What the object searched holds: a press on an item puts it in the
          inventory. Like a conversation, it takes the scene. */}
      {searching && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className={`absolute inset-0 justify-end bg-black/35 ${layout.landscape ? "flex-row" : ""}`}
        >
          <Pressable
            className="absolute inset-0"
            accessibilityLabel={sceneText.close}
            accessibilityRole="button"
            onPress={stopSearching}
          />
          <Animated.View
            entering={FadeInDown.duration(250)}
            accessibilityViewIsModal
            className={layout.landscape ? "bg-stone-900" : "rounded-t-3xl bg-stone-900 p-5"}
            style={
              layout.landscape
                ? { width: panel, ...panelPadding }
                : { paddingBottom: Math.max(20, insets.bottom) }
            }
          >
            <Text
              accessibilityRole="header"
              className="mb-3 font-serif text-sm uppercase tracking-widest text-amber-300"
            >
              {searching.label}
            </Text>
            <View
              className="flex-row flex-wrap"
              style={{
                gap: SLOT_GAP,
                width: CONTAINER_COLUMNS * CONTAINER_SLOT + (CONTAINER_COLUMNS - 1) * SLOT_GAP,
              }}
            >
              {CONTAINER_SLOTS.map((slot, i) => {
                const item = contents[searching.id]?.[i];
                const box = { width: CONTAINER_SLOT, height: CONTAINER_SLOT };
                const look = "rounded-[10px] border border-white/10 bg-white/5";
                return item === undefined ? (
                  <View
                    key={slot}
                    accessible
                    accessibilityLabel={sceneText.emptySlot}
                    className={look}
                    style={box}
                  />
                ) : (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityLabel={sceneText.take(itemName(item))}
                    onPress={() => dispatch({ type: "take", item })}
                    className={`${look} active:bg-white/15`}
                    style={box}
                  >
                    <ItemImage item={item} />
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-3">
              <Choice label={sceneText.close} onPress={stopSearching} />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Dialogue: an open conversation takes the scene, the background waits. */}
      {conversation && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className={`absolute inset-0 justify-end bg-black/35 ${layout.landscape ? "flex-row" : ""}`}
        >
          <Pressable
            className="absolute inset-0"
            accessibilityLabel={sceneText.goodbye}
            accessibilityRole="button"
            onPress={close}
          />
          <Animated.View
            entering={FadeInDown.duration(250)}
            accessibilityViewIsModal
            // In landscape, the conversation takes the text panel's place.
            className={layout.landscape ? "bg-stone-900" : "max-h-[60%] rounded-t-3xl bg-stone-900"}
            style={layout.landscape ? { width: panel } : undefined}
          >
            <ScrollView
              ref={lines}
              contentContainerClassName={layout.landscape ? undefined : "p-5"}
              contentContainerStyle={
                layout.landscape ? panelPadding : { paddingBottom: Math.max(20, insets.bottom) }
              }
              onContentSizeChange={() => lines.current?.scrollToEnd({ animated: true })}
            >
              <Text
                accessibilityRole="header"
                className="mb-3 font-serif text-sm uppercase tracking-widest text-amber-300"
              >
                {conversation.character.name}
              </Text>
              {conversation.lines.map((line, i) => (
                <Text
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are only appended
                  key={i}
                  className={`mb-2.5 font-serif text-base leading-6 ${line.player ? "italic text-stone-400" : "text-stone-100"}`}
                >
                  {line.text}
                </Text>
              ))}
              <View className="mt-3 gap-1.5">
                {remainingTopics(conversation).map((topic) => (
                  <Choice
                    key={topic.ask}
                    label={topic.ask}
                    onPress={() => dispatch({ type: "ask", topic })}
                  />
                ))}
                <Choice label={sceneText.goodbye} onPress={close} />
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {intro && (
        <Animated.View
          exiting={FadeOut.duration(INTRO.fade)}
          className="absolute inset-0 items-center justify-center bg-black"
        >
          <View className="absolute inset-0 items-center justify-center px-8">
            <Text
              accessibilityRole="header"
              className="text-center font-serif text-4xl leading-tight text-stone-100"
              style={{
                textShadowColor: "rgba(0,0,0,0.8)",
                textShadowRadius: 12,
                textShadowOffset: { width: 0, height: 2 },
              }}
            >
              {scene.title}
            </Text>
            <Animated.Text
              entering={FadeIn.duration(INTRO.textFade).delay(INTRO.textDelay)}
              className="mt-10 max-w-md text-center font-serif text-lg italic leading-relaxed text-stone-300"
            >
              {scene.intro}
            </Animated.Text>
          </View>
          <EnterButton
            ready={introReady}
            onPress={() => setIntro(false)}
            style={{
              right: Math.max(20, insets.right),
              bottom: Math.max(20, insets.bottom),
            }}
          />
        </Animated.View>
      )}
    </View>
  );
};

// The arrow to enter, in the bottom right corner, out of the way of the title
// and the intro (the web's Scene.module.css has the same): pointing right,
// brighter while it is pressed.
const EnterButton = ({
  ready,
  onPress,
  style,
}: {
  ready: boolean;
  onPress(): void;
  style: { right: number; bottom: number };
}) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (ready) opacity.value = withTiming(1, { duration: INTRO.buttonFade });
  }, [ready, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Fading
      style={[{ position: "absolute" }, style, fade]}
      pointerEvents={ready ? "auto" : "none"}
      accessibilityElementsHidden={!ready}
      importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sceneText.enter}
        onPress={onPress}
        hitSlop={12}
      >
        {({ pressed }) => (
          <Svg width={40} height={40} viewBox="0 0 24 24">
            <Path
              d={ENTER_ARROW}
              fill="none"
              stroke={pressed ? "#ffffff" : "rgba(245,245,244,0.7)"}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </Pressable>
    </Fading>
  );
};

// An object's actions, in a menu to the right of where it was pressed, or to
// its left (see objectMenuPlace; the web's ObjectMenu has the same). A touch out of it closes it.
const ObjectMenu = ({
  object,
  x,
  y,
  screen,
  onClose,
  onAction,
}: {
  object: SceneObject;
  x: number;
  y: number;
  screen: LayoutRectangle;
  onClose(): void;
  onAction(action: ObjectAction): void;
}) => {
  const [size, setSize] = useState<{ width: number; height: number }>();
  return (
    <View className="absolute inset-0">
      <Pressable className="absolute inset-0" onPress={onClose} accessible={false} />
      <Animated.View
        entering={FadeIn.duration(150)}
        accessibilityLabel={sceneText.actionsOf(object.label)}
        onLayout={(event) => setSize(event.nativeEvent.layout)}
        className="absolute min-w-40 rounded-xl border border-amber-300/30 bg-stone-950/90 p-1"
        style={size ? objectMenuPlace({ x, y }, size, screen) : { left: x, top: y, opacity: 0 }}
      >
        {objectActions(object).map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="menuitem"
            onPress={() => onAction(action)}
            className="rounded-lg px-3 py-2.5 active:bg-white/10"
          >
            <Text className="font-serif text-base text-white">{action.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
};

const Choice = ({ label, onPress }: { label: string; onPress(): void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className="rounded-xl border border-amber-300/35 bg-amber-300/5 px-3 py-2.5 active:bg-amber-300/15"
  >
    <Text className="font-serif text-base text-stone-100">{label}</Text>
  </Pressable>
);
