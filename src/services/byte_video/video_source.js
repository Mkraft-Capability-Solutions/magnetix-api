/**
 * Stock-video (b-roll) source for Byte Video scenes — Pexels Videos.
 * Needs `PEXELS_API_KEY` (the same free key used for photos). When absent or a
 * lookup fails, callers fall back to a still image (Ken Burns), so the feature
 * degrades gracefully. Uses global `fetch`.
 */
const fs = require('fs');

const PEXELS_VIDEO_SEARCH = 'https://api.pexels.com/videos/search';

/** Pick a reasonable landscape mp4 rendition (prefer ~720p) from a Pexels video. */
function pickFile(video) {
  const files = (video.video_files || []).filter(
    (f) => f.file_type === 'video/mp4' && f.width && f.height && f.width >= f.height
  );
  if (files.length === 0) return null;
  // Prefer the rendition closest to 1280 wide (our canvas), else the largest.
  files.sort((a, b) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280));
  return files[0].link;
}

/**
 * Find a relevant landscape stock clip for `query` and download it to
 * `destPath`. `index` varies the choice across scenes. Returns true on success.
 */
async function fetchSceneVideo(query, destPath, index = 0) {
  if (!process.env.PEXELS_API_KEY || !query) return false;
  try {
    const url = `${PEXELS_VIDEO_SEARCH}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`;
    const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY } });
    if (!res.ok) return false;
    const data = await res.json();
    const videos = Array.isArray(data.videos) ? data.videos : [];
    if (videos.length === 0) return false;

    const video = videos[index % videos.length];
    const link = pickFile(video);
    if (!link) return false;

    const dl = await fetch(link, { redirect: 'follow' });
    if (!dl.ok) return false;
    const buf = Buffer.from(await dl.arrayBuffer());
    if (buf.length < 4096) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    console.warn(`⚠️  Pexels video fetch error for "${query}":`, err.message);
    return false;
  }
}

module.exports = { fetchSceneVideo };
