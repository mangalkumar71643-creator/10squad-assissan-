import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { HeartsRow } from "@/components/HeartsRow";
import { theme } from "@/constants/theme";

interface Props {
  score: number;
  coins: number;
  stars: number;
  lives: number;
  combo: number;
  onPause: () => void;
}

export function HUD({ score, coins, stars, lives, combo, onPause }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable onPress={onPause} style={styles.pauseBtn} hitSlop={10}>
          <Text style={styles.pauseIcon}>⏸</Text>
        </Pressable>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
          {combo > 1 && <Text style={styles.combo}>x{combo} COMBO</Text>}
        </View>
        <View style={styles.currencies}>
          <CurrencyDisplay icon="🪙" amount={coins} compact />
          <CurrencyDisplay icon="⭐" amount={stars} compact />
        </View>
      </View>
      <View style={styles.livesRow}>
        <HeartsRow lives={lives} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF33",
  },
  pauseIcon: {
    fontSize: 16,
    color: theme.text.primary,
  },
  scoreBox: {
    alignItems: "center",
  },
  score: {
    color: theme.text.primary,
    fontWeight: "900",
    fontSize: 22,
  },
  combo: {
    color: theme.accent.gold,
    fontWeight: "800",
    fontSize: 11,
  },
  currencies: {
    gap: 4,
  },
  livesRow: {
    alignItems: "flex-start",
  },
});
