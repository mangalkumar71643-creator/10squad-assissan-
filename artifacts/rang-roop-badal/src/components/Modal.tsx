import React from "react";
import { Modal as RNModal, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "@/constants/theme";

interface Props {
  visible: boolean;
  children: React.ReactNode;
  onRequestClose?: () => void;
}

export function GameModal({ visible, children, onRequestClose }: Props) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={theme.bg.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {children}
        </LinearGradient>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0B0620CC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: theme.radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
});
