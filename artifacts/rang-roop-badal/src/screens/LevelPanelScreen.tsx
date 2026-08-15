import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { vibrate } from "@/utils/haptics";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "LevelPanel">;

export function LevelPanelScreen({ navigation }: Props) {
  const currentLevel = useProfileStore((s) => s.currentLevel);
  const levels = Array.from({ length: currentLevel }, (_, i) => i + 1);

  const play = (level: number) => {
    vibrate("light");
    navigation.replace("Gameplay", { mode: "classic", startLevel: level });
  };

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>LEVEL PANEL</Text>

          <View style={styles.hero}>
            <Text style={styles.heroLabel}>YOU'RE ON</Text>
            <Text style={styles.heroLevel}>LEVEL {currentLevel}</Text>
            <GameButton
              label={`Continue from Level ${currentLevel}`}
              size="lg"
              colors={[theme.accent.green, "#1B8F55"]}
              onPress={() => play(currentLevel)}
            />
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {levels.map((lvl) => {
              const isCurrent = lvl === currentLevel;
              return (
                <Pressable key={lvl} onPress={() => play(lvl)}>
                  <LinearGradient
                    colors={isCurrent ? [theme.accent.green + "44", theme.accent.green + "11"] : theme.bg.card}
                    style={[styles.chip, isCurrent && { borderColor: theme.accent.green, borderWidth: 2 }]}
                  >
                    <Text style={[styles.chipText, isCurrent && { color: theme.accent.green }]}>{lvl}</Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </ScrollView>

          <GameButton
            label="Back"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "Splash" }] })}
            colors={["#7C71A8", "#4A4460"]}
            style={styles.back}
          />
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
  hero: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 30,
    marginVertical: 16,
  },
  heroLabel: {
    color: theme.text.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroLevel: {
    color: theme.accent.green,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    justifyContent: "center",
  },
  chip: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  chipText: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
