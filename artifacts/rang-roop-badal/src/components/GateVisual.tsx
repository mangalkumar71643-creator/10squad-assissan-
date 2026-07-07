import React from "react";
import { StyleSheet, View } from "react-native";

import { ShapeIcon } from "@/components/ShapeIcon";
import { COLOR_HEX } from "@/constants/colors";
import { ColorName, ShapeName } from "@/types";

interface Props {
  color: ColorName;
  shape: ShapeName;
  progress: number; // 0 (spawn, far away) -> 1 (arrived)
  trackHeight: number;
  special?: boolean;
}

export function GateVisual({ color, shape, progress, trackHeight, special }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const top = clamped * (trackHeight - 90);
  const scale = 0.55 + clamped * 0.6;
  const opacity = 0.35 + clamped * 0.65;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          top,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View
        style={[
          styles.ring,
          {
            borderColor: COLOR_HEX[color],
            shadowColor: COLOR_HEX[color],
          },
          special && styles.specialRing,
        ]}
      >
        <ShapeIcon shape={shape} color={COLOR_HEX[color]} size={46} strokeColor="#FFFFFFAA" strokeWidth={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000033",
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  specialRing: {
    borderWidth: 4,
    borderColor: "#FFD35E",
  },
});
