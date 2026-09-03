import type { Article, ArticleStatus, Role } from "./types";

/**
 * One place that answers "is this person allowed to do that".
 * Firestore rules mirror these checks server-side — this copy exists so the UI
 * can hide what would fail anyway. Never treat it as the enforcement layer.
 */

export type Permission =
  | "news.view"
  | "news.create"
  | "news.publish"
  | "news.review"
  | "news.delete"
  | "news.pin"
  | "categories.manage"
  | "events.manage"
  | "playlists.manage"
  | "matrimony.moderate"
  | "vendors.moderate"
  | "payments.verify"
  | "carousels.manage"
  | "polls.manage"
  | "ads.manage"
  | "notifications.send"
  | "analytics.view"
  | "users.manage"
  | "settings.manage";

const MATRIX: Record<Role, Permission[]> = {
  super_admin: [
    "news.view",
    "news.create",
    "news.publish",
    "news.review",
    "news.delete",
    "news.pin",
    "categories.manage",
    "events.manage",
    "playlists.manage",
    "carousels.manage",
    "polls.manage",
    "ads.manage",
    "matrimony.moderate",
    "vendors.moderate",
    "payments.verify",
    "notifications.send",
    "analytics.view",
    "users.manage",
    "settings.manage",
  ],
  editor: [
    "news.view",
    "news.create",
    "news.publish",
    "news.review",
    "news.delete",
    "news.pin",
    "categories.manage",
    "events.manage",
    "carousels.manage",
    "polls.manage",
    "ads.manage",
    "notifications.send",
    "analytics.view",
  ],
  contributor: ["news.view", "news.create"],
  playlist_manager: ["playlists.manage"],
  // Matrimony is a separate duty from the newsroom: a moderator sees profiles
  // and reports, and nothing else.
  matrimony_moderator: ["matrimony.moderate"],
  vendor_moderator: ["vendors.moderate"],
  // The default for anyone who signs in. Deliberately empty: a member is a
  // reader, and the desk is not theirs. Signing in must never, by itself,
  // grant the ability to publish.
  member: [],
};

/**
 * The desks a role can reach, in the order they appear in the sidebar.
 *
 * One representative permission per desk rather than the whole matrix: Users &
 * roles is answering "what does this account get to touch", and eleven
 * permission strings answer that worse than five names of places.
 */
const AREAS: Array<{ label: string; permission: Permission }> = [
  { label: "News", permission: "news.view" },
  { label: "Publish", permission: "news.publish" },
  { label: "Events", permission: "events.manage" },
  { label: "Songs", permission: "playlists.manage" },
  { label: "Matrimony", permission: "matrimony.moderate" },
  { label: "Carousel & ads", permission: "ads.manage" },
  { label: "Polls", permission: "polls.manage" },
  { label: "Notifications", permission: "notifications.send" },
  { label: "Analytics", permission: "analytics.view" },
  { label: "Users", permission: "users.manage" },
  { label: "Settings", permission: "settings.manage" },
];

export function areasFor(role: Role | undefined): string[] {
  return AREAS.filter((area) => can(role, area.permission)).map((area) => area.label);
}

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}

/**
 * Whether this person has any business in the admin at all.
 *
 * A member has an empty permission set, so the reader site must not offer them
 * a link to a desk that would only bounce them.
 */
export function hasDeskAccess(role: Role | undefined): boolean {
  if (!role) return false;
  return MATRIX[role].length > 0;
}

/** Contributors only ever see their own work. */
export function seesOnlyOwnArticles(role: Role | undefined): boolean {
  return role === "contributor";
}

export function canEditArticle(
  role: Role | undefined,
  uid: string | undefined,
  article: Pick<Article, "createdBy" | "status">,
): boolean {
  if (!role || !uid) return false;
  if (can(role, "news.publish")) return true;
  // A contributor may edit their own work until it is out of their hands.
  return (
    article.createdBy === uid &&
    (article.status === "draft" || article.status === "rejected")
  );
}

/** Statuses a given role is allowed to move an article into. */
export function allowedTransitions(
  role: Role | undefined,
  current: ArticleStatus,
): ArticleStatus[] {
  if (!role) return [];

  if (can(role, "news.publish")) {
    switch (current) {
      case "draft":
      case "rejected":
        return ["in_review", "scheduled", "published"];
      case "in_review":
        return ["published", "scheduled", "rejected", "draft"];
      case "scheduled":
        return ["published", "draft"];
      case "published":
        return ["unpublished"];
      case "unpublished":
        return ["published", "draft"];
      default:
        return [];
    }
  }

  if (role === "contributor") {
    // Submit for approval, or pull a submission back.
    if (current === "draft" || current === "rejected") return ["in_review"];
    if (current === "in_review") return ["draft"];
  }

  return [];
}
