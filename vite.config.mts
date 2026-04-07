import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_ORIGIN_SURFACE": JSON.stringify("dashboard"),
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
