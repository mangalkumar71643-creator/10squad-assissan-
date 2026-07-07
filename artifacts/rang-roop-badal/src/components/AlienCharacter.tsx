import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { ShapeName } from "@/types";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export type CharacterMood = "idle" | "run" | "hit" | "success";

interface Props {
  color: string;
  secondaryColor?: string;
  shape: ShapeName;
  mood: CharacterMood;
  size?: number;
}

function bodyClipShape(shape: ShapeName, size: number) {
  const c = size / 2;
  switch (shape) {
    case "Square":
      return { rx: size * 0.22, isRound: false };
    case "Triangle":
      return { rx: size * 0.4, isRound: false };
    case "Hexagon":
      return { rx: size * 0.3, isRound: false };
    case "Star":
      return { rx: size * 0.5, isRound: false };
    default:
      return { rx: size * 0.5, isRound: true };
  }
}

export function AlienCharacter({ color, secondaryColor, shape, mood, size = 130 }: Props) {
  const bounce = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    if (mood === "run" || mood === "idle") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: 1,
            duration: mood === "run" ? 260 : 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: 0,
            duration: mood === "run" ? 260 : 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [mood, bounce]);

  useEffect(() => {
    if (mood === "hit") {
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    }
    if (mood === "success") {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [mood, tilt, scale]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] });
  const { rx, isRound } = bodyClipShape(shape, size);
  const bodyColor = mood === "hit" ? "#FF4757" : color;
  const secondary = secondaryColor ?? color;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }, { rotate }, { scale }],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size * 1.05} viewBox={`0 0 ${size} ${size * 1.05}`}>
        {/* glow halo */}
        <Circle cx={size / 2} cy={size * 0.52} r={size * 0.48} fill={bodyColor} opacity={0.18} />

        {/* antenna */}
        <Path
          d={`M ${size * 0.5} ${size * 0.12} Q ${size * 0.46} ${size * 0.02} ${size * 0.42} ${size * 0.01}`}
          stroke={secondary}
          strokeWidth={size * 0.02}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={size * 0.41} cy={size * 0.01} r={size * 0.03} fill="#FFD35E" />

        {/* body */}
        {isRound ? (
          <Ellipse cx={size / 2} cy={size * 0.58} rx={size * 0.34} ry={size * 0.4} fill={bodyColor} />
        ) : (
          <Path
            d={`M ${size * 0.5} ${size * 0.18}
                L ${size * 0.84} ${size * 0.58}
                Q ${size * 0.84} ${size * 0.95} ${size * 0.5} ${size * 0.95}
                Q ${size * 0.16} ${size * 0.95} ${size * 0.16} ${size * 0.58}
                Z`}
            fill={bodyColor}
          />
        )}

        {/* belly glow patch */}
        <Ellipse cx={size / 2} cy={size * 0.66} rx={size * 0.13} ry={size * 0.16} fill={secondary} opacity={0.55} />

        {/* eyes */}
        <Ellipse cx={size * 0.4} cy={size * 0.48} rx={size * 0.08} ry={size * 0.1} fill="#0F0A2A" />
        <Ellipse cx={size * 0.6} cy={size * 0.48} rx={size * 0.08} ry={size * 0.1} fill="#0F0A2A" />
        <Circle cx={size * 0.42} cy={size * 0.45} r={size * 0.02} fill="#FFFFFF" />
        <Circle cx={size * 0.62} cy={size * 0.45} r={size * 0.02} fill="#FFFFFF" />

        {/* mouth */}
        {mood === "success" ? (
          <Path
            d={`M ${size * 0.42} ${size * 0.6} Q ${size * 0.5} ${size * 0.68} ${size * 0.58} ${size * 0.6}`}
            stroke="#0F0A2A"
            strokeWidth={size * 0.015}
            fill="none"
            strokeLinecap="round"
          />
        ) : mood === "hit" ? (
          <Path
            d={`M ${size * 0.43} ${size * 0.63} Q ${size * 0.5} ${size * 0.58} ${size * 0.57} ${size * 0.63}`}
            stroke="#0F0A2A"
            strokeWidth={size * 0.015}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <Ellipse cx={size / 2} cy={size * 0.61} rx={size * 0.035} ry={size * 0.02} fill="#0F0A2A" />
        )}

        {/* arms */}
        <Path
          d={`M ${size * 0.2} ${size * 0.62} Q ${size * 0.08} ${size * 0.66} ${size * 0.1} ${size * 0.78}`}
          stroke={bodyColor}
          strokeWidth={size * 0.06}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${size * 0.8} ${size * 0.62} Q ${size * 0.92} ${size * 0.66} ${size * 0.9} ${size * 0.78}`}
          stroke={bodyColor}
          strokeWidth={size * 0.06}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
