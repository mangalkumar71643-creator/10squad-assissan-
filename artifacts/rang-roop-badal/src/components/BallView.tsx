import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { BallAnimation } from "@/constants/balls";

interface FaceProps {
  size: number;
  color: string;
  glowColor: string;
  animation: BallAnimation;
}

/** The decorative, animated interior of a ball — shared between gameplay and shop previews. */
export function BallFace({ size, color, glowColor, animation }: FaceProps) {
  const loopValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loopValue.setValue(0);
    const duration = animation === "spin" ? 1400 : animation === "sparkle" ? 1800 : 1000;
    const loop = Animated.loop(
      Animated.timing(loopValue, {
        toValue: 1,
        duration,
        easing: animation === "spin" || animation === "sparkle" ? Easing.linear : Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animation, loopValue]);

  const core = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );

  if (animation === "pulse") {
    const scale = loopValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.45, 1] });
    const opacity = loopValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0, 0.5] });
    return (
      <View style={styles.center}>
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: glowColor,
            transform: [{ scale }],
            opacity,
          }}
        />
        {core}
      </View>
    );
  }

  if (animation === "spin") {
    const rotate = loopValue.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
    return (
      <Animated.View style={[styles.center, { width: size, height: size, transform: [{ rotate }] }]}>
        {core}
        <View
          style={{
            position: "absolute",
            top: size * 0.08,
            left: size / 2 - size * 0.09,
            width: size * 0.18,
            height: size * 0.18,
            borderRadius: size * 0.09,
            backgroundColor: glowColor,
          }}
        />
      </Animated.View>
    );
  }

  if (animation === "sparkle") {
    const rotate = loopValue.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
    const dots = [0, 120, 240];
    return (
      <View style={styles.center}>
        {core}
        <Animated.View
          style={{
            position: "absolute",
            width: size * 1.7,
            height: size * 1.7,
            transform: [{ rotate }],
          }}
        >
          {dots.map((deg) => (
            <View
              key={deg}
              style={{
                position: "absolute",
                top: size * 0.85 - size * 0.06,
                left: size * 0.85 - size * 0.06 + (size * 0.85) * Math.cos((deg * Math.PI) / 180),
                width: size * 0.12,
                height: size * 0.12,
                borderRadius: size * 0.06,
                backgroundColor: glowColor,
                transform: [
                  { translateY: (size * 0.85) * Math.sin((deg * Math.PI) / 180) },
                ],
              }}
            />
          ))}
        </Animated.View>
      </View>
    );
  }

  // wave
  const glowOpacity = loopValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.85, 0.15] });
  return (
    <View style={styles.center}>
      {core}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
          opacity: glowOpacity,
        }}
      />
    </View>
  );
}

interface Props {
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  animation: BallAnimation;
}

function BallViewInner({ x, y, radius, color, glowColor, animation }: Props) {
  const size = radius * 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          left: x - radius,
          top: y - radius,
          width: size,
          height: size,
          shadowColor: glowColor,
        },
      ]}
    >
      <BallFace size={size} color={color} glowColor={glowColor} animation={animation} />
    </View>
  );
}

export const BallView = React.memo(BallViewInner);

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
