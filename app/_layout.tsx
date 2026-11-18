import "@/global.css";
import "react-native-reanimated";
import "@/lib/nativewind-pressable";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/lib/theme-provider";
import { AlarmProvider } from "@/lib/alarm-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AlarmProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        </AlarmProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
