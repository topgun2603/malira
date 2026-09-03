"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Ban, Check, Eye, HeartHandshake, Loader2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HoroscopeView } from "@/components/matrimony/horoscope-uploader";
import { useContact } from "@/hooks/use-matrimony";
import {
  DIET_LABELS,
  MARITAL_STATUS_LABELS,
  MATRIMONY_STATUS_LABELS,
  PHOTO_VISIBILITY_LABELS,
  POSTED_BY_LABELS,
  type MatrimonyProfile,
  type MatrimonyStatus,
} from "@/lib/types";

const stamp = (value: { toDate: () => Date } | null | undefined) =>
  value ? format(value.toDate(), "d MMM yyyy, h:mm a") : "";

function years(dob: MatrimonyProfile["dob"]) {
  if (!dob) return null;
  const born = dob.toDate();
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Everything a member typed, on one panel, with the decision at the bottom.
 *
 * The queue used to be a table of six columns, which is enough to recognise a
 * profile and nowhere near enough to review one — a moderator was approving a
 * name, a photograph and a job title while the about text, the family details
 * and the horoscope went unread.
 *
 * The private half is loaded too: photographs a member held back from search,
 * and the jathagam. The desk cannot vouch for a listing it has not seen, and
 * those are exactly the fields where something unwelcome would be put. Phone
 * and email are deliberately not rendered — nothing in a review turns on them,
 * and a moderation screen is a poor place to leave a district's phone numbers
 * lying about.
 */
export function ProfileReview({
  profile,
  onClose,
  onDecide,
  busy = false,
}: {
  profile: MatrimonyProfile | null;
  onClose: () => void;
  onDecide: (profile: MatrimonyProfile, status: MatrimonyStatus) => void;
  busy?: boolean;
}) {
  // Moderators may read any contact document; the rules allow it. A failure
  // here is not an error worth showing — the panel simply omits the section.
  const { data: contact } = useContact(profile?.id, Boolean(profile));

  if (!profile) return null;

  const age = years(profile.dob);
  const restricted = contact?.photos ?? [];
  const shown = profile.photos ?? [];

  return (
    <Sheet open={Boolean(profile)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {profile.name}
            {age !== null && (
              <span className="text-muted-foreground font-normal">{age}</span>
            )}
            <Badge
              variant={profile.status === "approved" ? "default" : "secondary"}
              className="font-normal"
            >
              {MATRIMONY_STATUS_LABELS[profile.status]}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {POSTED_BY_LABELS[profile.postedBy]} · {profile.hometown || "—"} ·{" "}
            {profile.viewCount} views
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-7 p-5">
          {(shown.length > 0 || restricted.length > 0) && (
            <Group title="Photographs">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ...shown.map((photo) => ({ photo, held: false })),
                  ...restricted.map((photo) => ({ photo, held: true })),
                ].map(({ photo, held }, index) => (
                  <div
                    key={`${photo.url}-${index}`}
                    className="bg-muted relative aspect-[3/4] overflow-hidden rounded-lg"
                  >
                    <Image
                      src={photo.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover"
                    />
                    {held && (
                      <span className="bg-background/85 absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium backdrop-blur">
                        Held back
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {PHOTO_VISIBILITY_LABELS[profile.photoVisibility]}
              </p>
            </Group>
          )}

          <Group title="Candidate">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field
                label="Gender"
                value={profile.gender === "male" ? "Male" : "Female"}
              />
              <Field
                label="Date of birth"
                value={profile.dob ? format(profile.dob.toDate(), "d MMM yyyy") : ""}
              />
              <Field
                label="Height"
                value={profile.heightCm ? `${profile.heightCm} cm` : ""}
              />
              <Field
                label="Marital status"
                value={MARITAL_STATUS_LABELS[profile.maritalStatus]}
              />
              <Field label="Diet" value={DIET_LABELS[profile.diet]} />
              <Field label="Mother tongue" value={profile.motherTongue} />
            </dl>
          </Group>

          <Group title="Education and work">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Education" value={profile.education} />
              <Field label="Occupation" value={profile.occupation} />
              <Field label="Works in" value={profile.workLocation} />
              <Field label="Hometown" value={profile.hometown} />
            </dl>
          </Group>

          {profile.about && (
            <Group title="About">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {profile.about}
              </p>
            </Group>
          )}

          <Group title="Horoscope">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Birth time" value={profile.birthTime} />
              <Field label="Birth place" value={profile.birthPlace} />
            </dl>
            {contact?.horoscopeNote && (
              <p className="mt-3 text-sm leading-relaxed">{contact.horoscopeNote}</p>
            )}
            {contact?.horoscopeImage && (
              <div className="mt-3">
                <HoroscopeView image={contact.horoscopeImage} />
              </div>
            )}
          </Group>

          {(profile.fatherOccupation ||
            profile.motherOccupation ||
            profile.siblings) && (
            <Group title="Family">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Father" value={profile.fatherOccupation} />
                <Field label="Mother" value={profile.motherOccupation} />
                <Field label="Siblings" value={profile.siblings} />
              </dl>
            </Group>
          )}

          <Group title="Record">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Created" value={stamp(profile.createdAt)} />
              <Field label="Last updated" value={stamp(profile.updatedAt)} />
              <Field label="Last reviewed" value={stamp(profile.reviewedAt)} />
              <Field label="Views" value={String(profile.viewCount)} />
            </dl>
            {profile.reviewNote && (
              <p className="bg-muted/50 mt-3 rounded-md p-3 text-sm">
                <span className="text-muted-foreground text-xs">
                  Note sent back:{" "}
                </span>
                {profile.reviewNote}
              </p>
            )}
            <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
              Phone and email live in a separate document and are not shown here.
              Nothing in a review turns on them.
            </p>
          </Group>
        </div>

        {/* The decision, pinned under the thing being decided about. */}
        <div className="bg-background sticky bottom-0 flex flex-wrap gap-2 border-t p-4">
          {profile.status !== "approved" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onDecide(profile, "approved")}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {profile.status === "paused" ? "Restore" : "Approve"}
            </Button>
          )}
          {profile.status !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onDecide(profile, "rejected")}
            >
              <Undo2 className="size-4" />
              Send back
            </Button>
          )}
          {profile.status !== "paused" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onDecide(profile, "paused")}
            >
              <Ban className="size-4" />
              Suspend
            </Button>
          )}
          {profile.status !== "married" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onDecide(profile, "married")}
            >
              <HeartHandshake className="size-4" />
              Married
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto" asChild>
            <a
              href={`/matrimony/${profile.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="size-4" />
              As members see it
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
