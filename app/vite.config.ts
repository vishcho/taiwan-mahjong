import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "牌效率 · 台灣十六張麻將",
        short_name: "牌效率",
        lang: "zh-Hant-TW",
        description: "台灣十六張麻將向聽數與牌效率分析",
        theme_color: "#164e43",
        background_color: "#164e43",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,gz}"],
        globIgnores: [
          "**/tables/suit-*",
          "**/tables/honors-*",
          "**/tables/manifest.json",
        ],
        maximumFileSizeToCacheInBytes: 4000000,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  worker: { format: "es" },
});
