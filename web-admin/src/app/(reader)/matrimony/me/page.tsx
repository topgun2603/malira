"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Check, Heart, Loader2, LogOut, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, FullPageSpinner } from "@/components/shared/states";
import { SignInGate } from "@/components/matrimony/sign-in-gate";
import { PlanStrip } from "@/components/matrimony/plan-strip";
import { HoroscopeSheet } from "@/components/matrimony/horoscope-uploader";
import { MatrimonyPhotos } from "@/components/matrimony/photo-uploader";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/reader/language";
import {
  useDeleteMyProfile,
  useMyContact,
  useMyProfile,
  useReceivedInterests,
  useRespondToInterest,
  useSaveProfile,
  useSentInterests,
  useSetOwnStatus,
  useResumeOwnListing,
  useWithdrawInterest,
} from "@/hooks/use-matrimony";
import { validateProfile, type ProfileDraft } from "@/lib/api/matrimony";
import {
  DIETS,
  DIET_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  MATRIMONY_STATUS_LABELS,
  PHOTO_VISIBILITY,
  PHOTO_VISIBILITY_LABELS,
  POSTED_BY,
  POSTED_BY_LABELS,
  type ArticleImage,
  type Diet,
  type MaritalStatus,
  type PhotoVisibility,
  type PostedBy,
} from "@/lib/types";

const EMPTY: ProfileDraft = {
  postedBy: "self",
  name: "",
  gender: "female",
  dob: null,
  birthTime: "",
  birthPlace: "",
  heightCm: 160,
  maritalStatus: "never_married",
  diet: "vegetarian",
  education: "",
  occupation: "",
  workLocation: "",
  hometown: "",
  motherTongue: "Badaga",
  about: "",
  fatherOccupation: "",
  motherOccupation: "",
  siblings: "",
  photoVisibility: "on_accept",
  photos: [],
  phone: "",
  email: "",
  horoscopeNote: "",
  horoscopeImage: null,
};

