import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { DAILY_REWARDS } from "@/constants/dailyRewards";
import { theme } from "@/constants/theme";
import { useDailyRewardStore } from "@/store/dailyRewardStore";
import { useProfileStore } from "@/store/profileStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "DailyReward">;

export function DailyRewardScreen({ navigation }: Props) {
  const currentDay = useDailyRewardStore((s) => s.currentDay);
  const canClaimToday = useDailyRewardStore((s) => s.canClaimToday());
  const claimToday = useDailyRewardStore((s) => s.claimToday);
  const addCoins = useProfileStore((s) => s.addCoins);
  const addStars = useProfileStore((s) => s.addStars);

  const handleClaim = () => {
    if (!canClaimToday) return;
    const dayClaimed = claimToday();
    const reward = DAILY_REWARDS.find((r) => r.day === dayClaimed);
    if (!reward) return;
    if (reward.currency === "coins") addCoins(reward.amount);
    else if (reward.currency === "stars") addStars(reward.amount);
    else if (dayClaimed === 5) addCoins(150);
    else if (dayClaimed === 7) {
      addCoins(300);
      addStars(40);
    }
  };

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>DAILY REWARDS</Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {DAILY_REWARDS.map((r) => {
              const isToday = r.day === currentDay;
              const isClaimedAlready = r.day < currentDay || (isToday && !canClaimToday);
              const locked = r.day > currentDay;
              return (
                <LinearGradient
                  key={r.day}
                  colors={isToday ? [theme.accent.gold + "55", theme.accent.gold + "22"] : theme.bg.card}
                  style={[styles.card, isToday && styles.cardToday]}
                >
                  <Text style={styles.day}>Day {r.day}</Text>
                  <Text style={styles.label}>{r.label}</Text>
                  <Text style={styles.state}>
                    {locked ? "🔒 Locked" : isClaimedAlready ? "✅ Claimed" : isToday ? "Ready!" : ""}
                  </Text>
                </LinearGradient>
              );
            })}
          </ScrollView>

          <GameButton
            label={canClaimToday ? `Claim Day ${currentDay}` : "Come back tomorrow"}
            onPress={handleClaim}
            disabled={!canClaimToday}
            colors={[theme.accent.gold, "#D19A2A"]}
            style={styles.claimBtn}
          />
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },
  card: {
    width: "28%",
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  cardToday: {
    borderColor: theme.accent.gold,
    borderWidth: 2,
  },
  day: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  label: {
    color: theme.text.secondary,
    fontSize: 11,
    textAlign: "center",
  },
  state: {
    color: theme.accent.green,
    fontSize: 10,
    fontWeight: "700",
  },
  claimBtn: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  back: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
});
