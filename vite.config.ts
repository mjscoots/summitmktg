import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Pass 157 - split by library so a phone downloads only what a route
        // needs, and heavy players/charts/editors never land in the shell.
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id))
              return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("react-quill") || id.includes("quill") || id.includes("dompurify"))
              return "vendor-editor";
            if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform"))
              return "vendor-forms";
            if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-dates";
            if (id.includes("@vimeo/player")) return "vendor-video";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("canvas-confetti")) return "vendor-confetti";
            // The tiny radix primitives are shared by every button, so they
            // travel with the utilities instead of the overlay libraries.
            if (
              /@radix-ui[\\/]react-(slot|primitive|compose-refs|context|use-|presence|id|portal|dismissable-layer|visually-hidden|collection|focus-guards|focus-scope)/.test(id)
            )
              return "vendor-utils";
            // Pass 159 - the toast layers mount in the shell so a toast fired
            // during first paint is never lost. They ride in their own small
            // chunk so the shell does not pay for every other overlay library.
            if (/@radix-ui[\\/]react-toast/.test(id) || /[\\/]node_modules[\\/]sonner[\\/]/.test(id))
              return "vendor-toast";
            if (id.includes("@radix-ui") || id.includes("@floating-ui")) return "vendor-ui";
            if (
              id.includes("tailwind-merge") ||
              id.includes("clsx") ||
              id.includes("class-variance-authority")
            )
              return "vendor-utils";
            return undefined;
          }
          // Shared app singletons live in one chunk so they never get folded
          // into a leaf chunk and drag it into the shell.
          if (id.includes("/src/integrations/") || id.includes("/src/lib/")) return "app-lib";
          if (id.includes("/src/components/VideoPlayer")) return "video-player";
          return undefined;
        },
      },
    },
  },
}));
