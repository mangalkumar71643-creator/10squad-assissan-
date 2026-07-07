import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import { ScreenBackground } from "@/components/ScreenBackground";
import { RANKS, RANK_XP_REQUIREMENTS, rankIndex, rankTierColor } from "@/constants/ranks";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "RankProgress">;

export function RankProgressScreen({ navigation }: Props) {
  const rank = useProfileStore((s) => s.rank);
  const rankXp = useProfileStore((s) => s.rankXp);
  const idx = rankIndex(rank);
  const isMaxRank = idx === RANKS.length - 1;
  const xpForNext = RANK_XP_REQUIREMENTS[idx];
  const nextRank = isMaxRank ? null : RANKS[idx + 1];

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>RANK PROGRESS</Text>

          <View style={styles.current}>
            <RankBadge rank={rank} size="lg" />
            <Text style={styles.currentRank}>{rank}</Text>
            {!isMaxRank && (
              <>
                <Text style={styles.xpText}>
                  {rankXp} / {xpForNext} XP to {nextRank}
                </Text>
                <ProgressBar progress={rankXp / xpForNext} color={rankTierColor(rank)} />
              </>
            )}
            {isMaxRank && <Text style={styles.xpText}>Maximum rank reached!</Text>}
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {RANKS.map((r, i) => (
              <LinearGradient
                key={r}
                colors={i === idx ? [rankTierColor(r) + "44", rankTierColor(r) + "11"] : theme.bg.card}
                style={[styles.row, i === idx && { borderColor: rankTierColor(r), borderWidth: 2 }]}
              >
                <Text style={styles.rowIndex}>{i + 1}</Text>
                <Text style={[styles.rowLabel, { color: rankTierColor(r) }]}>{r}</Text>
                {i < idx && <Text style={styles.doneMark}>✓</Text>}
              </LinearGradient>
            ))}
          </ScrollView>

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
  current: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 30,
    marginVertical: 16,
  },
  currentRank: {
    color: theme.text.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  xpText: {
    color: theme.text.secondary,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  rowIndex: {
    color: theme.text.muted,
    fontSize: 12,
    width: 20,
  },
  rowLabel: {
    flex: 1,
    fontWeight: "800",
    fontSize: 13,
  },
  doneMark: {
    color: theme.accent.green,
    fontWeight: "900",
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
