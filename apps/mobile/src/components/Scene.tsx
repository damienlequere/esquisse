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
  RING_ICONS,
  remainingTopics,
  type SceneData,
  type SceneObject,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
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
import { Effects } from "./Effects.tsx";
import { RingMenu } from "./RingMenu.tsx";
import { Toast } from "./Toast.tsx";

// Same scene as the web one (apps/web/components/Scene.tsx): the background
// covers the screen, each object is one action, each character opens a dialogue.
// Everything is placed in % of the image (see sceneLayout in packages/shared),
// so it follows the cropping. What it shows as it is played is playScene's,
// shared with the web site.

// In landscape, a conversation is a panel on the right, 256 wide but never more
// than 30% of the screen (the web's Scene.module.css has the same).

// A slot of a window (see SlotsWindow), and the room between two (the web's
// Scene.module.css has the same).
const SLOT = 72;
const SLOT_GAP = 8;
const SLOT_LOOK = "rounded-[10px] border border-stone-100/15 bg-black/25";

// The look of every box over the scene (the tip, the windows, the dialogue, an
// object's menu), as the ring menu's: a thin pale stroke on a dark, slightly
// translucent ground (the web's Scene.module.css has the same).
const BOX_LOOK = "border-stone-100/30 bg-stone-950/85";

// The same, as a style: NativeWind drops a className's border when the view
// also gets a style, as an object's menu, placed where it was pressed.
const BOX_STYLE = {
  borderWidth: 1,
  borderColor: "rgba(245,245,244,0.3)",
  backgroundColor: "rgba(12,10,9,0.85)",
};

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
// the Animated.View it styles: this one it does not know.
const Fading = Animated.createAnimatedComponent(View);

