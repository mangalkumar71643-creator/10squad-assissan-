import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface Props {
  icon: string;
  amount: number;
  compact?: boolean;
}

export function CurrencyDisplay({ icon, amount, compact }: Props) {
  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.amount}>{amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF1A",
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  pillCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  icon: {
    fontSize: 15,
  },
  amount: {
    color: theme.text.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
