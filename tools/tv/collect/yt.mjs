// node tools/tv/collect/yt.mjs "запрос"...
import fs from 'node:fs';
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const KEY = process.env.YT_API_KEY || (env.match(/YT_API_KEY\s*=\s*(\S+)/) || [])[1] || '';
for (const q of process.argv.slice(2)) {
  const s = await (
    await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&videoEmbeddable=true&q=${encodeURIComponent(q)}&key=${KEY}`,
    )
  ).json();
  if (s.error) {
    console.log(JSON.stringify(s.error).slice(0, 300));
    break;
  }
  const ids = s.items.map((i) => i.id.videoId).join(',');
  const d = await (
    await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${ids}&key=${KEY}`,
    )
  ).json();
  console.log(`\n=== ${q} ===`);
  for (const it of d.items ?? []) {
    const m = it.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
    const sec = +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
    console.log(
      `${String(Math.round(sec / 60)).padStart(4)}m ${it.snippet.publishedAt.slice(0, 10)} ${it.status.embeddable ? ' ' : 'X'}${it.contentDetails.contentRating?.ytRating ? '18' : '  '} | ${it.snippet.title.slice(0, 68)} | ${it.id}`,
    );
  }
}
