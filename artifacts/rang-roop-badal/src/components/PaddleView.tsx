import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

function PaddleViewInner({ x, y, width, height, color }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { left: x, top: y, width, height, shadowColor: color }]}
    >
      <LinearGradient
        colors={[color, "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { borderRadius: height / 2 }]}
      />
    </View>
  );
}

export const PaddleView = React.memo(PaddleViewInner);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  fill: {
    flex: 1,
  },
});
