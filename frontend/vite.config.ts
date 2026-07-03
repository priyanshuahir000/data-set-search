import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend calls the API at /api. In dev we proxy that to the backend on
// port 3001 so there is no CORS friction and the app runs from a single origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
