import {
  type Box,
  type Character,
  placeStyle,
  type SceneData,
  sceneLayout,
} from "@esquisse/shared";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { useEffect, useRef, useState } from "react";
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
// so it follows the cropping.

const place = (box: Box) => ({ position: "absolute" as const, ...placeStyle(box) });

// NativeWind styles only the components it knows.
cssInterop(LinearGradient, { className: "style" });
cssInterop(Animated.View, { className: "style" });

// How long the ✦ button shows what is clickable.
const REVEAL_MS = 1600;

type Line = { text: string; player?: boolean };
type Conversation = { character: Character; lines: Line[]; asked: string[] };

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

  const [narration, setNarration] = useState({ title: scene.title, text: scene.intro, key: 0 });
  const narrate = (title: string, text: string) =>
    setNarration((n) => ({ title, text, key: n.key + 1 }));

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

  const [conversation, setConversation] = useState<Conversation>();
  const lines = useRef<ScrollView>(null);

  const open = (character: Character) =>
    setConversation({ character, lines: [{ text: character.dialogue.greeting }], asked: [] });
  const close = () => {
    if (conversation === undefined) return;
    setConversation(undefined);
    narrate(conversation.character.name, conversation.character.dialogue.farewell);
  };
  const ask = (ask: string, answer: string) =>
    setConversation(
      (c) =>
        c && {
          ...c,
          lines: [...c.lines, { text: `— ${ask}`, player: true }, { text: answer }],
          asked: [...c.asked, ask],
        },
    );

  // Android's back button leaves the conversation, not the scene.
  const closeRef = useRef(close);
  closeRef.current = close;
  const inConversation = conversation !== undefined;
  useEffect(() => {
    if (!inConversation || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, [inConversation]);

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
              onPress={() => narrate(object.label, object.text)}
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
            const label = `Parler à ${character.name}`;
            return (
              <Pressable
                key={character.id}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => open(character)}
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
        className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: Math.max(12, insets.top) }}
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
          accessibilityLabel="Révéler ce qui est cliquable"
          onPress={reveal}
          className="h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-stone-950/50 active:bg-stone-950/80"
        >
          <Text className="text-base text-amber-200">✦</Text>
        </Pressable>
      </LinearGradient>

      {/* Narration: the bottom band, 22% of the height, over the image. */}
      <LinearGradient
        colors={["transparent", "rgba(12,10,9,0.85)"]}
        locations={[0, 0.25]}
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "22%" }}
      >
        <ScrollView
          key={narration.key}
          accessibilityLiveRegion="polite"
          contentContainerClassName="px-5 pt-10"
          contentContainerStyle={{ paddingBottom: Math.max(16, insets.bottom) }}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text className="mb-1 font-serif text-xs uppercase tracking-widest text-amber-300">
              {narration.title}
            </Text>
            <Text className="font-serif text-base leading-6 text-stone-100">{narration.text}</Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Dialogue: an open conversation takes the scene, the background waits. */}
      {conversation && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="absolute inset-0 justify-end bg-black/35"
        >
          <Pressable
            className="absolute inset-0"
            accessibilityLabel="Au revoir."
            accessibilityRole="button"
            onPress={close}
          />
          <Animated.View
            entering={FadeInDown.duration(250)}
            accessibilityViewIsModal
            className="max-h-[60%] rounded-t-3xl border-t border-amber-300/35 bg-stone-900"
          >
            <ScrollView
              ref={lines}
              contentContainerClassName="p-5"
              contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom) }}
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
                {conversation.character.dialogue.topics
                  .filter((topic) => !conversation.asked.includes(topic.ask))
                  .map((topic) => (
                    <Choice
                      key={topic.ask}
                      label={topic.ask}
                      onPress={() => ask(topic.ask, topic.answer)}
                    />
                  ))}
                <Choice label="Au revoir." onPress={close} />
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
