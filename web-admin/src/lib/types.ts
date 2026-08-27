import type { Timestamp } from "firebase/firestore";

/* -------------------------------------------------------------------------- */
/*  Roles                                                                      */
/* -------------------------------------------------------------------------- */

export const ROLES = [
  "super_admin",
  "editor",
  "contributor",
  "playlist_manager",
  "matrimony_moderator",
  "member",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  contributor: "Contributor",
  playlist_manager: "Playlist Manager",
  matrimony_moderator: "Matrimony Moderator",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full access, including user management and app settings.",
  editor: "Publishes news and events, approves contributor submissions.",
  contributor: "Writes and submits articles; sees only their own drafts.",
  playlist_manager: "Manages songs, playlists and artist pages only.",
  matrimony_moderator: "Reviews matrimony profiles and reports. No news access.",
  member:
    "A reader. Can use matrimony and vote in polls; no access to the desk at all.",
};

/* -------------------------------------------------------------------------- */
/*  Editorial workflow                                                         */
/* -------------------------------------------------------------------------- */

export const ARTICLE_STATUSES = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "rejected",
  "unpublished",
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  rejected: "Rejected",
  unpublished: "Unpublished",
};

/* -------------------------------------------------------------------------- */
/*  Documents                                                                  */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: Role;
  disabled: boolean;
  createdAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
}

export interface Category {
  id: string;
  name: string;
  nameTa: string;
  slug: string;
  /** Drives tab order in the mobile feed. */
  order: number;
  active: boolean;
  articleCount?: number;
  createdAt?: Timestamp | null;
}

export interface ArticleImage {
  url: string;
  path: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Article {
  id: string;
  title: string;
  titleTa: string;
  slug: string;
  summary: string;
  summaryTa: string;
  /** Tiptap HTML. */
  body: string;
  bodyTa: string;
  categoryId: string;
  tags: string[];
  /** Max 5, enforced in the uploader and in Firestore rules. */
  images: ArticleImage[];
  youtubeUrl: string | null;
  sourceName: string;
  authorName: string;

  status: ArticleStatus;
  pinned: boolean;
  commentsEnabled: boolean;

  publishAt: Timestamp | null;
  publishedAt: Timestamp | null;

  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;

  /** Editor's note shown to the contributor when a submission is rejected. */
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;

  viewCount: number;
  shareCount: number;
}

/** The shape the article form works with — no server timestamps, no ids. */
export type ArticleDraft = Pick<
  Article,
  | "title"
  | "titleTa"
  | "slug"
  | "summary"
  | "summaryTa"
  | "body"
  | "bodyTa"
  | "categoryId"
  | "tags"
  | "images"
  | "youtubeUrl"
  | "sourceName"
  | "authorName"
  | "pinned"
  | "commentsEnabled"
> & {
  publishAt: Date | null;
};

export interface ActivityEntry {
  id: string;
  articleId: string;
  articleTitle: string;
  action:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "rejected"
    | "published"
    | "unpublished"
    | "scheduled"
    | "deleted";
  actorId: string;
  actorName: string;
  note?: string | null;
  at: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/*  Polls                                                                      */
/* -------------------------------------------------------------------------- */

export const POLL_STATUSES = ["draft", "active", "closed"] as const;
export type PollStatus = (typeof POLL_STATUSES)[number];

export const POLL_STATUS_LABELS: Record<PollStatus, string> = {
  draft: "Draft",
  active: "Running",
  closed: "Closed",
};

export interface PollOption {
  id: string;
  label: string;
  labelTa: string;
}

export interface Poll {
  id: string;
  question: string;
  questionTa: string;
  options: PollOption[];
  /** optionId -> count. A map, not an array, so a vote is a single increment. */
  counts: Record<string, number>;
  totalVotes: number;
  status: PollStatus;
  /** Where the reader site shows it. */
  placement: "sidebar" | "article" | "both";
  closesAt: Timestamp | null;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/*  Advertising                                                                */
/* -------------------------------------------------------------------------- */

export const AD_FORMATS = ["banner", "inline", "sidebar", "popup"] as const;
export type AdFormat = (typeof AD_FORMATS)[number];

export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  banner: "Wide banner",
  inline: "In-feed card",
  sidebar: "Sidebar box",
  popup: "Popup",
};

export const AD_FORMAT_HINTS: Record<AdFormat, string> = {
  banner: "Full-width strip above the feed or article. Best for a 1200x300 image.",
  inline: "Sits between stories in the feed, styled like a card but clearly labelled.",
  sidebar: "Square-ish box beside the feed. Best for a 600x600 image.",
  popup: "Overlays the page after a delay. Shown at most once per reader per day.",
};

export const AD_PLACEMENTS = [
  "home_top",
  "home_feed",
  "home_sidebar",
  "article_top",
  "article_end",
  "article_sidebar",
  "popup",
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  home_top: "Home — above the feed",
  home_feed: "Home — inside the feed",
  home_sidebar: "Home — sidebar",
  article_top: "Article — under the headline",
  article_end: "Article — after the story",
  article_sidebar: "Article — sidebar",
  popup: "Popup — any page",
};

/** Which formats make sense in which slot. Enforced by the ad form. */
export const PLACEMENT_FORMATS: Record<AdPlacement, AdFormat[]> = {
  home_top: ["banner"],
  home_feed: ["inline"],
  home_sidebar: ["sidebar"],
  article_top: ["banner"],
  article_end: ["banner", "inline"],
  article_sidebar: ["sidebar"],
  popup: ["popup"],
};

export const AD_STATUSES = ["draft", "active", "paused"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  draft: "Draft",
  active: "Running",
  paused: "Paused",
};

export interface Ad {
  id: string;
  /** Internal name, never shown to readers. */
  name: string;
  advertiser: string;
  format: AdFormat;
  placement: AdPlacement;

