import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

export function TutorialOverlay() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.row}>👉 Drag anywhere to move the paddle</Text>
        <Text style={styles.row}>🧱 Break every brick to level up!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#0B0620DD",
    borderRadius: theme.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF33",
  },
  row: {
    color: theme.text.primary,
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
});
