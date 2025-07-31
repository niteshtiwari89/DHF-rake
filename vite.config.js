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
    // Increase chunk size warning limit to reduce warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: false,
  },
  // Ensure compatibility with different environments
  esbuild: {
    target: 'es2020'
  },
});
