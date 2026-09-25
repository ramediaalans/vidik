// Плеер балансера. SDK сам находит тег <ins> и меняет его на iframe — в том числе
// у тегов, вставленных после загрузки страницы, так что SPA-навигация ему не мешает.
// Реакт в этот узел не лезет: всё содержимое создаётся и сносится вручную.
import { useEffect, useRef } from 'react';

const PUBLISHER_ID = '679202313';
const SDK_SOURCES = [
  'https://graphicslab.io/sdk/v2/rendex-sdk.min.js',
  'https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js'
];

function ensureSdk() {
  for (const src of SDK_SOURCES) {
    if (document.querySelector(`script[src="${src}"]`)) continue;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.head.append(s);
  }
}

export function VibixPlayer({
  kpId,
  season,
  label
}: {
  kpId: number;
  season?: number;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureSdk();
    const mount = host.current;
    if (!mount) return;

    const ins = document.createElement('ins');
    ins.setAttribute('data-publisher-id', PUBLISHER_ID);
    ins.setAttribute('data-type', 'kp');
    ins.setAttribute('data-id', String(kpId));
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

    return () => {
      mount.replaceChildren();
    };
  }, [kpId, season]);

  return (
    <div className="vplayer">
      <div className="vplayer__mount" ref={host} aria-label={label} />
    </div>
  );
}
