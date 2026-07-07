import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ProgressBar } from "@/components/ProgressBar";
import { AchievementDef } from "@/types";
import { theme } from "@/constants/theme";

interface Props {
  achievement: AchievementDef;
  current: number;
  claimed: boolean;
  onClaim: () => void;
}

export function AchievementCard({ achievement, current, claimed, onClaim }: Props) {
  const progress = Math.min(1, current / achievement.target);
  const complete = current >= achievement.target;
  const rewardText = [
    achievement.reward.coins ? `${achievement.reward.coins} 🪙` : null,
    achievement.reward.stars ? `${achievement.reward.stars} ⭐` : null,
  ]
    .filter(Boolean)
    .join("  ");

  return (
    <LinearGradient colors={theme.bg.card} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{claimed ? "🏆" : complete ? "🎁" : "🔒"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.desc}>{achievement.description}</Text>
        </View>
      </View>
      <ProgressBar progress={progress} color={theme.accent.green} />
      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {Math.min(current, achievement.target)} / {achievement.target}
        </Text>
        <Text style={styles.reward}>{rewardText}</Text>
      </View>
      {complete && !claimed && (
        <GameButton label="Claim" onPress={onClaim} size="sm" colors={[theme.accent.gold, "#D19A2A"]} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  header: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  icon: {
    fontSize: 24,
  },
  title: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  desc: {
    color: theme.text.secondary,
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: theme.text.muted,
    fontSize: 12,
  },
  reward: {
    color: theme.accent.gold,
    fontSize: 12,
    fontWeight: "700",
  },
});
