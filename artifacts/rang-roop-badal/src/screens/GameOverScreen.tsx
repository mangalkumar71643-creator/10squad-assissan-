import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "GameOver">;

export function GameOverScreen({ route, navigation }: Props) {
  const { score, coins, stars, highestCombo, xpEarned, isNewBest } = route.params;
  const bestScore = useProfileStore((s) => s.bestScore);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [scaleAnim]);

  const rows: { label: string; value: string | number }[] = [
    { label: "Final Score", value: score },
    { label: "Best Score", value: bestScore },
    { label: "Coins Collected", value: coins },
    { label: "Stars Collected", value: stars },
    { label: "Highest Combo", value: `x${highestCombo}` },
    { label: "Rank XP Earned", value: `+${xpEarned}` },
  ];

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.deep}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.center}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }], width: "100%", alignItems: "center" }}>
              <Text style={styles.title}>GAME OVER</Text>
              {isNewBest && <Text style={styles.newBest}>🏆 NEW BEST SCORE!</Text>}

              <LinearGradient colors={theme.bg.card} style={styles.card}>
                {rows.map((r) => (
                  <View key={r.label} style={styles.row}>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Text style={styles.rowValue}>{r.value}</Text>
                  </View>
                ))}
              </LinearGradient>

              <View style={styles.buttons}>
                <GameButton
                  label="Play Again"
                  colors={[theme.accent.green, "#1B8F55"]}
                  size="lg"
                  onPress={() => navigation.replace("Gameplay", { mode: "classic" })}
                />
                <GameButton
                  label="Main Menu"
                  colors={[theme.accent.purple, "#6A2FCB"]}
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainMenu" }] })}
                />
                <GameButton
                  label="Share Score"
                  colors={["#3E7BFA", "#2653A8"]}
                  onPress={() => {
                    // Native share sheet wiring can be added with expo-sharing when ready.
                  }}
                />
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: theme.accent.red,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: theme.accent.red,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  newBest: {
    color: theme.accent.gold,
    fontWeight: "800",
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    width: "100%",
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  rowValue: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  buttons: {
    width: "100%",
    gap: 12,
    marginTop: 20,
  },
});
