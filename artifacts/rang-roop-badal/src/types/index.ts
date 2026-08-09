export type ColorName =
  | "White"
  | "Red"
  | "Yellow"
  | "Purple"
  | "Black"
  | "Blue"
  | "Pink"
  | "Violet"
  | "Green"
  | "Orange";

export type ShapeName = "Circle" | "Square" | "Triangle" | "Star" | "Hexagon";

export type GameMode = "classic" | "endless" | "challenge";

export type CurrencyType = "coins" | "stars";

export type GraphicsQuality = "Low" | "Medium" | "High";

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Paddle {
  x: number;
  width: number;
  height: number;
}

export interface Brick {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  points: number;
  alive: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  price: number;
  currency: CurrencyType;
  primary: string;
  secondary: string;
}

export interface ShopItemDef {
  id: string;
  name: string;
  category: "characters" | "trails" | "effects" | "themes";
  price: number;
  currency: CurrencyType;
  color: string;
  description: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: { coins?: number; stars?: number };
  statKey: keyof PlayerStats;
}

export interface PlayerStats {
  totalMatches: number;
  perfectMatches: number;
  highestCombo: number;
  totalScoreEarned: number;
  starsCollectedTotal: number;
  challengesCompleted: number;
  dangerTimeSurvivedCount: number;
  gamesPlayed: number;
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  type:
    | "matches"
    | "combo"
    | "coins"
    | "danger_survive"
    | "perfect_matches";
  target: number;
  reward: { coins?: number; stars?: number };
}

export interface DailyRewardDef {
  day: number;
  label: string;
  currency: CurrencyType | "special";
  amount: number;
}

export type RankName =
  | "Bronze III"
  | "Bronze II"
  | "Bronze I"
  | "Silver III"
  | "Silver II"
  | "Silver I"
  | "Gold III"
  | "Gold II"
  | "Gold I"
  | "Platinum III"
  | "Platinum II"
  | "Platinum I"
  | "Diamond III"
  | "Diamond II"
  | "Diamond I"
  | "Master"
  | "Grandmaster";

export type RootStackParamList = {
  Splash: undefined;
  Gameplay: { mode: GameMode; challengeId?: string };
  MainMenu: undefined;
  GameModes: undefined;
  ChallengeSelect: undefined;
  CharacterSelect: undefined;
  Shop: undefined;
  DailyReward: undefined;
  Achievements: undefined;
  Profile: undefined;
  RankProgress: undefined;
  Settings: undefined;
  GameOver: {
    score: number;
    coins: number;
    stars: number;
    highestCombo: number;
    xpEarned: number;
    isNewBest: boolean;
  };
};
