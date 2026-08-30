import type { AdDraft } from "@/lib/api/ads";
import type { PollDraft } from "@/lib/api/polls";

/**
 * Demo poll and ad campaign, seeded alongside the sample stories.
 *
 * Every link points at example.com, a reserved domain that can never belong to
 * a real business. Combined with the isSample flag and the non-removable
 * "Advertisement" label, that makes it impossible for a demo booking to be
 * mistaken for a real advertiser's campaign.
 */

export const SAMPLE_POLL: PollDraft = {
  question: "Should the district sports day be held in April?",
  questionTa: "மாவட்ட விளையாட்டு நாள் ஏப்ரல் மாதம் நடத்தப்பட வேண்டுமா?",
  options: [
    { id: "opt1", label: "Yes, April suits most families", labelTa: "ஆம், ஏப்ரல் பொருத்தமானது" },
    { id: "opt2", label: "No, wait until after the monsoon", labelTa: "இல்லை, மழைக்குப் பிறகு" },
    { id: "opt3", label: "Hold it twice a year", labelTa: "ஆண்டுக்கு இருமுறை நடத்தலாம்" },
  ],
  placement: "both",
  closesAt: null,
};

export interface SampleAd extends Omit<AdDraft, "image"> {
  /** Drives the generated placeholder artwork. */
  artwork: {
    width: number;
    height: number;
    from: string;
    to: string;
    eyebrow: string;
  };
}

export const SAMPLE_ADS: SampleAd[] = [
  {
    name: "Tea boutique — banner",
    advertiser: "Nilgiri Tea Boutique",
    format: "banner",
    placement: "home_top",
    headline: "Estate-fresh tea, dispatched the day it is packed",
    headlineTa: "தோட்டத்து புதிய தேயிலை, பொதி செய்த அன்றே அனுப்பப்படும்",
    body: "Single-estate leaf from the higher slopes, sold direct.",
    bodyTa: "மேட்டுப் பகுதி தோட்டங்களிலிருந்து நேரடி விற்பனை.",
    ctaLabel: "Browse the range",
    ctaUrl: "https://example.com",
    weight: 2,
    startsAt: null,
    endsAt: null,
    delaySeconds: 5,
    frequency: "once_per_day",
    artwork: {
      width: 900,
      height: 400,
      from: "#1f6140",
      to: "#4f9b63",
      eyebrow: "Tea",
    },
  },
  {
    name: "Tutorial centre — in-feed",
    advertiser: "Hills Tutorial Centre",
    format: "inline",
    placement: "home_feed",
    headline: "Evening coaching for board examinations",
    headlineTa: "பொதுத் தேர்வுக்கான மாலைநேர பயிற்சி வகுப்புகள்",
    body: "Small batches, taught in Tamil and English, close to the bus stand.",
    bodyTa: "சிறிய குழுக்கள், தமிழ் மற்றும் ஆங்கிலத்தில் பயிற்சி.",
    ctaLabel: "See the timetable",
    ctaUrl: "https://example.com",
    weight: 1,
    startsAt: null,
    endsAt: null,
    delaySeconds: 5,
    frequency: "once_per_day",
    artwork: {
      width: 800,
      height: 450,
      from: "#274b6d",
      to: "#4d82b3",
      eyebrow: "Education",
    },
  },
  {
    name: "Nursery — sidebar",
    advertiser: "Blue Mountain Nursery",
    format: "sidebar",
    placement: "home_sidebar",
    headline: "Saplings for the planting season",
    headlineTa: "நடவுப் பருவத்திற்கான நாற்றுகள்",
    body: "Native shade trees and flowering plants, raised on the plateau.",
    bodyTa: "பீடபூமியில் வளர்க்கப்பட்ட நிழல் மரங்கள் மற்றும் பூச்செடிகள்.",
    ctaLabel: "Visit the nursery",
    ctaUrl: "https://example.com",
    weight: 1,
    startsAt: null,
    endsAt: null,
    delaySeconds: 5,
    frequency: "once_per_day",
    artwork: {
      width: 700,
      height: 700,
      from: "#2c6b34",
      to: "#77a83f",
      eyebrow: "Garden",
    },
  },
  {
    name: "Travels — article sidebar",
    advertiser: "Coonoor Travels",
    format: "sidebar",
    placement: "article_sidebar",
    headline: "Daily coach to Coimbatore and Mysuru",
    headlineTa: "கோயம்புத்தூர் மற்றும் மைசூருக்கு தினசரி பேருந்து",
    body: "Booked seats, early morning and evening departures.",
    bodyTa: "முன்பதிவு இருக்கைகள், அதிகாலை மற்றும் மாலை புறப்பாடு.",
    ctaLabel: "Check timings",
    ctaUrl: "https://example.com",
    weight: 1,
    startsAt: null,
    endsAt: null,
    delaySeconds: 5,
    frequency: "once_per_day",
    artwork: {
      width: 700,
      height: 700,
      from: "#6d3a5f",
      to: "#a8709a",
      eyebrow: "Travel",
    },
  },
  {
    name: "WhatsApp headlines — popup",
    advertiser: "RK Matrimony",
    format: "popup",
    placement: "popup",
    headline: "Get the day's headlines on WhatsApp",
    headlineTa: "தினசரி தலைப்புச் செய்திகள் வாட்ஸ்அப்பில்",
    body: "One message a day, the stories that matter, nothing else.",
    bodyTa: "ஒரு நாளைக்கு ஒரு செய்தி, முக்கியமான தலைப்புகள் மட்டும்.",
    ctaLabel: "Join the list",
    ctaUrl: "https://example.com",
    weight: 1,
    startsAt: null,
    endsAt: null,
    // Long enough that the reader gets to the page first, short enough to see
    // while testing.
    delaySeconds: 6,
    frequency: "once_per_session",
    artwork: {
      width: 800,
      height: 450,
      from: "#8a6a1f",
      to: "#c9a44a",
      eyebrow: "RK Matrimony",
    },
  },
];
