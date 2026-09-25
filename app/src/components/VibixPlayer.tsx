// Плеер балансера. SDK сам находит тег <ins> и меняет его на iframe — в том числе
// у тегов, вставленных после загрузки страницы, так что SPA-навигация ему не мешает.
// Реакт в этот узел не лезет: всё содержимое создаётся и сносится вручную.
import { useEffect, useRef } from 'react';

const PUBLISHER_ID = '679202313';
const SDK_SOURCES = [
  'https://graphicslab.io/sdk/v2/rendex-sdk.min.js',
  'https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js'
];
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

function ensureSdk() {
  sdkPromise ??= loadScript(SDK_SOURCES[0]).catch(() => loadScript(SDK_SOURCES[1]));
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

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;

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
    void ensureSdk();

    return () => {
      mount.replaceChildren();
    };
  }, [type, id, season]);

  return (
    <div className="vplayer">
      <div className="vplayer__mount" ref={host} aria-label={label} />
    </div>
  );
}
