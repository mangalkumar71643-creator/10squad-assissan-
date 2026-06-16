import { createRoot } from "react-dom/client";
import App from "./App";
import OrientationGate from "./components/OrientationGate";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <OrientationGate>
    <App />
  </OrientationGate>
);
