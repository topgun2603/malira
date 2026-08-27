/**
 * We only ever store the canonical watch URL and derive everything else.
 * Thumbnails come from i.ytimg.com and titles from oEmbed, so there is no
 * YouTube Data API key to manage and no daily quota to run out of.
 */

const PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/live\/)([\w-]{11})/,
];

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  for (const pattern of PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}

export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export interface OEmbedResult {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

export async function fetchYouTubeMeta(id: string): Promise<OEmbedResult | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        youTubeWatchUrl(id),
      )}&format=json`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title ?? "",
      authorName: data.author_name ?? "",
      thumbnailUrl: data.thumbnail_url ?? youTubeThumbnail(id),
    };
  } catch {
    return null;
  }
}
