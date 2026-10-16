import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    /* Absolute asset paths, so deep links such as /centres/AMRUT-PUN-C01 load correctly. */
    base: '/',
    server: {
      port: 5174,
      /* Dev only: forward API calls to the backend so the browser stays same-origin. */
      proxy: { '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } },
    },
  };
});
