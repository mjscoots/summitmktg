import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hosted type, latin subset only (Pass 157): Montserrat for display and numbers, Inter for body,
// Source Serif for the Life workspace headings.
import "@fontsource/montserrat/latin-700.css";
import "@fontsource/montserrat/latin-800.css";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/source-serif-4/latin-500.css";
import "@fontsource/source-serif-4/latin-600.css";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
