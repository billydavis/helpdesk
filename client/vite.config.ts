import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      "/api": {
        target: process.env.API_TARGET ?? "http://localhost:5150",
        changeOrigin: true,
      },
    },
  },
});
