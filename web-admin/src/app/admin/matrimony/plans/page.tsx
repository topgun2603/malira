"use client";

import { useState } from "react";
import { ArrowLeft, IndianRupee, Loader2, Plus, Save, Trash2, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
  useCreatePlan,
  useDeletePlan,
  useMatrimonyLimits,
  usePagedPlans,
  useSaveMatrimonyLimits,
  useSeedDefaultPlan,
  useUpdatePlan,
} from "@/hooks/use-plans";
import type { PlanDraft } from "@/lib/api/plans";
import {
  DEFAULT_MATRIMONY_LIMITS,
  PLAN_KINDS,
  PLAN_KIND_LABELS,
  type SubscriptionPlan,
} from "@/lib/types";
import Link from "next/link";
import { PriceTag } from "@/components/matrimony/price-tag";

const EMPTY: PlanDraft = {
  kind: "matrimony",
  name: "",
  nameTa: "",
  priceInPaise: 49900,
  mrpInPaise: 99900,
  months: 6,
  features: [""],
  featuresTa: [],
  photoOverride: false,
  highlight: false,
  active: true,
  order: 1,
};

export default function PlansPage() {
  const page = usePagedPlans();
  const plans = page.items;
  const isLoading = page.isLoading;
  const { data: limits } = useMatrimonyLimits();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const seedPlan = useSeedDefaultPlan();
  const saveLimits = useSaveMatrimonyLimits();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<SubscriptionPlan | null>(null);

  // Free-tier fields are seeded from the loaded document on first render only.
  const [freeViews, setFreeViews] = useState<number | null>(null);
  const [freeInterests, setFreeInterests] = useState<number | null>(null);

  const views = freeViews ?? limits?.freeProfileViews ?? DEFAULT_MATRIMONY_LIMITS.freeProfileViews;
  const interests =
    freeInterests ?? limits?.freeInterestsPerMonth ?? DEFAULT_MATRIMONY_LIMITS.freeInterestsPerMonth;

  function startNew() {
    setEditing(null);
    setDraft({ ...EMPTY, order: (page.total ?? plans.length) + 1 });
    setOpen(true);
  }

  function startEdit(plan: SubscriptionPlan) {
    setEditing(plan);
    setDraft({
      kind: plan.kind,
      name: plan.name,
      nameTa: plan.nameTa,
      priceInPaise: plan.priceInPaise,
      mrpInPaise: plan.mrpInPaise,
      months: plan.months,
      features: plan.features.length ? plan.features : [""],
      featuresTa: plan.featuresTa,
      photoOverride: plan.photoOverride,
      highlight: plan.highlight,
      active: plan.active,
      order: plan.order,
    });
    setOpen(true);
  }

  function save() {
    if (!draft.name.trim()) return toast.error("Give the plan a name.");
    if (draft.priceInPaise < 100) return toast.error("The price must be at least ₹1.");
    if (draft.mrpInPaise && draft.mrpInPaise <= draft.priceInPaise) {
      return toast.error(
        "The list price must be higher than the price charged, or left empty.",
      );
    }
    if (draft.months < 1) return toast.error("A plan must run for at least a month.");

    const payload = {
      ...draft,
      features: draft.features.map((f) => f.trim()).filter(Boolean),
      featuresTa: draft.featuresTa.map((f) => f.trim()).filter(Boolean),
    };

    if (editing) {
      updatePlan.mutate(
        { id: editing.id, draft: payload },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createPlan.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  }

  const busy = createPlan.isPending || updatePlan.isPending;

  return (
    <>
      <PageHeader
        title="Matrimony plans"
        description="What members are offered, and what the server actually charges."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/matrimony">
                <ArrowLeft className="size-4" />
                Profiles
              </Link>
            </Button>
            <Button onClick={startNew}>
              <Plus className="size-4" />
              New plan
            </Button>
          </div>
        }
      />

      <Alert>
        <IndianRupee />
        <AlertTitle>The price here is the price charged</AlertTitle>
        <AlertDescription>
          <p>
            The checkout route reads this document with the Admin SDK and builds
            the Razorpay order from it. A browser names a plan, never an amount,
            so editing a price here changes what is billed with no deploy.
          </p>
          <p>
            Changing a price does not affect anyone who has already paid — their
            entitlement runs to its existing expiry.
          </p>
        </AlertDescription>
      </Alert>

      {/* ------------------------------ free tier -------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Free allowance</CardTitle>
          <CardDescription>
            What a member gets without paying. This is part of the pricing
            decision, so it lives here rather than in the code.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="views">Profiles visible</Label>
            <Input
              id="views"
              type="number"
              min={0}
              max={100}
              className="w-32"
              value={views}
              onChange={(event) => setFreeViews(Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interests">Interests a month</Label>
            <Input
              id="interests"
              type="number"
              min={0}
              max={100}
              className="w-32"
              value={interests}
              onChange={(event) => setFreeInterests(Number(event.target.value) || 0)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              saveLimits.mutate({
                freeProfileViews: views,
                freeInterestsPerMonth: interests,
              })
            }
            disabled={saveLimits.isPending}
          >
            {saveLimits.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save allowance
          </Button>
        </CardContent>
      </Card>

      {/* -------------------------------- plans ---------------------------- */}
      {isLoading ? (
        <TableSkeleton rows={2} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No plans yet"
          description="Until a plan exists, the pricing sections show the free tier only and no checkout is offered."
          action={
            <Button onClick={() => seedPlan.mutate()} disabled={seedPlan.isPending}>
              Add a starter plan
            </Button>
          }
        />
      ) : (
        <StaggerList className="space-y-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <Card>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={plan.active ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {plan.active ? "On sale" : "Hidden"}
                      </Badge>
                      {plan.highlight && (
                        <Badge variant="outline" className="font-normal">
                          Highlighted
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {plan.months} {plan.months === 1 ? "month" : "months"} ·{" "}
                        {plan.features.length} listed benefits
                      </span>
                    </div>
                    <p className="font-medium">
                      {plan.name}
                      {plan.nameTa && (
                        <span className="text-muted-foreground font-tamil font-normal">
                          {" "}
                          · {plan.nameTa}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {plan.features.join(" · ")}
                    </p>
                  </div>

                  <PriceTag plan={plan} size="compact" className="shrink-0" />

                  <div className="flex shrink-0 items-center gap-2">
                    <Label
                      htmlFor={`active-${plan.id}`}
                      className="text-muted-foreground text-xs"
                    >
                      On sale
                    </Label>
                    <Switch
                      id={`active-${plan.id}`}
                      checked={plan.active}
                      onCheckedChange={(checked) =>
                        updatePlan.mutate({ id: plan.id, draft: { active: checked } })
                      }
                    />
                    <Button variant="outline" size="sm" onClick={() => startEdit(plan)}>
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9"
                      aria-label={`Delete ${plan.name}`}
                      onClick={() => setPendingDelete(plan)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
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
        noun="plan"
      />

      {/* ------------------------------- editor ---------------------------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit plan" : "New plan"}</DialogTitle>
            <DialogDescription>
              Price is entered in rupees and stored in paise, which is what
              Razorpay expects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  placeholder="Premium"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameTa">பெயர்</Label>
                <Input
                  id="nameTa"
                  lang="ta"
                  className="font-tamil"
                  value={draft.nameTa}
                  onChange={(event) => setDraft({ ...draft, nameTa: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="mrp">List price (₹)</Label>
                <Input
                  id="mrp"
                  type="number"
                  min={0}
                  value={draft.mrpInPaise ? draft.mrpInPaise / 100 : ""}
                  placeholder="999"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      mrpInPaise: Math.round(Number(event.target.value) * 100) || 0,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Shown struck through. Leave empty for no discount.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price charged (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min={1}
                  value={draft.priceInPaise / 100}
                  placeholder="499"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      priceInPaise: Math.round(Number(event.target.value) * 100) || 0,
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  This is what Razorpay bills.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="months">Runs for (months)</Label>
                <Input
                  id="months"
                  type="number"
                  min={1}
                  max={36}
                  value={draft.months}
                  onChange={(event) =>
                    setDraft({ ...draft, months: Number(event.target.value) || 1 })
                  }
                />
              </div>
            </div>

            {/* Exactly what a member will see, computed from the two figures
                above so the advertised saving cannot drift from the prices. */}
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="text-muted-foreground mb-1.5 text-xs">
                How members see it
              </p>
              <PriceTag plan={draft} />
            </div>

            <div className="space-y-2">
              <Label>What it includes</Label>
              {draft.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    placeholder="Browse every profile"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        features: draft.features.map((f, i) =>
                          i === index ? event.target.value : f,
                        ),
                      })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove benefit ${index + 1}`}
                    disabled={draft.features.length <= 1}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        features: draft.features.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft({ ...draft, features: [...draft.features, ""] })}
              >
                <Plus className="size-4" />
                Add a line
              </Button>
              <p className="text-muted-foreground text-xs">
                The contact-on-mutual-accept line is added automatically, and is
                the same on every plan.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kind">What this plan sells</Label>
              <Select
                value={draft.kind}
                onValueChange={(v) =>
                  setDraft({ ...draft, kind: v as PlanDraft["kind"] })
                }
              >
                <SelectTrigger id="kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_KINDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PLAN_KIND_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                A vendor plan buys one directory listing its term of time. It
                never buys approval &mdash; a listing still goes through review.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="photoOverride">
                  Show restricted photographs
                </Label>
                <p className="text-muted-foreground text-xs">
                  Holders of this plan see photographs on listings that chose
                  &ldquo;only after an accepted interest&rdquo;. Phone and email
                  stay private &mdash; they are shown the desk&rsquo;s number
                  instead, and the desk passes the request on.
                </p>
              </div>
              <Switch
                id="photoOverride"
                checked={draft.photoOverride}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, photoOverride: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="highlight">Highlight this plan</Label>
                <p className="text-muted-foreground text-xs">
                  Marks it &ldquo;Most useful&rdquo; and makes it the one offered
                  at the subscribe wall.
                </p>
              </div>
              <Switch
                id="highlight"
                checked={draft.highlight}
                onCheckedChange={(checked) => setDraft({ ...draft, highlight: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create plan"}
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
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Members who already bought it keep what they paid for until it
              expires, but the record of what they bought will point at a plan
              that no longer exists. Taking it off sale is usually the better move.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deletePlan.mutate(pendingDelete.id);
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
