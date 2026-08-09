import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { BallFace } from "@/components/BallView";
import { GameButton } from "@/components/GameButton";
import { RankBadge } from "@/components/RankBadge";
import { ScreenBackground } from "@/components/ScreenBackground";
import { BALLS } from "@/constants/balls";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { useAchievementsStore } from "@/store/achievementsStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const profile = useProfileStore((s) => s);
  const claimedCount = useAchievementsStore((s) => s.claimedIds.length);
  const ball = BALLS.find((b) => b.id === profile.selectedBallId) ?? BALLS[0];

  const statRows: { label: string; value: number | string }[] = [
    { label: "Best Score", value: profile.bestScore },
    { label: "Games Played", value: profile.stats.gamesPlayed },
    { label: "Perfect Hits", value: profile.stats.perfectMatches },
    { label: "Highest Combo", value: `x${profile.stats.highestCombo}` },
    { label: "Achievements Completed", value: claimedCount },
  ];

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>PLAYER PROFILE</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <LinearGradient colors={theme.bg.card} style={styles.card}>
              <View style={styles.avatarWrap}>
                <BallFace size={70} color={ball.color} glowColor={ball.glowColor} animation={ball.animation} />
              </View>
              <Text style={styles.name}>{profile.playerName}</Text>
              <View style={styles.rankRow}>
                <RankBadge rank={profile.rank} size="md" />
                <Text style={styles.region}>
                  {profile.regionFlag} {profile.region}
                </Text>
              </View>
            </LinearGradient>

            <LinearGradient colors={theme.bg.card} style={styles.statsCard}>
              {statRows.map((row) => (
                <View key={row.label} style={styles.statRow}>
                  <Text style={styles.statLabel}>{row.label}</Text>
                  <Text style={styles.statValue}>{row.value}</Text>
                </View>
              ))}
            </LinearGradient>

            <GameButton
              label="View Rank Progress"
              colors={[theme.accent.purple, "#6A2FCB"]}
              onPress={() => navigation.navigate("RankProgress")}
            />
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
  body: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  avatarWrap: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: theme.text.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  region: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  statsCard: {
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statLabel: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  statValue: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
