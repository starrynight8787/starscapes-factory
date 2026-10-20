import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// How the tests run (npm test). They run in a pretend browser (jsdom), and they NEVER use your real Supabase: the address and key below are fake, whatever is in your .env files.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [fileURLToPath(new URL('./vitest.setup.js', import.meta.url))],
    env: {
      VITE_SUPABASE_URL: 'https://fake-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'fake-anon-key',
    },
  },
})
