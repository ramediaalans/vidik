import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base задаётся переменной VITE_BASE.
// Корень домена (Vercel, Netlify): ничего не задавать.
// GitHub Pages в подкаталоге: VITE_BASE=/имя-репозитория/
//
// envDir смотрит в корень репозитория: один .env на сайт и на скрипты tools/.
// В клиентский код Vite отдаёт только переменные с префиксом VITE_,
// так что BALANCER*_TOKEN, VIBIX_PASSWORD и прочее в бандл не попадает.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
})
