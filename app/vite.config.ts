import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// В режиме разработки Vite не отдаёт index.html папок из public/: /pc/ уходил в SPA и показывал 404.
// На боевом сайте и в vite preview это и так работает; плагин влияет только на dev-сервер.
const pcIndex = (): Plugin => ({
  name: 'pc-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [p, q] = (req.url ?? '').split('?')
      if (p === '/pc' || p === '/pc/') req.url = '/pc/index.html' + (q ? '?' + q : '')
      next()
    })
  },
})

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
  plugins: [react(), pcIndex()],
})
