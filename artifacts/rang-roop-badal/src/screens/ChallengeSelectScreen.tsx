import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { CHALLENGES } from "@/constants/challenges";
import { theme } from "@/constants/theme";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "ChallengeSelect">;

export function ChallengeSelectScreen({ navigation }: Props) {
  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>CHALLENGE SELECT</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {CHALLENGES.map((c) => {
              const rewardText = [
                c.reward.coins ? `${c.reward.coins} 🪙` : null,
                c.reward.stars ? `${c.reward.stars} ⭐` : null,
              ]
                .filter(Boolean)
                .join("  ");
              return (
                <LinearGradient key={c.id} colors={theme.bg.card} style={styles.card}>
                  <Text style={styles.title}>{c.title}</Text>
                  <Text style={styles.desc}>{c.description}</Text>
                  <Text style={styles.reward}>Reward: {rewardText}</Text>
                  <GameButton
                    label="Start Challenge"
                    colors={[theme.accent.gold, "#D19A2A"]}
                    onPress={() => navigation.navigate("Gameplay", { mode: "challenge", challengeId: c.id })}
                  />
                </LinearGradient>
              );
            })}
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
  list: {
    padding: 20,
    gap: 14,
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  title: {
    color: theme.text.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  desc: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  reward: {
    color: theme.accent.gold,
    fontSize: 12,
    fontWeight: "700",
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
