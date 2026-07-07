import React, { useRef } from "react";
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "@/constants/theme";
import { vibrate } from "@/utils/haptics";

interface Props {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  colors?: readonly [string, string, ...string[]];
  disabled?: boolean;
  locked?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function GameButton({
  label,
  onPress,
  colors = [theme.accent.magenta, theme.accent.purple],
  disabled,
  locked,
  selected,
  size = "md",
  style,
  icon,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || locked;

  const pad = size === "sm" ? 10 : size === "lg" ? 20 : 15;
  const fontSize = size === "sm" ? 14 : size === "lg" ? 20 : 16;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={(e) => {
          vibrate("light");
          onPress(e);
        }}
        style={({ pressed }) => [pressed && !isDisabled ? styles.pressed : null]}
      >
        <LinearGradient
          colors={isDisabled ? ["#4A4460", "#3A3450"] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            {
              paddingVertical: pad,
              paddingHorizontal: pad * 1.6,
              opacity: isDisabled ? 0.55 : 1,
            },
            selected ? styles.selected : null,
          ]}
        >
          {icon}
          <Text style={[styles.label, { fontSize }]} numberOfLines={1}>
            {locked ? `🔒 ${label}` : label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  selected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
});
