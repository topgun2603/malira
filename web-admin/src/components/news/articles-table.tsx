"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import NextImage from "next/image";
import { useMemo, useState } from "react";
import {
  Eye,
  FileText,
  ImageIcon,
  MoreHorizontal,
  Pin,
  PinOff,
  SquarePen,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/shared/states";
import {
  useChangeStatus,
  useDeleteArticle,
  useTogglePin,
} from "@/hooks/use-articles";
import { useCategoryMap } from "@/hooks/use-categories";
import { can, canEditArticle } from "@/lib/permissions";
import type { Article } from "@/lib/types";
import { StatusBadge } from "./status-badge";

/**
 * Sorting only. Paging is done by Firestore now, so a client-side paginator
 * would slice a page that has already been sliced — and mislead about how many
 * articles there are.
 *
 * Sorting therefore orders the current page, not the whole collection. That is
 * the honest trade for not reading every article to show twenty-five.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, Article>();

const EMPTY: Article[] = [];

function relative(timestamp: Article["updatedAt"]): string {
  if (!timestamp) return "—";
  return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
}

export function ArticlesTable({ articles }: { articles: Article[] }) {
  const { profile, firebaseUser } = useAuth();
  const categories = useCategoryMap();
  const changeStatus = useChangeStatus();
  const togglePin = useTogglePin();
  const deleteArticle = useDeleteArticle();
  const [pendingDelete, setPendingDelete] = useState<Article | null>(null);

  const role = profile?.role;
  const uid = firebaseUser?.uid;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("title", {
          header: "Headline",
          cell: ({ row }) => {
            const article = row.original;
            const lead = article.images[0];
            return (
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-muted text-muted-foreground relative size-11 shrink-0 overflow-hidden rounded-md">
                  {lead ? (
                    <NextImage
                      src={lead.url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : (
                    <ImageIcon className="absolute inset-0 m-auto size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {article.pinned && (
                      <Pin className="text-brand-saffron size-3 shrink-0" />
                    )}
                    <Link
                      href={`/admin/news/${article.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {article.title || "Untitled"}
                    </Link>
                  </div>
                  {article.titleTa && (
                    <p className="text-muted-foreground font-tamil truncate text-xs">
                      {article.titleTa}
                    </p>
                  )}
                </div>
              </div>
            );
          },
        }),

        helper.accessor("categoryId", {
          header: "Category",
          cell: ({ row }) => {
            const category = categories.get(row.original.categoryId);
            return category ? (
              <Badge variant="secondary" className="font-normal">
                {category.name}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs">Uncategorised</span>
            );
          },
        }),

        helper.accessor("status", {
          header: "Status",
          cell: ({ row }) => <StatusBadge status={row.original.status} />,
        }),

        helper.accessor("authorName", {
          header: "Author",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm">
              {row.original.authorName || row.original.createdByName || "—"}
            </span>
          ),
        }),

        helper.accessor((article) => article.updatedAt?.toMillis() ?? 0, {
          id: "updatedAt",
          header: "Updated",
          cell: ({ row }) => (
            <span className="text-muted-foreground text-sm whitespace-nowrap">
              {relative(row.original.updatedAt)}
            </span>
          ),
        }),

        helper.accessor("viewCount", {
          header: "Views",
          cell: ({ row }) => (
            <span className="text-muted-foreground flex items-center gap-1 text-sm tabular-nums">
              <Eye className="size-3.5" />
              {row.original.viewCount.toLocaleString("en-IN")}
            </span>
          ),
        }),

        helper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const article = row.original;
            const editable = canEditArticle(role, uid, article);
            const publisher = can(role, "news.publish");

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {editable && (
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/news/${article.id}`}>
                        <SquarePen className="size-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {publisher && article.status !== "published" && (
                    <DropdownMenuItem
                      onSelect={() =>
                        changeStatus.mutate(
                          { article, next: "published" },
                          { onSuccess: () => toast.success("Published.") },
                        )
                      }
                    >
                      <Upload className="size-4" />
                      Publish now
                    </DropdownMenuItem>
                  )}

                  {publisher && article.status === "published" && (
                    <>
                      <DropdownMenuItem
                        onSelect={() =>
                          togglePin.mutate({ article, pinned: !article.pinned })
                        }
                      >
                        {article.pinned ? (
                          <>
                            <PinOff className="size-4" />
                            Unpin from feed
                          </>
                        ) : (
                          <>
                            <Pin className="size-4" />
                            Pin to top
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          changeStatus.mutate(
                            { article, next: "unpublished" },
                            { onSuccess: () => toast.success("Taken off the feed.") },
                          )
                        }
                      >
                        <Undo2 className="size-4" />
                        Unpublish
                      </DropdownMenuItem>
                    </>
                  )}

                  {can(role, "news.delete") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete(article)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        }),
      ]),
    [categories, role, uid, changeStatus, togglePin],
  );

  const table = useTable(
    {
      features,
      columns,
      data: articles.length > 0 ? articles : EMPTY,
    },
    (state) => ({ sorting: state.sorting }),
  );

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No articles match this view"
        description="Change the filters above, or write the first story for this category."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className="h-10">
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this article?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; will be removed permanently. If it
              is live in the app, readers lose it immediately. Unpublish instead if
              you only want it off the feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteArticle.mutate(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
