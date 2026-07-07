import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AchievementCard } from "@/components/AchievementCard";
import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { ACHIEVEMENTS } from "@/constants/achievements";
import { theme } from "@/constants/theme";
import { useAchievementsStore } from "@/store/achievementsStore";
import { useProfileStore } from "@/store/profileStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Achievements">;

export function AchievementsScreen({ navigation }: Props) {
  const stats = useProfileStore((s) => s.stats);
  const addCoins = useProfileStore((s) => s.addCoins);
  const addStars = useProfileStore((s) => s.addStars);
  const claimedIds = useAchievementsStore((s) => s.claimedIds);
  const claim = useAchievementsStore((s) => s.claim);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>ACHIEVEMENTS</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {ACHIEVEMENTS.map((a) => (
              <AchievementCard
                key={a.id}
                achievement={a}
                current={stats[a.statKey] as number}
                claimed={claimedIds.includes(a.id)}
                onClaim={() => {
                  claim(a.id);
                  if (a.reward.coins) addCoins(a.reward.coins);
                  if (a.reward.stars) addStars(a.reward.stars);
                }}
              />
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
  list: {
    padding: 20,
    gap: 12,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
