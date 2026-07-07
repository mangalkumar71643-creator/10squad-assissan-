import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { FloatingText } from "@/types";

interface ItemProps {
  item: FloatingText;
  onDone: (id: string) => void;
}

function FloatingItem({ item, onDone }: ItemProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(translateY, {
        toValue: -70,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 900,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDone(item.id));
  }, []);

  return (
    <Animated.Text
      style={[
        styles.text,
        {
          left: item.x,
          top: item.y,
          color: item.color,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {item.text}
    </Animated.Text>
  );
}

export function FloatingScoreLayer({
  items,
  onDone,
}: {
  items: FloatingText[];
  onDone: (id: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <FloatingItem key={item.id} item={item} onDone={onDone} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    position: "absolute",
    fontSize: 20,
    fontWeight: "900",
    textShadowColor: "#00000088",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
});
