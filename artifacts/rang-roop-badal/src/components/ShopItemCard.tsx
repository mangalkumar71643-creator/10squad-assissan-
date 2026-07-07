import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ShopItemDef } from "@/types";
import { theme } from "@/constants/theme";

interface Props {
  item: ShopItemDef;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

export function ShopItemCard({ item, owned, equipped, canAfford, onBuy, onEquip }: Props) {
  return (
    <LinearGradient colors={theme.bg.card} style={styles.card}>
      <View style={[styles.swatch, { backgroundColor: item.color }]} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      {owned ? (
        <GameButton
          label={equipped ? "Equipped" : "Equip"}
          onPress={onEquip}
          selected={equipped}
          colors={[theme.accent.green, "#1B8F55"]}
          size="sm"
        />
      ) : (
        <GameButton
          label={`${item.price} ${item.currency === "coins" ? "🪙" : "⭐"}`}
          onPress={onBuy}
          disabled={!canAfford}
          colors={[theme.accent.gold, "#D19A2A"]}
          size="sm"
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  desc: {
    color: theme.text.secondary,
    fontSize: 12,
  },
});
