import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AlienCharacter } from "@/components/AlienCharacter";
import { GameButton } from "@/components/GameButton";
import { CharacterDef } from "@/types";
import { theme } from "@/constants/theme";

interface Props {
  character: CharacterDef;
  owned: boolean;
  selected: boolean;
  onSelect: () => void;
  onBuy: () => void;
  canAfford: boolean;
}

export function CharacterCard({ character, owned, selected, onSelect, onBuy, canAfford }: Props) {
  return (
    <LinearGradient colors={theme.bg.card} style={styles.card}>
      <View style={styles.preview}>
        <AlienCharacter color={character.primary} secondaryColor={character.secondary} shape="Circle" mood="idle" size={110} />
      </View>
      <Text style={styles.name}>{character.name}</Text>
      {owned ? (
        <GameButton
          label={selected ? "Selected" : "Select"}
          onPress={onSelect}
          selected={selected}
          colors={[theme.accent.green, "#1B8F55"]}
          size="sm"
        />
      ) : (
        <GameButton
          label={`${character.price} ${character.currency === "coins" ? "🪙" : "⭐"}`}
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
    width: 170,
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  preview: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 16,
  },
});
