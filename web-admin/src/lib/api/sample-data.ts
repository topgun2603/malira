import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { articlesCol } from "@/lib/firebase/collections";
import { listCategories, seedCategories } from "@/lib/api/categories";
import { uploadArticleImage } from "@/lib/api/storage";
import { suffixedSlug } from "@/lib/slug";
import { CATEGORY_ARTWORK, SAMPLE_ARTICLES } from "@/lib/sample-content";
import { SAMPLE_ADS, SAMPLE_POLL } from "@/lib/sample-engagement";
import { createPoll, setPollStatus } from "@/lib/api/polls";
import { createAd, setAdStatus } from "@/lib/api/ads";
import { createCarousel, setCarouselStatus } from "@/lib/api/carousels";
import { createEvent } from "@/lib/api/events";
import { createSong, listPlaylists, seedPlaylists } from "@/lib/api/playlists";
import { SAMPLE_EVENTS, SAMPLE_SONGS } from "@/lib/sample-phase2";
import { SAMPLE_MATRIMONY } from "@/lib/sample-matrimony";
import { Timestamp as ClientTimestamp } from "firebase/firestore";
import type { Article, ArticleImage } from "@/lib/types";

/** Marks every document the seeder writes, so removal is exact. */
export const SAMPLE_FLAG = "isSample";

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

interface Artwork {
  width: number;
  height: number;
  from: string;
  to: string;
  eyebrow: string;
  title: string;
  footer: string;
}

/**
 * Draws placeholder artwork rather than shipping binary fixtures.
 *
 * Two reasons this is worth the code: the reader pages and ad slots need real
 * images to be judged honestly, and generating them here means the seeder
 * exercises the whole upload path — compression, Storage rules, download URL —
 * instead of pretending it works.
 */
