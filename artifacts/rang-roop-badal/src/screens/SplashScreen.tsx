import React from "react";
import { Image, StyleSheet, View } from "react-native";

export function SplashScreen() {
  return (
    <View style={styles.flex}>
      <Image
        source={require("../../assets/splash_lobby.png")}
        style={styles.image}
        resizeMode="cover"
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
});
