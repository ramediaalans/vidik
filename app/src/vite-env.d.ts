/// <reference types="vite/client" />

// Клиентские переменные сборки. В бандл попадают только те, что начинаются с VITE_,
// поэтому токены и пароли в .env остаются только для скриптов из tools/.
interface ImportMetaEnv {
  /** Внешний хост для music/, roms/, cores/. Пусто — берём из public. */
  readonly VITE_MEDIA_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
