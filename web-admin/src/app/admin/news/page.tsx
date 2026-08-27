"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ArticlesTable } from "@/components/news/articles-table";
import { TableSkeleton } from "@/components/shared/states";
import { useAuth } from "@/components/providers/auth-provider";
import { usePagedArticles } from "@/hooks/use-articles";
import { useCategories } from "@/hooks/use-categories";
import { seesOnlyOwnArticles } from "@/lib/permissions";
import { ARTICLE_STATUSES, STATUS_LABELS, type ArticleStatus } from "@/lib/types";

export default function NewsPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ArticleStatus | "all">("all");
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories } = useCategories();
  const page = usePagedArticles({ status, categoryId });
  // Keyword search filters the page in hand: Firestore has no full-text
  // index, so searching the whole collection would mean reading all of it.
  const articles = search.trim()
    ? page.items.filter((article) =>
        [article.title, article.titleTa, article.summary, article.authorName, ...article.tags]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : page.items;
  const isLoading = page.isLoading;

  const ownOnly = seesOnlyOwnArticles(profile?.role);

  return (
    <>
      <PageHeader
        title={ownOnly ? "My articles" : "News"}
        description={
          ownOnly
            ? "Your drafts and submissions. An editor reviews anything you submit."
            : "Everything written for the app, across every status."
        }
        actions={
          <Button asChild>
            <Link href="/admin/news/new">
              <Plus className="size-4" />
              New article
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            placeholder="Search headlines, authors and tags"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => setStatus(value as ArticleStatus | "all")}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ARTICLE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <ArticlesTable articles={articles} />
          {search.trim() && (
            <p className="text-muted-foreground text-sm">
              Searching the {page.items.length} articles on this page. Clear the
              search to page through the rest.
            </p>
          )}
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
            noun="article"
          />
        </>
      )}
    </>
  );
}
