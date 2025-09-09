import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Later, point to your API origin, e.g. 'http://localhost:8080'
      // Requests to /api/* will be proxied in dev
      // '/api': 'http://localhost:8080'
    }
  }
})

