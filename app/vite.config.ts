import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base задаётся переменной VITE_BASE.
// Корень домена (Vercel, Netlify): ничего не задавать.
// GitHub Pages в подкаталоге: VITE_BASE=/имя-репозитория/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
