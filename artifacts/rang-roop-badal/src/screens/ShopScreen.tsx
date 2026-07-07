import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { ShopItemCard } from "@/components/ShopItemCard";
import { SHOP_ITEMS } from "@/constants/shop";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { useShopStore } from "@/store/shopStore";
import { RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;

const TABS: { key: "characters" | "trails" | "effects" | "themes"; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "trails", label: "Trails" },
  { key: "effects", label: "Effects" },
  { key: "themes", label: "Themes" },
];

export function ShopScreen({ navigation }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("trails");
  const coins = useProfileStore((s) => s.coins);
  const stars = useProfileStore((s) => s.stars);
  const spendCoins = useProfileStore((s) => s.spendCoins);
  const spendStars = useProfileStore((s) => s.spendStars);

  const ownedItemIds = useShopStore((s) => s.ownedItemIds);
  const equippedTrail = useShopStore((s) => s.equippedTrail);
  const equippedEffect = useShopStore((s) => s.equippedEffect);
  const equippedTheme = useShopStore((s) => s.equippedTheme);
  const ownItem = useShopStore((s) => s.ownItem);
  const equipTrail = useShopStore((s) => s.equipTrail);
  const equipEffect = useShopStore((s) => s.equipEffect);
  const equipTheme = useShopStore((s) => s.equipTheme);

  const equipMap = { trails: equippedTrail, effects: equippedEffect, themes: equippedTheme };
  const equipFn = { trails: equipTrail, effects: equipEffect, themes: equipTheme };

  const items = SHOP_ITEMS.filter((i) => i.category === tab);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>SHOP</Text>
            <View style={styles.currencyRow}>
              <CurrencyDisplay icon="🪙" amount={coins} compact />
              <CurrencyDisplay icon="⭐" amount={stars} compact />
            </View>
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => {
                  if (t.key === "characters") {
                    navigation.navigate("CharacterSelect");
                    return;
                  }
                  setTab(t.key);
                }}
                style={[styles.tab, tab === t.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item) => {
              const owned = ownedItemIds.includes(item.id);
              const equipped = tab !== "characters" && equipMap[tab as "trails" | "effects" | "themes"] === item.id;
              const funds = item.currency === "coins" ? coins : stars;
              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  owned={owned}
                  equipped={equipped}
                  canAfford={funds >= item.price}
                  onBuy={() => {
                    const success = item.currency === "coins" ? spendCoins(item.price) : spendStars(item.price);
                    if (success) ownItem(item.id);
                  }}
                  onEquip={() => {
                    if (tab === "trails" || tab === "effects" || tab === "themes") {
                      equipFn[tab](item.id);
                    }
                  }}
                />
              );
            })}
          </ScrollView>

          <GameButton label="Back" onPress={() => navigation.goBack()} colors={["#7C71A8", "#4A4460"]} style={styles.back} />
        </SafeAreaView>
      </ScreenBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  currencyRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "#FFFFFF14",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: theme.accent.magenta,
  },
  tabText: {
    color: theme.text.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 12,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
