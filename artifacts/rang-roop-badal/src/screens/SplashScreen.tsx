import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlienCharacter } from "@/components/AlienCharacter";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

const TITLE_WORDS: { text: string; color: string }[] = [
  { text: "RANG", color: "#FF4FD8" },
  { text: "ROOP", color: "#3EE9F0" },
  { text: "BADAL", color: "#FFD35E" },
];

export function SplashScreen({ navigation }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const logoEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoEntrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse, logoEntrance]);

  const startGame = () => {
    navigation.replace("Gameplay", { mode: "classic" });
  };

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.deep} starCount={44}>
        <SafeAreaView style={styles.flex}>
          <Pressable style={styles.flex} onPress={startGame}>
            <View style={styles.logoWrap}>
              <Animated.View
                style={{
                  opacity: logoEntrance,
                  transform: [
                    { scale: logoEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                  ],
                }}
              >
                <View style={styles.titleRow}>
                  {TITLE_WORDS.map((w) => (
                    <Text
                      key={w.text}
                      style={[
                        styles.title,
                        {
                          color: w.color,
                          textShadowColor: w.color,
                        },
                      ]}
                    >
                      {w.text}
                    </Text>
                  ))}
                </View>
                <Text style={styles.tagline}>a magical brick-smashing adventure</Text>
              </Animated.View>
            </View>

            <View style={styles.heroWrap}>
              <AlienCharacter color="#2ED47A" secondaryColor="#1B8F55" shape="Circle" mood="run" size={190} />
              <View style={styles.trackLine} />
            </View>

            <View style={styles.footer}>
              <Animated.Text style={[styles.cta, { transform: [{ scale: pulse }] }]}>
                TAP TO START
              </Animated.Text>
            </View>
          </Pressable>
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  logoWrap: {
    alignItems: "center",
    marginTop: "14%",
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: theme.text.secondary,
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  heroWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trackLine: {
    marginTop: 18,
    width: "70%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF22",
  },
  footer: {
    alignItems: "center",
    paddingBottom: "10%",
  },
  cta: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: theme.accent.magenta,
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
});
