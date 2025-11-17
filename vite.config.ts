import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client for platforms like Vercel.
    // This replaces `process.env.API_KEY` with the actual key during the build process.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
