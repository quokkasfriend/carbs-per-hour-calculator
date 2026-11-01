import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// base "./" lets the built site run from any path (GitHub Pages project page, a sub-folder, a file server).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  test: { environment: "node" },
});
