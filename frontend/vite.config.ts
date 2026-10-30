import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the API is proxied, so the browser sees one origin and the
// HttpOnly auth cookies work without any CORS configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