function toDateInput(date: Date | null): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function MyMatrimony() {
  const { firebaseUser, signOut } = useAuth();
  const { lang } = useLanguage();
  const { data: profile, isLoading } = useMyProfile();
  const { data: contact, isLoading: contactLoading } = useMyContact();
  const saveProfile = useSaveProfile();
  const setStatus = useSetOwnStatus();
  const resume = useResumeOwnListing();
  const deleteProfile = useDeleteMyProfile();

  const { data: sent } = useSentInterests();
  const { data: received } = useReceivedInterests();
  const respond = useRespondToInterest();
  const withdraw = useWithdrawInterest();

  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  // Both must be in hand before the form seeds itself. Photographs held back
  // from search live only in the contact document, so rendering the editor
  // while that is still loading would seed `photos: []` — and the next save
  // would wipe the member's pictures without anyone touching them.
  if (isLoading || contactLoading) {
    return <FullPageSpinner label="Loading your profile..." />;
  }

  // Seed the editor from the stored profile the first time it is opened.
  const current: ProfileDraft =
    draft ??
    (profile
      ? {
          postedBy: profile.postedBy,
          name: profile.name,
          gender: profile.gender,
          dob: profile.dob ? profile.dob.toDate() : null,
          birthTime: profile.birthTime,
          birthPlace: profile.birthPlace,
          heightCm: profile.heightCm,
          maritalStatus: profile.maritalStatus,
          diet: profile.diet,
          education: profile.education,
          occupation: profile.occupation,
          workLocation: profile.workLocation,
          hometown: profile.hometown,
          motherTongue: profile.motherTongue,
          about: profile.about,
          fatherOccupation: profile.fatherOccupation,
          motherOccupation: profile.motherOccupation,
          siblings: profile.siblings,
          photoVisibility: profile.photoVisibility,
          photos: contact?.photos ?? profile.photos,
          phone: contact?.phone ?? "",
          email: contact?.email ?? "",
          horoscopeNote: contact?.horoscopeNote ?? "",
          horoscopeImage: contact?.horoscopeImage ?? null,
        }
      : EMPTY);

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft({ ...current, [key]: value });
  }

  function save() {
    const problem = validateProfile(current);
    if (problem) {
      toast.error(problem);
      return;
    }
    saveProfile.mutate(current);
  }

  const pendingReceived = (received ?? []).filter((i) => i.status === "sent");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">My matrimony</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/matrimony/browse">
              {lang === "ta" ? "விவரங்களைப் பார்" : "Browse profiles"}
            </Link>
          </Button>
          {/* The account menu in the header carries this too, but this is the
              page a member treats as "my account", so it belongs here as well. */}
          <Button
            variant="ghost"
            onClick={() => void signOut("/matrimony")}
            className="text-muted-foreground"
          >
            <LogOut className="size-4" />
            {lang === "ta" ? "வெளியேறு" : "Sign out"}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <PlanStrip />
      </div>

      {profile && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge
            variant={profile.status === "approved" ? "default" : "secondary"}
            className="font-normal"
          >
            {MATRIMONY_STATUS_LABELS[profile.status]}
          </Badge>
          {profile.status === "approved" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setStatus.mutate({ status: "paused", current: profile.status })
                }
              >
                Pause listing
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus.mutate({ status: "married" })}
              >
                Marriage fixed
              </Button>
            </>
          )}
          {profile.status === "paused" && (
            <Button
              size="sm"
              // Resuming restores what the pause interrupted rather than
              // resubmitting: a listing that was live when it was paused goes
              // straight back to live.
              onClick={() => resume.mutate(profile.pausedFrom)}
              disabled={resume.isPending}
            >
              Resume listing
            </Button>
          )}
        </div>
      )}

      {profile?.status === "rejected" && profile.reviewNote && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertTitle>Sent back by a moderator</AlertTitle>
          <AlertDescription>{profile.reviewNote}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="received">
            Received
            {pendingReceived.length > 0 && (
              <span className="bg-primary text-primary-foreground ml-1.5 rounded-full px-1.5 text-xs">
                {pendingReceived.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        {/* ------------------------------ editor --------------------------- */}
        <TabsContent value="profile" className="mt-4 space-y-6">
          <Alert>
            <AlertCircle />
            <AlertTitle>Every change is reviewed again</AlertTitle>
            <AlertDescription>
              Saving returns the profile to the moderation queue. Your phone
              number is never listed or searchable — it is shown only to someone
              whose interest you accept.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>About the candidate</CardTitle>
              <CardDescription>
                A profile can be posted by the candidate or by a family member.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="postedBy">Posted by</Label>
                  <Select
                    value={current.postedBy}
                    onValueChange={(v) => set("postedBy", v as PostedBy)}
                  >
                    <SelectTrigger id="postedBy" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTED_BY.map((value) => (
                        <SelectItem key={value} value={value}>
                          {POSTED_BY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={current.name}
                    onChange={(event) => set("name", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={current.gender}
                    onValueChange={(v) => set("gender", v as "male" | "female")}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={toDateInput(current.dob)}
                    onChange={(event) =>
                      set("dob", event.target.value ? new Date(event.target.value) : null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heightCm">Height (cm)</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    min={120}
                    max={220}
                    value={current.heightCm}
                    onChange={(event) =>
                      set("heightCm", Number(event.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital status</Label>
                  <Select
                    value={current.maritalStatus}
                    onValueChange={(v) => set("maritalStatus", v as MaritalStatus)}
                  >
                    <SelectTrigger id="maritalStatus" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {MARITAL_STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diet">Diet</Label>
                  <Select
                    value={current.diet}
                    onValueChange={(v) => set("diet", v as Diet)}
                  >
                    <SelectTrigger id="diet" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIETS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {DIET_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={current.education}
                    onChange={(event) => set("education", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={current.occupation}
                    onChange={(event) => set("occupation", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workLocation">Works in</Label>
                  <Input
                    id="workLocation"
                    value={current.workLocation}
                    onChange={(event) => set("workLocation", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hometown">Hometown</Label>
                  <Input
                    id="hometown"
                    value={current.hometown}
                    placeholder="Village or town"
                    onChange={(event) => set("hometown", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About</Label>
                <Textarea
                  id="about"
                  rows={4}
                  value={current.about}
                  onChange={(event) => set("about", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horoscope and family</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthTime">Birth time</Label>
                  <Input
                    id="birthTime"
                    type="time"
                    value={current.birthTime}
                    onChange={(event) => set("birthTime", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Birth place</Label>
                  <Input
                    id="birthPlace"
                    value={current.birthPlace}
                    onChange={(event) => set("birthPlace", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Father&rsquo;s occupation</Label>
                  <Input
                    id="fatherOccupation"
                    value={current.fatherOccupation}
                    onChange={(event) => set("fatherOccupation", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Mother&rsquo;s occupation</Label>
                  <Input
                    id="motherOccupation"
                    value={current.motherOccupation}
                    onChange={(event) => set("motherOccupation", event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siblings">Siblings</Label>
                <Input
                  id="siblings"
                  value={current.siblings}
                  placeholder="One elder brother, married"
                  onChange={(event) => set("siblings", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos and contact</CardTitle>
              <CardDescription>
                Contact details are stored separately from the profile and are
                never returned to a member who has not been accepted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="photoVisibility">Who can see the photos</Label>
                <Select
                  value={current.photoVisibility}
                  onValueChange={(v) => set("photoVisibility", v as PhotoVisibility)}
                >
                  <SelectTrigger id="photoVisibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_VISIBILITY.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PHOTO_VISIBILITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <MatrimonyPhotos
                uid={firebaseUser?.uid ?? ""}
                value={current.photos}
                onChange={(photos: ArticleImage[]) => set("photos", photos)}
                disabled={saveProfile.isPending}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact number</Label>
                  <Input
                    id="phone"
                    value={current.phone}
                    onChange={(event) => set("phone", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={current.email}
                    onChange={(event) => set("email", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horoscopeNote">
                  Note for accepted matches (optional)
                </Label>
                <Textarea
                  id="horoscopeNote"
                  rows={2}
                  value={current.horoscopeNote}
                  placeholder="Best time to call, or where to send the horoscope."
                  onChange={(event) => set("horoscopeNote", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Horoscope</Label>
                {/* Same field the mobile app writes, so a sheet photographed
                    on a phone appears here and the other way round. */}
                <HoroscopeSheet
                  uid={firebaseUser?.uid ?? ""}
                  value={current.horoscopeImage}
                  onChange={(image) => set("horoscopeImage", image)}
                  disabled={saveProfile.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="size-4 animate-spin" />}
              {profile ? "Save and resubmit" : "Create profile"}
            </Button>
            {profile && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => deleteProfile.mutate()}
                disabled={deleteProfile.isPending}
              >
                <Trash2 className="size-4" />
                Delete profile and contact details
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ----------------------------- received -------------------------- */}
        <TabsContent value="received" className="mt-4">
          {(received ?? []).length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No interests received"
              description="When someone expresses interest in your profile it appears here."
            />
          ) : (
            <ul className="space-y-2">
              {(received ?? []).map((interest) => (
                <li key={interest.id}>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{interest.fromName || "A member"}</p>
                        <p className="text-muted-foreground text-xs">
                          {interest.createdAt &&
                            formatDistanceToNow(interest.createdAt.toDate(), {
                              addSuffix: true,
                            })}
                          {" · "}
                          {interest.status}
                        </p>
                      </div>
                      {interest.status === "sent" ? (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              respond.mutate({ id: interest.id, status: "accepted" })
                            }
                          >
                            <Check className="size-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              respond.mutate({ id: interest.id, status: "declined" })
                            }
                          >
                            <X className="size-4" />
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          {interest.status}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------------------------------- sent ---------------------------- */}
        <TabsContent value="sent" className="mt-4">
          {(sent ?? []).length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No interests sent"
              description="Browse profiles and express interest to start a conversation."
            />
          ) : (
            <ul className="space-y-2">
              {(sent ?? []).map((interest) => (
                <li key={interest.id}>
                  <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/matrimony/${interest.toUid}`}
                          className="font-medium hover:underline"
                        >
                          {interest.toName || "A member"}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {interest.status === "sent"
                            ? "Waiting for a response"
                            : interest.status === "accepted"
                              ? "Accepted — contact details unlocked"
                              : interest.status === "declined"
                                ? "Declined"
                                : "Withdrawn"}
                        </p>
                      </div>
                      {interest.status === "sent" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => withdraw.mutate(interest.id)}
                        >
                          Withdraw
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MyMatrimonyPage() {
  return (
    <SignInGate>
      <MyMatrimony />
    </SignInGate>
  );
}
