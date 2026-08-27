import { MatrimonyLanding } from "@/components/matrimony/landing";

export const metadata = {
  title: "Matrimony",
  description:
    "Marriage proposals for families across the Nilgiris. Every profile reviewed by a person; phone numbers exchanged only on a mutual accept.",
};

/**
 * Public marketing. Deliberately not a client component and deliberately not
 * behind an auth check: no member data appears here, so it can render on the
 * server for visitors and search engines alike.
 */
export default function MatrimonyPage() {
  return <MatrimonyLanding />;
}
