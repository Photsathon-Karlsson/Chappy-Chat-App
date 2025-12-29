import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for React app (GitHub Pages)
export default defineConfig({
  plugins: [react()],

  // for GitHub Pages
  base: "/Chappy-Chat-App/",

  server: {
    // Dev server proxy 
    proxy: {
      "/api": {
        target: "http://127.0.0.1:1338",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});



