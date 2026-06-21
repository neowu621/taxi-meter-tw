import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// 純前端 PWA：可加到手機主畫面、離線可用。
// base 用相對路徑，部署到任何 host（含子路徑）都不會壞。
export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icon.svg",
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png",
        "fonts/DSEG7Classic-Bold.woff2",
      ],
      manifest: {
        name: "Laowu 計程車計費器",
        short_name: "Laowu計費器",
        description: "Laowu 計程車計費器（自用/估價，全台各區費率）",
        lang: "zh-Hant-TW",
        theme_color: "#15171a",
        background_color: "#15171a",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,png}"],
        navigateFallback: "index.html",
        // 國道圖資不進首屏預快取，首次抓取後以 CacheFirst 快取供離線使用
        runtimeCaching: [
          {
            urlPattern: /freeways\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "freeways",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
      },
    }),
  ],
});
