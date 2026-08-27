"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ArticleForm } from "@/components/news/article-form";
import { useCreateArticle } from "@/hooks/use-articles";
import type { ArticleDraft, ArticleStatus } from "@/lib/types";

const CONFIRMATION: Partial<Record<ArticleStatus, string>> = {
  draft: "Draft saved.",
  in_review: "Submitted for approval.",
  scheduled: "Scheduled.",
  published: "Published to the app.",
};

export default function NewArticlePage() {
  const router = useRouter();
  const createArticle = useCreateArticle();

  async function handleSubmit(draft: ArticleDraft, status: ArticleStatus) {
    const id = await createArticle.mutateAsync({ draft, status });
    toast.success(CONFIRMATION[status] ?? "Saved.");
    router.push(`/admin/news/${id}`);
  }

  return (
    <>
      <PageHeader
        title="New article"
        description="Write in English first. Tamil can follow before you publish."
      />
      <ArticleForm onSubmit={handleSubmit} saving={createArticle.isPending} />
    </>
  );
}
