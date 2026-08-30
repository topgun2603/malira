"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Info, Loader2, Send, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import {
  useDeleteNotification,
  useNotifications,
  useQueueNotification,
  useSendNotification,
} from "@/hooks/use-phase2";
import {
  AUDIENCE_LABELS,
  NOTIFICATION_AUDIENCES,
  type NotificationAudience,
} from "@/lib/types";

export default function NotificationsPage() {
  const { data: history, isLoading } = useNotifications();
  const queueNotification = useQueueNotification();
  const removeNotification = useDeleteNotification();
  const sendNotification = useSendNotification();

  const [title, setTitle] = useState("");
  const [titleTa, setTitleTa] = useState("");
  const [body, setBody] = useState("");
  const [bodyTa, setBodyTa] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");

  function send() {
    if (!title.trim()) return toast.error("The notification needs a title.");
    if (!body.trim()) return toast.error("The notification needs a message.");

    queueNotification.mutate(
      {
        title,
        titleTa,
        body,
        bodyTa,
        audience,
        targetType: "none",
        targetId: null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setTitleTa("");
          setBody("");
          setBodyTa("");
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Compose a push, choose who gets it, and see exactly what lands on the phone."
      />

      <Alert>
        <Info />
        <AlertTitle>Composed here, sent by the server</AlertTitle>
        <AlertDescription>
          <p>
            Pushing to an FCM topic needs a service account, which must never sit
            in a browser bundle. Queueing writes the message; <strong>Send now</strong>{" "}
            asks the server to read it back and push it, so nothing that goes out
            can be altered in the browser first.
          </p>
          <p>
            It reaches every phone subscribed to that audience, signed in or not.
            The server needs <code>FIREBASE_SERVICE_ACCOUNT</code> set; without it
            Send now returns a plain error rather than pretending to have gone out.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------ composer -------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>New notification</CardTitle>
            <CardDescription>
              Keep the title under about 40 characters — Android truncates the rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    value={title}
                    placeholder="Tea auction posts a record price"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    {title.length} characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    rows={3}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
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
                    value={titleTa}
                    onChange={(event) => setTitleTa(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyTa">செய்தி</Label>
                  <Textarea
                    id="bodyTa"
                    lang="ta"
                    rows={3}
                    className="font-tamil"
                    value={bodyTa}
                    onChange={(event) => setBodyTa(event.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="audience">Who gets it</Label>
              <Select
                value={audience}
                onValueChange={(value) => setAudience(value as NotificationAudience)}
              >
                <SelectTrigger id="audience" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_AUDIENCES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {AUDIENCE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Category segments map to FCM topics the app subscribes to, so a
                reader who turned that category off never receives it.
              </p>
            </div>

            <Button onClick={send} disabled={queueNotification.isPending}>
              {queueNotification.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Queue for delivery
            </Button>
          </CardContent>
        </Card>

        {/* ------------------------------- preview -------------------------- */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="size-4" />
                On the phone
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* A close-enough Android heads-up notification, so nobody has to
                  guess how much of the title survives. */}
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="bg-card rounded-lg border p-3 shadow-sm">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded">
                      <Bell className="size-2.5" />
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      RK Matrimony · now
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm font-medium">
                    {title || "Notification title"}
                  </p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {body || "The message body appears here."}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                Tamil speakers see the Tamil fields when their app language is set
                to Tamil, falling back to English when a Tamil field is blank.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------- history ---------------------------- */}
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Send history</h2>
        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : (history ?? []).length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing sent yet"
            description="Every notification you queue is logged here with its delivery counts."
          />
        ) : (
          <StaggerList className="space-y-2">
            {(history ?? []).map((message) => (
              <StaggerItem key={message.id}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            message.status === "sent"
                              ? "default"
                              : message.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="font-normal"
                        >
                          {message.status === "queued"
                            ? "Queued"
                            : message.status === "sent"
                              ? "Sent"
                              : "Failed"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {AUDIENCE_LABELS[message.audience]}
                          {message.createdAt &&
                            ` · ${formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true })}`}
                          {" · by "}
                          {message.createdByName}
                        </span>
                      </div>
                      <p className="font-medium">{message.title}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {message.body}
                      </p>
                      {message.failureReason && (
                        <p className="text-destructive mt-1 text-xs">
                          {message.failureReason}
                        </p>
                      )}
                    </div>

                    <div className="text-muted-foreground flex shrink-0 gap-5 text-sm">
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {message.deliveredCount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs">Delivered</p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {message.openedCount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs">Opened</p>
                      </div>
                    </div>

                    {message.status === "queued" && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={sendNotification.isPending}
                        onClick={() => sendNotification.mutate(message.id)}
                      >
                        {sendNotification.isPending &&
                        sendNotification.variables === message.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Send now
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 shrink-0"
                      aria-label="Remove from history"
                      onClick={() => removeNotification.mutate(message.id)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </>
  );
}
