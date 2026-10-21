import { APP_NAME, scenes, TAGLINE } from "@esquisse/shared";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same screen as the web home page (apps/web/app/page.tsx).
export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-stone-100 dark:bg-stone-950">
      <ScrollView contentContainerClassName="px-4 py-12">
        <Text className="font-serif text-4xl font-semibold text-stone-900 dark:text-stone-100">
          {APP_NAME}
        </Text>
        <Text className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</Text>
        <Link href="/scene/phare" asChild>
          <Pressable className="mt-8 rounded-lg border border-stone-300 bg-white p-5 active:border-amber-600 dark:border-stone-700 dark:bg-stone-900 dark:active:border-amber-400">
            <Text className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
              {scenes.phare.scene.title}
            </Text>
            <Text className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              A clickable scene: three objects, two characters to talk to.
            </Text>
            <Text className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300">
              Open →
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
