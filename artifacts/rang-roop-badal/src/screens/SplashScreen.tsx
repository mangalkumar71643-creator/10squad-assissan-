import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";

const BUTTON_BG_ASPECT_RATIO = 1536 / 1024;
const SCREEN_WIDTH = Dimensions.get("window").width;
const BUTTON_BG_HEIGHT = SCREEN_WIDTH / BUTTON_BG_ASPECT_RATIO;
const BUTTON_BG_BOTTOM = -90;

// The pill artwork's solid band sits roughly between these two fractions of
// its own height (measured from the source PNG) — icons are laid out there.
const PILL_TOP_RATIO = 358 / 1024;
const PILL_BOTTOM_RATIO = 654 / 1024;
const ICON_ROW_TOP = PILL_TOP_RATIO * BUTTON_BG_HEIGHT;
const ICON_ROW_HEIGHT = (PILL_BOTTOM_RATIO - PILL_TOP_RATIO) * BUTTON_BG_HEIGHT;

const ICONS: { key: string; source: number }[] = [
  { key: "home", source: require("../../assets/icon_home.png") },
  { key: "shop", source: require("../../assets/icon_shop.png") },
  { key: "daily_reward", source: require("../../assets/icon_daily_reward.png") },
  { key: "achievements", source: require("../../assets/icon_achievements.png") },
];

export function SplashScreen() {
  return (
    <View style={styles.flex}>
      <Image
        source={require("../../assets/splash_lobby.png")}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.buttonBgWrap}>
        <Image
          source={require("../../assets/button_bg.png")}
          style={styles.buttonBg}
          resizeMode="stretch"
        />

        <View style={styles.iconRow}>
          {ICONS.map((icon) => (
            <View key={icon.key} style={styles.iconSlot}>
              <Image source={icon.source} style={styles.iconImage} resizeMode="contain" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#160B2E" },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  buttonBgWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: BUTTON_BG_BOTTOM,
    width: SCREEN_WIDTH,
    height: BUTTON_BG_HEIGHT,
  },
  buttonBg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: BUTTON_BG_HEIGHT,
  },
  iconRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ICON_ROW_TOP,
    height: ICON_ROW_HEIGHT,
    flexDirection: "row",
  },
  iconSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  iconImage: {
    width: "100%",
    height: "100%",
  },
});