async function drawArtwork(art: Artwork): Promise<File | null> {
  const canvas = document.createElement("canvas");
  canvas.width = art.width;
  canvas.height = art.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, art.from);
  gradient.addColorStop(1, art.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ridge lines, echoing the mountain motif in the app identity.
  const scale = canvas.width / 1200;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    const base = canvas.height * 0.62 + i * 52 * scale;
    ctx.moveTo(-40, base);
    ctx.lineTo(canvas.width * 0.3, base - (120 + i * 14) * scale);
    ctx.lineTo(canvas.width * 0.55, base - (30 + i * 6) * scale);
    ctx.lineTo(canvas.width * 0.78, base - (96 + i * 10) * scale);
    ctx.lineTo(canvas.width + 40, base - 10 * scale);
    ctx.stroke();
  }

  const pad = Math.round(56 * scale);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `600 ${Math.round(26 * scale)}px system-ui, sans-serif`;
  ctx.fillText(art.eyebrow.toUpperCase(), pad, Math.round(80 * scale));

  ctx.fillStyle = "#ffffff";
  const titleSize = Math.round(52 * scale);
  ctx.font = `700 ${titleSize}px system-ui, sans-serif`;

  const lines: string[] = [];
  let line = "";
  for (const word of art.title.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > canvas.width - pad * 2 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  const lineHeight = Math.round(titleSize * 1.22);
  const top = Math.round(canvas.height / 2 - (lines.length * lineHeight) / 2 + titleSize / 2);
  lines.slice(0, 4).forEach((text, index) => {
    ctx.fillText(text, pad, top + index * lineHeight);
  });

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${Math.round(22 * scale)}px system-ui, sans-serif`;
  ctx.fillText(art.footer, pad, canvas.height - Math.round(40 * scale));

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return null;
  return new File([blob], "sample-artwork.png", { type: "image/png" });
}

/**
 * Second stop for each sample's third shot.
 *
 * Rotated per profile so two neighbours in the browse list do not resolve to
 * the same three rectangles.
 */
const THIRD_TINTS = ["#1f6140", "#145892", "#9c3464", "#dd872b"];

const SAMPLE_COLLECTIONS = [
  "articles",
  "polls",
  "ads",
  "carousels",
  "events",
  "songs",
  "matrimonyProfiles",
] as const;

async function sampleDocsIn(name: string) {
  const snapshot = await getDocs(
    query(collection(db, name), where(SAMPLE_FLAG, "==", true)),
  );
  return snapshot.docs;
}

export interface SeedResult {
  articles: number;
  polls: number;
  ads: number;
  carousels: number;
  events: number;
  songs: number;
  matrimony: number;
  imagesUploaded: number;
  imageFailures: number;
  /** Why the first image failed. Null when none did. */
  imageError: string | null;
}

export async function seedSampleArticles(actor: {
  uid: string;
  name: string;
}): Promise<SeedResult> {
  // Seeding is idempotent per collection: running it again after the articles
  // already exist tops up whatever is missing rather than duplicating the feed.
  const existingArticles = (await sampleDocsIn("articles")).length;
  const existingPolls = (await sampleDocsIn("polls")).length;
  const existingAds = (await sampleDocsIn("ads")).length;
  const existingCarousels = (await sampleDocsIn("carousels")).length;
  const existingEvents = (await sampleDocsIn("events")).length;
  const existingSongs = (await sampleDocsIn("songs")).length;
  const existingMatrimony = (await sampleDocsIn("matrimonyProfiles")).length;

  // Categories first — a sample article with a dangling categoryId is worse
  // than no sample at all.
  await seedCategories();
  const categories = await listCategories();
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  let imagesUploaded = 0;
  let imageFailures = 0;

  // The reason, not just the count. Every image failure used to be swallowed by
  // a bare `catch`, which left the seeder reporting "0 images uploaded" with no
  // way to find out why — and documents written with an empty `images` array
  // that then rendered as placeholders in the app.
  let imageError: string | null = null;

  const noteImageFailure = (error: unknown) => {
    imageFailures += 1;
    imageError ??=
      error instanceof Error ? error.message : String(error ?? "unknown error");
  };
  let articles = 0;

  for (const sample of existingArticles > 0 ? [] : SAMPLE_ARTICLES) {
    const category = bySlug.get(sample.categorySlug);
    if (!category) continue;

    const key = `sample-${sample.categorySlug}-${articles}`;
    let images: ArticleImage[] = [];

    try {
      const [from, to] = CATEGORY_ARTWORK[sample.categorySlug] ?? ["#1f6140", "#2f7f57"];
      const file = await drawArtwork({
        width: 1200,
        height: 675,
        from,
        to,
        eyebrow: category.name,
        title: sample.title,
        footer: "Sample image · RK Matrimony",
      });
      if (file) {
        images = [await uploadArticleImage(file, key)];
        imagesUploaded += 1;
      }
    } catch {
      // A blocked upload must not stop the rest of the seed; the reader pages
      // all handle a missing lead image.
      imageFailures += 1;
    }

    const publishDate = daysFromNow(sample.publishOffsetDays);
    const isPublished = sample.status === "published";
    const isScheduled = sample.status === "scheduled";

    await addDoc(articlesCol(), {
      title: sample.title,
      titleTa: sample.titleTa,
      slug: suffixedSlug(sample.title, `s${articles}`),
      summary: sample.summary,
      summaryTa: sample.summaryTa,
      body: sample.body,
      bodyTa: sample.bodyTa,
      categoryId: category.id,
      tags: sample.tags,
      images,
      youtubeUrl: sample.youtubeUrl ?? null,
      sourceName: sample.sourceName,
      authorName: sample.authorName,
      status: sample.status,
      pinned: Boolean(sample.pinned),
      commentsEnabled: false,
      publishAt: isScheduled ? Timestamp.fromDate(publishDate) : null,
      publishedAt: isPublished ? Timestamp.fromDate(publishDate) : null,
      createdBy: actor.uid,
      createdByName: actor.name,
      updatedBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: Timestamp.fromDate(publishDate),
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      viewCount: isPublished ? Math.round(40 + articles * 37) : 0,
      shareCount: isPublished ? Math.round(4 + articles * 3) : 0,
      [SAMPLE_FLAG]: true,
    });

    articles += 1;
  }

  /* ---------------------------- poll ------------------------------------ */

  let polls = 0;
  try {
    if (existingPolls > 0) throw new Error("already seeded");
    const pollId = await createPoll(SAMPLE_POLL, actor);
    await updateDoc(doc(db, "polls", pollId), { [SAMPLE_FLAG]: true });
    // Seeded live, because a draft poll cannot be seen on the reader pages and
    // seeing it is the entire point of sample content.
    await setPollStatus(pollId, "active");
    polls = 1;
  } catch {
    polls = 0;
  }

  /* ----------------------------- ads ------------------------------------- */

  let ads = 0;
  for (const sample of existingAds > 0 ? [] : SAMPLE_ADS) {
    const { artwork, ...draft } = sample;
    let image: ArticleImage | null = null;

    try {
      const file = await drawArtwork({
        width: artwork.width,
        height: artwork.height,
        from: artwork.from,
        to: artwork.to,
        eyebrow: artwork.eyebrow,
        title: sample.headline,
        footer: `Sample creative · ${sample.advertiser}`,
      });
      if (file) {
        image = await uploadArticleImage(file, `sample-ad-${ads}`);
        imagesUploaded += 1;
      }
    } catch (error) {
      noteImageFailure(error);
    }

    try {
      const adId = await createAd({ ...draft, image }, actor);
      await updateDoc(doc(db, "ads", adId), { [SAMPLE_FLAG]: true });
      await setAdStatus(adId, "active");
      ads += 1;
    } catch {
      // Keep going; one rejected booking should not abort the rest.
    }
  }

  /* --------------------------- carousel ---------------------------------- */

  let carousels = 0;
  if (existingCarousels === 0) {
    try {
      // Curated from whatever sample stories are actually published, so the
      // carousel never points at an article that is not on the site.
      const sampleArticles = await sampleDocsIn("articles");
      const publishedIds = sampleArticles
        .filter((entry) => entry.data().status === "published")
        .slice(0, 5)
        .map((entry) => entry.id);

      if (publishedIds.length >= 2) {
        const carouselId = await createCarousel(
          {
            name: "Sample — front page picks",
            title: "Editor's picks",
            titleTa: "ஆசிரியர் தேர்வு",
            articleIds: publishedIds,
            placement: "home_after_hero",
            autoplay: true,
            intervalSeconds: 6,
          },
          actor,
        );
        await updateDoc(doc(db, "carousels", carouselId), { [SAMPLE_FLAG]: true });
        await setCarouselStatus(carouselId, "active");
        carousels = 1;
      }
    } catch {
      carousels = 0;
    }
  }

  /* ---------------------------- events ----------------------------------- */

  let events = 0;
  if (existingEvents === 0) {
    for (const sample of SAMPLE_EVENTS) {
      const { artwork, status, startOffsetDays, startHour, durationHours, ...draft } =
        sample;

      const startsAt = daysFromNow(startOffsetDays);
      startsAt.setHours(startHour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

      let poster = null;
      try {
        const file = await drawArtwork({
          width: 1000,
          height: 750,
          from: artwork.from,
          to: artwork.to,
          eyebrow: artwork.eyebrow,
          title: sample.title,
          footer: "Sample poster",
        });
        if (file) {
          poster = await uploadArticleImage(file, `sample-event-${events}`);
          imagesUploaded += 1;
        }
      } catch (error) {
        noteImageFailure(error);
      }

      try {
        const eventId = await createEvent(
          { ...draft, startsAt, endsAt, poster },
          status,
          actor,
        );
        await updateDoc(doc(db, "events", eventId), { [SAMPLE_FLAG]: true });
        events += 1;
      } catch {
        // One rejected event should not abort the rest of the calendar.
      }
    }
  }

  /* ----------------------------- songs ------------------------------------ */

  let songs = 0;
  if (existingSongs === 0) {
    await seedPlaylists();
    const playlists = await listPlaylists();
    const bySlug = new Map(
      playlists.map((playlist) => [
        playlist.name.toLowerCase().replace(/[^a-z]+/g, "-"),
        playlist.id,
      ]),
    );

    for (const sample of SAMPLE_SONGS) {
      const playlistId = bySlug.get(sample.playlistSlug);
      try {
        const songId = await createSong(
          {
            url: `https://www.youtube.com/watch?v=${sample.youtubeId}`,
            title: sample.title,
            titleTa: sample.titleTa,
            artistId: null,
            artistName: sample.artistName,
            playlistIds: playlistId ? [playlistId] : [],
            isNewRelease: sample.isNewRelease,
          },
          actor,
        );
        await updateDoc(doc(db, "songs", songId), { [SAMPLE_FLAG]: true });
        songs += 1;
      } catch {
        // Most likely the video is already in the library.
      }
    }
  }

  /* --------------------------- matrimony ---------------------------------- */

  let matrimony = 0;
  if (existingMatrimony === 0) {
    for (const sample of SAMPLE_MATRIMONY) {
      // Deterministic ids: re-seeding overwrites rather than duplicating.
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - sample.age);

      // Three shots each, so the gallery in the app has something to page
      // through and the restricted-photo path can be judged with more than a
      // single image behind it.
      //
      // Still generated gradients rather than photographs of people: these are
      // invented profiles, and putting a real face on an invented person in a
      // matrimony listing is the one thing this seeder must not do.
      const shots = [
        {
          from: sample.artwork[0],
          to: sample.artwork[1],
          eyebrow: sample.hometown,
          footer: "Sample profile",
        },
        {
          from: sample.artwork[1],
          to: sample.artwork[0],
          eyebrow: sample.occupation,
          footer: sample.workLocation,
        },
        {
          from: sample.artwork[0],
          to: THIRD_TINTS[matrimony % THIRD_TINTS.length],
          eyebrow: "Family",
          footer: sample.hometown,
        },
      ];

      const photos: ArticleImage[] = [];
      for (const shot of shots) {
        try {
          const file = await drawArtwork({
            width: 800,
            height: 1000,
            from: shot.from,
            to: shot.to,
            eyebrow: shot.eyebrow,
            title: sample.name,
            footer: shot.footer,
          });
          if (!file) continue;
          // Keyed on the sample id, not on a running count: the count only
          // moves on success, so a failure part-way through would have made
          // two different people share a folder.
          photos.push(await uploadArticleImage(file, sample.id));
          imagesUploaded += 1;
        } catch (error) {
          noteImageFailure(error);
        }
      }

      const restricted = sample.photoVisibility === "on_accept";

      try {
        await setDoc(doc(db, "matrimonyProfiles", sample.id), {
          ownerUid: sample.id,
          postedBy: sample.postedBy,
          name: sample.name,
          gender: sample.gender,
          dob: ClientTimestamp.fromDate(dob),
          birthTime: sample.birthTime,
          birthPlace: sample.birthPlace,
          heightCm: sample.heightCm,
          maritalStatus: sample.maritalStatus,
          diet: sample.diet,
          education: sample.education,
          occupation: sample.occupation,
          workLocation: sample.workLocation,
          hometown: sample.hometown,
          motherTongue: "Badaga",
          about: sample.about,
          fatherOccupation: sample.fatherOccupation,
          motherOccupation: sample.motherOccupation,
          siblings: sample.siblings,
          photoVisibility: sample.photoVisibility,
          // Restricted photos are withheld from the public document, exactly as
          // a real profile would be.
          photos: restricted ? [] : photos,
          hasPhotos: photos.length > 0,
          status: "approved",
          reviewNote: null,
          reviewedBy: actor.uid,
          reviewedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          viewCount: 0,
          [SAMPLE_FLAG]: true,
        });

        // No phone or email: these are invented people.
        await setDoc(
          doc(db, "matrimonyProfiles", sample.id, "private", "contact"),
          {
            phone: "Sample profile — no contact number",
            email: "",
            photos,
            horoscopeNote: "",
            horoscopeImage: null,
            updatedAt: serverTimestamp(),
          },
        );

        matrimony += 1;
      } catch {
        // A rejected profile should not stop the rest.
      }
    }
  }

  return {
    articles,
    polls,
    ads,
    carousels,
    events,
    songs,
    matrimony,
    imagesUploaded,
    imageFailures,
    imageError,
  };
}

/** Counts sample documents across every collection the seeder writes to. */
export async function countSampleArticles(): Promise<number> {
  const counts = await Promise.all(
    SAMPLE_COLLECTIONS.map(async (name) => {
      try {
        return (await sampleDocsIn(name)).length;
      } catch {
        return 0;
      }
    }),
  );
  return counts.reduce((sum, count) => sum + count, 0);
}

export async function removeSampleArticles(): Promise<number> {
  let removed = 0;
  for (const name of SAMPLE_COLLECTIONS) {
    try {
      const docs = await sampleDocsIn(name);
      await Promise.all(docs.map((entry) => deleteDoc(entry.ref)));
      removed += docs.length;
    } catch {
      // A collection that does not exist yet simply has nothing to remove.
    }
  }
  return removed;
}

/** Type guard used by the admin banner. */
export function isSampleArticle(article: Article & { isSample?: boolean }): boolean {
  return article.isSample === true;
}
