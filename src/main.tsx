import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Pass 181: one family, Archivo, loads from Google Fonts in index.html with
// display swap and a system fallback. No self-hosted faces remain.
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
