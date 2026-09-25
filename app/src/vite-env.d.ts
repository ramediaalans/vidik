/// <reference types="vite/client" />

// Клиентские переменные сборки. В бандл попадают только те, что начинаются с VITE_,
// поэтому токены и пароли в .env остаются только для скриптов из tools/.
interface ImportMetaEnv {
  /** id паблишера балансера для тега <ins data-publisher-id>. */
  readonly VITE_VIBIX_PUBLISHER_ID?: string;
  /** Адреса SDK через запятую, по порядку приоритета. */
  readonly VITE_VIBIX_SDK_SOURCES?: string;
  /** Внешний хост для music/, roms/, cores/. Пусто — берём из public. */
  readonly VITE_MEDIA_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
