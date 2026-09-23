import assert from 'node:assert/strict';

export const videoCatalogOutputPath = 'photography-assets/app/video-catalog.json';
export const videoPosterNamespace = 'photography-assets/video-20260923/';
export const videoReleasePrefix = 'https://github.com/Cisanotheraccount/Cisanotheraccount.github.io/releases/download/photography-video-2026-09-23/';

// A strict public projection keeps intake metadata and local source paths out of the site.
export function validatePhotographyVideos(catalog) {
  assert(Array.isArray(catalog) && catalog.length === 20, 'Video catalog must contain 20 reviewed videos');
  const ids = new Set(); const posterPaths = new Set();
  let realEstate = 0; let interviews = 0;
  for (const video of catalog) {
    assert.deepEqual(Object.keys(video).sort(), ['id', 'title', 'category', 'postedBy', 'filmmaker', 'originalUrl', 'source', 'poster', 'duration', 'dimensions', 'bytes', 'sha256'].sort(), 'Unexpected public video fields');
    assert(/^[a-z0-9][a-z0-9-]+$/.test(video.id) && !ids.has(video.id), 'Invalid or duplicate video id'); ids.add(video.id);
    assert(['real-estate', 'interviews'].includes(video.category), 'Invalid video category');
    realEstate += video.category === 'real-estate'; interviews += video.category === 'interviews';
    assert(typeof video.title === 'string' && video.title.trim() && !/[\u3400-\u9fff]/u.test(video.title), 'Video title must be English');
    assert(video.postedBy === null || (typeof video.postedBy === 'string' && video.postedBy.trim()), 'Invalid publisher');
    assert.equal(video.filmmaker, 'Ci Song');
    const origin = new URL(video.originalUrl);
    assert(['www.xiaohongshu.com', 'xiaohongshu.com'].includes(origin.hostname) && origin.protocol === 'https:' && /^\/explore\/[a-f0-9]{24}$/.test(origin.pathname) && !origin.search && !origin.hash, 'Video needs a canonical verified-source note URL');
    assert.equal(video.source, videoReleasePrefix + video.id + '.mp4', 'Video must use the reviewed GitHub Release');
    assert.equal(video.poster, '/' + videoPosterNamespace + video.id + '.jpg', 'Invalid video poster'); posterPaths.add(video.poster.slice(1));
    assert(Number.isFinite(video.duration) && video.duration > 0, 'Invalid video duration');
    assert.deepEqual(Object.keys(video.dimensions).sort(), ['height', 'width']);
    assert.equal(video.dimensions.width, 720, 'Preserve accepted source width');
    assert([1280, 1366].includes(video.dimensions.height), 'Preserve accepted source height');
    assert(Number.isSafeInteger(video.bytes) && video.bytes > 0 && video.bytes < 2 * 1024 ** 3, 'Invalid video bytes');
    assert(/^[a-f0-9]{64}$/.test(video.sha256), 'Missing video digest');
  }
  assert.equal(realEstate, 11); assert.equal(interviews, 9);
  assert.equal(catalog.filter(video => video.dimensions.height === 1366).length, 2);
  return { videos: catalog.length, realEstate, interviews, posterPaths };
}
