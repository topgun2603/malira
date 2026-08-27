import { getDocs, limit as fbLimit, orderBy, query, where } from "firebase/firestore";
import { articlesCol } from "@/lib/firebase/collections";
import { listAds } from "@/lib/api/ads";
import { listPolls } from "@/lib/api/polls";
import { listEvents } from "@/lib/api/events";
import { listSongs } from "@/lib/api/playlists";
import type { Article } from "@/lib/types";

/**
 * Analytics over the data this project owns.
 *
 * Deliberately NOT installs or daily active users: those live in Firebase
 * Analytics and reading them needs the GA4 Data API, which requires a service
 * account and therefore a server. Building a second events pipeline to
 * duplicate numbers Google already collects would be weeks of work for a worse
 * answer. What is here is the newsroom's own counters — reads, shares, ad
 * delivery, poll participation — which nothing else reports on.
 */

export interface AnalyticsSnapshot {
  totals: {
    published: number;
    reads: number;
    shares: number;
    events: number;
    songs: number;
    adImpressions: number;
    adClicks: number;
    pollVotes: number;
  };
  topArticles: Array<Pick<Article, "id" | "title" | "viewCount" | "shareCount">>;
  categoryMix: Array<{ categoryId: string; count: number; reads: number }>;
  adPerformance: Array<{
    id: string;
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}

export async function loadAnalytics(): Promise<AnalyticsSnapshot> {
  const publishedSnapshot = await getDocs(
    query(
      articlesCol(),
      where("status", "==", "published"),
      orderBy("viewCount", "desc"),
      fbLimit(500),
    ),
  );

  const articles = publishedSnapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      title: (data.title as string) ?? "",
      categoryId: (data.categoryId as string) ?? "",
      viewCount: (data.viewCount as number) ?? 0,
      shareCount: (data.shareCount as number) ?? 0,
    };
  });

  const [ads, polls, events, songs] = await Promise.all([
    listAds().catch(() => []),
    listPolls().catch(() => []),
    listEvents({ max: 500 }).catch(() => []),
    listSongs().catch(() => []),
  ]);

  const categoryTotals = new Map<string, { count: number; reads: number }>();
  for (const article of articles) {
    const current = categoryTotals.get(article.categoryId) ?? { count: 0, reads: 0 };
    current.count += 1;
    current.reads += article.viewCount;
    categoryTotals.set(article.categoryId, current);
  }

  return {
    totals: {
      published: articles.length,
      reads: articles.reduce((sum, a) => sum + a.viewCount, 0),
      shares: articles.reduce((sum, a) => sum + a.shareCount, 0),
      events: events.length,
      songs: songs.length,
      adImpressions: ads.reduce((sum, ad) => sum + ad.impressions, 0),
      adClicks: ads.reduce((sum, ad) => sum + ad.clicks, 0),
      pollVotes: polls.reduce((sum, poll) => sum + poll.totalVotes, 0),
    },
    topArticles: articles.slice(0, 10).map(({ id, title, viewCount, shareCount }) => ({
      id,
      title,
      viewCount,
      shareCount,
    })),
    categoryMix: [...categoryTotals.entries()]
      .map(([categoryId, value]) => ({ categoryId, ...value }))
      .sort((a, b) => b.reads - a.reads),
    adPerformance: ads
      .map((ad) => ({
        id: ad.id,
        name: ad.name,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions),
  };
}
