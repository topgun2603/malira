"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import NextImage from "next/image";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Check, FileQuestion, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/reader/article-card";
import { AdSlot } from "@/components/reader/ad-slot";
import { CarouselSlot } from "@/components/reader/carousel-slot";
import { PollWidget } from "@/components/reader/poll-widget";
import { useLanguage } from "@/components/reader/language";
import { EmptyState } from "@/components/shared/states";
import { FadeIn } from "@/components/motion/primitives";
import { listCategories } from "@/lib/api/categories";
import { getPublishedArticle, listPublishedArticles } from "@/lib/api/public-news";
import { extractYouTubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";

export default function ReaderArticlePage() {
  const params = useParams<{ id: string }>();
  const { lang, pick, langAttr } = useLanguage();
  const [copied, setCopied] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["public", "article", params.id],
    queryFn: () => getPublishedArticle(params.id),
    enabled: Boolean(params.id),
  });

  const { data: categories } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });

  const { data: related } = useQuery({
    queryKey: ["public", "related", article?.categoryId],
    queryFn: () => listPublishedArticles({ categoryId: article!.categoryId, max: 5 }),
    enabled: Boolean(article?.categoryId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={FileQuestion}
          title={lang === "ta" ? "செய்தி கிடைக்கவில்லை" : "Story not found"}
          description={
            lang === "ta"
              ? "இந்தச் செய்தி நீக்கப்பட்டிருக்கலாம் அல்லது இன்னும் வெளியிடப்படவில்லை."
              : "It may have been taken down, or it was never published."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/news">
                <ArrowLeft className="size-4" />
                Back to the feed
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const category = (categories ?? []).find((c) => c.id === article.categoryId);
  // The full map: a carousel after the story can carry articles from any
  // section, and each needs its own badge.
  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const isObituary = category?.slug === "obituaries";
  const title = pick(article.title, article.titleTa);
  const summary = pick(article.summary, article.summaryTa);
  const body = pick(article.body, article.bodyTa);
  const bodyLang = langAttr(article.body, article.bodyTa);
  const [lead, ...gallery] = article.images;
  const videoId = article.youtubeUrl ? extractYouTubeId(article.youtubeUrl) : null;

  const shareText = `${title} — Badaga Matrimony`;
  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some browsers without a user gesture chain;
      // the WhatsApp button still works, so this is not worth an error toast.
    }
  }

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link href="/news">
          <ArrowLeft className="size-4" />
          {lang === "ta" ? "செய்திகளுக்குத் திரும்பு" : "All stories"}
        </Link>
      </Button>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <FadeIn className="min-w-0">
          <header className="space-y-4">
            {category && (
              <Badge
                variant={isObituary ? "outline" : "secondary"}
                className="font-normal"
              >
                {pick(category.name, category.nameTa)}
              </Badge>
            )}

            <h1
              lang={langAttr(article.title, article.titleTa)}
              className={cn(
                "text-3xl leading-tight font-semibold tracking-tight sm:text-4xl",
                langAttr(article.title, article.titleTa) === "ta" && "font-tamil",
              )}
            >
              {title}
            </h1>

            {summary && (
              <p
                lang={langAttr(article.summary, article.summaryTa)}
                className="text-muted-foreground text-lg leading-relaxed"
              >
                {summary}
              </p>
            )}

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-foreground font-medium">
                {article.authorName || article.createdByName}
              </span>
              {article.sourceName && article.sourceName !== article.authorName && (
                <span>· {article.sourceName}</span>
              )}
              {article.publishedAt && (
                <span>
                  · {format(article.publishedAt.toDate(), "d MMMM yyyy, h:mm a")}
                </span>
              )}
            </div>
          </header>

          <Separator className="my-6" />

          <AdSlot placement="article_top" className="mb-6" />

          {lead && (
            <figure className="mb-6">
              <div className="bg-muted relative aspect-[16/9] overflow-hidden rounded-xl">
                <NextImage
                  src={lead.url}
                  alt={lead.caption || title}
                  fill
                  unoptimized
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 720px"
                />
              </div>
              {lead.caption && (
                <figcaption className="text-muted-foreground mt-2 text-sm">
                  {lead.caption}
                </figcaption>
              )}
            </figure>
          )}

          {videoId && (
            <div className="mb-6 overflow-hidden rounded-xl border">
              {/* The official embed. No download, no background play — the same
                  constraint the Android app is built under. */}
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div
            lang={bodyLang}
            className={cn("tiptap-content", bodyLang === "ta" && "font-tamil")}
            // Body HTML comes from the Tiptap editor, authored only by signed-in
            // staff and constrained by the editor's own schema.
            dangerouslySetInnerHTML={{ __html: body }}
          />

          {gallery.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {gallery.map((image) => (
                <figure key={image.path}>
                  <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg">
                    <NextImage
                      src={image.url}
                      alt={image.caption || ""}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 340px"
                    />
                  </div>
                  {image.caption && (
                    <figcaption className="text-muted-foreground mt-1.5 text-xs">
                      {image.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <CarouselSlot
            placement="article_end"
            categories={categoryById}
            className="mt-8"
          />

          <AdSlot placement="article_end" className="mt-8" />

          <Separator className="my-8" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground mr-1 text-sm">
              {lang === "ta" ? "பகிர்:" : "Share:"}
            </span>
            {/* WhatsApp first, deliberately — it is how this audience shares. */}
            <Button size="sm" asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="size-4" />
                WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
              {copied
                ? lang === "ta"
                  ? "நகலெடுக்கப்பட்டது"
                  : "Link copied"
                : lang === "ta"
                  ? "இணைப்பை நகலெடு"
                  : "Copy link"}
            </Button>
          </div>
        </FadeIn>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <AdSlot placement="article_sidebar" />

          <PollWidget surface="article" />

          <div className="bg-card rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold">
              {lang === "ta" ? "இதே பிரிவில்" : "More in this section"}
            </h2>
            <div className="divide-y">
              {(related ?? [])
                .filter((item) => item.id !== article.id)
                .slice(0, 4)
                .map((item) => (
                  <ArticleCard
                    key={item.id}
                    article={item}
                    category={category}
                    variant="compact"
                  />
                ))}
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
