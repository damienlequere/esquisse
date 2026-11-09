import { type GameId, games } from "@esquisse/content";
import { APP_NAME, gameSummary, TAGLINE } from "@esquisse/engine";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same screen as the web home page (apps/web/app/page.tsx): the games, each one
// to play from its first scene, and each of its scenes, to play alone.
export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-stone-100 dark:bg-stone-950">
      <ScrollView contentContainerClassName="px-4 py-12">
        <Text className="font-serif text-4xl font-semibold text-stone-900 dark:text-stone-100">
          {APP_NAME}
        </Text>
        <Text className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</Text>
        {(Object.keys(games) as GameId[]).map((id) => (
          <View
            key={id}
            className="mt-8 rounded-lg border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900"
          >
            <Link href={`/game/${id}`} asChild>
              <Pressable className="rounded-t-lg p-5 active:bg-stone-50 dark:active:bg-stone-800">
                <Text className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
                  {games[id].game.title}
                </Text>
                <Text className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {gameSummary(games[id])}
                </Text>
                <Text className="mt-3 text-sm font-medium text-stone-600 dark:text-stone-300">
                  Play →
                </Text>
              </Pressable>
            </Link>
            <View className="border-t border-stone-200 dark:border-stone-800">
              {Object.entries(games[id].scenes).map(([scene, { scene: s }]) => (
                <Link key={scene} href={`/game/${id}/scene/${scene}`} asChild>
                  <Pressable className="flex-row items-baseline justify-between gap-4 px-5 py-3 active:bg-stone-50 dark:active:bg-stone-800">
                    <Text className="shrink text-sm text-stone-900 dark:text-stone-100">
                      {s.title}
                    </Text>
                    <Text className="text-sm text-stone-400 dark:text-stone-500">{scene}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
