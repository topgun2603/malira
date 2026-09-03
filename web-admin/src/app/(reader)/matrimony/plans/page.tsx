import { redirect } from "next/navigation";

/**
 * Pricing moved to /subscription, which has a tab in the nav.
 *
 * Kept as a redirect rather than deleted: "See plans", "Extend" and the
 * subscribe wall all link here, and so may a bookmark or a message somebody
 * sent a relative.
 */
export default function MatrimonyPlansPage() {
  redirect("/subscription");
}
