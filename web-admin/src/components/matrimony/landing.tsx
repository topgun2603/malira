"use client";

import Link from "next/link";
import NextImage from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Eye,
  Heart,
  Lock,
  PhoneOff,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanCards } from "@/components/matrimony/plan-cards";
import { FadeIn, StaggerItem, StaggerList } from "@/components/motion/primitives";
import { useLanguage } from "@/components/reader/language";
import { cn } from "@/lib/utils";

/**
 * The public face of matrimony.
 *
 * Everything here is marketing: no real profile is rendered, because approved
 * profiles are readable only by signed-in members and that boundary is the
 * point of the product. The "sample" row below is deliberately illustrative —
 * silhouettes, not people — so nothing about a real member leaks to the open
 * web or to a search engine.
 *
 * Image paths live here so swapping a format is a one-line change.
 *
 * The hero goes through next/image: it is a 1.8 MB PNG on disk, and as a CSS
 * background every visitor would download all of it. next/image negotiates
 * AVIF/WebP and serves a width that suits the screen, which turns that into
 * tens of kilobytes on a phone — the difference between a usable and an
 * unusable page on a hill-station connection.
 *
 * All three now go through it, for the same reason: the sources are 1.8-2.1 MB
 * PNGs and a CSS background would ship every byte of them to every visitor.
 */
const IMAGES = {
  hero: "/matrimony/hero.png",
  tradition: "/matrimony/tradition.png",
  privacy: "/matrimony/privacy.png",
};

