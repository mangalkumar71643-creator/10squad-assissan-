import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";

const BUTTON_BG_ASPECT_RATIO = 1536 / 1024;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const BUTTON_BG_HEIGHT = SCREEN_WIDTH / BUTTON_BG_ASPECT_RATIO;
const BUTTON_BG_BOTTOM = -90;

const MENU_BUTTON_RATIO = 774 / 201;
const MENU_BUTTON_WIDTH = SCREEN_WIDTH * 0.82;
const MENU_BUTTON_HEIGHT = MENU_BUTTON_WIDTH / MENU_BUTTON_RATIO;
const MENU_BUTTON_GAP = 6;
const MENU_STACK_TOP = SCREEN_HEIGHT * 0.27 - 10;

const MENU_BUTTONS: { key: string; source: number }[] = [
  { key: "play", source: require("../../assets/btn_play.png") },
  { key: "game_modes", source: require("../../assets/btn_game_modes.png") },
  { key: "balls", source: require("../../assets/btn_balls.png") },
  { key: "rank", source: require("../../assets/btn_rank.png") },
  { key: "settings", source: require("../../assets/btn_settings.png") },
];

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

      <View style={styles.menuStack}>
        {MENU_BUTTONS.map((btn) => (
          <Image key={btn.key} source={btn.source} style={styles.menuButton} resizeMode="contain" />
        ))}
      </View>

      <View style={styles.buttonBgWrap}>
        <Image
          source={require("../../assets/button_bg.png")}
          style={styles.buttonBg}
          resizeMode="stretch"
        />

        <View style={styles.iconRow}>
          {ICONS.map((icon) => (
            <View key={icon.key} style={styles.iconSlot}>
              <View style={styles.iconSlotBg}>
                <Image source={icon.source} style={styles.iconImage} resizeMode="contain" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#160B2E" },
  menuStack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: MENU_STACK_TOP,
    alignItems: "center",
    gap: MENU_BUTTON_GAP,
  },
  menuButton: {
    width: MENU_BUTTON_WIDTH,
    height: MENU_BUTTON_HEIGHT,
  },
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
  iconSlotBg: {
    width: "88%",
    height: "88%",
    borderRadius: 14,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: "92%",
    height: "92%",
  },
});
