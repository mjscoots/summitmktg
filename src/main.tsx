import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Body type is self-hosted (latin subset). The display face Space Grotesk loads
// from Google Fonts in index.html with display swap and a system fallback.
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