  headline: string;
  headlineTa: string;
  body: string;
  bodyTa: string;
  ctaLabel: string;
  ctaUrl: string;

  image: ArticleImage | null;

  status: AdStatus;
  /** Higher wins more often when several ads compete for one slot. */
  weight: number;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;

  /** Popup only. */
  delaySeconds: number;
  frequency: "once_per_day" | "once_per_session" | "every_visit";

  impressions: number;
  clicks: number;

  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/*  Story carousels                                                            */
/* -------------------------------------------------------------------------- */

export const CAROUSEL_PLACEMENTS = [
  "home_top",
  "home_after_hero",
  "home_feed",
  "home_bottom",
  "article_end",
] as const;

export type CarouselPlacement = (typeof CAROUSEL_PLACEMENTS)[number];

export const CAROUSEL_PLACEMENT_LABELS: Record<CarouselPlacement, string> = {
  home_top: "Home — above the lead story",
  home_after_hero: "Home — under the lead story",
  home_feed: "Home — inside the feed",
  home_bottom: "Home — below the feed",
  article_end: "Article — after the story",
};

export const CAROUSEL_STATUSES = ["draft", "active"] as const;
export type CarouselStatus = (typeof CAROUSEL_STATUSES)[number];

/** Hard cap on curated stories: past this, a carousel stops being a selection. */
export const MAX_CAROUSEL_STORIES = 10;

export interface StoryCarousel {
  id: string;
  /** Internal name, never shown to readers. */
  name: string;
  /** Optional heading above the carousel, e.g. "Editor's picks". */
  title: string;
  titleTa: string;
  /** Curated, ordered. Not a query — an editor picks these by hand. */
  articleIds: string[];
  placement: CarouselPlacement;
  status: CarouselStatus;
  autoplay: boolean;
  intervalSeconds: number;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* ========================================================================== */
/*  PHASE 2                                                                    */
/* ========================================================================== */

/* -------------------------------- Events ---------------------------------- */

export const EVENT_CATEGORIES = [
  "festival",
  "meeting",
  "function",
  "sports",
  "cultural",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: "Festival",
  meeting: "Public meeting",
  function: "Wedding / function",
  sports: "Sports",
  cultural: "Cultural",
};

export const EVENT_CATEGORY_LABELS_TA: Record<EventCategory, string> = {
  festival: "பண்டிகை",
  meeting: "பொதுக் கூட்டம்",
  function: "திருமணம் / விழா",
  sports: "விளையாட்டு",
  cultural: "கலை நிகழ்ச்சி",
};

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const RECURRENCE_OPTIONS = ["none", "weekly", "monthly", "annual"] as const;
export type Recurrence = (typeof RECURRENCE_OPTIONS)[number];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "One-off",
  weekly: "Every week",
  monthly: "Every month",
  annual: "Every year",
};

export interface EventItem {
  id: string;
  title: string;
  titleTa: string;
  description: string;
  descriptionTa: string;
  category: EventCategory;

  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  /** Free text: a village venue rarely has a postal address. */
  venue: string;
  venueTa: string;
  /** Pasted Google Maps link; never parsed, only linked. */
  mapUrl: string;

