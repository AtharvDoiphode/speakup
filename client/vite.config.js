import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Fonts stay real files: a data: URI would need font-src data: in the server's CSP
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  server: {
    port: 5173,
    // The app calls relative /api URLs; in dev they go to the API server (in production it's one server)
    proxy: { '/api': 'http://localhost:5000' },
  },
});