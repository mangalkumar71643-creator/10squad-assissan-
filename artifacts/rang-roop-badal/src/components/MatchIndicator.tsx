import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProgressBar } from "@/components/ProgressBar";
import { ShapeIcon } from "@/components/ShapeIcon";
import { COLOR_HEX } from "@/constants/colors";
import { ColorName, ShapeName } from "@/types";
import { theme } from "@/constants/theme";

interface Props {
  color: ColorName;
  shape: ShapeName;
  timeProgress: number; // 1 -> 0 as gate approaches
  special?: boolean;
}

export function MatchIndicator({ color, shape, timeProgress, special }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{special ? "SPECIAL GATE!" : "MATCH"}</Text>
      <View style={styles.row}>
        <ShapeIcon shape={shape} color={COLOR_HEX[color]} size={32} strokeColor="#FFFFFF66" strokeWidth={1.5} />
        <Text style={styles.text}>
          {color.toUpperCase()} + {shape.toUpperCase()}
        </Text>
      </View>
      <ProgressBar progress={timeProgress} color={special ? theme.accent.gold : theme.accent.cyan} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF14",
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF2A",
  },
  label: {
    color: theme.text.secondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 15,
  },
});
