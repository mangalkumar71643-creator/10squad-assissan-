import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { GameMode, RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "GameModes">;

const MODES: { mode: GameMode; title: string; desc: string; colors: readonly [string, string] }[] = [
  {
    mode: "classic",
    title: "Classic Mode",
    desc: "Balanced difficulty, 3 lives, steady progression.",
    colors: [theme.accent.cyan, "#1E9CA6"],
  },
  {
    mode: "endless",
    title: "Endless Mode",
    desc: "Play until all lives are lost. Speed ramps up over time.",
    colors: [theme.accent.magenta, theme.accent.purple],
  },
];

export function GameModesScreen({ navigation }: Props) {
  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>GAME MODES</Text>
          <View style={styles.list}>
            {MODES.map((m) => (
              <LinearGradient key={m.mode} colors={theme.bg.card} style={styles.card}>
                <Text style={styles.title}>{m.title}</Text>
                <Text style={styles.desc}>{m.desc}</Text>
                <GameButton
                  label="Play"
                  colors={m.colors}
                  onPress={() => navigation.navigate("Gameplay", { mode: m.mode })}
                />
              </LinearGradient>
            ))}

            <LinearGradient colors={theme.bg.card} style={styles.card}>
              <Text style={styles.title}>Challenge Mode</Text>
              <Text style={styles.desc}>Complete objective-based missions for bonus rewards.</Text>
              <GameButton
                label="Choose Challenge"
                colors={[theme.accent.gold, "#D19A2A"]}
                onPress={() => navigation.navigate("ChallengeSelect")}
              />
            </LinearGradient>
          </View>

          <GameButton label="Back" onPress={() => navigation.goBack()} colors={["#7C71A8", "#4A4460"]} style={styles.back} />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 1,
  },
  list: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  title: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  desc: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
