import React, { useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlienCharacter } from "@/components/AlienCharacter";
import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { CHARACTERS } from "@/constants/characters";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { CharacterDef, RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "CharacterSelect">;

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_W * 0.72;

export function CharacterSelectScreen({ navigation }: Props) {
  const unlockedIds = useProfileStore((s) => s.unlockedCharacterIds);
  const selectedId = useProfileStore((s) => s.selectedCharacterId);
  const coins = useProfileStore((s) => s.coins);
  const stars = useProfileStore((s) => s.stars);
  const unlockCharacter = useProfileStore((s) => s.unlockCharacter);
  const selectCharacter = useProfileStore((s) => s.selectCharacter);
  const spendCoins = useProfileStore((s) => s.spendCoins);
  const spendStars = useProfileStore((s) => s.spendStars);

  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, CHARACTERS.findIndex((c) => c.id === selectedId)),
  );
  const listRef = useRef<FlatList<CharacterDef>>(null);

  const buy = (c: CharacterDef) => {
    const funds = c.currency === "coins" ? coins : stars;
    if (funds < c.price) return;
    const success = c.currency === "coins" ? spendCoins(c.price) : spendStars(c.price);
    if (success) unlockCharacter(c.id);
  };

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>CHARACTERS</Text>

          <FlatList
            ref={listRef}
            data={CHARACTERS}
            keyExtractor={(c) => c.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (SCREEN_W - CARD_WIDTH) / 2 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
              setActiveIndex(idx);
            }}
            renderItem={({ item }) => {
              const owned = unlockedIds.includes(item.id);
              const isSelected = selectedId === item.id;
              const funds = item.currency === "coins" ? coins : stars;
              return (
                <View style={[styles.card, { width: CARD_WIDTH }]}>
                  <View style={styles.preview}>
                    <AlienCharacter color={item.primary} secondaryColor={item.secondary} shape="Circle" mood="idle" size={170} />
                  </View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.status}>
                    {owned ? (isSelected ? "Equipped" : "Owned") : `${item.price} ${item.currency === "coins" ? "🪙" : "⭐"}`}
                  </Text>
                  {owned ? (
                    <GameButton
                      label={isSelected ? "Selected" : "Select"}
                      selected={isSelected}
                      colors={[theme.accent.green, "#1B8F55"]}
                      onPress={() => selectCharacter(item.id)}
                    />
                  ) : (
                    <GameButton
                      label="Buy"
                      colors={[theme.accent.gold, "#D19A2A"]}
                      disabled={funds < item.price}
                      onPress={() => buy(item)}
                    />
                  )}
                </View>
              );
            }}
          />

          <Text style={styles.hint}>Swipe left / right to browse • {activeIndex + 1}/{CHARACTERS.length}</Text>

          <GameButton label="Back" onPress={() => navigation.goBack()} colors={["#7C71A8", "#4A4460"]} style={styles.back} />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 1,
  },
  card: {
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  preview: {
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: theme.text.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  status: {
    color: theme.text.secondary,
    fontSize: 13,
    marginBottom: 6,
  },
  hint: {
    color: theme.text.muted,
    textAlign: "center",
    fontSize: 12,
    marginBottom: 10,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
