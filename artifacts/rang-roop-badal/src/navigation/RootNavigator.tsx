import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { RootStackParamList } from "@/types";
import { SplashScreen } from "@/screens/SplashScreen";
import { GameplayScreen } from "@/screens/GameplayScreen";
import { GameModesScreen } from "@/screens/GameModesScreen";
import { ChallengeSelectScreen } from "@/screens/ChallengeSelectScreen";
import { BallSelectScreen } from "@/screens/BallSelectScreen";
import { ShopScreen } from "@/screens/ShopScreen";
import { DailyRewardScreen } from "@/screens/DailyRewardScreen";
import { AchievementsScreen } from "@/screens/AchievementsScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { RankProgressScreen } from "@/screens/RankProgressScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { GameOverScreen } from "@/screens/GameOverScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#160B2E" },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Gameplay" component={GameplayScreen} />
      <Stack.Screen name="GameModes" component={GameModesScreen} />
      <Stack.Screen name="ChallengeSelect" component={ChallengeSelectScreen} />
      <Stack.Screen name="BallSelect" component={BallSelectScreen} />
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen name="DailyReward" component={DailyRewardScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="RankProgress" component={RankProgressScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="GameOver"
        component={GameOverScreen}
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}
