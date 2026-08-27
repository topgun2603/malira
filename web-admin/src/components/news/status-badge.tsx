import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ArticleStatus } from "@/lib/types";

const TONE: Record<ArticleStatus, string> = {
  draft: "bg-status-draft/10 text-status-draft border-status-draft/25",
  in_review: "bg-status-review/12 text-status-review border-status-review/30",
  scheduled: "bg-status-scheduled/12 text-status-scheduled border-status-scheduled/30",
  published: "bg-status-published/12 text-status-published border-status-published/30",
  rejected: "bg-status-rejected/12 text-status-rejected border-status-rejected/30",
  unpublished: "bg-status-draft/10 text-status-draft border-status-draft/25",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ArticleStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
