import type { ArticleStatus } from "./types";

/**
 * Demo newsroom content.
 *
 * Every document seeded from here carries `isSample: true` so it can be found
 * and removed in one action. This matters: the seeder writes to the real
 * Firestore project, and sample stories must never be mistaken for — or quietly
 * outlive — actual reporting.
 *
 * The copy is deliberately generic: no real person is named and no specific
 * event is attributed to a real organisation. It exists to fill the reader
 * pages with something of realistic length and shape, nothing more.
 */

export interface SampleArticle {
  categorySlug: string;
  status: ArticleStatus;
  pinned?: boolean;
  /** Days from today. Negative is in the past. */
  publishOffsetDays: number;
  authorName: string;
  sourceName: string;
  tags: string[];
  youtubeUrl?: string;
  title: string;
  titleTa: string;
  summary: string;
  summaryTa: string;
  body: string;
  bodyTa: string;
}

export const SAMPLE_ARTICLES: SampleArticle[] = [
  {
    categorySlug: "agriculture-tea",
    status: "published",
    pinned: true,
    publishOffsetDays: -1,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["tea", "auction", "prices"],
    title: "Tea auction prices firm up as the monsoon eases",
    titleTa: "பருவமழை குறைந்ததால் தேயிலை ஏல விலை உயர்வு",
    summary:
      "Leaf arriving from the higher estates has improved in quality this fortnight, and buyers are paying for it.",
    summaryTa:
      "மேட்டுப் பகுதி தோட்டங்களிலிருந்து வரும் இலையின் தரம் இந்தப் பதினைந்து நாட்களில் மேம்பட்டுள்ளது.",
    body: "<p>Growers across the district report a steadier fortnight at the auction, with the better leaf from the higher elevations fetching noticeably firmer bids than in the weeks of heavy rain.</p><h2>What changed</h2><p>Estate managers attribute the improvement to a drier spell that allowed plucking rounds to return to schedule. Leaf that reaches the factory within a few hours of plucking holds its quality far better, and the difference shows up in the cup.</p><p>Small growers, who sell through bought-leaf factories, say the improvement has not yet reached them in full. The gap between estate and small-grower realisations remains the season's persistent complaint.</p><h2>What to watch</h2><p>Much depends on whether the dry spell holds through the next plucking round. A sharp return of rain would undo most of the gain.</p>",
    bodyTa:
      "<p>மாவட்டம் முழுவதும் உள்ள விவசாயிகள் ஏலத்தில் நிலையான நிலையைத் தெரிவிக்கின்றனர். மேட்டுப் பகுதிகளிலிருந்து வரும் தரமான இலைக்கு கனமழை காலத்தை விட நல்ல விலை கிடைத்துள்ளது.</p><h2>என்ன மாறியது</h2><p>மழை குறைந்ததால் கொழுந்து பறிக்கும் சுழற்சி சரியான நேரத்திற்குத் திரும்பியது என்று தோட்ட மேலாளர்கள் கூறுகின்றனர். பறித்த சில மணி நேரத்தில் தொழிற்சாலையை அடையும் இலை தரத்தைத் தக்கவைக்கிறது.</p><p>சிறு விவசாயிகளுக்கு இந்த பலன் இன்னும் முழுமையாகச் சென்றடையவில்லை.</p>",
  },
  {
    categorySlug: "local",
    status: "published",
    publishOffsetDays: -2,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["roads", "traffic"],
    title: "Road widening work begins on the Ooty–Coonoor stretch",
    titleTa: "ஊட்டி–குன்னூர் சாலை அகலப்படுத்தும் பணி தொடக்கம்",
    summary:
      "Expect single-lane movement on the affected stretch during working hours for the next few weeks.",
    summaryTa:
      "வரும் சில வாரங்களுக்கு பணி நேரங்களில் ஒரு வழிப் போக்குவரத்து மட்டுமே இருக்கும்.",
    body: "<p>Widening work has started on a stretch of the Ooty–Coonoor road, and traffic is being held to a single lane through the work zone during working hours.</p><p>Drivers heading down in the morning are likely to meet the longest delays, since the school and office rush overlaps with the working window. Those who can shift their travel to the early morning or late evening should do so.</p><h2>What is being done</h2><p>The work covers the carriageway, roadside drains, and the retaining wall on the valley side. Drainage is the part that matters most: a good deal of the damage on this road each monsoon starts with water that has nowhere to go.</p>",
    bodyTa:
      "<p>ஊட்டி–குன்னூர் சாலையின் ஒரு பகுதியில் அகலப்படுத்தும் பணி தொடங்கியுள்ளது. பணி நேரங்களில் ஒரு வழிப் போக்குவரத்து மட்டுமே அனுமதிக்கப்படுகிறது.</p><p>காலை நேரத்தில் செல்பவர்களுக்கு அதிக தாமதம் ஏற்படலாம். முடிந்தவர்கள் அதிகாலை அல்லது மாலை நேரத்தில் பயணிக்கலாம்.</p><h2>என்ன பணி</h2><p>சாலை, ஓரக் கால்வாய்கள் மற்றும் பள்ளத்தாக்குப் பக்கச் சுவர் ஆகியவை இந்தப் பணியில் அடங்கும்.</p>",
  },
  {
    categorySlug: "community",
    status: "published",
    publishOffsetDays: -3,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["culture", "festival"],
    youtubeUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    title: "Festival season begins across the upper villages",
    titleTa: "மேட்டுப் பகுதி கிராமங்களில் பண்டிகைக் காலம் தொடக்கம்",
    summary:
      "Organisers are asking families travelling in to confirm numbers early, with accommodation tight through the season.",
    summaryTa:
      "வெளியூரிலிருந்து வரும் குடும்பங்கள் முன்கூட்டியே எண்ணிக்கையைத் தெரிவிக்குமாறு ஏற்பாட்டாளர்கள் கேட்டுக்கொள்கின்றனர்.",
    body: "<p>Festival preparations have begun across the upper villages, and organisers say early confirmations help them plan seating, food and parking with far less guesswork than last year.</p><h2>For families travelling in</h2><p>Those coming from Coimbatore, Mysuru and Bengaluru are asked to confirm numbers in advance. Accommodation near the venues is limited through the season, and organisers would rather arrange it early than turn people away.</p><p>Volunteers are welcome. Anyone who can help with reception, parking or the kitchen should contact the organisers listed on each event page.</p>",
    bodyTa:
      "<p>மேட்டுப் பகுதி கிராமங்களில் பண்டிகைக்கான ஏற்பாடுகள் தொடங்கியுள்ளன. முன்கூட்டியே உறுதிப்படுத்தினால் இருக்கை, உணவு மற்றும் வாகன நிறுத்தம் ஆகியவற்றைத் திட்டமிடுவது எளிதாகும்.</p><h2>வெளியூரிலிருந்து வருபவர்களுக்கு</h2><p>கோயம்புத்தூர், மைசூரு மற்றும் பெங்களூரிலிருந்து வருபவர்கள் முன்கூட்டியே எண்ணிக்கையைத் தெரிவிக்க வேண்டும்.</p><p>தன்னார்வலர்கள் வரவேற்கப்படுகிறார்கள்.</p>",
  },
  {
    categorySlug: "government",
    status: "published",
    publishOffsetDays: -4,
    authorName: "Staff reporter",
    sourceName: "District Administration",
    tags: ["e-sevai", "certificates"],
    title: "New e-Sevai counter opens, cutting the trip to the taluk office",
    titleTa: "புதிய இ-சேவை மையம் திறப்பு: தாலுகா அலுவலகப் பயணம் தவிர்ப்பு",
    summary:
      "Certificates and applications that previously meant a day's travel can now be handled closer to home.",
    summaryTa:
      "முன்பு ஒரு நாள் பயணம் தேவைப்பட்ட சான்றிதழ்கள் இப்போது அருகிலேயே பெறலாம்.",
    body: "<p>A new e-Sevai counter has opened, and residents can now apply for the common certificates without the trip to the taluk office that this used to require.</p><h2>What you can do there</h2><ul><li>Income, community and nativity certificates</li><li>Birth and death certificate copies</li><li>Applications for welfare scheme enrolment</li></ul><p>Applicants are advised to carry originals along with photocopies. The counter is busiest in the first hour of the morning; going later in the day is usually faster.</p>",
    bodyTa:
      "<p>புதிய இ-சேவை மையம் திறக்கப்பட்டுள்ளது. பொதுவான சான்றிதழ்களுக்கு இனி தாலுகா அலுவலகம் செல்ல வேண்டியதில்லை.</p><h2>கிடைக்கும் சேவைகள்</h2><ul><li>வருமானம், சமூகம் மற்றும் பிறப்பிடச் சான்றிதழ்கள்</li><li>பிறப்பு மற்றும் இறப்புச் சான்றிதழ் நகல்கள்</li><li>நல திட்டப் பதிவு விண்ணப்பங்கள்</li></ul><p>அசல் ஆவணங்களுடன் நகல்களையும் எடுத்துச் செல்ல வேண்டும்.</p>",
  },
  {
    categorySlug: "sports",
    status: "published",
    publishOffsetDays: -6,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["hockey", "tournament", "youth"],
    title: "District hockey tournament opens entries for the new season",
    titleTa: "மாவட்ட ஹாக்கி போட்டி: புதிய பருவத்திற்கான பதிவு தொடக்கம்",
    summary:
      "Teams from the villages and the town clubs can enter until the end of the month.",
    summaryTa:
      "கிராமங்கள் மற்றும் நகர கிளப்புகளைச் சேர்ந்த அணிகள் இந்த மாத இறுதி வரை பதிவு செய்யலாம்.",
    body: "<p>Entries are open for the district hockey tournament, with teams from the villages and the town clubs both eligible.</p><p>Organisers have added a separate under-17 bracket this year after several schools asked for one. Age proof will be checked at registration, so teams should sort their paperwork before the deadline rather than on the morning of the first match.</p><h2>Key dates</h2><ul><li>Entries close at the end of the month</li><li>Draw announced the following week</li><li>Matches on weekends only, so students do not miss class</li></ul>",
    bodyTa:
      "<p>மாவட்ட ஹாக்கி போட்டிக்கான பதிவு தொடங்கியுள்ளது. கிராமங்கள் மற்றும் நகர கிளப்பு அணிகள் பங்கேற்கலாம்.</p><p>பள்ளிகளின் கோரிக்கையை ஏற்று இந்த ஆண்டு 17 வயதுக்குட்பட்டோருக்குத் தனிப் பிரிவு சேர்க்கப்பட்டுள்ளது. வயதுச் சான்று பதிவின்போது சரிபார்க்கப்படும்.</p><h2>முக்கிய தேதிகள்</h2><ul><li>மாத இறுதியில் பதிவு நிறைவு</li><li>அடுத்த வாரம் குலுக்கல் அறிவிப்பு</li><li>வார இறுதி நாட்களில் மட்டும் ஆட்டங்கள்</li></ul>",
  },
  {
    categorySlug: "announcements",
    status: "published",
    publishOffsetDays: -8,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["notice", "water"],
    title: "Notice: water supply interrupted for pipeline repairs",
    titleTa: "அறிவிப்பு: குழாய் பழுதுபார்ப்புக்காக நீர் விநியோகம் நிறுத்தம்",
    summary:
      "Supply will be off for most of the day in the affected wards. Residents are advised to store water the night before.",
    summaryTa:
      "பாதிக்கப்பட்ட வார்டுகளில் நாள் முழுவதும் நீர் விநியோகம் இருக்காது. முந்தைய இரவே நீரைச் சேமிக்குமாறு அறிவுறுத்தப்படுகிறது.",
    body: "<p>Water supply will be interrupted for most of the day in the affected wards while a section of the main pipeline is repaired.</p><h2>What to expect</h2><ul><li>Supply off from early morning until the evening</li><li>Pressure may stay low for a day afterwards</li><li>Tanker supply on request for the worst-affected streets</li></ul><p>Residents are advised to store enough water the night before. Discoloured water in the first hour after supply resumes is normal and should be run off before use.</p>",
    bodyTa:
      "<p>பிரதான குழாயின் ஒரு பகுதி பழுதுபார்க்கப்படுவதால் பாதிக்கப்பட்ட வார்டுகளில் நாள் முழுவதும் நீர் விநியோகம் இருக்காது.</p><h2>என்ன எதிர்பார்க்கலாம்</h2><ul><li>அதிகாலை முதல் மாலை வரை விநியோகம் நிறுத்தம்</li><li>அடுத்த ஒரு நாளுக்கு அழுத்தம் குறைவாக இருக்கலாம்</li><li>அதிகம் பாதிக்கப்பட்ட தெருக்களுக்கு கோரிக்கையின் பேரில் தொட்டி நீர்</li></ul><p>முந்தைய இரவே போதுமான நீரைச் சேமித்து வைக்குமாறு அறிவுறுத்தப்படுகிறது.</p>",
  },
  {
    categorySlug: "obituaries",
    status: "published",
    publishOffsetDays: -10,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["condolence"],
    title: "How to submit an obituary notice",
    titleTa: "இரங்கல் அறிவிப்பு சமர்ப்பிப்பது எப்படி",
    summary:
      "Families can send a notice to the desk for publication. These are the details we need, and how long it takes.",
    summaryTa:
      "குடும்பத்தினர் இரங்கல் அறிவிப்பை ஆசிரியர் குழுவுக்கு அனுப்பலாம்.",
    body: "<p>Families wishing to publish an obituary notice can send the details to the desk, and it will normally appear the same day.</p><h2>What to include</h2><ul><li>Full name, age and village or town</li><li>Date of passing</li><li>Time and place of the funeral, if it has been arranged</li><li>A contact number the desk can call to confirm</li></ul><p>Notices are published without charge. The desk confirms every notice by telephone before it goes out.</p>",
    bodyTa:
      "<p>இரங்கல் அறிவிப்பை வெளியிட விரும்பும் குடும்பத்தினர் விவரங்களை ஆசிரியர் குழுவுக்கு அனுப்பலாம்; பொதுவாக அதே நாளில் வெளியிடப்படும்.</p><h2>தேவையான விவரங்கள்</h2><ul><li>முழுப் பெயர், வயது மற்றும் ஊர்</li><li>மறைந்த தேதி</li><li>இறுதிச் சடங்கின் நேரம் மற்றும் இடம்</li><li>உறுதிப்படுத்த ஒரு தொடர்பு எண்</li></ul><p>அறிவிப்புகள் கட்டணமின்றி வெளியிடப்படுகின்றன.</p>",
  },
  {
    categorySlug: "local",
    status: "scheduled",
    publishOffsetDays: 2,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["weather", "rain"],
    title: "Weekend rain expected across the higher reaches",
    titleTa: "வார இறுதியில் மேட்டுப் பகுதிகளில் மழைக்கு வாய்ப்பு",
    summary:
      "Travellers on the ghat roads should plan for reduced visibility, particularly after dark.",
    summaryTa:
      "மலைச் சாலைகளில் பயணிப்பவர்கள் குறைந்த தெரிவுநிலைக்குத் தயாராக இருக்க வேண்டும்.",
    body: "<p>Rain is expected across the higher reaches over the weekend. Visibility on the ghat roads drops quickly once the mist sets in, and it is worst after dark.</p><p>Anyone driving down should keep to the low beam, since full beam in mist reflects straight back and makes things worse. Leave more room than usual behind the vehicle in front.</p>",
    bodyTa:
      "<p>வார இறுதியில் மேட்டுப் பகுதிகளில் மழை பெய்ய வாய்ப்புள்ளது. மூடுபனி சூழ்ந்தால் மலைச் சாலைகளில் தெரிவுநிலை வேகமாகக் குறையும்.</p><p>மூடுபனியில் முழு ஒளிக்கற்றை பிரதிபலித்து மேலும் சிரமம் தரும் என்பதால் குறைந்த ஒளிக்கற்றையையே பயன்படுத்த வேண்டும்.</p>",
  },
  {
    categorySlug: "community",
    status: "in_review",
    publishOffsetDays: 0,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["education", "students"],
    title: "Students from the district clear their board examinations",
    titleTa: "மாவட்ட மாணவர்கள் பொதுத் தேர்வில் வெற்றி",
    summary:
      "Schools across the taluks report steady results, with several first-generation learners among those who did well.",
    summaryTa:
      "தாலுகாக்கள் முழுவதும் உள்ள பள்ளிகள் நிலையான தேர்வு முடிவுகளைத் தெரிவிக்கின்றன.",
    body: "<p>Schools across the taluks have reported their board results, and headmasters describe the year as a steady one.</p><p>Several of those who did well are first-generation learners, and teachers point to the after-school study centres run by local committees as part of the reason.</p><p><em>Draft submitted for review. Names and figures to be confirmed with the schools before publication.</em></p>",
    bodyTa:
      "<p>தாலுகாக்கள் முழுவதும் உள்ள பள்ளிகள் பொதுத் தேர்வு முடிவுகளைத் தெரிவித்துள்ளன.</p><p>சிறப்பாகத் தேர்ச்சி பெற்றவர்களில் பலர் தங்கள் குடும்பத்தில் முதல் தலைமுறைப் பயில்பவர்கள் ஆவர்.</p>",
  },
  {
    categorySlug: "agriculture-tea",
    status: "draft",
    publishOffsetDays: 0,
    authorName: "Staff reporter",
    sourceName: "RK Matrimony",
    tags: ["vegetables", "market"],
    title: "Vegetable growers ask for a closer collection centre",
    titleTa: "காய்கறி விவசாயிகள் அருகில் கொள்முதல் மையம் கோரிக்கை",
    summary:
      "Carrot and potato growers say the distance to the existing centre eats into what little margin they have.",
    summaryTa:
      "கேரட் மற்றும் உருளைக்கிழங்கு விவசாயிகள் தூரம் அதிகம் என்று கூறுகின்றனர்.",
    body: "<p>Growers in the upper villages have asked for a collection centre closer to their fields, saying the present distance costs them both time and produce.</p><p><em>Draft. Needs quotes from the growers and a response from the horticulture department before this can go out.</em></p>",
    bodyTa:
      "<p>மேட்டுப் பகுதி கிராமங்களைச் சேர்ந்த விவசாயிகள் தங்கள் வயல்களுக்கு அருகில் கொள்முதல் மையம் அமைக்கக் கோரியுள்ளனர்.</p>",
  },
];

/** Gradient pairs used to generate a placeholder lead image per category. */
export const CATEGORY_ARTWORK: Record<string, [string, string]> = {
  local: ["#1f6140", "#2f7f57"],
  community: ["#8a4b1f", "#c07a34"],
  government: ["#274b6d", "#3b6c95"],
  "agriculture-tea": ["#2c6b34", "#5a9440"],
  sports: ["#6d3a5f", "#96547f"],
  obituaries: ["#3f4a48", "#5c6b68"],
  announcements: ["#8a6a1f", "#bc9538"],
};
