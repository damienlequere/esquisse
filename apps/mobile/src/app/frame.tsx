import { APP_NAME, greeting } from "@template/shared";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Same screen as the web frame page (apps/web/components/Screen.tsx), in three
// bands: the top bar; the content, which scrolls; and the commands at the bottom.
export default function Frame() {
  const [name, setName] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-stone-100 dark:bg-stone-950">
      <View className="min-h-14 flex-row items-center border-b border-stone-300 px-4 py-2 dark:border-stone-800">
        <Text className="flex-1 font-semibold text-stone-900 dark:text-stone-100">{APP_NAME}</Text>
        {/* Back to the home screen, without stacking a new one. */}
        <Link dismissTo href="/" className="text-sm text-stone-500 underline dark:text-stone-400">
          Home
        </Link>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="grow items-center justify-center px-4 py-6"
      >
        <Text className="w-full text-center font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
          {greeting(name)}
        </Text>
      </ScrollView>

      <View className="flex-row gap-2 border-t border-stone-300 px-4 py-4 dark:border-stone-800">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          accessibilityLabel="Your name"
          className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <Link href="/about" asChild>
          <Pressable className="justify-center rounded-md bg-amber-700 px-4 py-2 active:bg-amber-800">
            <Text className="font-medium text-white">About</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
