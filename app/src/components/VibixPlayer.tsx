// Плеер балансера. SDK сам находит тег <ins> и меняет его на iframe — в том числе
// у тегов, вставленных после загрузки страницы, так что SPA-навигация ему не мешает.
// Реакт в этот узел не лезет: всё содержимое создаётся и сносится вручную.
//
// Идентификатор паблишера и адреса SDK задаются в .env в корне репозитория
// (VITE_VIBIX_PUBLISHER_ID, VITE_VIBIX_SDK_SOURCES). Это не секрет — значение всё
// равно уходит в бандл, — но так его можно менять без правки кода и держать
// разные значения для дева, превью и боевого домена.
import { useEffect, useRef, useState } from 'react';

const PUBLISHER_ID = (import.meta.env.VITE_VIBIX_PUBLISHER_ID ?? '').trim();

const DEFAULT_SDK_SOURCES = [
  'https://graphicslab.io/sdk/v2/rendex-sdk.min.js',
  'https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js'
];

const SDK_SOURCES = (import.meta.env.VITE_VIBIX_SDK_SOURCES ?? '')
  .split(',')
  .map((src) => src.trim())
  .filter(Boolean);

const sources = SDK_SOURCES.length > 0 ? SDK_SOURCES : DEFAULT_SDK_SOURCES;

let sdkPromise: Promise<void> | undefined;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      // Если SDK уже добавлен страницей или предыдущим переходом SPA,
      // его MutationObserver сам обработает новый <ins>.
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Vibix SDK failed: ${src}`)), { once: true });
    script.src = src;
    script.async = true;
    document.head.append(script);
  });
}

// Пробуем зеркала по очереди: падает всё — промис отклоняется, и это видно в UI.
function ensureSdk() {
  sdkPromise ??= sources.reduce(
    (chain, src) => chain.catch(() => loadScript(src)),
    Promise.reject<void>(new Error('Vibix SDK: нет источников'))
  );
  return sdkPromise;
}

export function VibixPlayer({
  type,
  id,
  season,
  label
}: {
  type: 'movie' | 'serial';
  id: string;
  season?: number;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = host.current;
    if (!mount || !PUBLISHER_ID) return;

    let alive = true;
    setFailed(false);

    const ins = document.createElement('ins');
    ins.setAttribute('data-publisher-id', PUBLISHER_ID);
    ins.setAttribute('data-type', type);
    ins.setAttribute('data-id', id);
    if (season) ins.setAttribute('data-season', String(season));
    ins.setAttribute('data-nopreload', 'true');
    ins.setAttribute('data-poster', 'true');
    ins.setAttribute('data-width', '100%');
    ins.setAttribute('data-height', '100%');
    // под палитру ВИДИКа
    ins.setAttribute('data-color1', '0B0B0C');
    ins.setAttribute('data-color2', 'C9F03A');
    ins.setAttribute('data-color3', 'EDE6D6');
    mount.append(ins);

    ensureSdk().catch(() => {
      if (alive) setFailed(true);
    });

    return () => {
      alive = false;
      mount.replaceChildren();
    };
  }, [type, id, season]);

  if (!PUBLISHER_ID) {
    return (
      <div className="vplayer">
        <p className="mono">
          Плеер не настроен: задайте VITE_VIBIX_PUBLISHER_ID в .env и пересоберите сайт.
        </p>
      </div>
    );
  }

  return (
    <div className="vplayer">
      <div className="vplayer__mount" ref={host} aria-label={label} />
      {failed ? (
        <p className="mono" role="status">
          Плеер не отвечает. Похоже, кассету зажевало — попробуй обновить страницу.
        </p>
      ) : null}
    </div>
  );
}
