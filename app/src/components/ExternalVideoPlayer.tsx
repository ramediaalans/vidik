import type { FilmVideoSource } from '../data/films';

function embedUrl(source: FilmVideoSource): string {
  if (source.provider === 'vk') {
    const [ownerId, videoId] = source.id.split('_');
    return `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=1`;
  }
  if (source.provider === 'rutube') {
    return `https://rutube.ru/play/embed/${source.id}/?autoStart=true`;
  }
  return `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&rel=0&cc_load_policy=0`;
}

export function ExternalVideoPlayer({ source, label }: { source: FilmVideoSource; label: string }) {
  return (
    <div className="vplayer">
      <div className="vplayer__mount">
        <iframe
          src={embedUrl(source)}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
