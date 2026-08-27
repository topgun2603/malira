"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  changeArticleStatus,
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  listRecentActivity,
  setArticlePinned,
  updateArticle,
  articlesPage,
  type ArticleFilters,
} from "@/lib/api/articles";
import { friendlyError } from "@/lib/firebase/errors";
import { seesOnlyOwnArticles } from "@/lib/permissions";
import { useServerPage } from "@/hooks/use-server-page";
import type { Article, ArticleDraft, ArticleStatus } from "@/lib/types";

export const articleKeys = {
  all: ["articles"] as const,
  list: (filters: ArticleFilters) => ["articles", "list", filters] as const,
  detail: (id: string) => ["articles", "detail", id] as const,
  activity: ["articles", "activity"] as const,
};

function useActor() {
  const { firebaseUser, profile } = useAuth();
  return {
    uid: firebaseUser?.uid ?? "",
    name: profile?.displayName ?? firebaseUser?.email ?? "Unknown",
  };
}

/** Contributors are scoped to their own work at the query level, not the UI. */
export function useArticles(
  filters: ArticleFilters = {},
  options?: Partial<UseQueryOptions<Article[]>>,
) {
  const { firebaseUser, profile } = useAuth();
  const scoped: ArticleFilters = seesOnlyOwnArticles(profile?.role)
    ? { ...filters, createdBy: firebaseUser?.uid }
    : filters;

  return useQuery<Article[]>({
    queryKey: articleKeys.list(scoped),
    queryFn: () => listArticles(scoped),
    enabled: Boolean(profile),
    ...options,
  });
}

export function useArticle(id: string | undefined) {
  return useQuery<Article | null>({
    queryKey: articleKeys.detail(id ?? ""),
    queryFn: () => getArticle(id as string),
    enabled: Boolean(id),
  });
}

export function useRecentActivity(max = 12) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: articleKeys.activity,
    queryFn: () => listRecentActivity(max),
    enabled: Boolean(profile),
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  const actor = useActor();

  return useMutation({
    mutationFn: ({ draft, status }: { draft: ArticleDraft; status: ArticleStatus }) =>
      createArticle(draft, status, actor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();
  const actor = useActor();

  return useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ArticleDraft }) =>
      updateArticle(id, draft, actor),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      queryClient.invalidateQueries({ queryKey: articleKeys.detail(id) });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  const actor = useActor();

  return useMutation({
    mutationFn: ({
      article,
      next,
      note,
    }: {
      article: Article;
      next: ArticleStatus;
      note?: string;
    }) => changeArticleStatus(article, next, actor, note),
    onSuccess: (_, { article }) => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
      queryClient.invalidateQueries({ queryKey: articleKeys.detail(article.id) });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  const actor = useActor();

  return useMutation({
    mutationFn: ({ article, pinned }: { article: Article; pinned: boolean }) =>
      setArticlePinned(article, pinned, actor),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: articleKeys.all }),
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  const actor = useActor();

  return useMutation({
    mutationFn: (article: Article) => deleteArticle(article, actor),
    onSuccess: () => {
      toast.success("Article deleted.");
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/**
 * Server-paged newsroom list.
 *
 * Contributors stay scoped to their own work here exactly as they are in
 * useArticles — the scoping is applied to the query, not to the rendered rows.
 */
export function usePagedArticles(
  filters: Omit<ArticleFilters, "search" | "max"> = {},
) {
  const { firebaseUser, profile } = useAuth();
  const scoped = seesOnlyOwnArticles(profile?.role)
    ? { ...filters, createdBy: firebaseUser?.uid }
    : filters;

  const page = articlesPage(scoped);
  return useServerPage<Article>({
    key: ["articles", "paged", scoped],
    fetchPage: page.fetchPage,
    count: page.count,
    enabled: Boolean(profile),
  });
}
