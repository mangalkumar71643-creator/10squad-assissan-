import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface Props {
  color: string;
  count?: number;
  size?: number;
  burstKey: number;
  x?: number;
  y?: number;
}

export function ParticleBurst({ color, count = 12, size = 8, burstKey, x, y }: Props) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.3,
        distance: 60 + Math.random() * 40,
      })),
    [count, burstKey],
  );
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, [burstKey, progress]);

  const positionStyle = x !== undefined && y !== undefined ? { left: x, top: y } : styles.centered;

  return (
    <View style={[styles.container, positionStyle]} pointerEvents="none">
      {particles.map((p, i) => {
        const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.distance] });
        const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.distance] });
        const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateX: tx }, { translateY: ty }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignSelf: "center",
  },
  particle: {
    position: "absolute",
  },
});
