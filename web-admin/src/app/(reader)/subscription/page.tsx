"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Crown, Eye, HeartHandshake, Lock, ShieldCheck, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanCards } from "@/components/matrimony/plan-cards";
import { MyPayments } from "@/components/payments/my-payments";
import { useLanguage } from "@/components/reader/language";
import { useAuth } from "@/components/providers/auth-provider";
import { useEntitlement } from "@/hooks/use-subscription";

/**
 * Subscription, on its own page.
 *
 * It used to be a band near the bottom of the matrimony landing page, where it
 * competed with the pitch and — with one paid plan configured — rendered as a
 * single card floating in a two-column grid. Pricing is a decision people come
 * back to deliberately, so it gets an address of its own in the nav rather than
 * a scroll position.
 *
 * Public on purpose. Somebody deciding whether to join should be able to read
 * the price first; the cards themselves switch from "Get started" to a real
 * checkout once there is an account to charge.
 */
export default function SubscriptionPage() {
  const { lang } = useLanguage();
  const { firebaseUser } = useAuth();
  const { premium, subscription, remaining } =
    useEntitlement();
  const ta = lang === "ta";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <Badge variant="secondary" className="font-normal">
          {ta ? "சந்தா" : "Subscription"}
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
          {ta ? "பதிவு எப்போதும் இலவசம்" : "Listing is always free"}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed">
          {ta
            ? "மேலும் விவரங்களைப் பார்க்கவும் அதிக விருப்பங்கள் அனுப்பவும் மட்டுமே கட்டணம். உங்கள் விவரம் தெரிவதற்குக் கட்டணம் இல்லை."
            : "You pay only to see more profiles and send more interests — never to be seen yourself."}
        </p>
      </header>

      {/* Where somebody already stands, before they are shown anything to buy.
          A member on a paid plan mostly comes here to check the expiry date. */}
      {firebaseUser && (
        <Card className="mt-10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {premium ? (
                <Crown className="text-primary size-5 shrink-0" />
              ) : (
                <HeartHandshake className="text-muted-foreground size-5 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {premium
                    ? subscription?.planName || (ta ? "பிரீமியம்" : "Premium")
                    : ta
                      ? "சந்தா இல்லை"
                      : "No plan"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {premium && subscription?.expiresAt
                    ? `${ta ? "காலாவதி" : "Renews or ends"} ${format(subscription.expiresAt.toDate(), "d MMM yyyy")}`
                    : remaining === "unlimited"
                      ? ta
                        ? "வரம்பற்ற விருப்பங்கள்"
                        : "Unlimited interests"
                      : `${remaining} ${ta ? "விருப்பங்கள் இந்த மாதம் மீதம்" : "interests left this month"}`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href="/matrimony/browse">
                {ta ? "விவரங்களைப் பார்" : "Browse profiles"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-10">
        <PlanCards interactive={Boolean(firebaseUser)} onSignInHref="/matrimony" />
      </div>

      {firebaseUser && (
        <div className="mt-10">
          <MyPayments />
        </div>
      )}

      {/* The three questions people actually have about paying on a matrimony
          site, answered before they are asked. */}
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Lock,
            title: ta ? "தொடர்பு விவரம் விற்பனைக்கு அல்ல" : "The contact reveal is not for sale",
            body: ta
              ? "இருவரும் சம்மதித்தால் மட்டுமே தொலைபேசி எண் பரிமாறப்படும். கட்டணம் அதை மாற்றாது."
              : "Numbers are exchanged only when both sides accept. Paying does not get anyone past a decision that is not theirs to make.",
          },
          {
            icon: Eye,
            title: ta ? "தெரிவதற்குக் கட்டணம் இல்லை" : "Being seen is never paid for",
            body: ta
              ? "பதிவு எப்போதும் இலவசம், அனைவருக்கும் தெரியும். பார்ப்பதற்கு மட்டுமே கட்டணம்."
              : "Listing stays free and is shown to every subscriber. The plan is for looking, not for being looked at.",
          },
          {
            icon: Undo2,
            title: ta ? "தானாகப் புதுப்பிக்கப்படாது" : "It does not auto-renew",
            body: ta
              ? "ஒரு முறை கட்டணம், ஒரு காலத்திற்கு. முடிந்ததும் இலவசத் திட்டத்திற்கே திரும்புவீர்கள்."
              : "One payment, one term. When it ends your listing stays up and browsing stops — there is nothing to cancel.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="bg-muted/30 border-0 shadow-none">
            <CardContent className="p-5">
              <Icon className="text-primary size-5" />
              <p className="mt-3 font-medium">{title}</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {body}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <p className="text-muted-foreground mt-10 flex items-start justify-center gap-2 text-center text-xs leading-relaxed">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        {ta
          ? "கட்டணம் இணையத்தில் செலுத்தப்படுவதால் செயலி கடை கமிஷன் இல்லை."
          : "Payment is taken on the web, so no app-store commission is added to the price."}
      </p>
    </div>
  );
}
