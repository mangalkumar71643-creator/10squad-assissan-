export const theme = {
  bg: {
    deep: ["#0F0A2A", "#2A1259", "#4A1489"] as const,
    menu: ["#160B2E", "#2A1259", "#3B1470"] as const,
    danger: ["#2A0A0A", "#4A0F1E", "#6B1030"] as const,
    card: ["#241249", "#33186B"] as const,
  },
  accent: {
    magenta: "#FF4FD8",
    cyan: "#3EE9F0",
    gold: "#FFD35E",
    green: "#2ED47A",
    red: "#FF4757",
    purple: "#9B59F6",
  },
  text: {
    primary: "#F5F6FF",
    secondary: "#B9AEE0",
    muted: "#7C71A8",
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
};

export type Theme = typeof theme;
