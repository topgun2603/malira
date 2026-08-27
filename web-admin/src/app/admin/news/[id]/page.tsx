"use client";

import { useParams, useRouter } from "next/navigation";
import { AlertCircle, FileQuestion } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ArticleForm } from "@/components/news/article-form";
import { EmptyState, FullPageSpinner } from "@/components/shared/states";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useArticle,
  useChangeStatus,
  useUpdateArticle,
} from "@/hooks/use-articles";
import { canEditArticle } from "@/lib/permissions";
import type { ArticleDraft, ArticleStatus } from "@/lib/types";

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, firebaseUser } = useAuth();

  const { data: article, isLoading } = useArticle(params.id);
  const updateArticle = useUpdateArticle();
  const changeStatus = useChangeStatus();

  if (isLoading) return <FullPageSpinner label="Opening the article..." />;

  if (!article) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Article not found"
        description="It may have been deleted by an editor."
        action={
          <Button variant="outline" onClick={() => router.push("/admin/news")}>
            Back to news
          </Button>
        }
      />
    );
  }

  const editable = canEditArticle(profile?.role, firebaseUser?.uid, article);

  async function handleSubmit(draft: ArticleDraft, status: ArticleStatus) {
    if (!article) return;

    await updateArticle.mutateAsync({ id: article.id, draft });

    // Saving and moving the article along are two separate writes so the
    // activity log records the edit and the transition independently.
    if (status !== article.status) {
      await changeStatus.mutateAsync({ article, next: status });
    }

    toast.success(
      status === "published"
        ? "Published to the app."
        : status === "in_review"
          ? "Submitted for approval."
          : "Changes saved.",
    );
  }

  return (
    <>
      <PageHeader
        title="Edit article"
        description={
          article.publishedAt
            ? `First published ${article.publishedAt.toDate().toLocaleDateString("en-IN")}`
            : "Not published yet."
        }
      />

      {article.status === "rejected" && article.reviewNote && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Sent back by an editor</AlertTitle>
          <AlertDescription>{article.reviewNote}</AlertDescription>
        </Alert>
      )}

      {!editable ? (
        <Alert>
          <AlertCircle />
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            This article is with an editor. You can edit it again if it is sent back
            to you.
          </AlertDescription>
        </Alert>
      ) : (
        <ArticleForm
          article={article}
          onSubmit={handleSubmit}
          saving={updateArticle.isPending || changeStatus.isPending}
        />
      )}
    </>
  );
}
