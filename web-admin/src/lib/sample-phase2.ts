import type { EventDraft } from "@/lib/api/events";
import type { EventStatus } from "@/lib/types";

/**
 * Demo events and songs.
 *
 * Organiser phone numbers are deliberately left blank. India has no reserved
 * "fictional" dialling range, so any plausible-looking number in sample data is
 * somebody's real phone.
 */

export interface SampleEvent extends Omit<EventDraft, "startsAt" | "endsAt" | "poster"> {
  status: EventStatus;
  /** Days from today. */
  startOffsetDays: number;
  startHour: number;
  durationHours: number;
  artwork: { from: string; to: string; eyebrow: string };
}

export const SAMPLE_EVENTS: SampleEvent[] = [
  {
    title: "Village temple festival, three days of music and processions",
    titleTa: "கிராமக் கோவில் திருவிழா: மூன்று நாள் இசையும் ஊர்வலமும்",
    description:
      "The annual temple festival runs over three days, with music each evening and the procession on the final night.\n\nParking near the temple is limited. Visitors are asked to use the ground below the bus stop and walk up, and to keep the approach road clear for the procession.",
    descriptionTa:
      "ஆண்டு கோவில் திருவிழா மூன்று நாட்கள் நடைபெறும். ஒவ்வொரு மாலையும் இசை நிகழ்ச்சி, இறுதி நாள் இரவு ஊர்வலம்.\n\nகோவில் அருகே வாகன நிறுத்தம் குறைவு. பேருந்து நிறுத்தத்திற்கு கீழுள்ள மைதானத்தைப் பயன்படுத்துமாறு கேட்டுக்கொள்ளப்படுகிறது.",
    category: "festival",
    venue: "Village temple ground",
    venueTa: "கிராமக் கோவில் மைதானம்",
    mapUrl: "",
    organiserName: "Festival committee",
    organiserPhone: "",
    recurrence: "annual",
    status: "published",
    startOffsetDays: 9,
    startHour: 17,
    durationHours: 5,
    artwork: { from: "#8a4b1f", to: "#c07a34", eyebrow: "Festival" },
  },
  {
    title: "Ward meeting on the pipeline repairs",
    titleTa: "குழாய் பழுதுபார்ப்பு குறித்த வார்டுக் கூட்டம்",
    description:
      "An open meeting on the pipeline work and the supply schedule that follows it. Residents of the affected wards are welcome.\n\nBring your water bill if you want a specific connection looked at.",
    descriptionTa:
      "குழாய் பணி மற்றும் அதன் பின் நீர் விநியோக அட்டவணை குறித்த திறந்த கூட்டம். பாதிக்கப்பட்ட வார்டு மக்கள் கலந்து கொள்ளலாம்.\n\nஒரு குறிப்பிட்ட இணைப்பு குறித்துப் பேச விரும்பினால் நீர்க் கட்டண ரசீதைக் கொண்டு வரவும்.",
    category: "meeting",
    venue: "Community hall",
    venueTa: "சமுதாயக் கூடம்",
    mapUrl: "",
    organiserName: "Ward office",
    organiserPhone: "",
    recurrence: "none",
    status: "published",
    startOffsetDays: 4,
    startHour: 11,
    durationHours: 2,
    artwork: { from: "#274b6d", to: "#4d82b3", eyebrow: "Meeting" },
  },
  {
    title: "District hockey tournament, opening round",
    titleTa: "மாவட்ட ஹாக்கி போட்டி: தொடக்கச் சுற்று",
    description:
      "The opening round of the district tournament, with village and town club teams in both the open and under-17 brackets.\n\nMatches run through the day. Entry is free for spectators.",
    descriptionTa:
      "மாவட்டப் போட்டியின் தொடக்கச் சுற்று. கிராம மற்றும் நகர கிளப்பு அணிகள் திறந்த மற்றும் 17 வயதுக்குட்பட்ட பிரிவுகளில் பங்கேற்கின்றன.\n\nநாள் முழுவதும் ஆட்டங்கள். பார்வையாளர்களுக்கு நுழைவு இலவசம்.",
    category: "sports",
    venue: "Government higher secondary school ground",
    venueTa: "அரசு மேல்நிலைப் பள்ளி மைதானம்",
    mapUrl: "",
    organiserName: "Tournament organisers",
    organiserPhone: "",
    recurrence: "none",
    status: "published",
    startOffsetDays: 16,
    startHour: 9,
    durationHours: 8,
    artwork: { from: "#6d3a5f", to: "#96547f", eyebrow: "Sports" },
  },
  {
    title: "Badaga folk music evening",
    titleTa: "படகு நாட்டுப்புற இசை மாலை",
    description:
      "An evening of traditional singing and dance, with performers from across the district.\n\nSeating is on the floor with a limited number of chairs at the back for elders.",
    descriptionTa:
      "மாவட்டம் முழுவதிலுமிருந்து கலைஞர்கள் பங்கேற்கும் பாரம்பரிய இசை மற்றும் நடன மாலை.\n\nதரையில் அமரும் வசதி; முதியவர்களுக்கு பின்புறம் சில நாற்காலிகள்.",
    category: "cultural",
    venue: "Town cultural centre",
    venueTa: "நகர கலை அரங்கம்",
    mapUrl: "",
    organiserName: "Cultural centre",
    organiserPhone: "",
    recurrence: "none",
    status: "published",
    startOffsetDays: 6,
    startHour: 18,
    durationHours: 3,
    artwork: { from: "#2c6b34", to: "#5a9440", eyebrow: "Cultural" },
  },
  {
    title: "Weekly farmers market",
    titleTa: "வாராந்திர விவசாயிகள் சந்தை",
    description:
      "Growers sell direct: carrots, potatoes, beans, greens and cut flowers, with no commission agent in between.\n\nEarly morning is the best time for the freshest produce.",
    descriptionTa:
      "விவசாயிகள் நேரடி விற்பனை: கேரட், உருளைக்கிழங்கு, பீன்ஸ், கீரை மற்றும் பூக்கள். இடைத்தரகர் இல்லை.\n\nபுதிய காய்கறிகளுக்கு அதிகாலை நேரமே சிறந்தது.",
    category: "meeting",
    venue: "Market ground, near the bus stand",
    venueTa: "பேருந்து நிலையம் அருகில் சந்தை மைதானம்",
    mapUrl: "",
    organiserName: "Market committee",
    organiserPhone: "",
    recurrence: "weekly",
    status: "published",
    startOffsetDays: 2,
    startHour: 6,
    durationHours: 5,
    artwork: { from: "#2c6b34", to: "#77a83f", eyebrow: "Market" },
  },
  {
    title: "Free eye camp with screening and spectacles",
    titleTa: "இலவச கண் மருத்துவ முகாம்: பரிசோதனை மற்றும் கண்ணாடி",
    description:
      "Screening for cataract and refractive errors, with spectacles issued on the day where required.\n\nBring an identity document. Those referred for surgery will be given a follow-up date.",
    descriptionTa:
      "கண்புரை மற்றும் பார்வைக் கோளாறு பரிசோதனை. தேவைப்படுவோருக்கு அன்றே கண்ணாடி வழங்கப்படும்.\n\nஅடையாள ஆவணம் கொண்டு வரவும். அறுவை சிகிச்சைக்கு பரிந்துரைக்கப்படுபவர்களுக்கு அடுத்த தேதி வழங்கப்படும்.",
    category: "meeting",
    venue: "Primary health centre",
    venueTa: "ஆரம்ப சுகாதார நிலையம்",
    mapUrl: "",
    organiserName: "Health centre",
    organiserPhone: "",
    recurrence: "none",
    status: "draft",
    startOffsetDays: 21,
    startHour: 9,
    durationHours: 6,
    artwork: { from: "#8a6a1f", to: "#bc9538", eyebrow: "Health" },
  },
];

