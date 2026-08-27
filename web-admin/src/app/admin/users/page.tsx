"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/shared/states";
import { UsersTable, type UserFilterState } from "@/components/users/users-table";
import { useAuth } from "@/components/providers/auth-provider";
import {
  usePagedAdminUsers,
  useSetUserDisabled,
  useSetUserRole,
  useSuperAdminCount,
} from "@/hooks/use-users";

export default function UsersPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<UserFilterState>({
    search: "",
    role: "all",
    status: "all",
  });

  // Every one of these goes into the Firestore query, so paging walks the
  // matching accounts rather than a window that happened to be loaded.
  const page = usePagedAdminUsers(filters);
  const superAdmins = useSuperAdminCount();
  const setRole = useSetUserRole();
  const setDisabled = useSetUserDisabled();

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Anyone who signs in lands here as a Member until you give them a role."
      />

      <Alert>
        <ShieldAlert />
        <AlertTitle>How accounts are created</AlertTitle>
        <AlertDescription>
          <p>
            Add the person in Firebase Console under Authentication, or ask them to
            sign in with Google. They appear in this list on their first sign-in as
            a Member — a reader with no desk access at all — and you promote them
            from here.
          </p>
        </AlertDescription>
      </Alert>

      {page.isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <UsersTable
          page={page}
          filters={filters}
          onFiltersChange={setFilters}
          selfId={profile?.id}
          superAdminCount={superAdmins.data}
          onRoleChange={(uid, role) => setRole.mutate({ uid, role })}
          onDisabledChange={(uid, disabled) => setDisabled.mutate({ uid, disabled })}
        />
      )}
    </>
  );
}
