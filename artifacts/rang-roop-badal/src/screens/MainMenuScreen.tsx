import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { GameButton } from "@/components/GameButton";
import { RankBadge } from "@/components/RankBadge";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "MainMenu">;

const MENU_ITEMS: { label: string; route: keyof RootStackParamList; colors: readonly [string, string]; icon: string }[] = [
  { label: "PLAY", route: "Gameplay", colors: [theme.accent.magenta, theme.accent.purple], icon: "▶" },
  { label: "GAME MODES", route: "GameModes", colors: [theme.accent.cyan, "#1E9CA6"], icon: "🎮" },
  { label: "CHARACTERS", route: "CharacterSelect", colors: [theme.accent.green, "#1B8F55"], icon: "👽" },
  { label: "SHOP", route: "Shop", colors: [theme.accent.gold, "#D19A2A"], icon: "🛍" },
  { label: "ACHIEVEMENTS", route: "Achievements", colors: [theme.accent.purple, "#6A2FCB"], icon: "🏆" },
  { label: "DAILY REWARD", route: "DailyReward", colors: [theme.accent.red, "#B33240"], icon: "🎁" },
  { label: "SETTINGS", route: "Settings", colors: ["#7C71A8", "#4A4460"], icon: "⚙️" },
];

export function MainMenuScreen({ navigation }: Props) {
  const coins = useProfileStore((s) => s.coins);
  const stars = useProfileStore((s) => s.stars);
  const rank = useProfileStore((s) => s.rank);
  const region = useProfileStore((s) => s.region);
  const regionFlag = useProfileStore((s) => s.regionFlag);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.topBar}>
            <View style={styles.profileRow}>
              <RankBadge rank={rank} size="sm" />
              <View>
                <Text style={styles.rankLabel}>{rank}</Text>
                <Text style={styles.regionLabel}>
                  {regionFlag} {region}
                </Text>
              </View>
            </View>
            <View style={styles.currencyRow}>
              <CurrencyDisplay icon="🪙" amount={coins} />
              <CurrencyDisplay icon="⭐" amount={stars} />
            </View>
          </View>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>RANG ROOP BADAL</Text>
          </View>

          <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
            {MENU_ITEMS.map((item) => (
              <GameButton
                key={item.label}
                label={item.label}
                colors={item.colors}
                size="lg"
                onPress={() =>
                  item.route === "Gameplay"
                    ? navigation.navigate("Gameplay", { mode: "classic" })
                    : navigation.navigate(item.route as any)
                }
                style={styles.menuButton}
              />
            ))}
            <GameButton
              label="Profile & Rank"
              colors={["#3E7BFA", "#2653A8"]}
              size="md"
              onPress={() => navigation.navigate("Profile")}
              style={styles.menuButton}
            />
          </ScrollView>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankLabel: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  regionLabel: {
    color: theme.text.secondary,
    fontSize: 11,
  },
  currencyRow: {
    flexDirection: "row",
    gap: 8,
  },
  titleWrap: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: theme.accent.magenta,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  menuList: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 14,
    alignItems: "stretch",
  },
  menuButton: {
    width: "100%",
  },
});
