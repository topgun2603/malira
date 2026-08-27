"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  countSuperAdmins,
  setUserDisabled,
  setUserRole,
  usersPage,
  type UserFilters,
} from "@/lib/api/users";
import { useServerPage } from "@/hooks/use-server-page";
import { friendlyError } from "@/lib/firebase/errors";
import { can } from "@/lib/permissions";
import type { AdminUser, Role } from "@/lib/types";

export const userKeys = {
  all: ["users"] as const,
  superAdmins: ["users", "super-admin-count"] as const,
};

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: Role }) => setUserRole(uid, role),
    onSuccess: () => {
      toast.success("Role updated.");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSetUserDisabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, disabled }: { uid: string; disabled: boolean }) =>
      setUserDisabled(uid, disabled),
    onSuccess: (_, { disabled }) => {
      toast.success(disabled ? "Account disabled." : "Account enabled.");
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/**
 * Server-paged staff and member directory.
 *
 * The filters go into the Firestore query, so paging walks the matching
 * accounts rather than a window that happened to be loaded — and they are part
 * of the key, so changing one starts again at page one.
 */
export function usePagedAdminUsers(filters: UserFilters = {}) {
  const { profile } = useAuth();
  const page = usersPage(filters);
  return useServerPage<AdminUser>({
    key: ["users", "paged", filters],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: can(profile?.role, "users.manage"),
  });
}

/**
 * How many super admins can still sign in, for the last-super-admin guard.
 *
 * Counted across the whole collection rather than the current page, because the
 * page is a page. Invalidated with the rest of the directory, so demoting one
 * super admin immediately locks the last remaining one.
 */
export function useSuperAdminCount() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: userKeys.superAdmins,
    queryFn: countSuperAdmins,
    enabled: can(profile?.role, "users.manage"),
    staleTime: 60_000,
  });
}
