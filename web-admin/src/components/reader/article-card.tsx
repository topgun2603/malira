"use client";

import Link from "next/link";
import NextImage from "next/image";
import { format } from "date-fns";
import { ImageIcon, Pin, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Article, Category } from "@/lib/types";
import { useLanguage } from "./language";

function publishedLabel(article: Article): string {
  if (!article.publishedAt) return "";
  return format(article.publishedAt.toDate(), "d MMM yyyy");
}

/**
 * The feed card. Obituaries deliberately lose the accent colour and the image
 * crop stays calm — a death notice should not be styled like a match report.
 */
export function ArticleCard({
  article,
  category,
  variant = "default",
}: {
  article: Article;
  category?: Category;
  variant?: "default" | "hero" | "compact";
}) {
  const { pick, langAttr } = useLanguage();

  const title = pick(article.title, article.titleTa);
  const summary = pick(article.summary, article.summaryTa);
  const lead = article.images[0];
  const isObituary = category?.slug === "obituaries";

  if (variant === "compact") {
    return (
      <Link
        href={`/article/${article.id}`}
        className="group hover:bg-muted/50 -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5"
      >
        <div className="bg-muted text-muted-foreground relative size-14 shrink-0 overflow-hidden rounded-md">
          {lead ? (
            <NextImage
              src={lead.url}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <ImageIcon className="absolute inset-0 m-auto size-4" />
          )}
        </div>
        <div className="min-w-0">
          <h3
            lang={langAttr(article.title, article.titleTa)}
            className="group-hover:text-primary line-clamp-2 text-sm leading-snug font-medium"
          >
            {title}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {publishedLabel(article)}
          </p>
        </div>
      </Link>
    );
  }

  const isHero = variant === "hero";

  return (
    <Link
      href={`/article/${article.id}`}
      className={cn(
        "group bg-card hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border transition-colors",
        isHero && "sm:flex-row",
      )}
    >
      <div
        className={cn(
          "bg-muted text-muted-foreground relative shrink-0",
          isHero ? "aspect-[16/10] sm:aspect-auto sm:w-1/2" : "aspect-[16/9]",
        )}
      >
        {lead ? (
          <NextImage
            src={lead.url}
            alt={lead.caption || ""}
            fill
            unoptimized
            className={cn(
              "object-cover transition-transform duration-500",
              !isObituary && "group-hover:scale-[1.03]",
            )}
            sizes={isHero ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 768px) 100vw, 380px"}
          />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-6" />
        )}

        {article.youtubeUrl && (
          <span className="bg-background/90 text-foreground absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <Play className="size-3 fill-current" />
            Video
          </span>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col p-4", isHero && "sm:justify-center sm:p-6")}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {category && (
            <Badge
              variant={isObituary ? "outline" : "secondary"}
              className="font-normal"
            >
              {pick(category.name, category.nameTa)}
            </Badge>
          )}
          {article.pinned && (
            <span className="text-brand-saffron flex items-center gap-1 text-xs font-medium">
              <Pin className="size-3" />
              Top story
            </span>
          )}
        </div>

        <h2
          lang={langAttr(article.title, article.titleTa)}
          className={cn(
            "group-hover:text-primary leading-snug font-semibold tracking-tight transition-colors",
            isHero ? "text-2xl sm:text-3xl" : "line-clamp-3 text-lg",
          )}
        >
          {title}
        </h2>

        {summary && (
          <p
            lang={langAttr(article.summary, article.summaryTa)}
            className={cn(
              "text-muted-foreground mt-2 text-sm leading-relaxed",
              isHero ? "line-clamp-3" : "line-clamp-2",
            )}
          >
            {summary}
          </p>
        )}

        <p className="text-muted-foreground mt-auto pt-3 text-xs">
          {article.authorName || article.createdByName}
          {article.publishedAt && ` · ${publishedLabel(article)}`}
        </p>
      </div>
    </Link>
  );
}
