"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { CalendarClock, Loader2, Save, Send, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { FadeIn } from "@/components/motion/primitives";
import { useCategories } from "@/hooks/use-categories";
import { can } from "@/lib/permissions";
import type { Article, ArticleDraft, ArticleStatus } from "@/lib/types";
import { ImageUploader } from "./image-uploader";
import { RichEditor } from "./rich-editor";
import { StatusBadge } from "./status-badge";
import { TagInput } from "./tag-input";
import { YouTubeField } from "./youtube-field";

const EMPTY: ArticleDraft = {
  title: "",
  titleTa: "",
  slug: "",
  summary: "",
  summaryTa: "",
  body: "",
  bodyTa: "",
  categoryId: "",
  tags: [],
  images: [],
  youtubeUrl: null,
  sourceName: "",
  authorName: "",
  pinned: false,
  commentsEnabled: false,
  publishAt: null,
};

function toDraft(article: Article): ArticleDraft {
  return {
    title: article.title,
    titleTa: article.titleTa,
    slug: article.slug,
    summary: article.summary,
    summaryTa: article.summaryTa,
    body: article.body,
    bodyTa: article.bodyTa,
    categoryId: article.categoryId,
    tags: article.tags,
    images: article.images,
    youtubeUrl: article.youtubeUrl,
    sourceName: article.sourceName,
    authorName: article.authorName,
    pinned: article.pinned,
    commentsEnabled: article.commentsEnabled,
    publishAt: article.publishAt ? article.publishAt.toDate() : null,
  };
}

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export interface ArticleFormProps {
  article?: Article;
  onSubmit: (draft: ArticleDraft, status: ArticleStatus) => Promise<void>;
  saving?: boolean;
}

export function ArticleForm({ article, onSubmit, saving }: ArticleFormProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: categories } = useCategories();
  const [draft, setDraft] = useState<ArticleDraft>(
    article ? toDraft(article) : { ...EMPTY, authorName: profile?.displayName ?? "" },
  );
  const [pending, setPending] = useState<ArticleStatus | null>(null);

  const canPublish = can(profile?.role, "news.publish");

  // Uploads for a brand-new article need a stable folder before the doc exists.
  // useId keeps that folder constant across re-renders without reaching for a
  // clock or a random number, both of which make render impure.
  const draftId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const articleKey = useMemo(
    () => article?.id ?? `draft-${profile?.id ?? "anon"}-${draftId}`,
    [article?.id, profile?.id, draftId],
  );

  function set<K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validate(status: ArticleStatus): string | null {
    if (!draft.title.trim()) return "The English headline is required.";
    if (!draft.categoryId) return "Pick a category.";

    if (status === "published" || status === "scheduled" || status === "in_review") {
      if (!draft.summary.trim()) return "A summary is required before submitting.";
      if (!draft.body.trim() || draft.body === "<p></p>") {
        return "The article body is empty.";
      }
    }

    if (status === "scheduled") {
      if (!draft.publishAt) return "Pick a date and time to schedule for.";
      if (draft.publishAt <= new Date()) {
        return "The scheduled time must be in the future.";
      }
    }

    return null;
  }

  async function handle(status: ArticleStatus) {
    const problem = validate(status);
    if (problem) {
      toast.error(problem);
      return;
    }
    setPending(status);
    try {
      await onSubmit(draft, status);
    } finally {
      setPending(null);
    }
  }

  const busy = Boolean(saving) || pending !== null;

  return (
    <FadeIn className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* -------------------------- Main column --------------------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Story</CardTitle>
            <CardDescription>
              English is required. Tamil is optional per article and falls back to
              English in the app when left blank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="en">
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ta" className="font-tamil">
                  தமிழ்
                </TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Headline</Label>
                  <Input
                    id="title"
                    value={draft.title}
                    placeholder="Coonoor tea auction posts a record price"
                    onChange={(event) => set("title", event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    {draft.title.length} characters. Keep it under 70 so it does not
                    truncate in the feed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    rows={3}
                    value={draft.summary}
                    placeholder="Two lines shown under the headline in the feed, and in the WhatsApp share preview."
                    onChange={(event) => set("summary", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body</Label>
                  <RichEditor value={draft.body} onChange={(html) => set("body", html)} />
                </div>
              </TabsContent>

              <TabsContent value="ta" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titleTa">தலைப்பு</Label>
                  <Input
                    id="titleTa"
                    lang="ta"
                    className="font-tamil"
                    value={draft.titleTa}
                    onChange={(event) => set("titleTa", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summaryTa">சுருக்கம்</Label>
                  <Textarea
                    id="summaryTa"
                    lang="ta"
                    rows={3}
                    className="font-tamil"
                    value={draft.summaryTa}
                    onChange={(event) => set("summaryTa", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>செய்தி</Label>
                  <RichEditor
                    lang="ta"
                    value={draft.bodyTa}
                    onChange={(html) => set("bodyTa", html)}
                    placeholder="செய்தியை இங்கே எழுதுங்கள்..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>
              Up to five images. The first one is the lead image used in the feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImageUploader
              value={draft.images}
              articleKey={articleKey}
              onChange={(images) => set("images", images)}
              disabled={busy}
            />
            <div className="space-y-2">
              <Label>Video</Label>
              <YouTubeField
                value={draft.youtubeUrl}
                onChange={(url) => set("youtubeUrl", url)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------- Sidebar ----------------------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Publishing</CardTitle>
            {article && <StatusBadge status={article.status} />}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={draft.categoryId}
                onValueChange={(value) => set("categoryId", value)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? [])
                    .filter((category) => category.active)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={draft.authorName}
                onChange={(event) => set("authorName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={draft.sourceName}
                placeholder="Staff reporter, agency name..."
                onChange={(event) => set("sourceName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput value={draft.tags} onChange={(tags) => set("tags", tags)} />
            </div>

            {canPublish && (
              <div className="space-y-2">
                <Label htmlFor="publishAt">Schedule for</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={toDateTimeLocal(draft.publishAt)}
                  onChange={(event) =>
                    set(
                      "publishAt",
                      event.target.value ? new Date(event.target.value) : null,
                    )
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {canPublish && (
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pinned">Pin to top of feed</Label>
                  <p className="text-muted-foreground text-xs">
                    Keeps the story above the latest items.
                  </p>
                </div>
                <Switch
                  id="pinned"
                  checked={draft.pinned}
                  onCheckedChange={(checked) => set("pinned", checked)}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="comments">Allow comments</Label>
                  <p className="text-muted-foreground text-xs">
                    Off by default. Turning this on means somebody has to moderate it.
                  </p>
                </div>
                <Switch
                  id="comments"
                  checked={draft.commentsEnabled}
                  onCheckedChange={(checked) => set("commentsEnabled", checked)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-2 pt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void handle("draft")}
            >
              {pending === "draft" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save draft
            </Button>

            {canPublish ? (
              <>
                {draft.publishAt && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void handle("scheduled")}
                  >
                    {pending === "scheduled" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CalendarClock className="size-4" />
                    )}
                    Schedule
                  </Button>
                )}
                <Button
                  type="button"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void handle("published")}
                >
                  {pending === "published" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Publish now
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void handle("in_review")}
              >
                {pending === "in_review" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit for approval
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => router.push("/admin/news")}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
