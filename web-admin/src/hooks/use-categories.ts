"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createCategory,
  deleteCategory,
  listCategories,
  seedCategories,
  updateCategory,
} from "@/lib/api/categories";
import { friendlyError } from "@/lib/firebase/errors";
import type { Category } from "@/lib/types";

export const categoryKeys = { all: ["categories"] as const };

export function useCategories() {
  const { profile } = useAuth();
  return useQuery<Category[]>({
    queryKey: categoryKeys.all,
    queryFn: listCategories,
    enabled: Boolean(profile),
    staleTime: 5 * 60_000,
  });
}

/** Convenience for tables that only need an id to name lookup. */
export function useCategoryMap() {
  const { data } = useCategories();
  return new Map((data ?? []).map((category) => [category.id, category]));
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success("Category added.");
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Category> }) =>
      updateCategory(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Category removed.");
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

export function useSeedCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: seedCategories,
    onSuccess: (count) => {
      toast.success(
        count > 0
          ? "Added the seven default categories."
          : "Categories already exist, nothing to seed.",
      );
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}
