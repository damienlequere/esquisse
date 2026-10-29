import {
  type Box,
  ENTER_ARROW,
  INTRO,
  INTRO_HOLD,
  initialSceneState,
  placeStyle,
  playScene,
  remainingTopics,
  type SceneData,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  BackHandler,
  Image,
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

type DrawerTabId = "narration" | "two" | "three";

const panelWidth = (screenWidth: number) => Math.min(256, screenWidth * 0.3);

const place = (box: Box) => ({ position: "absolute" as const, ...placeStyle(box) });

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

  const [{ narration, conversation }, dispatch] = useReducer(playScene, data, initialSceneState);

  // ── Dialogue: an open conversation, until it is left ─────────────────────────

  const lines = useRef<ScrollViewInstance>(null);
  const close = () => dispatch({ type: "leave" });

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

  const panel = screen ? panelWidth(screen.width) : 0;
  const band = screen ? screen.height * BAND : 0;

  // The drawer shows the text, or another content (2 and 3, to come); it can be
  // folded to see the whole image. A new text opens it again, on the text. It
  // starts folded: the scene's intro waits for its button.
  const [choice, setChoice] = useState<{ tab: DrawerTabId | undefined; at: number }>({
    tab: undefined,
    at: narration.key,
  });
  const drawerTab = choice.at === narration.key ? choice.tab : "narration";

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

  const narrationText = (
    <ScrollView
      key={narration.key}
      accessibilityLiveRegion="polite"
      contentContainerClassName={layout.landscape ? undefined : "px-5 pt-4"}
      contentContainerStyle={
        layout.landscape ? panelPadding : { paddingBottom: Math.max(16, insets.bottom) }
      }
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text className="mb-1 font-serif text-xs uppercase tracking-widest text-amber-300">
          {narration.title}
        </Text>
        <Text className="font-serif text-base leading-6 text-stone-100">{narration.text}</Text>
      </Animated.View>
    </ScrollView>
  );

  // The drawer's other contents, to come.
  const placeholder = (text: string) => (
    <ScrollView
      key={text}
      contentContainerClassName={layout.landscape ? undefined : "px-5 pt-4"}
      contentContainerStyle={
        layout.landscape ? panelPadding : { paddingBottom: Math.max(16, insets.bottom) }
      }
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text className="font-serif text-base leading-6 text-stone-100">{text}</Text>
      </Animated.View>
    </ScrollView>
  );

  return (
    <View
      className="flex-1 overflow-hidden bg-stone-950"
      onLayout={(event) => setScreen(event.nativeEvent.layout)}
      // A touch out of the drawer folds it (see Drawer).
      onTouchStart={() => {
        if (drawerTab !== undefined) setChoice({ tab: undefined, at: narration.key });
      }}
    >
      <StatusBar style="light" />

      {screen && image && (
        <View
          importantForAccessibility={inConversation ? "no-hide-descendants" : "auto"}
          accessibilityElementsHidden={inConversation}
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
              onPress={() => dispatch({ type: "look", title: object.label, text: object.text })}
              style={place(box)}
            >
              {({ pressed }) => (
                <>
                  {pressed && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(300)}
                      className="absolute inset-0 rounded-xl border-2 border-amber-300/80 bg-amber-300/15"
                    />
                  )}
                  {pressed && <Tip label={object.label} />}
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

      {/* Narration: the bottom band, over the image; in landscape, the panel on
          the right, the whole height (see BAND and panelWidth). */}
      <Drawer
        side={layout.landscape ? "right" : "bottom"}
        size={layout.landscape ? panel : band}
        open={drawerTab}
        onOpen={(tab) => setChoice({ tab, at: narration.key })}
        tabs={[
          {
            id: "narration",
            icon: "1",
            label: drawerTab === "narration" ? sceneText.foldText : sceneText.unfoldText,
            content: narrationText,
          },
          { id: "two", icon: "2", label: "2", content: placeholder("2") },
          { id: "three", icon: "3", label: "3", content: placeholder("3") },
        ]}
      />

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

const Choice = ({ label, onPress }: { label: string; onPress(): void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className="rounded-xl border border-amber-300/35 bg-amber-300/5 px-3 py-2.5 active:bg-amber-300/15"
  >
    <Text className="font-serif text-base text-stone-100">{label}</Text>
  </Pressable>
);
