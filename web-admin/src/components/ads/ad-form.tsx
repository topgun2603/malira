"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, Monitor, Smartphone } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/news/image-uploader";
import { AdCreative } from "@/components/reader/ad-creative";
import { LanguageProvider } from "@/components/reader/language";
import { useAuth } from "@/components/providers/auth-provider";
import type { AdDraft } from "@/lib/api/ads";
import {
  AD_FORMAT_HINTS,
  AD_FORMAT_LABELS,
  AD_PLACEMENTS,
  AD_PLACEMENT_LABELS,
  PLACEMENT_FORMATS,
  type Ad,
  type AdPlacement,
  type ArticleImage,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY: AdDraft = {
  name: "",
  advertiser: "",
  format: "banner",
  placement: "home_top",
  headline: "",
  headlineTa: "",
  body: "",
  bodyTa: "",
  ctaLabel: "Learn more",
  ctaUrl: "",
  image: null,
  weight: 1,
  startsAt: null,
  endsAt: null,
  delaySeconds: 5,
  frequency: "once_per_day",
};

function toDraft(ad: Ad): AdDraft {
  return {
    name: ad.name,
    advertiser: ad.advertiser,
    format: ad.format,
    placement: ad.placement,
    headline: ad.headline,
    headlineTa: ad.headlineTa,
    body: ad.body,
    bodyTa: ad.bodyTa,
    ctaLabel: ad.ctaLabel,
    ctaUrl: ad.ctaUrl,
    image: ad.image,
    weight: ad.weight,
    startsAt: ad.startsAt ? ad.startsAt.toDate() : null,
    endsAt: ad.endsAt ? ad.endsAt.toDate() : null,
    delaySeconds: ad.delaySeconds,
    frequency: ad.frequency,
  };
}

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AdForm({
  ad,
  onSubmit,
  onCancel,
  saving,
}: {
  ad?: Ad;
  onSubmit: (draft: AdDraft) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const { profile } = useAuth();
  const [draft, setDraft] = useState<AdDraft>(ad ? toDraft(ad) : EMPTY);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const uploadId = useId().replace(/[^a-zA-Z0-9]/g, "");
  // No slash: uploads land at articles/<key>/<file>, and the Storage rule
  // matches exactly one key segment. A key containing "/" would push the file
  // one level deeper and be denied.
  const adKey = useMemo(
    () => `ad-${ad?.id ?? `draft-${profile?.id ?? "anon"}-${uploadId}`}`,
    [ad?.id, profile?.id, uploadId],
  );

  function set<K extends keyof AdDraft>(key: K, value: AdDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /** Changing the slot narrows the formats, so keep the two in step. */
  function setPlacement(placement: AdPlacement) {
    const allowed = PLACEMENT_FORMATS[placement];
    setDraft((current) => ({
      ...current,
      placement,
      format: allowed.includes(current.format) ? current.format : allowed[0],
    }));
  }

  function submit() {
    if (!draft.name.trim()) return toast.error("Give the ad an internal name.");
    if (!draft.headline.trim()) return toast.error("The ad needs a headline.");
    if (draft.ctaUrl && !/^https?:\/\//i.test(draft.ctaUrl)) {
      return toast.error("The link must start with http:// or https://");
    }
    if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) {
      return toast.error("The end date must be after the start date.");
    }
    onSubmit(draft);
  }

  // The preview renders the real reader component, so nothing can drift between
  // what the desk approves and what a reader sees.
  const previewAd: Ad = {
    id: "preview",
    ...draft,
    status: "active",
    startsAt: null,
    endsAt: null,
    impressions: 0,
    clicks: 0,
    createdBy: "",
    createdAt: null,
    updatedAt: null,
  };

  const allowedFormats = PLACEMENT_FORMATS[draft.placement];
  const isPopup = draft.placement === "popup";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ------------------------------ form ------------------------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
            <CardDescription>
              Internal details and where the ad runs. Readers never see the name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Internal name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  placeholder="Tea estate — spring campaign"
                  onChange={(event) => set("name", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advertiser">Advertiser</Label>
                <Input
                  id="advertiser"
                  value={draft.advertiser}
                  placeholder="Shown to readers as the sponsor"
                  onChange={(event) => set("advertiser", event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement">Placement</Label>
              <Select
                value={draft.placement}
                onValueChange={(value) => setPlacement(value as AdPlacement)}
              >
                <SelectTrigger id="placement" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AD_PLACEMENTS.map((placement) => (
                    <SelectItem key={placement} value={placement}>
                      {AD_PLACEMENT_LABELS[placement]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {allowedFormats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => set("format", format)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      draft.format === format
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {AD_FORMAT_LABELS[format]}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                      {AD_FORMAT_HINTS[format]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="en">
              <TabsList className="mb-3">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ta" className="font-tamil">
                  தமிழ்
                </TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={draft.headline}
                    onChange={(event) => set("headline", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    rows={3}
                    value={draft.body}
                    onChange={(event) => set("body", event.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ta" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headlineTa">தலைப்பு</Label>
                  <Input
                    id="headlineTa"
                    lang="ta"
                    className="font-tamil"
                    value={draft.headlineTa}
                    onChange={(event) => set("headlineTa", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyTa">விவரம்</Label>
                  <Textarea
                    id="bodyTa"
                    lang="ta"
                    rows={3}
                    className="font-tamil"
                    value={draft.bodyTa}
                    onChange={(event) => set("bodyTa", event.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ctaLabel">Button text</Label>
                <Input
                  id="ctaLabel"
                  value={draft.ctaLabel}
                  onChange={(event) => set("ctaLabel", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">Button link</Label>
                <Input
                  id="ctaUrl"
                  value={draft.ctaUrl}
                  placeholder="https://"
                  onChange={(event) => set("ctaUrl", event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUploader
                value={draft.image ? [draft.image] : []}
                articleKey={adKey}
                onChange={(images: ArticleImage[]) => set("image", images[0] ?? null)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule and delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={toDateTimeLocal(draft.startsAt)}
                  onChange={(event) =>
                    set("startsAt", event.target.value ? new Date(event.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={toDateTimeLocal(draft.endsAt)}
                  onChange={(event) =>
                    set("endsAt", event.target.value ? new Date(event.target.value) : null)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Share of voice</Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={10}
                value={draft.weight}
                onChange={(event) => set("weight", Number(event.target.value) || 1)}
              />
              <p className="text-muted-foreground text-xs">
                When several ads book the same slot, a weight of 3 against a 1 shows
                three times as often — it does not block the other advertiser.
              </p>
            </div>

            {isPopup && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="delay">Delay before showing</Label>
                  <Input
                    id="delay"
                    type="number"
                    min={0}
                    max={60}
                    value={draft.delaySeconds}
                    onChange={(event) =>
                      set("delaySeconds", Number(event.target.value) || 0)
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Seconds after the page loads.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">How often</Label>
                  <Select
                    value={draft.frequency}
                    onValueChange={(value) =>
                      set("frequency", value as AdDraft["frequency"])
                    }
                  >
                    <SelectTrigger id="frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once_per_day">Once a day per reader</SelectItem>
                      <SelectItem value="once_per_session">Once per visit</SelectItem>
                      <SelectItem value="every_visit">Every page load</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Every page load is intrusive. Use it only for a short campaign.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------- preview ----------------------------- */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Live preview</CardTitle>
            <div className="bg-muted flex rounded-md p-0.5">
              <Button
                size="icon"
                variant={device === "desktop" ? "secondary" : "ghost"}
                className="size-7"
                aria-label="Desktop preview"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant={device === "mobile" ? "secondary" : "ghost"}
                className="size-7"
                aria-label="Mobile preview"
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "bg-muted/40 mx-auto rounded-lg p-3 transition-all",
                device === "mobile" ? "max-w-[320px]" : "w-full",
              )}
            >
              {/* The preview uses its own LanguageProvider so it renders in
                  English regardless of what the reader site is set to. */}
              <LanguageProvider>
                <AdCreative ad={previewAd} preview />
              </LanguageProvider>
            </div>
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              This is the exact component readers get, including the
              &ldquo;Advertisement&rdquo; label, which is not removable.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {ad ? "Save changes" : "Create ad"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
