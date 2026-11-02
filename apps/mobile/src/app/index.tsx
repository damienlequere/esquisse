import { type GameId, games } from "@esquisse/content";
import { APP_NAME, gameSummary, sceneSummary, TAGLINE } from "@esquisse/engine";
import { Link } from "expo-router";
import { Fragment } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same screen as the web home page (apps/web/app/page.tsx): the games, each one
// to play from its first scene, and its scenes, each one to play alone.
export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-stone-100 dark:bg-stone-950">
      <ScrollView contentContainerClassName="px-4 py-12">
        <Text className="font-serif text-4xl font-semibold text-stone-900 dark:text-stone-100">
          {APP_NAME}
        </Text>
        <Text className="mt-3 text-lg text-stone-600 dark:text-stone-300">{TAGLINE}</Text>
        {(Object.keys(games) as GameId[]).map((id) => (
          <Fragment key={id}>
            <Link href={`/game/${id}`} asChild>
              <Pressable className="mt-8 rounded-lg border border-stone-300 bg-white p-5 active:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:active:border-stone-400">
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
            {Object.entries(games[id].scenes).map(([scene, { scene: data }]) => (
              <Link key={scene} href={`/game/${id}/scene/${scene}`} asChild>
                <Pressable className="mt-3 ml-6 rounded-lg border border-stone-300 bg-white p-4 active:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:active:border-stone-400">
                  <Text className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {data.title}
                  </Text>
                  <Text className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {sceneSummary(data)}
                  </Text>
                  <Text className="mt-2 text-sm font-medium text-stone-600 dark:text-stone-300">
                    Open →
                  </Text>
                </Pressable>
              </Link>
            ))}
          </Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
