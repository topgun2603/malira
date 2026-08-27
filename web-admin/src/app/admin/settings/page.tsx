"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { FullPageSpinner } from "@/components/shared/states";
import { useAppSettings, useSaveAppSettings } from "@/hooks/use-phase2";
import type { AppSettings } from "@/lib/types";

type Draft = Omit<AppSettings, "updatedAt" | "updatedBy">;

export default function SettingsPage() {
  const { data: settings, isLoading } = useAppSettings();

  if (isLoading || !settings) {
    return <FullPageSpinner label="Loading settings..." />;
  }

  // The form owns its own state, seeded once from the loaded document. Copying
  // the query into state through an effect would both trip the cascading-render
  // rule and let a background refetch wipe an editor's unsaved typing.
  return <SettingsForm settings={settings} />;
}

function SettingsForm({ settings }: { settings: AppSettings }) {
  const saveSettings = useSaveAppSettings();
  const [draft, setDraft] = useState<Draft>(() => {
    const { updatedAt, updatedBy, ...rest } = settings;
    void updatedAt;
    void updatedBy;
    return rest;
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="App pages, contact details and release controls."
        actions={
          <Button
            onClick={() => saveSettings.mutate(draft)}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save settings
          </Button>
        }
      />

      {settings.updatedAt && (
        <p className="text-muted-foreground text-sm">
          Last saved {format(settings.updatedAt.toDate(), "d MMM yyyy, h:mm a")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Shown on the About page in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aboutTitle">Page title</Label>
              <Input
                id="aboutTitle"
                value={draft.aboutTitle}
                onChange={(event) => set("aboutTitle", event.target.value)}
              />
            </div>

            <Tabs defaultValue="en">
              <TabsList className="mb-3">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ta" className="font-tamil">
                  தமிழ்
                </TabsTrigger>
              </TabsList>
              <TabsContent value="en">
                <Textarea
                  rows={8}
                  value={draft.aboutBody}
                  placeholder="Who runs this publication, what it covers, and how to get in touch."
                  onChange={(event) => set("aboutBody", event.target.value)}
                />
              </TabsContent>
              <TabsContent value="ta">
                <Textarea
                  lang="ta"
                  rows={8}
                  className="font-tamil"
                  value={draft.aboutBodyTa}
                  onChange={(event) => set("aboutBodyTa", event.target.value)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                Where feedback from the app is sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={draft.contactEmail}
                  onChange={(event) => set("contactEmail", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={draft.contactPhone}
                  onChange={(event) => set("contactPhone", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactAddress">Address</Label>
                <Textarea
                  id="contactAddress"
                  rows={3}
                  value={draft.contactAddress}
                  onChange={(event) => set("contactAddress", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>App releases</CardTitle>
              <CardDescription>
                The force-update switch for a critical release.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minAndroidVersion">
                  Minimum Android version code
                </Label>
                <Input
                  id="minAndroidVersion"
                  type="number"
                  min={1}
                  value={draft.minAndroidVersion}
                  onChange={(event) =>
                    set("minAndroidVersion", Number(event.target.value) || 1)
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Anything below this is considered out of date.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="forceUpdate">Force the update</Label>
                  <p className="text-muted-foreground text-xs">
                    Blocks the app until the reader updates.
                  </p>
                </div>
                <Switch
                  id="forceUpdate"
                  checked={draft.forceUpdate}
                  onCheckedChange={(checked) => set("forceUpdate", checked)}
                />
              </div>

              {draft.forceUpdate && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertTitle>This locks people out</AlertTitle>
                  <AlertDescription>
                    Every reader below version {draft.minAndroidVersion} loses access
                    until they update. Confirm the new build is actually live on the
                    Play Store before turning this on.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="updateMessage">Update message</Label>
                <Input
                  id="updateMessage"
                  value={draft.updateMessage}
                  onChange={(event) => set("updateMessage", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playStoreUrl">Play Store link</Label>
                <Input
                  id="playStoreUrl"
                  value={draft.playStoreUrl}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  onChange={(event) => set("playStoreUrl", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
