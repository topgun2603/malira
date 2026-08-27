"use client";

import { useState } from "react";
import NextImage from "next/image";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ImageIcon,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useArticles } from "@/hooks/use-articles";
import { useCategoryMap } from "@/hooks/use-categories";
import type { CarouselDraft } from "@/lib/api/carousels";
import {
  CAROUSEL_PLACEMENTS,
  CAROUSEL_PLACEMENT_LABELS,
  MAX_CAROUSEL_STORIES,
  type Article,
  type CarouselPlacement,
  type StoryCarousel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY: CarouselDraft = {
  name: "",
  title: "",
  titleTa: "",
  articleIds: [],
  placement: "home_top",
  autoplay: true,
  intervalSeconds: 6,
};

function toDraft(carousel: StoryCarousel): CarouselDraft {
  return {
    name: carousel.name,
    title: carousel.title,
    titleTa: carousel.titleTa,
    articleIds: carousel.articleIds,
    placement: carousel.placement,
    autoplay: carousel.autoplay,
    intervalSeconds: carousel.intervalSeconds,
  };
}

function StoryRow({
  article,
  categoryName,
  trailing,
}: {
  article: Article;
  categoryName?: string;
  trailing: React.ReactNode;
}) {
  const lead = article.images[0];
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="bg-muted text-muted-foreground relative size-11 shrink-0 overflow-hidden rounded-md">
        {lead ? (
          <NextImage
            src={lead.url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{article.title}</p>
        <p className="text-muted-foreground text-xs">
          {categoryName}
          {article.publishedAt &&
            ` · ${format(article.publishedAt.toDate(), "d MMM yyyy")}`}
        </p>
      </div>
      {trailing}
    </div>
  );
}

export function CarouselForm({
  carousel,
  onSubmit,
  onCancel,
  saving,
}: {
  carousel?: StoryCarousel;
  onSubmit: (draft: CarouselDraft) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [draft, setDraft] = useState<CarouselDraft>(
    carousel ? toDraft(carousel) : EMPTY,
  );
  const [search, setSearch] = useState("");

  const categories = useCategoryMap();
  // Only published stories can be curated: a carousel pointing at a draft would
  // silently render one story short on the reader side.
  const { data: published, isLoading } = useArticles({ status: "published", max: 200 });

  const byId = new Map((published ?? []).map((article) => [article.id, article]));
  const selected = draft.articleIds
    .map((id) => byId.get(id))
    .filter((article): article is Article => Boolean(article));

  const term = search.trim().toLowerCase();
  const available = (published ?? []).filter((article) => {
    if (draft.articleIds.includes(article.id)) return false;
    if (!term) return true;
    return `${article.title} ${article.titleTa} ${article.tags.join(" ")}`
      .toLowerCase()
      .includes(term);
  });

  function add(id: string) {
    if (draft.articleIds.length >= MAX_CAROUSEL_STORIES) {
      toast.error(`A carousel holds at most ${MAX_CAROUSEL_STORIES} stories.`);
      return;
    }
    setDraft((current) => ({
      ...current,
      articleIds: [...current.articleIds, id],
    }));
  }

  function remove(id: string) {
    setDraft((current) => ({
      ...current,
      articleIds: current.articleIds.filter((entry) => entry !== id),
    }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.articleIds.length) return;
    const next = [...draft.articleIds];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft((current) => ({ ...current, articleIds: next }));
  }

  function submit() {
    if (!draft.name.trim()) {
      toast.error("Give the carousel an internal name.");
      return;
    }
    if (draft.articleIds.length < 2) {
      toast.error("Pick at least two stories — one story is not a carousel.");
      return;
    }
    onSubmit(draft);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* --------------------------- story picker --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Stories</CardTitle>
          <CardDescription>
            Picked by hand, shown in this order. Only published stories can be
            selected. Up to {MAX_CAROUSEL_STORIES}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>
                Selected ({draft.articleIds.length}/{MAX_CAROUSEL_STORIES})
              </Label>
              {draft.articleIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDraft({ ...draft, articleIds: [] })}
                >
                  Clear all
                </Button>
              )}
            </div>

            {selected.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                Nothing selected yet. Pick stories from the list below.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border px-3">
                {selected.map((article, index) => (
                  <li key={article.id}>
                    <StoryRow
                      article={article}
                      categoryName={categories.get(article.categoryId)?.name}
                      trailing={
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Badge variant="secondary" className="mr-1 font-normal">
                            {index + 1}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Move up"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Move down"
                            disabled={index === selected.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Remove from carousel"
                            onClick={() => remove(article.id)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label className="mb-1 block">Add a story</Label>
            <div className="relative mb-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                placeholder="Search published headlines and tags"
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Loading published stories...
              </p>
            ) : available.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {term
                  ? "No published story matches that."
                  : "Every published story is already in this carousel."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border px-3">
                {available.map((article) => (
                  <li key={article.id}>
                    <StoryRow
                      article={article}
                      categoryName={categories.get(article.categoryId)?.name}
                      trailing={
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => add(article.id)}
                        >
                          <Check className="size-3.5" />
                          Add
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------- settings ------------------------------ */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Placement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Internal name</Label>
              <Input
                id="name"
                value={draft.name}
                placeholder="Front page picks"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot">Where it appears</Label>
              <Select
                value={draft.placement}
                onValueChange={(value) =>
                  setDraft({ ...draft, placement: value as CarouselPlacement })
                }
              >
                <SelectTrigger id="slot" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAROUSEL_PLACEMENTS.map((placement) => (
                    <SelectItem key={placement} value={placement}>
                      {CAROUSEL_PLACEMENT_LABELS[placement]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                One running carousel per slot. Publishing a newer one replaces it.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Heading (optional)</Label>
              <Input
                id="title"
                value={draft.title}
                placeholder="Editor's picks"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="titleTa">தலைப்பு (optional)</Label>
              <Input
                id="titleTa"
                lang="ta"
                className="font-tamil"
                value={draft.titleTa}
                onChange={(event) =>
                  setDraft({ ...draft, titleTa: event.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rotation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="autoplay">Rotate automatically</Label>
                <p className="text-muted-foreground text-xs">
                  Always off for readers who have asked for reduced motion.
                </p>
              </div>
              <Switch
                id="autoplay"
                checked={draft.autoplay}
                onCheckedChange={(checked) => setDraft({ ...draft, autoplay: checked })}
              />
            </div>

            {draft.autoplay && (
              <div className="space-y-2">
                <Label htmlFor="interval">Seconds per story</Label>
                <Input
                  id="interval"
                  type="number"
                  min={3}
                  max={20}
                  value={draft.intervalSeconds}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      intervalSeconds: Number(event.target.value) || 6,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Under four seconds is too fast to read a headline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={cn("flex gap-2")}>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {carousel ? "Save changes" : "Create carousel"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
