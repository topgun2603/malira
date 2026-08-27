"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, Lock, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/primitives";
import { useLanguage } from "@/components/reader/language";
import type { MatrimonyProfile } from "@/lib/types";

/**
 * Shown to a signed-in member who has no listing yet, or whose listing is not
 * live.
 *
 * Browsing is gated behind having a profile on purpose. A matrimony service
 * where people can look but never be looked at empties out fast: the families
 * who list are the ones carrying the risk, and they should not be the only ones
 * doing it.
 */
export function MatrimonyOnboarding({
  profile,
}: {
  profile: MatrimonyProfile | null;
}) {
  const { lang } = useLanguage();

  const pending = profile?.status === "pending";
  const rejected = profile?.status === "rejected";
  const paused = profile?.status === "paused";

  const state = pending
    ? {
        icon: Clock,
        title: lang === "ta" ? "சரிபார்ப்பில் உள்ளது" : "With a moderator",
        body:
          lang === "ta"
            ? "உங்கள் விவரங்கள் சரிபார்க்கப்படுகின்றன. அது முடிந்ததும் மற்றவர்களின் விவரங்களைப் பார்க்கலாம்."
            : "Your profile is being read by a person. Browsing opens as soon as it is approved — usually the same day.",
        cta: lang === "ta" ? "என் விவரங்கள்" : "View my profile",
      }
    : rejected
      ? {
          icon: BadgeCheck,
          title: lang === "ta" ? "சில திருத்தங்கள் தேவை" : "A few changes needed",
          body:
            profile?.reviewNote ??
            (lang === "ta"
              ? "நடுவரின் குறிப்பைப் பார்த்து மீண்டும் சமர்ப்பியுங்கள்."
              : "Read the moderator's note, make the change, and resubmit."),
          cta: lang === "ta" ? "திருத்தி சமர்ப்பி" : "Edit and resubmit",
        }
      : paused
        ? {
            icon: Lock,
            title: lang === "ta" ? "உங்கள் பதிவு இடைநிறுத்தப்பட்டுள்ளது" : "Your listing is paused",
            body:
              lang === "ta"
                ? "மீண்டும் தொடங்கினால் மற்றவர்களின் விவரங்களைப் பார்க்கலாம்."
                : "Resume it to start browsing again. Nothing has been deleted.",
            cta: lang === "ta" ? "மீண்டும் தொடங்கு" : "Resume listing",
          }
        : {
            icon: UserRoundPlus,
            title:
              lang === "ta" ? "உங்கள் விவரங்களை நிறைவு செய்யுங்கள்" : "Complete your profile",
            body:
              lang === "ta"
                ? "பதிவு செய்தால் மட்டுமே மற்றவர்களின் விவரங்களைப் பார்க்க முடியும். சில நிமிடங்களே ஆகும்."
                : "Listing comes first, then browsing. It takes a few minutes, and a moderator reviews it before it appears.",
            cta: lang === "ta" ? "தொடங்கு" : "Start my profile",
          };

  return (
    <FadeIn className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="flex flex-col items-center text-center">
        <span className="bg-primary/10 text-primary mb-6 flex size-14 items-center justify-center rounded-2xl">
          <state.icon className="size-7" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {state.title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
          {state.body}
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/matrimony/me">
            {state.cta}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {!profile && (
        <Card className="mt-12">
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-medium">
              {lang === "ta" ? "தயாராக வைத்துக்கொள்ளுங்கள்" : "Have these ready"}
            </p>
            <ul className="text-muted-foreground space-y-2.5 text-sm">
              {[
                {
                  en: "Date of birth, birth time and birth place",
                  ta: "பிறந்த தேதி, நேரம் மற்றும் இடம்",
                },
                {
                  en: "Education, occupation and where they work",
                  ta: "கல்வி, தொழில் மற்றும் பணியிடம்",
                },
                {
                  en: "A photograph of the candidate alone",
                  ta: "தனியாக எடுத்த ஒரு புகைப்படம்",
                },
                {
                  en: "A contact number — kept private until you accept an interest",
                  ta: "ஒரு தொடர்பு எண் — சம்மதிக்கும் வரை வெளியிடப்படாது",
                },
              ].map((item) => (
                <li key={item.en} className="flex items-start gap-2.5">
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  {lang === "ta" ? item.ta : item.en}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </FadeIn>
  );
}