  organiserName: string;
  organiserPhone: string;

  poster: ArticleImage | null;

  recurrence: Recurrence;
  status: EventStatus;
  /** Set by the archive sweep once the event is over. */
  archived: boolean;

  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* ------------------------------ Songs & video ----------------------------- */

export interface Artist {
  id: string;
  name: string;
  nameTa: string;
  bio: string;
  bioTa: string;
  photoUrl: string | null;
  songCount?: number;
  createdAt: Timestamp | null;
}

export interface Song {
  id: string;
  title: string;
  titleTa: string;
  /** The 11-character YouTube id. Everything else is derived from it. */
  youtubeId: string;
  thumbnailUrl: string;
  artistId: string | null;
  artistName: string;
  playlistIds: string[];
  isNewRelease: boolean;
  order: number;
  createdBy: string;
  createdAt: Timestamp | null;
}

export interface Playlist {
  id: string;
  name: string;
  nameTa: string;
  description: string;
  coverUrl: string | null;
  order: number;
  active: boolean;
  songCount?: number;
  createdAt: Timestamp | null;
}

/* ----------------------------- Notifications ------------------------------ */

export const NOTIFICATION_AUDIENCES = [
  "all",
  "news",
  "events",
  "songs",
] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  all: "Everyone",
  news: "News subscribers",
  events: "Event subscribers",
  songs: "Song subscribers",
};

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface NotificationMessage {
  id: string;
  title: string;
  titleTa: string;
  body: string;
  bodyTa: string;
  audience: NotificationAudience;
  /** Optional deep link, e.g. an article id. */
  targetType: "none" | "article" | "event" | "song";
  targetId: string | null;

  status: NotificationStatus;
  /** Filled in by the dispatcher, not by this app. */
  sentAt: Timestamp | null;
  deliveredCount: number;
  openedCount: number;
  failureReason: string | null;

  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
}

/* -------------------------------- Settings -------------------------------- */

export interface AppSettings {
  aboutTitle: string;
  aboutBody: string;
  aboutBodyTa: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  /** Android versionCode below this is forced to update. */
  minAndroidVersion: number;
  forceUpdate: boolean;
  updateMessage: string;
  playStoreUrl: string;
  updatedAt: Timestamp | null;
  updatedBy: string | null;
}

export const DEFAULT_SETTINGS: Omit<AppSettings, "updatedAt" | "updatedBy"> = {
  aboutTitle: "About Nilgiri News",
  aboutBody: "",
  aboutBodyTa: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  minAndroidVersion: 1,
  forceUpdate: false,
  updateMessage: "A newer version of the app is available.",
  playStoreUrl: "",
};

/* ========================================================================== */
/*  MATRIMONY                                                                  */
/* ========================================================================== */

export const MATRIMONY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "paused",
  "married",
] as const;
export type MatrimonyStatus = (typeof MATRIMONY_STATUSES)[number];

export const MATRIMONY_STATUS_LABELS: Record<MatrimonyStatus, string> = {
  pending: "Awaiting review",
  approved: "Live",
  rejected: "Sent back",
  paused: "Paused",
  married: "Marriage fixed",
};

export const POSTED_BY = ["self", "parent", "sibling", "relative"] as const;
export type PostedBy = (typeof POSTED_BY)[number];

export const POSTED_BY_LABELS: Record<PostedBy, string> = {
  self: "Myself",
  parent: "Parent",
  sibling: "Sibling",
  relative: "Relative",
};

export const MARITAL_STATUSES = [
  "never_married",
  "divorced",
  "widowed",
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  never_married: "Never married",
  divorced: "Divorced",
  widowed: "Widowed",
};

export const DIETS = ["vegetarian", "non_vegetarian", "eggetarian"] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  vegetarian: "Vegetarian",
  non_vegetarian: "Non-vegetarian",
  eggetarian: "Eggetarian",
};

/**
 * Photo visibility has exactly two settings on purpose.
 *
 * An earlier draft had a "blurred" option. A CSS blur is not privacy — the
 * image URL is still in the page — so it was dropped rather than shipped as
 * security theatre. Restricted photos are held in the private subcollection and
 * their URLs are never sent to a browser that has not earned them.
 */
export const PHOTO_VISIBILITY = ["members", "on_accept"] as const;
export type PhotoVisibility = (typeof PHOTO_VISIBILITY)[number];

export const PHOTO_VISIBILITY_LABELS: Record<PhotoVisibility, string> = {
  members: "Visible to signed-in members",
  on_accept: "Only after an accepted interest",
};

/** Legal minimum marriage age in India, enforced when a profile is saved. */
export const MIN_AGE_BY_GENDER: Record<"male" | "female", number> = {
  male: 21,
  female: 18,
};

export interface MatrimonyProfile {
  /** Always equals the owner's uid: one profile per account, enforced by rules. */
  id: string;
  ownerUid: string;
  postedBy: PostedBy;

