"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/states";
import { PaginationBar } from "@/components/shared/pagination-bar";
import type { ServerPage } from "@/hooks/use-server-page";
import { areasFor } from "@/lib/permissions";
import {
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type AdminUser,
  type Role,
} from "@/lib/types";

/**
 * Sorting only. Filtering and paging both happen in Firestore, so a client-side
 * filter would narrow a page that has already been narrowed, and a client-side
 * paginator would page a page.
 *
 * Sorting therefore orders the rows on screen rather than the whole directory —
 * the honest trade for not reading every account to show twenty-five.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, AdminUser>();
const EMPTY: AdminUser[] = [];

export interface UserFilterState {
  search: string;
  role: Role | "all";
  status: "all" | "enabled" | "disabled";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** The desks a role reaches, trimmed so Super Admin does not fill the row. */
function Areas({ role }: { role: Role }) {
  const areas = areasFor(role);

  if (areas.length === 0) {
    return <span className="text-muted-foreground text-xs">Reader only</span>;
  }

  const shown = areas.slice(0, 3);
  const rest = areas.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1" title={areas.join(", ")}>
      {shown.map((area) => (
        <Badge key={area} variant="secondary" className="font-normal">
          {area}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge variant="outline" className="text-muted-foreground font-normal">
          +{rest}
        </Badge>
      )}
    </div>
  );
}

export function UsersTable({
  page,
  filters,
  onFiltersChange,
  selfId,
  superAdminCount,
  onRoleChange,
  onDisabledChange,
}: {
  page: ServerPage<AdminUser>;
  filters: UserFilterState;
  onFiltersChange: (next: UserFilterState) => void;
  selfId: string | undefined;
  /** Across the whole collection, not this page. Undefined while loading. */
  superAdminCount: number | undefined;
  onRoleChange: (uid: string, role: Role) => void;
  onDisabledChange: (uid: string, disabled: boolean) => void;
}) {
  const users = page.items;
  const searching = filters.search.trim().length > 0;

  // Until the count arrives, assume every super admin is the last one. Being
  // briefly unable to demote somebody is a nuisance; briefly being able to
  // demote the only one locks the desk out of its own panel.
  const onlySuperAdminLeft = (superAdminCount ?? 1) <= 1;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("displayName", {
          header: "Person",
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage src={user.photoURL ?? undefined} alt="" />
                  <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium">{user.displayName}</p>
                    {user.id === selfId && (
                      <Badge variant="outline" className="font-normal">
                        You
                      </Badge>
                    )}
                    {user.disabled && (
                      <Badge variant="destructive" className="font-normal">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                </div>
              </div>
            );
          },
        }),

        helper.accessor("role", {
          header: "Role",
          cell: ({ row }) => {
            const user = row.original;
            const locked = user.role === "super_admin" && onlySuperAdminLeft;
            return (
              <div className="w-52 space-y-1">
                <Select
                  value={user.role}
                  disabled={locked}
                  onValueChange={(value) => onRoleChange(user.id, value as Role)}
                >
                  <SelectTrigger
                    aria-label={`Role for ${user.displayName}`}
                    className="w-full"
                    size="sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  {/* The description belongs to the open list, not the trigger:
                      the trigger states the role the account has, the sentence
                      under each option is for the moment somebody is choosing. */}
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        description={ROLE_DESCRIPTIONS[role]}
                      >
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {locked && (
                  <p className="text-muted-foreground text-xs">
                    The last super admin cannot be demoted.
                  </p>
                )}
              </div>
            );
          },
        }),

        helper.display({
          id: "areas",
          header: "Can reach",
          cell: ({ row }) => <Areas role={row.original.role} />,
        }),

        helper.accessor((user) => user.lastLoginAt?.toMillis() ?? 0, {
          id: "lastLoginAt",
          header: "Last seen",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {row.original.lastLoginAt
                ? formatDistanceToNow(row.original.lastLoginAt.toDate(), {
                    addSuffix: true,
                  })
                : "—"}
            </span>
          ),
        }),

        helper.display({
          id: "enabled",
          header: "Enabled",
          cell: ({ row }) => {
            const user = row.original;
            return (
              <Switch
                aria-label={`${user.displayName} can sign in`}
                checked={!user.disabled}
                // Nobody locks themselves out, and the desk keeps one way in.
                disabled={
                  user.id === selfId ||
                  (user.role === "super_admin" && onlySuperAdminLeft)
                }
                onCheckedChange={(checked) => onDisabledChange(user.id, !checked)}
              />
            );
          },
        }),
      ]),
    [selfId, onlySuperAdminLeft, onRoleChange, onDisabledChange],
  );

  const data = users.length > 0 ? users : EMPTY;

  const table = useTable({ features, columns, data }, (state) => ({
    sorting: state.sorting,
  }));

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      {/* ------------------------------- toolbar -------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={filters.search}
            placeholder="Search by name, or type an @ for email"
            className="pl-9"
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
          />
        </div>

        <Select
          value={filters.role}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, role: value as UserFilterState["role"] })
          }
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any role</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value as UserFilterState["status"],
            })
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* -------------------------------- table --------------------------- */}
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searching ? "Nobody matches" : "No accounts yet"}
          description={
            page.isLoading
              ? "Loading..."
              : searching
                ? "Search matches the start of a name, or the start of an email address."
                : "Nothing in the directory matches the current filters."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id} className="hover:bg-transparent">
                      {group.headers.map((header) => {
                        const sortable = header.column.getCanSort?.() ?? false;
                        const sorted = header.column.getIsSorted?.();
                        return (
                          <TableHead key={header.id} className="h-10">
                            {header.isPlaceholder ? null : sortable ? (
                              <button
                                type="button"
                                className="hover:text-foreground flex items-center gap-1"
                                onClick={header.column.getToggleSortingHandler?.()}
                              >
                                <table.FlexRender header={header} />
                                {sorted === "asc" ? (
                                  <ArrowUp className="size-3" />
                                ) : sorted === "desc" ? (
                                  <ArrowDown className="size-3" />
                                ) : (
                                  <ChevronsUpDown className="size-3 opacity-40" />
                                )}
                              </button>
                            ) : (
                              <table.FlexRender header={header} />
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 align-middle">
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Searching is a range scan, which has no cursor to page with and no
              affordable exact total — say so rather than showing a Next button
              that would silently do nothing. */}
          {searching ? (
            <p className="text-muted-foreground text-sm">
              Showing the first {page.pageSize} matches. Narrow the search to see
              fewer.
            </p>
          ) : (
            <PaginationBar
              pageIndex={page.pageIndex}
              pageSize={page.pageSize}
              setPageSize={page.setPageSize}
              hasPrev={page.hasPrev}
              hasNext={page.hasNext}
              onPrev={page.prev}
              onNext={page.next}
              total={page.total}
              pageCount={page.pageCount}
              loading={page.isFetching}
              noun="account"
            />
          )}
        </>
      )}
    </div>
  );
}
