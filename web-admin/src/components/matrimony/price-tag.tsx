"use client";

import { Badge } from "@/components/ui/badge";
import { discountPercent, type SubscriptionPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * Price, list price and saving, in one place.
 *
 * Every surface renders this rather than formatting prices itself, so the
 * struck-through figure can never disagree between the landing page, the plans
 * page and the subscribe wall.
 *
 * The saving is computed from the two prices instead of being stored, which
 * means a desk cannot advertise "50% off" while the numbers say something else.
 * When no list price is set the whole discount treatment disappears rather than
 * inventing a "before" figure — a struck-through price that was never charged
 * is the oldest trick in retail and not one this should learn.
 */
export function PriceTag({
  plan,
  size = "default",
  className,
}: {
  plan: Pick<SubscriptionPlan, "priceInPaise" | "mrpInPaise" | "months">;
  size?: "default" | "large" | "compact";
  className?: string;
}) {
  const off = discountPercent(plan);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "large" ? "text-4xl" : size === "compact" ? "text-xl" : "text-3xl",
        )}
      >
        {rupees(plan.priceInPaise)}
      </span>

      {off > 0 && (
        <span
          className={cn(
            "text-muted-foreground line-through",
            size === "compact" ? "text-sm" : "text-lg",
          )}
        >
          {rupees(plan.mrpInPaise)}
        </span>
      )}

      {size !== "compact" && (
        <span className="text-muted-foreground text-base font-normal">
          / {plan.months} {plan.months === 1 ? "month" : "months"}
        </span>
      )}

      {off > 0 && (
        <Badge variant="secondary" className="font-normal">
          {off}% off
        </Badge>
      )}
    </div>
  );
}
