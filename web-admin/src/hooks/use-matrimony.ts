"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  deleteProfile,
  getContact,
  getProfile,
  listProfilesForModeration,
  listReceivedInterests,
  listReports,
  listSentInterests,
  moderateProfile,
  reportProfile,
  resolveReport,
  respondToInterest,
  countProfiles,
  listProfilesPage,
  searchProfiles,
  saveProfile,
  sendInterest,
  setOwnStatus,
  resumeOwnListing,
  withdrawInterest,
  type MatrimonyFilters,
  type ModerationFilters,
  type ProfileDraft,
} from "@/lib/api/matrimony";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";
import { useServerPage } from "@/hooks/use-server-page";
import type {
  InterestStatus,
  MatrimonyProfile,
  MatrimonyStatus,
} from "@/lib/types";

export const matrimonyKeys = {
  mine: (uid: string) => ["matrimony", "mine", uid] as const,
  profile: (uid: string) => ["matrimony", "profile", uid] as const,
  contact: (uid: string) => ["matrimony", "contact", uid] as const,
  search: (filters: MatrimonyFilters) => ["matrimony", "search", filters] as const,
  sent: (uid: string) => ["matrimony", "sent", uid] as const,
  received: (uid: string) => ["matrimony", "received", uid] as const,
  moderation: (status: string) => ["matrimony", "moderation", status] as const,
  reports: ["matrimony", "reports"] as const,
};

/* ------------------------------- my profile ------------------------------- */

export function useMyProfile() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: matrimonyKeys.mine(uid),
    queryFn: () => getProfile(uid),
    enabled: Boolean(uid),
  });
}

export function useMyContact() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: matrimonyKeys.contact(uid),
    queryFn: () => getContact(uid),
    enabled: Boolean(uid),
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (draft: ProfileDraft) =>
      saveProfile(firebaseUser?.uid ?? "", draft),
    onSuccess: () => {
      toast.success("Saved. A moderator reviews it before it goes live.");
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/**
 * Resume a paused listing.
 *
 * Separate from [useSetOwnStatus] because resuming is the one owner action
 * whose destination is not known at the call site: it depends on where the
 * pause began, and the toast has to say which of the two happened so nobody is
 * left waiting for a review that is not coming.
 */
export function useResumeOwnListing() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (pausedFrom: MatrimonyStatus | null) =>
      resumeOwnListing(firebaseUser?.uid ?? "", pausedFrom),
    onSuccess: (status) => {
      toast.success(
        status === "approved"
          ? "Listing is live again."
          : "Listing resumed and sent for review.",
      );
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetOwnStatus() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: ({
      status,
      current,
    }: {
      status: "paused" | "married" | "pending";
      current?: MatrimonyStatus;
    }) => setOwnStatus(firebaseUser?.uid ?? "", status, current),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "married"
          ? "Profile removed from search. Congratulations."
          : status === "paused"
            ? "Profile paused and hidden from search."
            : "Profile sent back for review.",
      );
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteMyProfile() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: () => deleteProfile(firebaseUser?.uid ?? ""),
    onSuccess: () => {
      toast.success("Profile and contact details deleted.");
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* --------------------------------- browse --------------------------------- */

export function useProfileSearch(filters: MatrimonyFilters) {
  const { firebaseUser } = useAuth();
  // Self-exclusion is applied here rather than at the call site, so a future
  // screen that searches profiles cannot forget it.
  const scoped: MatrimonyFilters = { ...filters, excludeUid: firebaseUser?.uid };

  return useQuery({
    queryKey: matrimonyKeys.search(scoped),
    queryFn: () => searchProfiles(scoped),
    enabled: Boolean(firebaseUser),
    staleTime: 60_000,
  });
}

export function useProfile(uid: string | undefined) {
  const { firebaseUser } = useAuth();
  return useQuery({
    queryKey: matrimonyKeys.profile(uid ?? ""),
    queryFn: () => getProfile(uid as string),
    enabled: Boolean(uid) && Boolean(firebaseUser),
  });
}

/**
 * The contact details of another member.
 *
 * Expected to fail with permission-denied until an interest is accepted — the
 * UI treats a failure as "not unlocked yet" rather than as an error, because
 * that is exactly what the rules are there to say.
 */
export function useContact(uid: string | undefined, unlocked: boolean) {
  return useQuery({
    queryKey: matrimonyKeys.contact(uid ?? ""),
    queryFn: () => getContact(uid as string),
    enabled: Boolean(uid) && unlocked,
    retry: false,
  });
}

/* -------------------------------- interests ------------------------------- */

export function useSentInterests() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: matrimonyKeys.sent(uid),
    queryFn: () => listSentInterests(uid),
    enabled: Boolean(uid),
  });
}

