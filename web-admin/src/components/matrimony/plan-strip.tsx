"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/reader/language";
import { useEntitlement } from "@/hooks/use-subscription";

/**
 * A one-line plan status, for the top of My matrimony.
 *
 * Replaces the full pricing card that used to sit there: on the page where
 * somebody is trying to fill in their own details, a sales panel above the form
 * is in the way. The offer belongs where it is earned — at the end of a free
 * member's search results — and the full comparison lives on its own page.
 */
export function PlanStrip() {
  const { lang } = useLanguage();
  const { premium, subscription } = useEntitlement();

  if (premium && subscription?.expiresAt) {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Badge className="gap-1 font-normal">
          <Crown className="size-3" />
          {subscription.planName || "Premium"}
        </Badge>
        <span>
          {lang === "ta" ? "காலாவதி" : "Until"}{" "}
          {format(subscription.expiresAt.toDate(), "d MMM yyyy")}
        </span>
        <Link
          href="/matrimony/plans"
          className="hover:text-foreground underline underline-offset-2"
        >
          {lang === "ta" ? "நீட்டி" : "Extend"}
        </Link>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="secondary" className="font-normal">
        {lang === "ta" ? "சந்தா இல்லை" : "No plan"}
      </Badge>
      <span>
        {lang === "ta"
          ? "பதிவு இலவசம். பார்ப்பதற்குச் சந்தா தேவை."
          : "Listing is free. Browsing needs a plan."}
      </span>
      <Button variant="link" size="sm" className="h-auto p-0" asChild>
        <Link href="/matrimony/plans">
          {lang === "ta" ? "திட்டங்களைப் பார்" : "See plans"}
        </Link>
      </Button>
    </div>
  );
}