function Steps() {
  const { lang } = useLanguage();

  const steps = [
    {
      icon: UserRound,
      en: "Create your profile",
      ta: "உங்கள் விவரங்களைப் பதிவு செய்யுங்கள்",
      enBody: "Yourself, or on behalf of a son, daughter, brother or sister.",
      taBody: "நீங்களே அல்லது உங்கள் குடும்பத்தினர் சார்பாக.",
    },
    {
      icon: BadgeCheck,
      en: "A moderator reviews it",
      ta: "நடுவர் ஒருவர் சரிபார்ப்பார்",
      enBody: "Every profile is read by a person before it appears. Nothing is automatic.",
      taBody: "ஒவ்வொரு விவரமும் வெளியிடப்படும் முன் ஒருவரால் படிக்கப்படுகிறது.",
    },
    {
      icon: Heart,
      en: "Express interest",
      ta: "விருப்பம் தெரிவியுங்கள்",
      enBody: "Browse and reach out. The other side decides, in their own time.",
      taBody: "பார்த்து விருப்பம் தெரிவியுங்கள். முடிவு அவர்களுடையது.",
    },
    {
      icon: PhoneOff,
      en: "Numbers only on a yes",
      ta: "சம்மதத்திற்குப் பிறகே எண்",
      enBody:
        "Phone numbers are never listed. They are exchanged when both sides agree, and not before.",
      taBody:
        "தொலைபேசி எண்கள் ஒருபோதும் பட்டியலிடப்படுவதில்லை. இருவரும் சம்மதித்தால் மட்டுமே.",
    },
  ];

  return (
    <StaggerList className="grid gap-5 sm:grid-cols-2">
      {steps.map((step, index) => (
        <StaggerItem key={step.en}>
          <div className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <step.icon className="size-5" />
              </span>
              {index < steps.length - 1 && (
                <span className="bg-border mt-2 hidden w-px flex-1 sm:block" />
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-0.5 font-semibold">
                {lang === "ta" ? step.ta : step.en}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {lang === "ta" ? step.taBody : step.enBody}
              </p>
            </div>
          </div>
        </StaggerItem>
      ))}
    </StaggerList>
  );
}

/**
 * Illustrative cards showing the shape of a listing.
 *
 * These are invented people, not members: approved profiles are readable only
 * once you are signed in, and that boundary is the product. Photographs are a
 * blurred crop of the section artwork rather than a face — there is no real
 * photograph to blur here, and putting a stock face on a matrimony landing
 * page implies a listing that does not exist.
 *
 * The row is labelled as an example directly beneath, so nobody reads these as
 * four people they could write to.
 */
const SAMPLE_CARDS = [
  {
    name: "Bellie",
    age: 26,
    role: { en: "Bride", ta: "மணமகள்" },
    town: "Kotagiri",
    line: { en: "B.Sc Nursing · Coimbatore", ta: "பி.எஸ்சி நர்சிங் · கோயம்புத்தூர்" },
    image: IMAGES.tradition,
    position: "object-center",
  },
  {
    name: "Jogi",
    age: 30,
    role: { en: "Groom", ta: "மணமகன்" },
    town: "Coonoor",
    line: { en: "B.E · Bengaluru", ta: "பி.இ · பெங்களூரு" },
    image: IMAGES.hero,
    position: "object-left",
  },
  {
    name: "Hemmi",
    age: 24,
    role: { en: "Bride", ta: "மணமகள்" },
    town: "Ooty",
    line: { en: "M.A English · Teacher", ta: "எம்.ஏ ஆங்கிலம் · ஆசிரியர்" },
    image: IMAGES.privacy,
    position: "object-center",
  },
  {
    name: "Kariya",
    age: 27,
    role: { en: "Groom", ta: "மணமகன்" },
    town: "Kundah",
    line: { en: "Manages the family estate", ta: "குடும்பத் தோட்டம்" },
    image: IMAGES.hero,
    position: "object-right",
  },
];

function SampleRow() {
  const { lang } = useLanguage();

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SAMPLE_CARDS.map((card) => (
          <div
            key={card.name}
            className="bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            <div className="bg-primary/10 relative aspect-[4/5] overflow-hidden">
              {/* Scaled past the edges so the blur has no soft border. */}
              <NextImage
                src={card.image}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 240px"
                className={cn(
                  "scale-110 object-cover blur-md brightness-105 saturate-50",
                  card.position,
                )}
              />
              <div className="from-primary/40 absolute inset-0 bg-gradient-to-t to-transparent" />
              <UserRound className="absolute inset-0 m-auto size-12 text-white/70" />

              <span className="bg-background/90 text-muted-foreground absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                <Lock className="size-2.5" />
                {lang === "ta" ? "மறைக்கப்பட்டது" : "Hidden"}
              </span>
            </div>

            <div className="p-3">
              <p className="font-semibold">
                {card.name}
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {card.age}
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {lang === "ta" ? card.role.ta : card.role.en} · {card.town}
              </p>
              <p className="text-muted-foreground mt-1.5 line-clamp-1 text-xs">
                {lang === "ta" ? card.line.ta : card.line.en}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-center text-sm">
        <Lock className="size-3.5 shrink-0" />
        {lang === "ta"
          ? "இவை எடுத்துக்காட்டுகள். உண்மையான விவரங்கள் உள்நுழைந்தால் மட்டுமே."
          : "Examples of how a listing looks. Real profiles open to signed-in members."}
      </p>
    </div>
  );
}

export function MatrimonyLanding() {
  const { lang } = useLanguage();
  // Always the member area: /matrimony/browse gates itself and sends a signed
  // out visitor to login with the right `next`, so this one href is correct
  // whether or not somebody is signed in.
  const signInHref = "/matrimony/browse";

  return (
    <div>
      {/* ------------------------------- hero ---------------------------- */}
      <section className="relative isolate overflow-hidden">
        {/* Gradient sits on the section itself, so a missing file still reads
            as a deliberate panel rather than a blank box. */}
        <div
          aria-hidden
          className="from-primary/90 absolute inset-0 -z-20 bg-gradient-to-br to-[oklch(0.2_0.05_355)]"
        />

        <NextImage
          src={IMAGES.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          // Biased left of centre: the headline sits on the left, and the
          // artwork's calm area is on that side.
          className="-z-10 object-cover object-[35%_center]"
        />

        {/* Scrim, so white text holds up over any part of the photograph. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,oklch(0.18_0.05_355/0.92)_0%,oklch(0.22_0.06_355/0.72)_45%,oklch(0.3_0.08_340/0.45)_100%)]"
        />

        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <FadeIn className="max-w-2xl">
            <Badge className="border-0 bg-white/15 font-normal text-white backdrop-blur">
              {lang === "ta" ? "RK திருமணம்" : "RK Matrimony"}
            </Badge>

            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-6xl">
              {lang === "ta" ? (
                <span className="font-tamil">
                  மலைநாட்டு குடும்பங்களுக்கான
                  <br />
                  நம்பகமான திருமணத் தகவல்
                </span>
              ) : (
                <>
                  Marriage proposals,
                  <br />
                  the way families here
                  <br />
                  actually make them.
                </>
              )}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              {lang === "ta"
                ? "ஒவ்வொரு விவரமும் ஒருவரால் சரிபார்க்கப்படுகிறது. தொலைபேசி எண்கள் பட்டியலிடப்படுவதில்லை — இருவரும் சம்மதித்தால் மட்டுமே பரிமாறப்படும்."
                : "Every profile read by a person before it appears. Phone numbers never listed — exchanged only when both sides say yes."}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href={signInHref}>
                  {lang === "ta" ? "விவரங்களைப் பதிவு செய்" : "Create your profile"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                asChild
              >
                <Link href={signInHref}>
                  {lang === "ta" ? "உள்நுழை" : "Sign in"}
                </Link>
              </Button>
            </div>

            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {[
                { en: "Free to list", ta: "பதிவு இலவசம்" },
                { en: "Reviewed by a person", ta: "நேரடி சரிபார்ப்பு" },
                { en: "No number without consent", ta: "சம்மதமின்றி எண் இல்லை" },
              ].map((item) => (
                <li key={item.en} className="flex items-center gap-1.5">
                  <Check className="size-3.5" />
                  {lang === "ta" ? item.ta : item.en}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* ---------------------------- how it works ------------------------ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-primary text-sm font-medium">
              {lang === "ta" ? "எப்படி வேலை செய்கிறது" : "How it works"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {lang === "ta"
                ? "நான்கு படிகள். அவசரம் இல்லை."
                : "Four steps. No hurry."}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
              {lang === "ta"
                ? "இது ஒரு அறிமுகச் சேவை, சந்தை அல்ல. முடிவு எப்போதும் குடும்பத்தினருடையது."
                : "This is an introduction service, not a marketplace. The decision always stays with the families."}
            </p>

            <div className="mt-10">
              <Steps />
            </div>
          </div>

          <div className="from-primary/20 to-primary/5 relative hidden aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br lg:block">
            <NextImage
              src={IMAGES.tradition}
              alt=""
              fill
              sizes="360px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------ privacy --------------------------- */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[oklch(0.2_0.05_355)]"
        />
        <NextImage
          src={IMAGES.privacy}
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        {/* Heavy scrim: this band carries body text over a photograph. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[oklch(0.2_0.05_355/0.94)]"
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {lang === "ta"
              ? "தனியுரிமை என்பது இங்கே வெறும் வாக்குறுதி அல்ல"
              : "Privacy here is a mechanism, not a promise"}
          </h2>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                en: "Nothing is public",
                enBody:
                  "Profiles are not readable by the open web or by a search engine. Signing in is the minimum.",
                ta: "எதுவும் பொதுவில் இல்லை",
                taBody:
                  "தேடுபொறிகளுக்கோ பொது இணையத்திற்கோ விவரங்கள் தெரியாது.",
              },
              {
                icon: PhoneOff,
                en: "Numbers are held back",
                enBody:
                  "A phone number is never shown in search or on a profile. It moves only on a mutual accept.",
                ta: "எண்கள் மறைக்கப்படுகின்றன",
                taBody:
                  "இருவரும் சம்மதித்தால் மட்டுமே தொலைபேசி எண் பரிமாறப்படும்.",
              },
              {
                icon: Eye,
                en: "Photos on your terms",
                enBody:
                  "Choose whether photographs are visible to members, or only after you accept an interest.",
                ta: "புகைப்படங்கள் உங்கள் விருப்பப்படி",
                taBody:
                  "புகைப்படங்களை யார் பார்க்கலாம் என்பதை நீங்களே தீர்மானிக்கலாம்.",
              },
            ].map((item) => (
              <div key={item.en}>
                <item.icon className="mb-3 size-5 text-white/80" />
                <h3 className="font-medium text-white">
                  {lang === "ta" ? item.ta : item.en}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  {lang === "ta" ? item.taBody : item.enBody}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ samples --------------------------- */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {lang === "ta" ? "யார் பதிவு செய்துள்ளார்கள்" : "Who is listed"}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl leading-relaxed">
            {lang === "ta"
              ? "மலைநாட்டைச் சேர்ந்த குடும்பங்கள். உள்நுழைந்தால் முழு விவரங்களைப் பார்க்கலாம்."
              : "Families from across the district. Sign in to see the profiles themselves."}
          </p>
        </div>

        <SampleRow />

        <div className="mt-8 flex justify-center">
          <Button size="lg" asChild>
            <Link href={signInHref}>
              {lang === "ta" ? "உள்நுழைந்து பார்" : "Sign in to browse"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ------------------------------ pricing --------------------------- */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {lang === "ta" ? "பதிவு இலவசம்" : "Listing is free"}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-xl leading-relaxed">
              {lang === "ta"
                ? "மேலும் விவரங்களைப் பார்க்கவும் அதிக விருப்பங்களை அனுப்பவும் மட்டுமே கட்டணம்."
                : "You only pay to see more profiles and send more interests. Never to be seen."}
            </p>
          </div>

          <PlanCards onSignInHref={signInHref} />

          <p className="text-muted-foreground mt-6 flex items-start justify-center gap-2 text-center text-xs leading-relaxed">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {lang === "ta"
              ? "தொலைபேசி எண் ஒருபோதும் விற்கப்படுவதில்லை. கட்டணம் செலுத்தினாலும் சம்மதம் தேவை."
              : "The contact reveal is never sold. Paying does not let anyone past a decision that is not theirs to make."}
          </p>
        </div>
      </section>

      {/* -------------------------------- CTA ----------------------------- */}
      <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {lang === "ta" ? "இன்றே தொடங்குங்கள்" : "Start today"}
        </h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {lang === "ta"
            ? "பதிவு செய்ய சில நிமிடங்களே போதும்."
            : "Creating a profile takes a few minutes. A moderator does the rest."}
        </p>
        <Button size="lg" className="mt-7" asChild>
          <Link href={signInHref}>
            {lang === "ta" ? "விவரங்களைப் பதிவு செய்" : "Create your profile"}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
