/**
 * NetTrader 2 — Configuration du Bundler Vite
 *
 * Usage:
 *   Configure le serveur de développement Vite, le plugin React et le reverse-proxy API.
 *
 * Logique & Fonctionnement:
 *   - Active le plugin @vitejs/plugin-react pour le support JSX/TSX et Fast Refresh.
 *   - Configure le proxy /api vers le serveur backend (port 8080 ou conteneur app).
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
});
