"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  Flag,
  Heart,
  Lock,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/states";
import { FadeIn } from "@/components/motion/primitives";
import { SignInGate } from "@/components/matrimony/sign-in-gate";
import { HoroscopeView } from "@/components/matrimony/horoscope-uploader";
import { useEntitlement } from "@/hooks/use-subscription";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useContact,
  useProfile,
  useReportProfile,
  useSendInterest,
  useSentInterests,
  useReceivedInterests,
} from "@/hooks/use-matrimony";
import { ageFrom, isMatched } from "@/lib/api/matrimony";
import {
  DIET_LABELS,
  MARITAL_STATUS_LABELS,
  POSTED_BY_LABELS,
} from "@/lib/types";

function Detail() {
  const params = useParams<{ id: string }>();
  const { firebaseUser } = useAuth();
  const { data: profile, isLoading } = useProfile(params.id);
  const { data: sent } = useSentInterests();
  const { data: received } = useReceivedInterests();
  const sendInterest = useSendInterest();
  const reportProfile = useReportProfile();
  const { premium, remaining } = useEntitlement();

  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");

  const uid = firebaseUser?.uid ?? "";
  const all = [...(sent ?? []), ...(received ?? [])];
  const matched = profile ? isMatched(all, uid, profile.id) : false;
  const alreadySent = (sent ?? []).find(
    (interest) => interest.toUid === params.id && interest.status === "sent",
  );

  // Only requested once a match exists; the rules would refuse it otherwise.
  const { data: contact } = useContact(params.id, matched);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={UserRound}
          title="Profile not available"
          description="It may have been paused, withdrawn, or it is still awaiting review."
          action={
            <Button asChild variant="outline">
              <Link href="/matrimony/browse">
                <ArrowLeft className="size-4" />
                Back to profiles
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const age = ageFrom(profile.dob);
  const isOwn = profile.id === uid;
  const photos = matched && contact ? contact.photos : profile.photos;

  const facts: Array<[string, string]> = [
    ["Age", age !== null ? `${age}` : "—"],
    ["Height", profile.heightCm ? `${profile.heightCm} cm` : "—"],
    ["Marital status", MARITAL_STATUS_LABELS[profile.maritalStatus]],
    ["Diet", DIET_LABELS[profile.diet]],
    ["Education", profile.education || "—"],
    ["Occupation", profile.occupation || "—"],
    ["Works in", profile.workLocation || "—"],
    ["Hometown", profile.hometown || "—"],
    ["Mother tongue", profile.motherTongue || "—"],
    ["Posted by", POSTED_BY_LABELS[profile.postedBy]],
  ];

  const horoscope: Array<[string, string]> = [
    ["Date of birth", profile.dob ? format(profile.dob.toDate(), "d MMMM yyyy") : "—"],
    ["Birth time", profile.birthTime || "—"],
    ["Birth place", profile.birthPlace || "—"],
  ];

  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        {/* The member area, not the public landing: /matrimony is marketing. */}
        <Link href="/matrimony/browse">
          <ArrowLeft className="size-4" />
          All profiles
        </Link>
      </Button>

      <FadeIn className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="bg-muted text-muted-foreground relative aspect-[4/5] overflow-hidden rounded-xl">
            {photos[0] ? (
              <NextImage
                src={photos[0].url}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="300px"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <Lock className="size-6" />
                <p className="text-xs leading-relaxed">
                  {profile.hasPhotos
                    ? "Photos are shared once an interest is accepted."
                    : "No photograph on this profile."}
                </p>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(1).map((photo) => (
                <div
                  key={photo.path}
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                >
                  <NextImage
                    src={photo.url}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ------------------------- contact gate ------------------------ */}
          <Card>
            <CardContent className="p-4">
              {isOwn ? (
                <p className="text-muted-foreground text-sm">
                  This is your own profile.
                </p>
              ) : matched && contact ? (
                <div className="space-y-2.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Check className="text-status-published size-4" />
                    Interest accepted
                  </p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Phone className="text-primary size-4" />
                    {contact.phone}
                  </a>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <Mail className="text-primary size-4" />
                      {contact.email}
                    </a>
                  )}
                  {contact.horoscopeImage && (
                    <div className="pt-1">
                      <HoroscopeView image={contact.horoscopeImage} />
                    </div>
                  )}
                  {contact.horoscopeNote && (
                    <p className="text-muted-foreground text-xs">
                      {contact.horoscopeNote}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground flex items-start gap-2 text-sm">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    Contact details are shown only after this side accepts your
                    interest.
                  </p>
                  <Button
                    className="w-full"
                    disabled={
                      Boolean(alreadySent) ||
                      sendInterest.isPending ||
                      remaining === 0
                    }
                    onClick={() =>
                      sendInterest.mutate({ toUid: profile.id, toName: profile.name })
                    }
                  >
                    <Heart className="size-4" />
                    {alreadySent
                      ? "Interest sent"
                      : remaining === 0
                        ? "Monthly limit reached"
                        : "Express interest"}
                  </Button>
                  {!premium && remaining !== "unlimited" && !alreadySent && (
                    <p className="text-muted-foreground text-xs">
                      {remaining === 0 ? (
                        <>
                          You have used this month&rsquo;s free interests.{" "}
                          <Link
                            href="/matrimony/plans"
                            className="text-primary underline underline-offset-2"
                          >
                            See plans
                          </Link>
                        </>
                      ) : (
                        <>
                          {remaining} free{" "}
                          {remaining === 1 ? "interest" : "interests"} left this
                          month.
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!isOwn && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-full"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="size-3.5" />
              Report this profile
            </Button>
          )}
        </div>

        {/* --------------------------- the profile ------------------------- */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{profile.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-normal">
              {profile.gender === "male" ? "Groom" : "Bride"}
            </Badge>
            {profile.hometown && (
              <Badge variant="outline" className="font-normal">
                {profile.hometown}
              </Badge>
            )}
          </div>

          {profile.about && (
            <p className="mt-4 text-[15px] leading-7 whitespace-pre-line">
              {profile.about}
            </p>
          )}

          <Separator className="my-6" />

          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Details
          </h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="text-right text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-6 mb-3 text-sm font-semibold tracking-wide uppercase">
            Horoscope details
          </h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {horoscope.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b pb-2">
                <dt className="text-muted-foreground text-sm">{label}</dt>
                <dd className="text-right text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {(profile.fatherOccupation ||
            profile.motherOccupation ||
            profile.siblings) && (
            <>
              <h2 className="mt-6 mb-3 text-sm font-semibold tracking-wide uppercase">
                Family
              </h2>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {profile.fatherOccupation && (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground text-sm">Father</dt>
                    <dd className="text-right text-sm font-medium">
                      {profile.fatherOccupation}
                    </dd>
                  </div>
                )}
                {profile.motherOccupation && (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground text-sm">Mother</dt>
                    <dd className="text-right text-sm font-medium">
                      {profile.motherOccupation}
                    </dd>
                  </div>
                )}
                {profile.siblings && (
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <dt className="text-muted-foreground text-sm">Siblings</dt>
                    <dd className="text-right text-sm font-medium">
                      {profile.siblings}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
      </FadeIn>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this profile</DialogTitle>
            <DialogDescription>
              A moderator reviews every report. The person is not told who
              reported them.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reason}
            placeholder="What is wrong with this profile?"
            onChange={(event) => setReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) {
                  toast.error("Tell the moderator what is wrong.");
                  return;
                }
                reportProfile.mutate(
                  {
                    profileId: profile.id,
                    profileName: profile.name,
                    reason: reason.trim(),
                  },
                  {
                    onSuccess: () => {
                      setReportOpen(false);
                      setReason("");
                    },
                  },
                );
              }}
            >
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export default function MatrimonyProfilePage() {
  return (
    <SignInGate>
      <Detail />
    </SignInGate>
  );
}
