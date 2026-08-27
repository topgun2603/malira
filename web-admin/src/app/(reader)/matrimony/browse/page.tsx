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
  if (!profile || profile.status !== "approved") {
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
