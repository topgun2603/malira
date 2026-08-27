"use client";

import { useState } from "react";
import { Archive, CalendarDays, Loader2, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { ImageUploader } from "@/components/news/image-uploader";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import {
  EventsTable,
  type EventFilterState,
} from "@/components/events/events-table";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useArchivePastEvents,
  useCreateEvent,
  useDeleteEvent,
  usePagedEvents,
  useSetEventStatus,
  useUpdateEvent,
} from "@/hooks/use-phase2";
import type { EventDraft } from "@/lib/api/events";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  RECURRENCE_LABELS,
  RECURRENCE_OPTIONS,
  type ArticleImage,
  type EventCategory,
  type EventItem,
  type EventStatus,
  type Recurrence,
} from "@/lib/types";

const EMPTY: EventDraft = {
  title: "",
  titleTa: "",
  description: "",
  descriptionTa: "",
  category: "meeting",
  startsAt: null,
  endsAt: null,
  venue: "",
  venueTa: "",
  mapUrl: "",
  organiserName: "",
  organiserPhone: "",
  poster: null,
  recurrence: "none",
};

function toLocal(date: Date | null): string {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDraft(event: EventItem): EventDraft {
  return {
    title: event.title,
    titleTa: event.titleTa,
    description: event.description,
    descriptionTa: event.descriptionTa,
    category: event.category,
    startsAt: event.startsAt ? event.startsAt.toDate() : null,
    endsAt: event.endsAt ? event.endsAt.toDate() : null,
    venue: event.venue,
    venueTa: event.venueTa,
    mapUrl: event.mapUrl,
    organiserName: event.organiserName,
    organiserPhone: event.organiserPhone,
    poster: event.poster,
    recurrence: event.recurrence,
  };
}

export default function EventsPage() {
  const { profile } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const [filters, setFilters] = useState<EventFilterState>({
    status: "all",
    category: "all",
  });

  // All three go into the Firestore query, so paging walks the matching events
  // rather than a window that happened to be loaded.
  const page = usePagedEvents({ archived: showArchived, ...filters });
  const events = page.items;
  const isLoading = page.isLoading;
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const setStatus = useSetEventStatus();
  const deleteEvent = useDeleteEvent();
  const archivePast = useArchivePastEvents();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [draft, setDraft] = useState<EventDraft>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<EventItem | null>(null);

  const uploadKey = `event-${editing?.id ?? profile?.id ?? "new"}`;

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  }

  function startEdit(event: EventItem) {
    setEditing(event);
    setDraft(toDraft(event));
    setOpen(true);
  }

  function save(status: EventStatus) {
    if (!draft.title.trim()) return toast.error("The event needs a title.");
    if (!draft.startsAt) return toast.error("Pick a start date and time.");
    if (draft.endsAt && draft.endsAt <= draft.startsAt) {
      return toast.error("The end time must be after the start time.");
    }
    if (status === "published" && !draft.venue.trim()) {
      return toast.error("A published event needs a venue.");
    }

    if (editing) {
      updateEvent.mutate(
        { id: editing.id, draft },
        {
          onSuccess: () => {
            if (status !== editing.status) {
              setStatus.mutate({ id: editing.id, status });
            }
            setOpen(false);
          },
        },
      );
    } else {
      createEvent.mutate({ draft, status }, { onSuccess: () => setOpen(false) });
    }
  }

  const busy = createEvent.isPending || updateEvent.isPending;

  return (
    <>
      <PageHeader
        title="Events"
        description="Festivals, public meetings, functions, sports and cultural events."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => archivePast.mutate()}
              disabled={archivePast.isPending}
            >
              {archivePast.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Archive className="size-4" />
              )}
              Tidy past events
            </Button>
            <Button onClick={startNew}>
              <Plus className="size-4" />
              New event
            </Button>
          </div>
        }
      />

      <div className="flex gap-2">
        <Button
          variant={showArchived ? "outline" : "secondary"}
          size="sm"
          onClick={() => setShowArchived(false)}
        >
          Current
        </Button>
        <Button
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowArchived(true)}
        >
          Archived
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            showArchived
              ? "Nothing archived yet"
              : filters.status !== "all" || filters.category !== "all"
                ? "Nothing matches"
                : "No events yet"
          }
          description={
            showArchived
              ? "Finished one-off events move here when you tidy up."
              : filters.status !== "all" || filters.category !== "all"
                ? "No event in the diary matches the current filters."
                : "Add an event and it appears in the app calendar."
          }
          action={
            !showArchived &&
            filters.status === "all" &&
            filters.category === "all" && (
              <Button onClick={startNew}>Add the first event</Button>
            )
          }
        />
      ) : (
        <EventsTable
          page={page}
          filters={filters}
          onFiltersChange={setFilters}
          busy={setStatus.isPending}
          onSetStatus={(event, status) => setStatus.mutate({ id: event.id, status })}
          onEdit={startEdit}
          onDelete={setPendingDelete}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              Everything except the Tamil fields is required before publishing.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="en">
            <TabsList className="mb-3">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ta" className="font-tamil">
                தமிழ்
              </TabsTrigger>
            </TabsList>

            <TabsContent value="en" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(event) => set("title", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={draft.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={draft.venue}
                  placeholder="Community hall, village or town"
                  onChange={(event) => set("venue", event.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="ta" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titleTa">தலைப்பு</Label>
                <Input
                  id="titleTa"
                  lang="ta"
                  className="font-tamil"
                  value={draft.titleTa}
                  onChange={(event) => set("titleTa", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionTa">விவரம்</Label>
                <Textarea
                  id="descriptionTa"
                  lang="ta"
                  rows={4}
                  className="font-tamil"
                  value={draft.descriptionTa}
                  onChange={(event) => set("descriptionTa", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueTa">இடம்</Label>
                <Input
                  id="venueTa"
                  lang="ta"
                  className="font-tamil"
                  value={draft.venueTa}
                  onChange={(event) => set("venueTa", event.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={toLocal(draft.startsAt)}
                onChange={(event) =>
                  set("startsAt", event.target.value ? new Date(event.target.value) : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends (optional)</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={toLocal(draft.endsAt)}
                onChange={(event) =>
                  set("endsAt", event.target.value ? new Date(event.target.value) : null)
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={draft.category}
                onValueChange={(value) => set("category", value as EventCategory)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {EVENT_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence">Repeats</Label>
              <Select
                value={draft.recurrence}
                onValueChange={(value) => set("recurrence", value as Recurrence)}
              >
                <SelectTrigger id="recurrence" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {RECURRENCE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                A repeating event rolls forward instead of being archived.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapUrl">Map link (optional)</Label>
            <Input
              id="mapUrl"
              value={draft.mapUrl}
              placeholder="Paste a Google Maps link"
              onChange={(event) => set("mapUrl", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organiserName">Organiser</Label>
              <Input
                id="organiserName"
                value={draft.organiserName}
                onChange={(event) => set("organiserName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organiserPhone">Contact number</Label>
              <Input
                id="organiserPhone"
                value={draft.organiserPhone}
                onChange={(event) => set("organiserPhone", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Poster (optional)</Label>
            <ImageUploader
              value={draft.poster ? [draft.poster] : []}
              articleKey={uploadKey}
              onChange={(images: ArticleImage[]) => set("poster", images[0] ?? null)}
              disabled={busy}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => save("draft")} disabled={busy}>
              Save draft
            </Button>
            <Button onClick={() => save("published")} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Publish
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
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; is removed permanently. If people
              have already set a reminder, cancelling it instead tells them why.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteEvent.mutate(pendingDelete.id);
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
