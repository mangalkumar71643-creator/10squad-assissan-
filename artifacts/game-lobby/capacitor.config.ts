import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tensquad.assassin",
  appName: "10 Squad Assassin",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      // Kept brief on purpose: the native splash-screen icon renders
      // inconsistently across Android versions/OEMs (confirmed blank on a
      // real device even after theming it), so this is just here to cover
      // the gap before the WebView paints — the actual 3-second logo
      // display is handled reliably by the web layer (src/App.tsx).
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
