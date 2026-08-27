"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, IndianRupee, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/shared/states";
import {
  ModerationTable,
  type ModerationFilterState,
} from "@/components/matrimony/moderation-table";
import {
  useModerateProfile,
  useModerationPage,
  useReports,
  useResolveReport,
} from "@/hooks/use-matrimony";
import type { MatrimonyProfile, MatrimonyStatus } from "@/lib/types";

const QUEUES: Array<{ value: MatrimonyStatus | "all"; label: string }> = [
  { value: "pending", label: "Awaiting review" },
  { value: "approved", label: "Live" },
  { value: "rejected", label: "Sent back" },
  { value: "all", label: "All" },
];

export default function MatrimonyModerationPage() {
  const [queue, setQueue] = useState<MatrimonyStatus | "all">("pending");
  const [filters, setFilters] = useState<ModerationFilterState>({
    search: "",
    gender: "all",
    marital: "all",
  });

  // Every one of these goes into the Firestore query, so paging walks the
  // filtered set rather than a window that happened to be loaded.
  const page = useModerationPage({
    status: queue,
    gender: filters.gender,
    maritalStatus:
      filters.marital === "all"
        ? "all"
        : (filters.marital as Parameters<typeof useModerationPage>[0]["maritalStatus"]),
    search: filters.search,
  });
  const isLoading = page.isLoading;
  const { data: reports } = useReports();
  const moderate = useModerateProfile();
  const resolveReport = useResolveReport();

  const [rejecting, setRejecting] = useState<MatrimonyProfile | null>(null);
  const [note, setNote] = useState("");

  function reject() {
    if (!rejecting) return;
    if (!note.trim()) {
      toast.error("Tell them what needs fixing.");
      return;
    }
    moderate.mutate(
      { uid: rejecting.id, status: "rejected", note: note.trim() },
      {
        onSuccess: () => {
          setRejecting(null);
          setNote("");
        },
      },
    );
  }

  const openReports = (reports ?? []).filter((report) => !report.resolved);

  return (
    <>
      <PageHeader
        title="Matrimony"
        description="Every profile is reviewed before it appears. Contact details are never shown here or in search."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/matrimony/plans">
              <IndianRupee className="size-4" />
              Plans &amp; pricing
            </Link>
          </Button>
        }
      />

      <Alert>
        <ShieldCheck />
        <AlertTitle>What this desk can and cannot see</AlertTitle>
        <AlertDescription>
          <p>
            Photographs are shown here, including the ones a member has chosen to
            hold back from search — you cannot approve a listing you have not
            seen. Phone numbers and email addresses are not displayed on this
            screen.
          </p>
          <p>
            Approving publishes the profile to signed-in members only — matrimony
            is never readable by the public web, unlike the news feed.
          </p>
        </AlertDescription>
      </Alert>

      {openReports.length > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 font-medium">
              <Flag className="text-destructive size-4" />
              {openReports.length} open report{openReports.length === 1 ? "" : "s"}
            </h2>
            <ul className="space-y-2">
              {openReports.map((report) => (
                <li
                  key={report.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{report.profileName}</p>
                    <p className="text-muted-foreground">{report.reason}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        moderate.mutate({
                          uid: report.profileId,
                          status: "rejected",
                          note: "Taken down following a report.",
                        })
                      }
                    >
                      Take down
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveReport.mutate(report.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs value={queue} onValueChange={(value) => setQueue(value as MatrimonyStatus)}>
        <TabsList>
          {QUEUES.map((entry) => (
            <TabsTrigger key={entry.value} value={entry.value}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={queue} className="mt-4">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <ModerationTable
              page={page}
              filters={filters}
              onFiltersChange={setFilters}
              busy={moderate.isPending}
              onApprove={(profile) =>
                moderate.mutate({ uid: profile.id, status: "approved" })
              }
              onReject={(profile) => setRejecting(profile)}
            />
          )}
        </TabsContent>
      </Tabs>

      <Alert>
        <Info />
        <AlertTitle>Moderation is a staffing commitment</AlertTitle>
        <AlertDescription>
          Profiles stay invisible until someone reviews them. Without a named
          moderator and a same-day turnaround, this module is dead on arrival
          however well it is built.
        </AlertDescription>
      </Alert>

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this profile back</DialogTitle>
            <DialogDescription>
              The note is shown to whoever posted it, and they can edit and
              resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note">What needs fixing?</Label>
            <Textarea
              id="note"
              rows={4}
              value={note}
              placeholder="The photograph shows more than one person. Please upload one of the candidate alone."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button onClick={reject} disabled={moderate.isPending}>
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
