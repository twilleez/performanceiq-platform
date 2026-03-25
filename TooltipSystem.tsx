// vite.config.ts — Frontend build config
// Handles VITE_ env vars, React plugin, GitHub Pages base path

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages deploys to /performanceiq-platform/ — set base accordingly
  base: process.env.NODE_ENV === "production"
    ? "/performanceiq-platform/"
    : "/",
  define: {
    // Make env vars available at build time
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code split for performance
        manualChunks: {
          vendor:    ["react", "react-dom"],
          supabase:  ["@supabase/supabase-js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls to backend during dev
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
