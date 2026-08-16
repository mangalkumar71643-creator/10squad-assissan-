import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { BallView } from "@/components/BallView";
import { BrickGrid } from "@/components/BrickGrid";
import { FloatingScoreLayer } from "@/components/FloatingScoreText";
import { GameButton } from "@/components/GameButton";
import { GameModal } from "@/components/Modal";
import { HUD } from "@/components/HUD";
import { PaddleView } from "@/components/PaddleView";
import { ParticleBurst } from "@/components/ParticleBurst";
import { ScreenBackground } from "@/components/ScreenBackground";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { BALLS } from "@/constants/balls";
import { theme } from "@/constants/theme";
import { paddleYFor, useGameLoop } from "@/hooks/useGameLoop";
import { playSfx } from "@/hooks/useSound";
import { useProfileStore } from "@/store/profileStore";
import { useSettingsStore } from "@/store/settingsStore";
import { RootStackParamList } from "@/types";
import { vibrate } from "@/utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Gameplay">;

export function GameplayScreen({ route, navigation }: Props) {
  const { mode, challengeId } = route.params;
  const savedLevel = useProfileStore((s) => s.currentLevel);
  const startLevel = route.params.startLevel ?? savedLevel;
  const { state, movePaddle, pause, resume, restart, collectStar, removeFloating, setBounds } =
    useGameLoop(mode, challengeId, startLevel);

  const tutorialOn = useSettingsStore((s) => s.tutorialOn);
  const selectedBallId = useProfileStore((s) => s.selectedBallId);
  const addCoins = useProfileStore((s) => s.addCoins);
  const addStars = useProfileStore((s) => s.addStars);
  const addXp = useProfileStore((s) => s.addXp);
  const recordRunEnd = useProfileStore((s) => s.recordRunEnd);
  const bumpStat = useProfileStore((s) => s.bumpStat);
  const bumpLevel = useProfileStore((s) => s.bumpLevel);
  const recordLevelStars = useProfileStore((s) => s.recordLevelStars);

  const ball = BALLS.find((b) => b.id === selectedBallId) ?? BALLS[0];

  const [hasMovedPaddle, setHasMovedPaddle] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [burstPos, setBurstPos] = useState({ x: 0, y: 0, color: theme.accent.green });

  const syncedCoins = useRef(0);
  const syncedStars = useRef(0);
  const finalized = useRef(false);
  const prevLives = useRef(state.lives);
  const prevMatches = useRef(state.matches);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const paddleWidthRef = useRef(state.paddle.width);
  paddleWidthRef.current = state.paddle.width;

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

  // Persist the highest level reached so the next run can resume from it.
  useEffect(() => {
    bumpLevel(state.level);
  }, [state.level, bumpLevel]);

  // Persist the star rating earned each time a level is cleared.
  useEffect(() => {
    if (state.lastLevelCleared) {
      recordLevelStars(state.lastLevelCleared.level, state.lastLevelCleared.stars);
    }
  }, [state.lastLevelCleared, recordLevelStars]);

  // Particle burst + sfx whenever a brick breaks.
  useEffect(() => {
    if (state.matches === prevMatches.current) return;
    prevMatches.current = state.matches;
    const last = state.floatingTexts[state.floatingTexts.length - 1];
    if (last) {
      setBurstPos({ x: last.x, y: last.y, color: last.color });
      setBurstKey((k) => k + 1);
    }
    if (last?.text.includes("PERFECT")) playSfx("perfect");
    else if (state.combo >= 3) playSfx("combo");
    else playSfx("correct");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matches]);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        movePaddle(evt.nativeEvent.locationX - paddleWidthRef.current / 2);
        setHasMovedPaddle(true);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        movePaddle(evt.nativeEvent.locationX - paddleWidthRef.current / 2);
      },
    }),
  ).current;

  const showTutorial = tutorialOn && !hasMovedPaddle && state.status === "playing";
  const bgColors = state.dangerTime ? theme.bg.danger : theme.bg.deep;
  const paddleY = paddleYFor(state.bounds.height);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={bgColors} starCount={state.dangerTime ? 40 : 24} intense={state.dangerTime}>
        <SafeAreaView style={styles.flex}>
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

          <View style={styles.playArea} onLayout={onLayout} {...panResponder.panHandlers}>
            <BrickGrid bricks={state.bricks} />

            <PaddleView
              x={state.paddle.x}
              y={paddleY}
              width={state.paddle.width}
              height={state.paddle.height}
              color={ball.glowColor}
            />

            <BallView
              x={state.ball.x}
              y={state.ball.y}
              radius={state.ball.radius}
              color={ball.color}
              glowColor={ball.glowColor}
              animation={ball.animation}
            />

            <ParticleBurst color={burstPos.color} burstKey={burstKey} x={burstPos.x} y={burstPos.y} />

            {state.stars.map((star) => (
              <View
                key={star.id}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => {
                  collectStar(star.id);
                  playSfx("star");
                  vibrate("success");
                }}
                style={[styles.star, { left: star.x, top: star.y }]}
              >
                <Text style={styles.starIcon}>⭐</Text>
              </View>
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

            <View style={styles.levelWrap} pointerEvents="none">
              <Text style={styles.levelText}>LEVEL {state.level}</Text>
            </View>

            {state.challenge && (
              <View style={styles.challengeWrap} pointerEvents="none">
                <Text style={styles.challengeText}>
                  {state.challenge.title}: {Math.min(state.challengeProgress, state.challenge.target)}/
                  {state.challenge.target}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </ScreenBackground>

      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />

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
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "LevelPanel" }] })}
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
    paddingBottom: 6,
  },
  playArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
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
    top: "40%",
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
  levelWrap: {
    position: "absolute",
    top: 6,
    right: 12,
  },
  levelText: {
    color: theme.text.muted,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1,
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
