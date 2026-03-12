import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages deploys to /performanceiq-platform/ — update to match your repo name
  base: "/performanceiq-platform/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
  },
});