/* -------------------------------------------------------------------------- */
/*  Songs                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Real Badaga music from YouTube.
 *
 * Every id below was checked against YouTube's oEmbed endpoint before being
 * added here — a candidate that did not resolve was dropped rather than seeded
 * as a broken player. Nothing is re-hosted: the app embeds the official player,
 * so views and any revenue stay with the uploader.
 */
export interface SampleSong {
  youtubeId: string;
  title: string;
  titleTa: string;
  artistName: string;
  playlistSlug: "devotional" | "folk" | "film" | "wedding" | "new-releases";
  isNewRelease: boolean;
}

export const SAMPLE_SONGS: SampleSong[] = [
  {
    youtubeId: "RI1sVb2309s",
    title: "Nera Sedhu Baa",
    titleTa: "நேர செது பா",
    artistName: "HOSA RAAGA",
    playlistSlug: "new-releases",
    isNewRelease: true,
  },
  {
    youtubeId: "k-gcQj-Uwdw",
    title: "Devathai",
    titleTa: "தேவதை",
    artistName: "BBH Productions",
    playlistSlug: "film",
    isNewRelease: false,
  },
  {
    youtubeId: "LGWDYK8vTvA",
    title: "Jil Jung Juk",
    titleTa: "ஜில் ஜங் ஜுக்",
    artistName: "Mountain Bulls Studio",
    playlistSlug: "film",
    isNewRelease: false,
  },
  {
    youtubeId: "Mer6-85SrkI",
    title: "Singaranae",
    titleTa: "சிங்காரனே",
    artistName: "BMW Production",
    playlistSlug: "folk",
    isNewRelease: false,
  },
  {
    youtubeId: "mGX7NReHBzU",
    title: "Traditional Badaga dance",
    titleTa: "பாரம்பரிய படகு நடனம்",
    artistName: "Senthilkumars3",
    playlistSlug: "folk",
    isNewRelease: false,
  },
  {
    youtubeId: "iatEhW1Byy8",
    title: "Porthy band troop",
    titleTa: "பொர்த்தி இசைக் குழு",
    artistName: "Hillstation43",
    playlistSlug: "wedding",
    isNewRelease: false,
  },
  {
    youtubeId: "4kC5m3qXfTI",
    title: "Top 20 Badaga hits",
    titleTa: "சிறந்த 20 படகு பாடல்கள்",
    artistName: "SathiyaKathi Hethae",
    playlistSlug: "folk",
    isNewRelease: false,
  },
];