// The action's label, above what it names, centered and on one line even when
// wider than it.
const Tip = ({ label }: { label: string }) => (
  <View
    pointerEvents="none"
    className="absolute bottom-full mb-1.5 items-center"
    style={{ left: -200, right: -200 }}
  >
    <Text
      className={`rounded-full border px-2.5 py-1 font-serif text-sm text-stone-100 ${BOX_LOOK}`}
    >
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

  const [{ conversation, inventory, contents, searching, toast, logbook }, dispatch] = useReducer(
    playScene,
    data,
    initialSceneState,
  );

  // Leaving the scene, from the general menu, for the home screen.
  const router = useRouter();
  const quit = () => (router.canGoBack() ? router.back() : router.replace("/"));

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

  // The inventory's window, opened by the ring menu's satchel, the logbook's,
  // opened by its book, the general menu's, opened by its cogwheel, and the
  // one of what an object searched holds: under them, the scene is hidden
  // from screen readers.
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [logbookOpen, setLogbookOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const inWindow = inventoryOpen || logbookOpen || gameMenuOpen || searching !== undefined;

  const panel = screen ? panelWidth(screen.width) : 0;

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

  return (
    <View
      className="flex-1 overflow-hidden bg-stone-950"
      onLayout={(event) => setScreen(event.nativeEvent.layout)}
    >
      <StatusBar style="light" />

      {screen && image && (
        <View
          importantForAccessibility={inConversation || inWindow ? "no-hide-descendants" : "auto"}
          accessibilityElementsHidden={inConversation || inWindow}
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

      {/* The ring menu, in the bottom right corner: its satchel opens the
          inventory, its book the logbook, its cogwheel the general menu. */}
      <RingMenu
        frame={screen}
        items={[
          { id: "inventory", label: sceneText.inventory, icon: RING_ICONS.inventory },
          { id: "logbook", label: sceneText.logbook, icon: RING_ICONS.logbook },
          { id: "gameMenu", label: sceneText.gameMenu, icon: RING_ICONS.gameMenu },
        ]}
        onChoose={(item) => {
          if (item === "inventory") setInventoryOpen(true);
          if (item === "logbook") setLogbookOpen(true);
          if (item === "gameMenu") setGameMenuOpen(true);
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

      {/* The inventory, opened by the ring menu's satchel: the items carried. */}
      {inventoryOpen && (
        <SlotsWindow
          label={sceneText.inventory}
          titled
          columns={INVENTORY_COLUMNS}
          onClose={() => setInventoryOpen(false)}
        >
          {INVENTORY_SLOTS.map((slot, i) => {
            const item = inventory[i];
            return (
              <View
                key={slot}
                accessible
                accessibilityLabel={item === undefined ? sceneText.emptySlot : itemName(item)}
                className={SLOT_LOOK}
                style={{ width: SLOT, height: SLOT }}
              >
                {item !== undefined && <ItemImage item={item} />}
              </View>
            );
          })}
        </SlotsWindow>
      )}

      {/* The logbook, opened by the ring menu's book: its entries, oldest
          first, the scene's intro the first (the web's has the same). */}
      {logbookOpen && (
        <Window label={sceneText.logbook} titled onClose={() => setLogbookOpen(false)}>
          {/* As tall as its entries, up to 60% of the screen: a ScrollView
              otherwise grows to all it may. */}
          <ScrollView
            style={{ flexGrow: 0, maxWidth: 416, maxHeight: (screen?.height ?? 600) * 0.6 }}
          >
            {logbook.map((entry, i) => (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: entries are only appended
                key={i}
                className={`font-serif text-base italic leading-6 text-stone-300 ${i > 0 ? "mt-3.5 border-t border-stone-100/15 pt-3.5" : ""}`}
              >
                {entry}
              </Text>
            ))}
          </ScrollView>
        </Window>
      )}

      {/* The general menu, opened by the ring menu's cogwheel: save the game
          (to come: it does nothing yet), or leave the scene for the home screen. */}
      {gameMenuOpen && (
        <Window label={sceneText.gameMenu} onClose={() => setGameMenuOpen(false)}>
          <View className="min-w-56 gap-1.5">
            <Choice label={sceneText.save} onPress={() => {}} />
            <Choice label={sceneText.quit} onPress={quit} />
          </View>
        </Window>
      )}

      {/* What the object searched holds: a press on an item puts it in the
          inventory. */}
      {searching && (
        <SlotsWindow
          label={searching.label}
          columns={CONTAINER_COLUMNS}
          onClose={() => dispatch({ type: "stopSearching" })}
        >
          {CONTAINER_SLOTS.map((slot, i) => {
            const item = contents[searching.id]?.[i];
            return item === undefined ? (
              <View
                key={slot}
                accessible
                accessibilityLabel={sceneText.emptySlot}
                className={SLOT_LOOK}
                style={{ width: SLOT, height: SLOT }}
              />
            ) : (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={sceneText.take(itemName(item))}
                onPress={() => dispatch({ type: "take", item })}
                className={`${SLOT_LOOK} active:border-white/80`}
                style={{ width: SLOT, height: SLOT }}
              >
                <ItemImage item={item} />
              </Pressable>
            );
          })}
        </SlotsWindow>
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
            className={`${BOX_LOOK} ${layout.landscape ? "border-l" : "max-h-[60%] rounded-t-3xl border-t"}`}
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
                className="mb-3 font-serif text-sm uppercase tracking-widest text-stone-100/70"
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

      {/* What was just done, as taking an item: over the rest. */}
      <Toast message={toast} />

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

// A window in the middle of the screen, over the darkened scene, in both
// orientations, showing `children`; `titled`, its label above them, otherwise
// only for screen readers. A touch out of it, or Android's back button, closes
// it (the web's Window has the same).
const Window = ({
  label,
  titled,
  onClose,
  children,
}: {
  label: string;
  titled?: boolean;
  onClose(): void;
  children: ReactNode;
}) => {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      close.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="absolute inset-0 items-center justify-center bg-black/50 p-4"
    >
      <Pressable
        className="absolute inset-0"
        accessibilityLabel={sceneText.close}
        accessibilityRole="button"
        onPress={onClose}
      />
      <Animated.View
        entering={FadeInDown.duration(250)}
        accessibilityViewIsModal
        accessibilityLabel={label}
        className={`rounded-3xl border p-5 ${BOX_LOOK}`}
      >
        {titled && (
          <Text
            importantForAccessibility="no"
            accessibilityElementsHidden
            className="mb-3 font-serif text-xs uppercase tracking-widest text-stone-100/70"
          >
            {label}
          </Text>
        )}
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// A window of slots, `columns` to a row: the inventory, or what an object
// searched holds (`children`) (the web's SlotsWindow has the same).
const SlotsWindow = ({
  columns,
  children,
  ...window
}: {
  label: string;
  titled?: boolean;
  columns: number;
  onClose(): void;
  children: ReactNode;
}) => (
  <Window {...window}>
    <View
      className="flex-row flex-wrap"
      style={{ gap: SLOT_GAP, width: columns * SLOT + (columns - 1) * SLOT_GAP }}
    >
      {children}
    </View>
  </Window>
);

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
        style={[
          { position: "absolute", minWidth: 160, gap: 4, padding: 6, borderRadius: 24 },
          BOX_STYLE,
          size ? objectMenuPlace({ x, y }, size, screen) : { left: x, top: y, opacity: 0 },
        ]}
      >
        {objectActions(object).map((action) => (
          <Choice
            key={action.label}
            label={action.label}
            role="menuitem"
            onPress={() => onAction(action)}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// A choice, as the ring menu's items: a pill, its stroke and its text half
// seen; pressed, lit white (the web's Scene.module.css has the same). Its look
// is a plain style, from its own pressed state: NativeWind's Pressable drops a
// style given as a function.
const Choice = ({
  label,
  role = "button",
  onPress,
}: {
  label: string;
  role?: "button" | "menuitem";
  onPress(): void;
}) => {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole={role}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: pressed ? "#f5f5f4" : "transparent",
        borderColor: pressed ? "#fff" : "rgba(245,245,244,0.3)",
        boxShadow: pressed ? "0 0 14px rgba(255,255,255,0.6)" : undefined,
      }}
    >
      <Text className={`font-serif text-base ${pressed ? "text-stone-950" : "text-stone-100/70"}`}>
        {label}
      </Text>
    </Pressable>
  );
};
