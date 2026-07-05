import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import OrientationGate from "./components/OrientationGate";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  setBaseUrl("https://api-server-beryl-delta.vercel.app");
}

createRoot(document.getElementById("root")!).render(
  <OrientationGate>
    <App />
  </OrientationGate>
);
