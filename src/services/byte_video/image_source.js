/**
 * Stock-image source for Byte Video scenes.
 *
 * Two backends, tried in order:
 *   1. Pexels   — higher quality/relevance, needs a free `PEXELS_API_KEY`
 *                 (https://www.pexels.com/api/).
 *   2. Openverse — keyless, Creative-Commons image search; the default so the
 *                 feature works out of the box with no signup.
 *
 * If both fail (or there's no internet), callers fall back to a plain caption
 * slide, so generation never hard-fails on imagery. Uses the global `fetch`.
 */
const fs = require('fs');

const PEXELS_SEARCH = 'https://api.pexels.com/v1/search';
const OPENVERSE_SEARCH = 'https://api.openverse.org/v1/images/';
const UA = 'MkraftByteVideo/1.0';

/** Download an image URL to disk; returns true only for a real image file. */
async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) return false; // guard against error pages / tiny icons
    fs.writeFileSync(destPath, buf);
    return true;
  } catch (_) {
    return false;
  }
}

async function fromPexels(query, destPath, index) {
  if (!process.env.PEXELS_API_KEY) return false;
  try {
    const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=10`;
    const res = await fetch(url, { headers: { Authorization: process.env.PEXELS_API_KEY, 'User-Agent': UA } });
    if (!res.ok) return false;
    const data = await res.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    if (photos.length === 0) return false;
    const photo = photos[index % photos.length];
    const imgUrl = photo.src && (photo.src.landscape || photo.src.large || photo.src.original);
    return imgUrl ? downloadImage(imgUrl, destPath) : false;
  } catch (_) {
    return false;
  }
}

async function fromOpenverse(query, destPath, index) {
  try {
    const url = `${OPENVERSE_SEARCH}?q=${encodeURIComponent(query)}&page_size=12&aspect_ratio=wide&mature=false`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return false;
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    if (results.length === 0) return false;
    const start = index % results.length;
    for (let k = 0; k < results.length; k++) {
      const r = results[(start + k) % results.length];
      const imgUrl = r && (r.url || r.thumbnail);
      if (imgUrl && (await downloadImage(imgUrl, destPath))) return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Find a relevant photo for `query` and download it to `destPath`. `index`
 * lightly varies which result is chosen so scenes don't all get the same
 * picture. Returns true on success, false otherwise.
 */
async function fetchSceneImage(query, destPath, index = 0) {
  if (!query) return false;
  if (await fromPexels(query, destPath, index)) return true;
  if (await fromOpenverse(query, destPath, index)) return true;
  return false;
}

module.exports = { fetchSceneImage };
