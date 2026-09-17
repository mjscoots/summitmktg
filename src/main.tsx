import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Pass 181: one family, Archivo, loads from Google Fonts in index.html with
// display swap and a system fallback. No self-hosted faces remain.
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { rememberCodeFromUrl } from "./lib/source";

// Pass 224 - a referral code is remembered before the first render, so it
// survives the cover, a scroll, a refresh and the whole application flow.
rememberCodeFromUrl();

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