export function useReceivedInterests() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: matrimonyKeys.received(uid),
    queryFn: () => listReceivedInterests(uid),
    enabled: Boolean(uid),
  });
}

export function useSendInterest() {
  const queryClient = useQueryClient();
  const { firebaseUser, profile } = useAuth();
  return useMutation({
    mutationFn: ({ toUid, toName }: { toUid: string; toName: string }) =>
      sendInterest({
        fromUid: firebaseUser?.uid ?? "",
        toUid,
        fromName: profile?.displayName ?? "",
        toName,
      }),
    onSuccess: () => {
      toast.success("Interest sent. Contact details unlock only if it is accepted.");
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useRespondToInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<InterestStatus, "accepted" | "declined">;
    }) => respondToInterest(id, status),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "accepted"
          ? "Accepted. You can both see each other's contact details now."
          : "Declined. They are not told why.",
      );
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useWithdrawInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withdrawInterest,
    onSuccess: () => {
      toast.success("Interest withdrawn.");
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useReportProfile() {
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: ({
      profileId,
      profileName,
      reason,
    }: {
      profileId: string;
      profileName: string;
      reason: string;
    }) =>
      reportProfile({
        profileId,
        profileName,
        reporterUid: firebaseUser?.uid ?? "",
        reason,
      }),
    onSuccess: () => toast.success("Reported. A moderator will look at it."),
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* ------------------------------- moderation ------------------------------- */

export function useModerationQueue(status: MatrimonyStatus | "all") {
  const { profile } = useAuth();
  return useQuery({
    queryKey: matrimonyKeys.moderation(status),
    queryFn: () => listProfilesForModeration(status),
    enabled: can(profile?.role, "matrimony.moderate"),
  });
}

export function useModerateProfile() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: ({
      uid,
      status,
      note,
    }: {
      uid: string;
      status: MatrimonyStatus;
      note?: string;
    }) => moderateProfile(uid, status, { uid: firebaseUser?.uid ?? "" }, note),
    onSuccess: (_, { status }) => {
      toast.success(
        status === "approved"
          ? "Approved and live."
          : status === "rejected"
            ? "Sent back with your note."
            : "Updated.",
      );
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useReports() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: matrimonyKeys.reports,
    queryFn: listReports,
    enabled: can(profile?.role, "matrimony.moderate"),
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveReport,
    onSuccess: () => {
      toast.success("Report resolved.");
      queryClient.invalidateQueries({ queryKey: matrimonyKeys.reports });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/**
 * Every photograph on a profile, for the moderation queue.
 *
 * A profile that holds its photos back until an accepted interest keeps them in
 * the private subcollection, so the public document's `photos` array is empty.
 * The security rules have always let a moderator read that subcollection — the
 * queue simply never asked, which meant nobody could see the one thing they
 * were being asked to approve.
 */
export function useProfilePhotos(profile: MatrimonyProfile | null | undefined) {
  const { profile: viewer } = useAuth();
  const canModerate = can(viewer?.role, "matrimony.moderate");

  // Only reach for the private document when the public one is empty.
  const needsPrivate = Boolean(
    profile && profile.hasPhotos && profile.photos.length === 0,
  );

  const { data: contact, isLoading } = useQuery({
    queryKey: ["matrimony", "moderation-photos", profile?.id ?? ""],
    queryFn: () => getContact(profile!.id),
    enabled: canModerate && needsPrivate,
    retry: false,
    staleTime: 60_000,
  });

  const photos = profile
    ? profile.photos.length > 0
      ? profile.photos
      : (contact?.photos ?? [])
    : [];

  return { photos, loading: needsPrivate && isLoading };
}

/**
 * The moderation queue, paged by Firestore.
 *
 * This is the list that grows with every account ever created, so it is the one
 * that must never load "everything and slice it". Status, gender and marital
 * status go into the query; the exact total comes from an aggregation, so the
 * position shown is real rather than "at least this many".
 */
export function useModerationPage(
  filters: Omit<ModerationFilters, "after" | "pageSize">,
) {
  const { profile } = useAuth();

  return useServerPage<MatrimonyProfile>({
    key: ["matrimony", "moderation-page", filters],
    fetchPage: (after, pageSize) =>
      listProfilesPage({ ...filters, after, pageSize }).then((page) => ({
        items: page.profiles,
        cursor: page.cursor,
      })),
    // A name search is a range scan, so the count query cannot mirror it.
    count: filters.search?.trim()
      ? undefined
      : () =>
          countProfiles({
            status: filters.status,
            gender: filters.gender,
            maritalStatus: filters.maritalStatus,
          }),
    enabled: can(profile?.role, "matrimony.moderate"),
  });
}
