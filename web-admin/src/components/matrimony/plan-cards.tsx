"use client";

import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/reader/language";
import { useActivePlans, useMatrimonyLimits } from "@/hooks/use-plans";
import { useEntitlement, useStartCheckout } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { PriceTag, rupees } from "@/components/matrimony/price-tag";

/**
 * The pricing grid, rendered from the plans collection.
 *
 * Used on the public landing and on the members' plans page. `interactive` is
 * false on the landing, where there is nobody signed in to charge — the button
 * becomes a sign-in link instead of a checkout.
 */
export function PlanCards({
  interactive = false,
  onSignInHref = "/matrimony/browse",
}: {
  interactive?: boolean;
  onSignInHref?: string;
}) {
  const { lang } = useLanguage();
  const { data: plans, isLoading } = useActivePlans();
  const { data: limits } = useMatrimonyLimits();
  const { premium, subscription } = useEntitlement();
  const checkout = useStartCheckout();

  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const freeFeatures =
    lang === "ta"
      ? [
          "விவரங்களைப் பதிவு செய்யலாம்",
          `${limits?.freeProfileViews ?? 6} விவரங்களைப் பார்க்கலாம்`,
          `மாதம் ${limits?.freeInterestsPerMonth ?? 3} விருப்பங்கள்`,
          "சம்மதத்திற்குப் பிறகு தொடர்பு விவரங்கள்",
        ]
      : [
          "List a profile, reviewed by a moderator",
          `Browse ${limits?.freeProfileViews ?? 6} profiles`,
          `Send ${limits?.freeInterestsPerMonth ?? 3} interests a month`,
          "Contact details on a mutual accept",
        ];

  return (
    <div
      className={cn(
        "grid gap-5",
        (plans?.length ?? 0) >= 2 ? "md:grid-cols-3" : "md:grid-cols-2",
      )}
    >
      <Card>
        <CardContent className="p-6">
          <p className="font-medium">{lang === "ta" ? "இலவசம்" : "Free"}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">₹0</p>
          <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
            {freeFeatures.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="text-primary mt-0.5 size-4 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {(plans ?? []).map((plan) => {
        const current = premium && subscription?.planId === plan.id;
        const features =
          lang === "ta" && plan.featuresTa.length ? plan.featuresTa : plan.features;

        return (
          <Card
            key={plan.id}
            className={cn(plan.highlight && "ring-primary/40 ring-2")}
          >
            <CardContent className="flex h-full flex-col p-6">
              {/* In the card, not hanging off it. The ribbon used to sit at
                  a negative top offset, and Card carries overflow-hidden, so
                  the badge was sliced in half by the card's own top edge. */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {lang === "ta" && plan.nameTa ? plan.nameTa : plan.name}
                </p>
                {plan.highlight && (
                  <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {lang === "ta" ? "பரிந்துரை" : "Most useful"}
                  </span>
                )}
              </div>
              <PriceTag plan={plan} className="mt-2" />

              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                {features.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    {line}
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  {lang === "ta"
                    ? "தொடர்பு விவரங்கள் — இலவசம் போலவே சம்மதத்திற்குப் பிறகே"
                    : "Contact details on a mutual accept — same as free"}
                </li>
              </ul>

              <div className="mt-6 pt-0">
                {!interactive ? (
                  <Button className="w-full" asChild>
                    <a href={onSignInHref}>
                      {lang === "ta" ? "தொடங்கு" : "Get started"}
                    </a>
                  </Button>
                ) : current ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Crown className="size-4" />
                    {lang === "ta" ? "தற்போதைய திட்டம்" : "Your current plan"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => checkout.mutate(plan.id)}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending && <Loader2 className="size-4 animate-spin" />}
                    {premium
                      ? lang === "ta"
                        ? "நீட்டி"
                        : "Extend"
                      : lang === "ta"
                        ? "கட்டணம் செலுத்து"
                        : `Pay ${rupees(plan.priceInPaise)}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
