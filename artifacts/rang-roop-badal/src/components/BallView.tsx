import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  x: number;
  y: number;
  radius: number;
  glowing?: boolean;
}

function BallViewInner({ x, y, radius, glowing }: Props) {
  const size = radius * 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.ball,
        {
          left: x - radius,
          top: y - radius,
          width: size,
          height: size,
          borderRadius: radius,
          shadowColor: glowing ? "#FF4757" : "#3EE9F0",
        },
      ]}
    />
  );
}

export const BallView = React.memo(BallViewInner);

const styles = StyleSheet.create({
  ball: {
    position: "absolute",
    backgroundColor: "#F5F6FF",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
