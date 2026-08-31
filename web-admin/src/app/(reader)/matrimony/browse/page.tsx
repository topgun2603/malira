"use client";

import { MatrimonyOnboarding } from "@/components/matrimony/onboarding";
import { SignInGate } from "@/components/matrimony/sign-in-gate";
import { FullPageSpinner } from "@/components/shared/states";
import { useMyProfile } from "@/hooks/use-matrimony";
import { MatrimonyBrowse } from "@/components/matrimony/browse";

/**
 * The member area.
 *
 * Split from /matrimony so the landing page can be plain server-rendered
 * marketing: putting both behind one auth check meant a crawler — and every
 * first paint — got a spinner instead of the pitch.
 *
 * Listing comes before browsing. A service where people can look but never be
 * looked at empties out fast.
 */
function Gated() {
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading) return <FullPageSpinner label="Loading matrimony..." />;
  // Waiting on a moderator is not the same as never having listed. Somebody in
  // the queue has already put themselves in front of the people they are about
  // to look at, which is the whole point of the gate, and the app has always
  // let them browse — holding them here only made the two products disagree
  // about the same account on the same day.
  if (!profile || (profile.status !== "approved" && profile.status !== "pending")) {
    return <MatrimonyOnboarding profile={profile ?? null} />;
  }
  return <MatrimonyBrowse />;
}

export default function MatrimonyBrowsePage() {
  return (
    <SignInGate>
      <Gated />
    </SignInGate>
  );
}
