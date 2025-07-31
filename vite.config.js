import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}, 
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Group large libraries into separate chunks for better loading
          'xlsx-chunk': ['xlsx'],
          'date-fns-chunk': ['date-fns'],
          'lucide-chunk': ['lucide-react'],
        },
      },
    },
  },
});
