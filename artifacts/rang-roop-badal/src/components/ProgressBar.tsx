import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface Props {
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  height?: number;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  color = "#2ED47A",
  trackColor = "#FFFFFF22",
  height = 10,
  animated = true,
}: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clamped,
        duration: 350,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(clamped);
    }
  }, [clamped, animated, widthAnim]);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            borderRadius: height / 2,
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
