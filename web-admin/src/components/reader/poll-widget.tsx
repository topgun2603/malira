"use client";

import { useState } from "react";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivePoll, useCastVote } from "@/hooks/use-engagement";
import { readVotedOptions } from "@/lib/api/polls";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language";

export function PollWidget({ surface }: { surface: "sidebar" | "article" }) {
  const { lang, pick, langAttr } = useLanguage();
  const { data: poll, isLoading } = useActivePoll(surface);
  const castVote = useCastVote();

  // Read the whole map once via a lazy initialiser rather than on every render
  // or in an effect, so results show immediately for a returning voter.
  const [priorVotes] = useState(readVotedOptions);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [pendingOption, setPendingOption] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }
  if (!poll) return null;

  const alreadyVoted = votedOption ?? priorVotes[poll.id] ?? null;
  const showResults = Boolean(alreadyVoted) || poll.status === "closed";
  const total = Math.max(1, poll.totalVotes);

  function vote(optionId: string) {
    if (!poll || alreadyVoted || poll.status !== "active") return;
    setPendingOption(optionId);
    castVote.mutate(
      { pollId: poll.id, optionId },
      {
        onSuccess: () => setVotedOption(optionId),
        onSettled: () => setPendingOption(null),
      },
    );
  }

  return (
    <section className="bg-card rounded-xl border p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="text-primary size-4" />
        {lang === "ta" ? "வாசகர் கருத்து" : "Reader poll"}
      </h2>

      <p
        lang={langAttr(poll.question, poll.questionTa)}
        className={cn(
          "mb-3 text-sm leading-snug font-medium",
          langAttr(poll.question, poll.questionTa) === "ta" && "font-tamil",
        )}
      >
        {pick(poll.question, poll.questionTa)}
      </p>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const count = poll.counts[option.id] ?? 0;
          const share = Math.round((count / total) * 100);
          const isChoice = alreadyVoted === option.id;
          const busy = pendingOption === option.id;

          if (showResults) {
            return (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      isChoice && "font-medium",
                    )}
                  >
                    {isChoice && <Check className="text-primary size-3.5" />}
                    {pick(option.label, option.labelTa)}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{share}%</span>
                </div>
                {/* The bar is the mark; the number beside it carries the value. */}
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isChoice ? "bg-primary" : "bg-primary/35",
                    )}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <Button
              key={option.id}
              variant="outline"
              className="h-auto w-full justify-start py-2 text-left text-sm whitespace-normal"
              disabled={castVote.isPending}
              onClick={() => vote(option.id)}
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {pick(option.label, option.labelTa)}
            </Button>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        {poll.totalVotes.toLocaleString("en-IN")}{" "}
        {lang === "ta" ? "வாக்குகள்" : poll.totalVotes === 1 ? "vote" : "votes"}
        {poll.status === "closed" && (lang === "ta" ? " · முடிந்தது" : " · closed")}
      </p>
    </section>
  );
}
