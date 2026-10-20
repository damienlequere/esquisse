import { Text, View } from "react-native";

// Opened as a modal (see _layout.tsx), like the dialog of the web frame page.
export default function About() {
  return (
    <View className="flex-1 bg-stone-50 p-6 dark:bg-stone-900">
      <Text className="text-stone-600 dark:text-stone-300">
        On mobile, the app uses the whole screen. On the web, the same screen is shown in a device
        frame on a large screen with a mouse.
      </Text>
    </View>
  );
}
