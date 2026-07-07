import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { rankTierColor } from "@/constants/ranks";
import { RankName } from "@/types";
import { theme } from "@/constants/theme";

interface Props {
  rank: RankName;
  size?: "sm" | "md" | "lg";
}

export function RankBadge({ rank, size = "md" }: Props) {
  const color = rankTierColor(rank);
  const dim = size === "sm" ? 30 : size === "lg" ? 64 : 44;
  const fontSize = size === "sm" ? 10 : size === "lg" ? 14 : 12;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: color + "33",
            borderColor: color,
          },
        ]}
      >
        <Text style={{ fontSize: dim * 0.42 }}>⭐</Text>
      </View>
      {size !== "sm" && (
        <Text style={[styles.rankText, { fontSize, color }]} numberOfLines={1}>
          {rank}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 4,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  rankText: {
    fontWeight: "800",
  },
});
