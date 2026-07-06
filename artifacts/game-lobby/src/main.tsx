import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getStoredToken } from "./lib/auth";
import App from "./App";
import OrientationGate from "./components/OrientationGate";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  setBaseUrl("https://api-server-beryl-delta.vercel.app");
}

setAuthTokenGetter(() => getStoredToken());

createRoot(document.getElementById("root")!).render(
  <OrientationGate>
    <App />
  </OrientationGate>
);
