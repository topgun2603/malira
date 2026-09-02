"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ShieldAlert, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAdmitUser, usePendingUsers } from "@/hooks/use-pending-users";

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
  const { data: pending } = usePendingUsers();
  const admit = useAdmitUser();

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
            This list is the directory, and a person joins it the first time they
            actually sign in. Adding somebody in the Firebase Console creates a
            sign-in account and nothing else, so they wait below until either they
            sign in or you add them from here.
          </p>
        </AlertDescription>
      </Alert>

      {(pending ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" />
              Waiting for a first sign-in
            </CardTitle>
            <CardDescription>
              These accounts can sign in but are not in the directory yet. Adding
              one here gives it a role immediately; signing in later keeps it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pending ?? []).map((account) => (
              <div
                key={account.uid}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {account.email ?? account.phoneNumber ?? account.uid}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Created{" "}
                    {account.createdAt
                      ? formatDistanceToNow(new Date(account.createdAt), {
                          addSuffix: true,
                        })
                      : "recently"}
                    {account.lastSignInAt ? "" : " · never signed in"}
                  </p>
                </div>

                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={admit.isPending}
                  onClick={() => admit.mutate({ uid: account.uid, role: "member" })}
                >
                  {admit.isPending && admit.variables?.uid === account.uid ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Add as Member
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
