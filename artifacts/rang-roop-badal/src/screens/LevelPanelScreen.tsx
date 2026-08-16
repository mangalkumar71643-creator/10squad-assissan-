import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { DifficultyTier, TIER_COLORS, TIER_RANGES, levelsForTier, tierFor } from "@/constants/levels";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { vibrate } from "@/utils/haptics";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "LevelPanel">;

function StarRow({ stars }: { stars: number }) {
  return (
    <View style={styles.starRow}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={[styles.star, i < stars ? styles.starFilled : styles.starEmpty]}>
          ★
        </Text>
      ))}
    </View>
  );
}

function TierTab({
  tier,
  locked,
  active,
  onPress,
}: {
  tier: DifficultyTier;
  locked: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const color = TIER_COLORS[tier];
  return (
    <Pressable disabled={locked} onPress={onPress} style={styles.tierTabWrap}>
      <LinearGradient
        colors={active ? [color + "55", color + "18"] : theme.bg.card}
        style={[styles.tierTab, active && { borderColor: color, borderWidth: 2 }]}
      >
        {locked ? (
          <Text style={styles.tierLock}>🔒</Text>
        ) : (
          <Text style={[styles.tierLabel, active && { color }]}>{tier.toUpperCase()}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function LevelPanelScreen({ navigation }: Props) {
  const currentLevel = useProfileStore((s) => s.currentLevel);
  const levelStars = useProfileStore((s) => s.levelStars);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>(tierFor(currentLevel));

  const totalStarsEarned = Object.values(levelStars).reduce((sum, n) => sum + n, 0);
  const totalStarsPossible = currentLevel * 3;

  const play = (level: number) => {
    vibrate("light");
    navigation.replace("Gameplay", { mode: "classic", startLevel: level });
  };

  const levels = levelsForTier(selectedTier, currentLevel);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.titleWrap}>
            <Text style={styles.titleTop}>BRICK BREAKER</Text>
            <Text style={styles.titleBottom}>BALL</Text>
          </View>

          <View style={styles.bannerRow}>
            <LinearGradient colors={[theme.accent.cyan, "#1E5C9C"]} style={styles.banner}>
              <Text style={styles.bannerText}>LEVELS</Text>
            </LinearGradient>
            <View style={styles.starChip}>
              <Text style={styles.starChipIcon}>⭐</Text>
              <Text style={styles.starChipText}>
                {totalStarsEarned}/{totalStarsPossible}
              </Text>
            </View>
          </View>

          <View style={styles.tierRow}>
            {TIER_RANGES.map((r) => (
              <TierTab
                key={r.tier}
                tier={r.tier}
                locked={currentLevel < r.from}
                active={selectedTier === r.tier}
                onPress={() => setSelectedTier(r.tier)}
              />
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {levels.map((lvl) => {
              const locked = lvl > currentLevel;
              const stars = levelStars[lvl] ?? 0;
              const isCurrent = lvl === currentLevel;
              const color = TIER_COLORS[selectedTier];
              return (
                <Pressable key={lvl} disabled={locked} onPress={() => play(lvl)}>
                  <LinearGradient
                    colors={locked ? ["#1A1A2E", "#12121F"] : theme.bg.card}
                    style={[styles.card, isCurrent && { borderColor: color, borderWidth: 2 }]}
                  >
                    {locked ? (
                      <Text style={styles.cardLock}>🔒</Text>
                    ) : (
                      <>
                        <Text style={styles.cardLevel}>{lvl}</Text>
                        <StarRow stars={stars} />
                      </>
                    )}
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
  titleWrap: {
    alignItems: "center",
    marginTop: 14,
  },
  titleTop: {
    color: theme.accent.gold,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "#00000088",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  titleBottom: {
    color: theme.accent.cyan,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: -4,
    textShadowColor: "#00000088",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 20,
  },
  banner: {
    flex: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  bannerText: {
    color: theme.text.primary,
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 2,
  },
  starChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00000055",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  starChipIcon: { fontSize: 13 },
  starChipText: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  tierRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  tierTabWrap: { flex: 1 },
  tierTab: {
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  tierLabel: {
    color: theme.text.secondary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tierLock: { fontSize: 13 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    justifyContent: "center",
  },
  card: {
    width: 62,
    height: 62,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF22",
    gap: 3,
  },
  cardLevel: {
    color: theme.text.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  cardLock: {
    fontSize: 20,
    opacity: 0.5,
  },
  starRow: {
    flexDirection: "row",
    gap: 1,
  },
  star: {
    fontSize: 9,
  },
  starFilled: {
    color: theme.accent.gold,
  },
  starEmpty: {
    color: "#FFFFFF33",
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 4,
  },
});
