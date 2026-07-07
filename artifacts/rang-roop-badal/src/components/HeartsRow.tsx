import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  lives: number;
  maxLives?: number;
}

export function HeartsRow({ lives, maxLives = 3 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: maxLives }).map((_, i) => (
        <Text key={i} style={styles.heart}>
          {i < lives ? "❤️" : "🖤"}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 4,
  },
  heart: {
    fontSize: 18,
  },
});
