import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works both at / (local) and at /fityo/ (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})
