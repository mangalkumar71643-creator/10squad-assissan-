import "react-native-gesture-handler";

import React from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { RootNavigator } from "@/navigation/RootNavigator";
import { useStoresHydrated } from "@/hooks/useHydration";
import { useSoundSystem } from "@/hooks/useSound";
import { ScreenBackground } from "@/components/ScreenBackground";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#160B2E",
    card: "#160B2E",
    primary: "#FF4FD8",
  },
};

function AppInner() {
  useSoundSystem();
  const hydrated = useStoresHydrated();

  if (!hydrated) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <ScreenBackground />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
