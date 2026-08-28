import { redirect } from "next/navigation";

/**
 * The front door is matrimony, not the news feed.
 *
 * Matrimony is the part of this product somebody pays for, so it gets the
 * address people type. The feed keeps everything it had at `/news` — same
 * page, same component, one segment further in — rather than being demoted
 * into a tab of somebody else's screen.
 *
 * A redirect rather than rendering the landing page here on purpose: the
 * reader shell picks its accent colour from the pathname, so matrimony served
 * at `/` would wear the newsroom's blue. One URL, one section, one colour.
 */
export default function ReaderRootPage() {
  redirect("/matrimony");
}
