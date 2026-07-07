import React from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GameButton } from "@/components/GameButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { theme } from "@/constants/theme";
import { useProfileStore } from "@/store/profileStore";
import { useSettingsStore } from "@/store/settingsStore";
import { GraphicsQuality, RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const GRAPHICS_OPTIONS: GraphicsQuality[] = ["Low", "Medium", "High"];

function SettingRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#4A4460", true: theme.accent.green }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const settings = useSettingsStore((s) => s);
  const region = useProfileStore((s) => s.region);
  const regionFlag = useProfileStore((s) => s.regionFlag);

  return (
    <View style={styles.flex}>
      <ScreenBackground colors={theme.bg.menu}>
        <SafeAreaView style={styles.flex}>
          <Text style={styles.header}>SETTINGS</Text>
          <ScrollView contentContainerStyle={styles.body}>
            <LinearGradient colors={theme.bg.card} style={styles.card}>
              <SettingRow label="Music" value={settings.musicOn} onToggle={settings.toggleMusic} />
              <SettingRow label="Sound Effects" value={settings.sfxOn} onToggle={settings.toggleSfx} />
              <SettingRow label="Vibration" value={settings.vibrationOn} onToggle={settings.toggleVibration} />
              <SettingRow label="Show Tutorial" value={settings.tutorialOn} onToggle={settings.toggleTutorial} />
            </LinearGradient>

            <LinearGradient colors={theme.bg.card} style={styles.card}>
              <Text style={styles.sectionLabel}>Graphics Quality</Text>
              <View style={styles.optionsRow}>
                {GRAPHICS_OPTIONS.map((g) => (
                  <GameButton
                    key={g}
                    label={g}
                    size="sm"
                    selected={settings.graphics === g}
                    colors={settings.graphics === g ? [theme.accent.cyan, "#1E9CA6"] : ["#4A4460", "#3A3450"]}
                    onPress={() => settings.setGraphics(g)}
                  />
                ))}
              </View>
            </LinearGradient>

            <LinearGradient colors={theme.bg.card} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Language</Text>
                <Text style={styles.rowValue}>{settings.language}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Region</Text>
                <Text style={styles.rowValue}>
                  {regionFlag} {region}
                </Text>
              </View>
            </LinearGradient>
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
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
    letterSpacing: 1,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    color: theme.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  rowValue: {
    color: theme.text.secondary,
    fontSize: 13,
  },
  sectionLabel: {
    color: theme.text.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  back: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
});
