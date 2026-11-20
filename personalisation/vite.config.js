import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend (Flask) runs on 5003; the dev server proxies API + photo requests to it.
// 127.0.0.1 (not "localhost") so Node never tries IPv6 ::1 while Flask listens on IPv4.
// NEUROGUARD_API / VITE_PORT let the browser tests run an isolated copy on other ports.
const API = process.env.NEUROGUARD_API || 'http://127.0.0.1:5003'

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT || 5173),
    strictPort: true,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
})
