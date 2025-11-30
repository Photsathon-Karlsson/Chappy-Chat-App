import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for React app
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev server proxy
    // Frontend calls /api/...
    // Proxy sends request to backend on port 1338
    proxy: {
      "/api": {
        target: "http://127.0.0.1:1338",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});


/*
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true
      }
    }
  }
})
*/