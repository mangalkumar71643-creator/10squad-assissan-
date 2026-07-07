import React, { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlienCharacter } from "@/components/AlienCharacter";
import { FloatingScoreLayer } from "@/components/FloatingScoreText";
import { GameButton } from "@/components/GameButton";
import { GameModal } from "@/components/Modal";
import { GateVisual } from "@/components/GateVisual";
import { HUD } from "@/components/HUD";
import { MatchIndicator } from "@/components/MatchIndicator";
import { ParticleBurst } from "@/components/ParticleBurst";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { COLOR_HEX } from "@/constants/colors";
import { CHARACTERS } from "@/constants/characters";
import { theme } from "@/constants/theme";
import { useGameLoop } from "@/hooks/useGameLoop";
import { playSfx } from "@/hooks/useSound";
import { useProfileStore } from "@/store/profileStore";
import { useSettingsStore } from "@/store/settingsStore";
import { RootStackParamList } from "@/types";
import { vibrate } from "@/utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Gameplay">;

const DOUBLE_TAP_DELAY = 300;

export function GameplayScreen({ route, navigation }: Props) {
  const { mode, challengeId } = route.params;
  const { state, changeColor, changeShape, pause, resume, restart, collectStar, removeFloating, setBounds } =
    useGameLoop(mode, challengeId);

  const tutorialOn = useSettingsStore((s) => s.tutorialOn);
  const selectedCharacterId = useProfileStore((s) => s.selectedCharacterId);
  const addCoins = useProfileStore((s) => s.addCoins);
  const addStars = useProfileStore((s) => s.addStars);
  const addXp = useProfileStore((s) => s.addXp);
  const recordRunEnd = useProfileStore((s) => s.recordRunEnd);
  const bumpStat = useProfileStore((s) => s.bumpStat);

  const character = CHARACTERS.find((c) => c.id === selectedCharacterId) ?? CHARACTERS[0];

  const [sawColorChange, setSawColorChange] = useState(false);
  const [sawShapeChange, setSawShapeChange] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  const lastTapAt = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedCoins = useRef(0);
  const syncedStars = useRef(0);
  const finalized = useRef(false);
  const prevLives = useRef(state.lives);
  const prevMood = useRef(state.characterMood);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Sync earned run currency into the persisted profile as it's earned.
  useEffect(() => {
    const coinDelta = state.runCoins - syncedCoins.current;
    if (coinDelta > 0) {
      addCoins(coinDelta);
      syncedCoins.current = state.runCoins;
    }
    const starDelta = state.runStars - syncedStars.current;
    if (starDelta > 0) {
      addStars(starDelta);
      bumpStat("starsCollectedTotal", starDelta);
      syncedStars.current = state.runStars;
    }
  }, [state.runCoins, state.runStars, addCoins, addStars, bumpStat]);

  // React to match/hit feedback.
  useEffect(() => {
    if (state.characterMood === prevMood.current) return;
    prevMood.current = state.characterMood;
    if (state.characterMood === "success") {
      setBurstKey((k) => k + 1);
    }
  }, [state.characterMood]);

  useEffect(() => {
    if (state.lives < prevLives.current) {
      playSfx("wrong");
      vibrate("error");
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
    prevLives.current = state.lives;
  }, [state.lives, flashAnim]);

  useEffect(() => {
    if (state.banner?.tone === "danger") playSfx("danger");
  }, [state.banner]);

  // Finalize run once when it ends.
  useEffect(() => {
    if (state.status !== "gameover" || finalized.current) return;
    finalized.current = true;

    if (state.challengeCompleted && state.challenge) {
      if (state.challenge.reward.coins) addCoins(state.challenge.reward.coins);
      if (state.challenge.reward.stars) addStars(state.challenge.reward.stars);
      bumpStat("challengesCompleted", 1);
    }

    const xpEarned = Math.round(state.score / 8) + state.matches * 2 + state.perfectMatches * 5;
    addXp(xpEarned);
    const isNewBest = recordRunEnd({
      score: state.score,
      combo: state.highestCombo,
      perfectMatches: state.perfectMatches,
      matches: state.matches,
      starsEarned: state.runStars,
      survivedDanger: state.dangerSurvivedThisRun,
    });

    playSfx("gameover");
    navigation.replace("GameOver", {
      score: state.score,
      coins: state.runCoins,
      stars: state.runStars,
      highestCombo: state.highestCombo,
      xpEarned,
      isNewBest,
    });
  }, [state.status]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBounds(width, height);
  };

  const handleTap = () => {
    if (state.status !== "playing") return;
    const now = Date.now();
    if (singleTapTimer.current && now - lastTapAt.current < DOUBLE_TAP_DELAY) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
      changeShape();
      setSawShapeChange(true);
      playSfx("tap");
      vibrate("medium");
    } else {
      lastTapAt.current = now;
      singleTapTimer.current = setTimeout(() => {
        changeColor();
        setSawColorChange(true);
        playSfx("tap");
        vibrate("light");
        singleTapTimer.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  useEffect(() => {
    if (state.matches === 0) return;
    const lastText = state.floatingTexts[state.floatingTexts.length - 1]?.text;
    if (lastText?.includes("PERFECT")) playSfx("perfect");
    else if (state.combo >= 3) playSfx("combo");
    else playSfx("correct");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matches]);

  const showTutorial = tutorialOn && !(sawColorChange && sawShapeChange) && state.status === "playing";
  const bgColors = state.dangerTime ? theme.bg.danger : theme.bg.deep;

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={bgColors} starCount={state.dangerTime ? 40 : 24} intense={state.dangerTime}>
        <SafeAreaView style={styles.flex} onLayout={onLayout}>
          <View style={styles.hudWrap}>
            <HUD
              score={state.score}
              coins={state.runCoins}
              stars={state.runStars}
              lives={state.lives}
              combo={state.combo}
              onPause={() => {
                pause();
                playSfx("tap");
              }}
            />
          </View>

          <View style={styles.matchIndicatorWrap}>
            {state.gate && (
              <MatchIndicator
                color={state.gate.color}
                shape={state.gate.shape}
                special={state.gate.special}
                timeProgress={1 - (state.now - state.gate.spawnedAt) / Math.max(1, state.gate.arrivesAt - state.gate.spawnedAt)}
              />
            )}
          </View>

          <Pressable style={styles.playArea} onPress={handleTap}>
            {state.gate && (
              <GateVisual
                color={state.gate.color}
                shape={state.gate.shape}
                special={state.gate.special}
                trackHeight={state.bounds.height}
                progress={(state.now - state.gate.spawnedAt) / Math.max(1, state.gate.arrivesAt - state.gate.spawnedAt)}
              />
            )}

            <View style={styles.characterWrap}>
              <ParticleBurst
                color={COLOR_HEX[state.playerColor]}
                burstKey={burstKey}
              />
              <AlienCharacter
                color={COLOR_HEX[state.playerColor]}
                secondaryColor={character.secondary}
                shape={state.playerShape}
                mood={state.characterMood}
                size={120}
              />
            </View>

            {state.stars.map((star) => (
              <Pressable
                key={star.id}
                onPress={() => {
                  collectStar(star.id);
                  playSfx("star");
                  vibrate("success");
                }}
                style={[styles.star, { left: star.x, top: star.y }]}
                hitSlop={12}
              >
                <Text style={styles.starIcon}>⭐</Text>
              </Pressable>
            ))}

            <FloatingScoreLayer items={state.floatingTexts} onDone={removeFloating} />

            {showTutorial && <TutorialOverlay />}

            {state.banner && (
              <View style={styles.bannerWrap} pointerEvents="none">
                <Text
                  style={[
                    styles.bannerText,
                    { color: state.banner.tone === "danger" ? theme.accent.red : theme.accent.gold },
                  ]}
                >
                  {state.banner.text}
                </Text>
              </View>
            )}

            {state.challenge && (
              <View style={styles.challengeWrap} pointerEvents="none">
                <Text style={styles.challengeText}>
                  {state.challenge.title}: {Math.min(state.challengeProgress, state.challenge.target)}/
                  {state.challenge.target}
                </Text>
              </View>
            )}
          </Pressable>
        </SafeAreaView>
      </ScreenBackground>

      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flashAnim }]}
      />

      <GameModal visible={state.status === "paused"}>
        <Text style={styles.pauseTitle}>PAUSED</Text>
        <View style={styles.pauseButtons}>
          <GameButton label="Resume" onPress={resume} colors={[theme.accent.green, "#1B8F55"]} />
          <GameButton label="Restart" onPress={restart} colors={[theme.accent.cyan, "#1E9CA6"]} />
          <GameButton
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
            colors={[theme.accent.purple, "#6A2FCB"]}
          />
          <GameButton
            label="Main Menu"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainMenu" }] })}
            colors={[theme.accent.red, "#B33240"]}
          />
        </View>
      </GameModal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hudWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  matchIndicatorWrap: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  playArea: {
    flex: 1,
    position: "relative",
  },
  characterWrap: {
    position: "absolute",
    bottom: "12%",
    alignSelf: "center",
    alignItems: "center",
  },
  star: {
    position: "absolute",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  starIcon: {
    fontSize: 28,
  },
  bannerWrap: {
    position: "absolute",
    top: "26%",
    alignSelf: "center",
  },
  bannerText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "#000000AA",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  challengeWrap: {
    position: "absolute",
    top: 6,
    alignSelf: "center",
    backgroundColor: "#00000066",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  challengeText: {
    color: theme.text.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FF0000",
  },
  pauseTitle: {
    color: theme.text.primary,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 2,
  },
  pauseButtons: {
    gap: 12,
  },
});
