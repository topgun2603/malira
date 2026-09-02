"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/auth-provider";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { userKeys } from "@/hooks/use-users";

export interface PendingAccount {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export const pendingKeys = { all: ["users", "pending"] as const };

async function authorized(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in first.");
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "That did not work.");
  return payload;
}

/**
 * Accounts in Authentication with no directory document yet.
 *
 * Listing Authentication needs the Admin SDK, so this goes through a route
 * rather than Firestore. It is deliberately not retried: on a server with no
 * FIREBASE_SERVICE_ACCOUNT it returns 503 every time, and hammering it would
 * only fill the console.
 */
export function usePendingUsers() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: pendingKeys.all,
    queryFn: async () =>
      ((await authorized("/api/users/pending")) as { pending?: PendingAccount[] })
        .pending ?? [],
    enabled: can(profile?.role, "users.manage"),
    retry: false,
  });
}

export function useAdmitUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { uid: string; role: Role }) =>
      authorized("/api/users/pending", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("Added to the directory.");
      queryClient.invalidateQueries({ queryKey: pendingKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => toast.error(error.message),
  });
}
