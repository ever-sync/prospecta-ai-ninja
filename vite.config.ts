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
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("xlsx")) return "xlsx-vendor";
          if (id.includes("recharts")) return "charts-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (
            id.includes("@radix-ui") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner")
          ) {
            return "ui-vendor";
          }
          if (
            id.includes("react-router-dom") ||
            id.includes("@tanstack/react-query") ||
            id.includes("react-dom") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
}));
