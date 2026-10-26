import {
  type Box,
  initialSceneState,
  placeStyle,
  playScene,
  REVEAL_MS,
  remainingTopics,
  type SceneData,
  sceneLayout,
  sceneText,
} from "@esquisse/shared";
import { LinearGradient } from "expo-linear-gradient";
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
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SceneImages } from "../scenes.ts";

// Same scene as the web one (apps/web/components/Scene.tsx): the background
// covers the screen, each object is one action, each character opens a dialogue.
// Everything is placed in % of the image (see sceneLayout in packages/shared),
// so it follows the cropping. What it shows as it is played is playScene's,
// shared with the web site.

// In landscape, the text is a panel on the right, 30% of the screen's width,
// over the image (the web's Scene.module.css has the same): the safe zone of
// the landscape scenes leaves it free (see packages/generator).
const PANEL = "30%";

const place = (box: Box) => ({ position: "absolute" as const, ...placeStyle(box) });

// NativeWind styles only the components it knows.
cssInterop(LinearGradient, { className: "style" });
cssInterop(Animated.View, { className: "style" });

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

  // Reveal what is clickable: there is no hover with a finger.
  const [revealed, setRevealed] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reveal = () => {
    setRevealed(true);
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setRevealed(false), REVEAL_MS);
  };
  useEffect(() => () => clearTimeout(revealTimer.current), []);

  // ── Dialogue: an open conversation, until it is left ─────────────────────────

  const lines = useRef<ScrollView>(null);
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
      contentContainerClassName={layout.landscape ? undefined : "px-5 pt-10"}
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

  return (
    <View
      className="flex-1 overflow-hidden bg-stone-950"
      onLayout={(event) => setScreen(event.nativeEvent.layout)}
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
                  {(pressed || revealed) && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(300)}
                      className="absolute inset-0 rounded-xl border-2 border-amber-300/80 bg-amber-300/15"
                    />
                  )}
                  {(pressed || revealed) && <Tip label={object.label} />}
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
                    {(pressed || revealed) && <Tip label={label} />}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Top bar. */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        pointerEvents="box-none"
        className="absolute left-0 top-0 flex-row items-center justify-between pb-3"
        style={{
          right: layout.landscape ? PANEL : 0,
          paddingTop: Math.max(12, insets.top),
          paddingLeft: Math.max(16, insets.left),
          paddingRight: layout.landscape ? 16 : Math.max(16, insets.right),
        }}
      >
        <Text
          accessibilityRole="header"
          className="font-serif text-base tracking-wide text-stone-100"
          style={{
            textShadowColor: "#000",
            textShadowRadius: 3,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          {scene.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sceneText.reveal}
          onPress={reveal}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-stone-950/50 active:bg-stone-950/80"
        >
          <Text className="text-base text-amber-200">✦</Text>
        </Pressable>
      </LinearGradient>

      {/* Narration: the bottom band, 22% of the height, over the image; in
          landscape, the panel on the right, the whole height (see PANEL). */}
      {layout.landscape ? (
        <View
          className="absolute bottom-0 right-0 top-0 border-l border-amber-300/20 bg-stone-950/85"
          style={{ width: PANEL }}
        >
          {narrationText}
        </View>
      ) : (
        <LinearGradient
          colors={["transparent", "rgba(12,10,9,0.85)"]}
          locations={[0, 0.25]}
          className="absolute bottom-0 left-0 right-0"
          style={{ height: "22%" }}
        >
          {narrationText}
        </LinearGradient>
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
            className={
              layout.landscape
                ? "border-l border-amber-300/35 bg-stone-900"
                : "max-h-[60%] rounded-t-3xl border-t border-amber-300/35 bg-stone-900"
            }
            style={layout.landscape ? { width: PANEL } : undefined}
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
