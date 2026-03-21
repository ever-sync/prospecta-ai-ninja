import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
        "pwa-192.png",
        "pwa-512.png",
        "maskable-icon-512.png",
      ],
      manifest: {
        id: "/",
        name: "envPRO",
        short_name: "envPRO",
        description:
          "Scanner consultivo, CRM e campanhas comerciais em um app instalável para celular.",
        theme_color: "#ef3333",
        background_color: "#f7f8fb",
        display: "standalone",
        orientation: "portrait-primary",
        lang: "pt-BR",
        scope: "/",
        start_url: "/",
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/dashboard",
            description: "Abrir o painel principal",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Campanhas",
            short_name: "Campanhas",
            url: "/campaigns",
            description: "Abrir a fila de campanhas",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Scanner",
            short_name: "Scanner",
            url: "/search",
            description: "Abrir o scanner consultivo",
            icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,json}"],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
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
          return "vendor";
        },
      },
    },
  },
}));
