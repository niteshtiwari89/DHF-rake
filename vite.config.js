import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}, 
  },
  optimizeDeps: {
    exclude: ['xlsx', 'file-saver'], // Prevent bundling xlsx and file-saver
  },
  build: {
    rollupOptions: {
      external: ['xlsx', 'file-saver', './cptable', './jszip'], // External dependencies
      output: {
        globals: {
          'xlsx': 'XLSX',  // Use 'XLSX' as a global variable for xlsx
          'file-saver': 'FileSaver', // Use 'FileSaver' as a global variable for file-saver
          './cptable': 'cptable',  // External for cptable
          './jszip': 'JSZip',  // External for jszip
        },
      },
    },
  },
});
