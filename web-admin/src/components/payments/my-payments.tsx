"use client";

import { format } from "date-fns";
import { Clock, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/reader/language";
import { useOwnPayments } from "@/hooks/use-payments";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * What this account has claimed, and what came of it.
 *
 * The list exists because verification is manual: somebody who has paid and is
 * waiting needs somewhere to see that the claim arrived, and somebody whose
 * claim was turned down needs to read why. Without this the only signal either
 * way is silence, which is indistinguishable from the desk having lost it.
 */
export function MyPayments() {
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const { data, isLoading } = useOwnPayments();

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (!data?.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ReceiptText className="size-4" />
        {ta ? "உங்கள் கட்டணங்கள்" : "Your payments"}
      </h2>

      {data.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="space-y-1.5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {rupees(payment.amountInPaise)} · {payment.planName}
              </span>
              <Badge
                variant={
                  payment.status === "approved"
                    ? "default"
                    : payment.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
                className="font-normal"
              >
                {PAYMENT_STATUS_LABELS[payment.status]}
              </Badge>
            </div>

            <p className="text-muted-foreground text-xs">
              <span className="font-mono">{payment.reference}</span>
              {payment.createdAt
                ? ` · ${format(payment.createdAt.toDate(), "d MMM yyyy")}`
                : ""}
              {payment.vendorName ? ` · ${payment.vendorName}` : ""}
            </p>

            {payment.status === "submitted" && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Clock className="size-3.5" />
                {ta
                  ? "ஒரு நபர் சரிபார்க்கிறார். வழக்கமாக அதே நாளில்."
                  : "A person is checking it against the account — usually the same day."}
              </p>
            )}

            {/*
              The reason, verbatim. A rejection the payer cannot act on is a
              rejection they will ring the desk about.
            */}
            {payment.reviewNote && (
              <p className="bg-muted/60 rounded-md p-2 text-xs">
                {payment.reviewNote}
              </p>
            )}

            {payment.status === "approved" && payment.grantedUntil && (
              <p className="text-muted-foreground text-xs">
                {ta ? "செல்லுபடி" : "Active until"}{" "}
                {format(payment.grantedUntil.toDate(), "d MMM yyyy")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
