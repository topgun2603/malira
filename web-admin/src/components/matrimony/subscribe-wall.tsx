"use client";

import Link from "next/link";
import { Check, Crown, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/reader/language";
import { useEntitlement, useStartCheckout } from "@/hooks/use-subscription";
import { PriceTag, rupees } from "@/components/matrimony/price-tag";

/**
 * The wall at the end of a free member's results.
 *
 * It sits *after* the profiles they can see rather than replacing them, so the
 * free tier is genuinely useful on its own. A wall that fires before anything
 * is shown reads as a bait-and-switch and gets a matrimony service uninstalled.
 *
 * The offer comes from the plans collection: whatever the desk priced is what
 * appears here.
 */
export function SubscribeWall({ hidden }: { hidden: number }) {
  const { lang } = useLanguage();
  const { plans } = useEntitlement();
  const checkout = useStartCheckout();

  // Push the highlighted plan, or the cheapest if none is marked.
  const plan =
    plans.find((entry) => entry.highlight) ??
    [...plans].sort((a, b) => a.priceInPaise - b.priceInPaise)[0];

  return (
    <div className="border-primary/30 from-primary/8 relative overflow-hidden rounded-2xl border border-dashed bg-gradient-to-b to-transparent p-8 text-center sm:p-12">
      <span className="bg-primary/10 text-primary mx-auto mb-5 flex size-12 items-center justify-center rounded-xl">
        <Lock className="size-5" />
      </span>

      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {lang === "ta"
          ? `மேலும் ${hidden} விவரங்கள் உள்ளன`
          : `${hidden} more ${hidden === 1 ? "profile" : "profiles"} match your search`}
      </h2>

      {!plan ? (
        <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-relaxed">
          {lang === "ta"
            ? "தற்போது கட்டணத் திட்டம் எதுவும் இல்லை."
            : "No plan is on sale at the moment. Check back shortly."}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-relaxed">
            {lang === "ta"
              ? `${plan.nameTa || plan.name} அனைத்து விவரங்களையும் திறக்கிறது.`
              : `${plan.name} opens every profile and removes the monthly limit on interests.`}
          </p>

          <ul className="text-muted-foreground mx-auto mt-6 grid max-w-md gap-2 text-left text-sm sm:grid-cols-2">
            {(lang === "ta" && plan.featuresTa.length ? plan.featuresTa : plan.features)
              .slice(0, 4)
              .map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  {line}
                </li>
              ))}
          </ul>

          <PriceTag plan={plan} className="mt-6 justify-center" />

          <Button
            size="lg"
            className="mt-5"
            onClick={() => checkout.mutate(plan.id)}
            disabled={checkout.isPending}
          >
            {checkout.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Crown className="size-4" />
            )}
            {plan.name} — {rupees(plan.priceInPaise)}
          </Button>

          {plans.length > 1 && (
            <p className="mt-3">
              <Link
                href="/matrimony/plans"
                className="text-muted-foreground text-xs underline underline-offset-2"
              >
                {lang === "ta" ? "அனைத்து திட்டங்கள்" : "See all plans"}
              </Link>
            </p>
          )}
        </>
      )}

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        {lang === "ta"
          ? "தொலைபேசி எண் ஒருபோதும் விற்கப்படுவதில்லை — இருவரும் சம்மதித்தால் மட்டுமே."
          : "Contact details are still exchanged only on a mutual accept. That is never for sale."}
      </p>
    </div>
  );
}
