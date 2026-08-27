"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCards } from "@/components/matrimony/plan-cards";
import { SignInGate } from "@/components/matrimony/sign-in-gate";
import { useLanguage } from "@/components/reader/language";

function Plans() {
  const { lang } = useLanguage();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link href="/matrimony/browse">
          <ArrowLeft className="size-4" />
          {lang === "ta" ? "விவரங்களுக்குத் திரும்பு" : "Back to profiles"}
        </Link>
      </Button>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {lang === "ta" ? "திட்டங்கள்" : "Plans"}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
        {lang === "ta"
          ? "பதிவு எப்போதும் இலவசம். மேலும் விவரங்களைப் பார்க்கவும் அதிக விருப்பங்கள் அனுப்பவும் மட்டுமே கட்டணம்."
          : "Listing is always free. You pay only to see more profiles and send more interests."}
      </p>

      <div className="mt-10">
        <PlanCards interactive />
      </div>

      <p className="text-muted-foreground mt-8 flex items-start gap-2 text-xs leading-relaxed">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        {lang === "ta"
          ? "தொடர்பு விவரங்கள் ஒருபோதும் விற்கப்படுவதில்லை. கட்டணம் செலுத்துவது யாருடைய சம்மதத்தையும் தவிர்க்காது. கட்டணம் இணையத்தில் செலுத்தப்படுவதால் செயலி கடை கமிஷன் இல்லை."
          : "Contact details are never sold — paying does not get anyone past a decision that is not theirs to make. Payment is taken on the web, so no app-store commission applies."}
      </p>
    </div>
  );
}

export default function MatrimonyPlansPage() {
  return (
    <SignInGate>
      <Plans />
    </SignInGate>
  );
}
