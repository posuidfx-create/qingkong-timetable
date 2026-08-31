import path from "node:path"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

const srcDirectory = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.svg", "icon-512.svg"],
      workbox: {
        // Keep the lightweight static fallback available offline. The 31 MB
        // video remains an on-demand resource instead of inflating app install.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp}"],
        globIgnores: ["wallpapers/water-01.png"],
      },
      manifest: {
        name: "努力也是一种天赋",
        short_name: "努力天赋",
        description: "记录每一天的学习与成长",
        lang: "zh-CN",
        start_url: "/",
        display: "standalone",
        theme_color: "#f7f7f3",
        background_color: "#f7f7f3",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(srcDirectory),
    },
  },
})
