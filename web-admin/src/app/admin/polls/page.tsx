"use client";

import { useState } from "react";
import { BarChart3, Loader2, Pause, Play, Plus, Trash2, X } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import {
  useCreatePoll,
  useDeletePoll,
  usePagedPolls,
  useSetPollStatus,
  useUpdatePoll,
} from "@/hooks/use-engagement";
import type { Poll, PollOption } from "@/lib/types";
import { POLL_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

function blankOption(index: number): PollOption {
  return { id: `opt${index}`, label: "", labelTa: "" };
}

const EMPTY = {
  question: "",
  questionTa: "",
  options: [blankOption(1), blankOption(2)],
  placement: "sidebar" as Poll["placement"],
  closesAt: null as Date | null,
};

export default function PollsPage() {
  const page = usePagedPolls();
  const polls = page.items;
  const isLoading = page.isLoading;
  const createPoll = useCreatePoll();
  const updatePoll = useUpdatePoll();
  const setStatus = useSetPollStatus();
  const deletePoll = useDeletePoll();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Poll | null>(null);

  function startNew() {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  }

  function startEdit(poll: Poll) {
    setEditing(poll);
    setDraft({
      question: poll.question,
      questionTa: poll.questionTa,
      options: poll.options,
      placement: poll.placement,
      closesAt: poll.closesAt ? poll.closesAt.toDate() : null,
    });
    setOpen(true);
  }

  function setOption(index: number, patch: Partial<PollOption>) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function addOption() {
    setDraft((current) => ({
      ...current,
      options: [...current.options, blankOption(current.options.length + 1)],
    }));
  }

  function removeOption(index: number) {
    setDraft((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
    }));
  }

  function save() {
    if (!draft.question.trim()) {
      toast.error("The poll needs a question.");
      return;
    }
    const filled = draft.options.filter((option) => option.label.trim());
    if (filled.length < 2) {
      toast.error("A poll needs at least two answers.");
      return;
    }

    const payload = { ...draft, options: filled };

    if (editing) {
      // Editing an option after voting has started would strand existing votes
      // against ids that no longer exist, so this is blocked once it is live.
      updatePoll.mutate(
        { id: editing.id, draft: payload },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createPoll.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  }

  const busy = createPoll.isPending || updatePoll.isPending;

  return (
    <>
      <PageHeader
        title="Polls"
        description="One running poll per surface. Readers vote without signing in, one vote per browser."
        actions={
          <Button onClick={startNew}>
            <Plus className="size-4" />
            New poll
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : polls.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No polls yet"
          description="A poll appears in the reader sidebar or beside an article, and results show as soon as someone votes."
          action={<Button onClick={startNew}>Create the first poll</Button>}
        />
      ) : (
        <StaggerList className="space-y-3">
          {polls.map((poll) => {
            const total = Math.max(1, poll.totalVotes);
            return (
              <StaggerItem key={poll.id}>
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={poll.status === "active" ? "default" : "secondary"}
                            className="font-normal"
                          >
                            {POLL_STATUS_LABELS[poll.status]}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {poll.placement === "both"
                              ? "Sidebar + articles"
                              : poll.placement === "sidebar"
                                ? "Sidebar"
                                : "Articles"}
                            {" · "}
                            {poll.totalVotes.toLocaleString("en-IN")} votes
                          </span>
                        </div>
                        <p className="font-medium">{poll.question}</p>
                        {poll.questionTa && (
                          <p className="text-muted-foreground font-tamil text-sm">
                            {poll.questionTa}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {poll.status !== "active" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setStatus.mutate({ id: poll.id, status: "active" })
                            }
                          >
                            <Play className="size-4" />
                            Run
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setStatus.mutate({ id: poll.id, status: "closed" })
                            }
                          >
                            <Pause className="size-4" />
                            Close
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(poll)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9"
                          aria-label="Delete poll"
                          onClick={() => setPendingDelete(poll)}
                        >
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const count = poll.counts[option.id] ?? 0;
                        const share = Math.round((count / total) * 100);
                        return (
                          <div key={option.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="truncate">{option.label}</span>
                              <span className="text-muted-foreground shrink-0 tabular-nums">
                                {count.toLocaleString("en-IN")} · {share}%
                              </span>
                            </div>
                            <div className="bg-muted h-2 overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
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
        noun="poll"
      />

      {/* ------------------------------- editor ------------------------------ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit poll" : "New poll"}</DialogTitle>
            <DialogDescription>
              Tamil is optional. Readers see English when a Tamil field is blank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={draft.question}
                placeholder="Should the district sports day be held in April?"
                onChange={(event) =>
                  setDraft({ ...draft, question: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionTa">கேள்வி</Label>
              <Input
                id="questionTa"
                lang="ta"
                className="font-tamil"
                value={draft.questionTa}
                onChange={(event) =>
                  setDraft({ ...draft, questionTa: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Answers</Label>
              {draft.options.map((option, index) => (
                <div key={option.id} className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={option.label}
                      placeholder={`Answer ${index + 1}`}
                      onChange={(event) =>
                        setOption(index, { label: event.target.value })
                      }
                    />
                    <Input
                      lang="ta"
                      className="font-tamil h-8 text-sm"
                      value={option.labelTa}
                      placeholder="தமிழ் (optional)"
                      onChange={(event) =>
                        setOption(index, { labelTa: event.target.value })
                      }
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="mt-0.5 shrink-0"
                    aria-label={`Remove answer ${index + 1}`}
                    disabled={draft.options.length <= 2}
                    onClick={() => removeOption(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="size-4" />
                Add answer
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement">Where it appears</Label>
              <Select
                value={draft.placement}
                onValueChange={(value) =>
                  setDraft({ ...draft, placement: value as Poll["placement"] })
                }
              >
                <SelectTrigger id="placement" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sidebar">Home sidebar</SelectItem>
                  <SelectItem value="article">Beside articles</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {editing && editing.totalVotes > 0 && (
            <p className={cn("text-muted-foreground text-xs")}>
              This poll already has {editing.totalVotes} votes. Renaming an answer
              keeps its votes; removing one discards them.
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create poll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(value) => !value && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
            <AlertDialogDescription>
              The question and all {pendingDelete?.totalVotes ?? 0} votes are removed
              permanently. Closing it instead keeps the results visible to readers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deletePoll.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
