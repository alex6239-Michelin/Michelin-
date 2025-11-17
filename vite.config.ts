import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client-side code.
    // Vercel injects its environment variables into the build process.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
})
