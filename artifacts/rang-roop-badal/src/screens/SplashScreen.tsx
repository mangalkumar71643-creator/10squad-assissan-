import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";

const BUTTON_BG_ASPECT_RATIO = 1536 / 1024;
const SCREEN_WIDTH = Dimensions.get("window").width;
const BUTTON_BG_HEIGHT = SCREEN_WIDTH / BUTTON_BG_ASPECT_RATIO;

export function SplashScreen() {
  return (
    <View style={styles.flex}>
      <Image
        source={require("../../assets/splash_lobby.png")}
        style={styles.image}
        resizeMode="cover"
      />
      <Image
        source={require("../../assets/button_bg.png")}
        style={styles.buttonBg}
        resizeMode="stretch"
      />
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
  buttonBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: BUTTON_BG_HEIGHT,
  },
});
