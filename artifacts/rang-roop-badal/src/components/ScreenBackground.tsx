import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  colors?: readonly [string, string, ...string[]];
  children?: React.ReactNode;
  starCount?: number;
  intense?: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function TwinklingStar({ star }: { star: Star }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: star.duration,
          delay: star.delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: star.duration,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, star]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: star.x,
        top: star.y,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: "#FFFFFF",
        opacity,
      }}
    />
  );
}

export function ScreenBackground({
  colors = ["#160B2E", "#2A1259", "#3B1470"],
  children,
  starCount = 26,
  intense = false,
}: Props) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: starCount }).map(() => ({
        x: Math.random() * SCREEN_W,
        y: Math.random() * SCREEN_H * 0.75,
        size: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 1500,
        duration: 900 + Math.random() * 1200,
      })),
    [starCount],
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {stars.map((s, i) => (
        <TwinklingStar key={i} star={s} />
      ))}
      {intense && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "#FF2D5533" }]}
        />
      )}
      {children}
    </View>
  );
}
