import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Pass 180: the display face Instrument Serif and the body face Geist both load
// from Google Fonts in index.html with display swap and a system fallback. The
// serif for the Life headings stays self-hosted.
import "@fontsource/source-serif-4/latin-500.css";
import "@fontsource/source-serif-4/latin-600.css";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