  name: string;
  gender: "male" | "female";
  dob: Timestamp | null;
  birthTime: string;
  birthPlace: string;

  heightCm: number;
  maritalStatus: MaritalStatus;
  diet: Diet;
  education: string;
  occupation: string;
  workLocation: string;
  hometown: string;
  motherTongue: string;
  about: string;

  fatherOccupation: string;
  motherOccupation: string;
  siblings: string;

  photoVisibility: PhotoVisibility;
  /** Only populated when photoVisibility is "members". */
  photos: ArticleImage[];
  hasPhotos: boolean;

  status: MatrimonyStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;

  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  viewCount: number;
}

/** Phone, email and restricted photos. Never on the public document. */
export interface MatrimonyContact {
  phone: string;
  email: string;
  photos: ArticleImage[];
  horoscopeNote: string;
  /**
   * A photograph of the jathagam, uploaded from the app.
   *
   * Lives here rather than on the profile for the same reason the phone number
   * does: a horoscope carries a birth date, a birth time and a birth place, and
   * handing that to every signed-in member would give away more than the
   * contact details it sits beside.
   */
  horoscopeImage: ArticleImage | null;
}

export const INTEREST_STATUSES = [
  "sent",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export type InterestStatus = (typeof INTEREST_STATUSES)[number];

export interface MatrimonyInterest {
  /** `${fromUid}__${toUid}` — deterministic, so the rules can look it up. */
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  status: InterestStatus;
  createdAt: Timestamp | null;
  respondedAt: Timestamp | null;
}

export interface MatrimonyReport {
  id: string;
  profileId: string;
  profileName: string;
  reporterUid: string;
  reason: string;
  resolved: boolean;
  createdAt: Timestamp | null;
}

/* -------------------------------------------------------------------------- */
/*  Subscriptions                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What a paid plan does and does not unlock.
 *
 * It buys reach, never consent. Contact details stay behind a mutual accept for
 * everyone, paid or free — selling the contact reveal would turn a consent
 * mechanism into a payment mechanism, which is exactly the thing that makes
 * matrimony sites unpleasant.
 *
 * Plans themselves live in Firestore and are edited in the admin. Nothing about
 * a price is compiled in: the reader sees what the `plans` collection says, and
 * so does the server when it creates the Razorpay order.
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  nameTa: string;
  /**
   * What is actually charged. The server reads this and nothing else, so the
   * list price below can never affect a bill.
   */
  priceInPaise: number;
  /**
   * The struck-through "before" figure. Zero means no discount is advertised
   * and nothing is struck through.
   */
  mrpInPaise: number;
  /** How long a purchase runs for. */
  months: number;
  features: string[];
  featuresTa: string[];
  /** Marks the plan the desk wants to push. */
  highlight: boolean;
  active: boolean;
  order: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * The advertised saving, derived rather than stored.
 *
 * Storing a percentage as well as two prices invites the three of them to
 * disagree; this cannot. Returns 0 when there is nothing honest to claim.
 */
export function discountPercent(plan: {
  priceInPaise: number;
  mrpInPaise: number;
}): number {
  if (!plan.mrpInPaise || plan.mrpInPaise <= plan.priceInPaise) return 0;
  return Math.round(((plan.mrpInPaise - plan.priceInPaise) / plan.mrpInPaise) * 100);
}

/** The free allowance, also edited in the admin. */
export interface MatrimonyLimits {
  freeProfileViews: number;
  freeInterestsPerMonth: number;
}

export const DEFAULT_MATRIMONY_LIMITS: MatrimonyLimits = {
  freeProfileViews: 6,
  freeInterestsPerMonth: 3,
};

export interface Subscription {
  /** Document id is the owner's uid. */
  id: string;
  /** The plan document that was bought. */
  planId: string | null;
  planName: string;
  status: "active" | "expired" | "none";
  startedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  provider: "razorpay" | null;
  lastPaymentId: string | null;
  lastOrderId: string | null;
  amountInPaise: number;
  updatedAt: Timestamp | null;
}
