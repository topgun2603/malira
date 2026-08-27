"use client";

import { FlaskConical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useRemoveSampleArticles,
  useSampleCount,
  useSeedSampleArticles,
} from "@/hooks/use-sample-data";
import { can } from "@/lib/permissions";

/**
 * Sample content writes to the live Firestore project, so this card stays
 * visible for as long as any sample article exists — a seeded newsroom should
 * never quietly become the real one.
 */
export function SampleDataCard() {
  const { profile } = useAuth();
  const { data: count } = useSampleCount();
  const seed = useSeedSampleArticles();
  const remove = useRemoveSampleArticles();

  if (!can(profile?.role, "news.publish")) return null;

  const hasSamples = (count ?? 0) > 0;

  return (
    <Card className={hasSamples ? "border-brand-saffron/50 bg-accent/30" : undefined}>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FlaskConical className="text-accent-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">
              {hasSamples
                ? `${count} sample documents are live in this project`
                : "Sample content"}
            </p>
            <p className="text-muted-foreground text-sm">
              {hasSamples
                ? "Demo stories, a demo poll and demo ad bookings. Remove them before the app goes to readers."
                : "Adds ten bilingual stories, one running poll and five ad bookings across every slot, each with generated artwork, so the reader pages can be judged with real content in them."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {/* Seeding is idempotent per collection, so "add" stays available as a
              top-up once articles exist but the poll and ads do not. */}
          <Button
            variant={hasSamples ? "outline" : "default"}
            onClick={() => seed.mutate()}
            disabled={seed.isPending || remove.isPending}
          >
            {seed.isPending && <Loader2 className="size-4 animate-spin" />}
            {seed.isPending
              ? "Seeding..."
              : hasSamples
                ? "Top up sample content"
                : "Add sample content"}
          </Button>

          {hasSamples && (
            <Button
              variant="destructive"
              onClick={() => remove.mutate()}
              disabled={remove.isPending || seed.isPending}
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove all
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
