"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  IndianRupee,
  Loader2,
  Save,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { ImageUploader } from "@/components/news/image-uploader";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import {
  usePaymentReport,
  usePaymentSettings,
  useReviewPayment,
  useSavePaymentSettings,
} from "@/hooks/use-payments";
import { useActivePlans } from "@/hooks/use-plans";
import type { PaymentReportFilters } from "@/lib/api/payments";
import {
  PAYMENT_PURPOSE_LABELS,
  PAYMENT_STATUS_LABELS,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  type PaymentRequest,
  type PaymentSettings,
  type PaymentStatus,
} from "@/lib/types";

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * What a broken read looks like.
 *
 * Firestore's two common refusals here read very differently to a person at
 * the desk, and both used to render as "nothing waiting": a missing composite
 * index means the query cannot run at all, and permission-denied means this
 * account is not a Super Admin. Neither is an empty queue, and both need
 * saying, because the cost of confusing them is somebody concluding a payer
 * never paid.
 */
function QueryFailed({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const missingIndex = message.includes("index");
  const denied = message.includes("permission");

  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>These could not be loaded</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          {missingIndex
            ? "Firestore needs an index for this query. Claims may well exist — this screen cannot read them."
            : denied
              ? "This account is not allowed to read payments. Only a Super Admin can verify them."
              : "Something went wrong reading the payments."}
        </p>
        <p className="font-mono text-xs opacity-80">{message}</p>
      </AlertDescription>
    </Alert>
  );
}

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payments"
        description="Money arrives by UPI and is checked by a person. Nothing here is automatic."
      />

      <Tabs defaultValue="queue" className="px-4 pb-10 sm:px-6">
        <TabsList>
          <TabsTrigger value="queue">To check</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="settings">Where to pay</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <PaymentQueue />
        </TabsContent>
        <TabsContent value="report" className="mt-6">
          <PaymentReport />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <PaymentDestinations />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  The queue                                                                  */
/* -------------------------------------------------------------------------- */

function PaymentQueue() {
  const { data, isLoading, error } = usePaymentReport({ status: "submitted" });
  const [reviewing, setReviewing] = useState<PaymentRequest | null>(null);

  if (isLoading) return <TableSkeleton />;
  // A failed query used to land on the empty state below, so a broken screen
  // and a quiet one looked identical — which is exactly how a missing index
  // hid real payments here. Say what went wrong instead.
  if (error) return <QueryFailed error={error} />;
  if (!data?.length) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Nothing waiting"
        description="Every claim has been checked. New ones appear here as they are submitted."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {data.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            onReview={() => setReviewing(payment)}
          />
        ))}
      </div>
      <ReviewDialog
        payment={reviewing}
        onClose={() => setReviewing(null)}
      />
    </>
  );
}

function PaymentCard({
  payment,
  onReview,
}: {
  payment: PaymentRequest;
  onReview?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold">
              {payment.reference}
            </span>
            <Badge variant="secondary" className="font-normal">
              {PAYMENT_PURPOSE_LABELS[payment.purpose]}
            </Badge>
            {payment.vendorCategory && (
              <Badge variant="outline" className="font-normal">
                {VENDOR_CATEGORY_LABELS[payment.vendorCategory]}
              </Badge>
            )}
            <StatusBadge status={payment.status} />
          </div>

          <p className="text-sm font-medium">
            {rupees(payment.amountInPaise)} · {payment.planName}
            {payment.vendorName ? ` · ${payment.vendorName}` : ""}
          </p>
          <p className="text-muted-foreground text-sm">
            {payment.userName || "Unnamed"}
            {payment.userPhone ? ` · ${payment.userPhone}` : ""}
            {payment.userEmail ? ` · ${payment.userEmail}` : ""}
          </p>
          <p className="text-muted-foreground text-xs">
            UTR <span className="font-mono">{payment.utr}</span>
            {payment.createdAt
              ? ` · submitted ${format(payment.createdAt.toDate(), "d MMM yyyy, h:mm a")}`
              : ""}
          </p>
          {payment.reviewNote && (
            <p className="text-muted-foreground text-xs italic">
              &ldquo;{payment.reviewNote}&rdquo;
              {payment.reviewedByName ? ` — ${payment.reviewedByName}` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {payment.proof && (
            // The screenshot is the evidence. Opened full size rather than
            // squinted at: a UTR in a banking app is small type.
            <a
              href={payment.proof.url}
              target="_blank"
              rel="noreferrer"
              className="border-border block size-20 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.proof.url}
                alt="Payment proof"
                className="size-full object-cover"
              />
            </a>
          )}
          {onReview && <Button onClick={onReview}>Check</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      variant={
        status === "approved"
          ? "default"
          : status === "rejected"
            ? "destructive"
            : "secondary"
      }
      className="font-normal"
    >
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

function ReviewDialog({
  payment,
  onClose,
}: {
  payment: PaymentRequest | null;
  onClose: () => void;
}) {
  const review = useReviewPayment();
  const [note, setNote] = useState("");

  function decide(verdict: "approved" | "rejected") {
    if (!payment) return;
    review.mutate(
      { requestId: payment.id, verdict, note },
      {
        onSuccess: () => {
          setNote("");
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check this payment</DialogTitle>
          <DialogDescription>
            Match the UTR against the bank statement before approving. Approving
            grants the plan straight away.
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-3 text-sm">
            <div className="bg-muted/50 space-y-1 rounded-lg p-3">
              <p className="font-medium">
                {rupees(payment.amountInPaise)} · {payment.planName}
              </p>
              <p className="text-muted-foreground">
                Reference{" "}
                <span className="font-mono">{payment.reference}</span> · UTR{" "}
                <span className="font-mono">{payment.utr}</span>
              </p>
              <p className="text-muted-foreground">
                {payment.months} month{payment.months === 1 ? "" : "s"} for{" "}
                {payment.userName || payment.uid}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Reason</Label>
              <Textarea
                id="note"
                value={note}
                placeholder="Required when rejecting. The payer is shown this."
                onChange={(event) => setNote(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            disabled={review.isPending || !note.trim()}
            onClick={() => decide("rejected")}
          >
            <Ban className="size-4" />
            Reject
          </Button>
          <Button disabled={review.isPending} onClick={() => decide("approved")}>
            {review.isPending && <Loader2 className="size-4 animate-spin" />}
            <BadgeCheck className="size-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  The report                                                                 */
/* -------------------------------------------------------------------------- */

function PaymentReport() {
  const [filters, setFilters] = useState<PaymentReportFilters>({
    status: "all",
    purpose: "all",
    category: "all",
    planId: "all",
  });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const applied = useMemo<PaymentReportFilters>(
    () => ({
      ...filters,
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
    }),
    [filters, from, to],
  );

  const { data, isLoading, error } = usePaymentReport(applied);
  const { data: matrimonyPlans } = useActivePlans("matrimony");
  const { data: vendorPlans } = useActivePlans("vendor");
  const plans = [...(matrimonyPlans ?? []), ...(vendorPlans ?? [])];

  // Approved money only. A total that counted rejected claims would be a
  // number the association could not find in its bank.
  const collected = (data ?? [])
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + row.amountInPaise, 0);

  function set<K extends keyof PaymentReportFilters>(
    key: K,
    value: PaymentReportFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Label className="mb-1.5 block text-xs">Search</Label>
          <Input
            value={filters.search ?? ""}
            placeholder="Reference, UTR, name, phone"
            onChange={(event) => set("search", event.target.value)}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Status</Label>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) => set("status", v as PaymentStatus | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              <SelectItem value="submitted">Waiting</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">For</Label>
          <Select
            value={filters.purpose ?? "all"}
            onValueChange={(v) =>
              set("purpose", v as PaymentReportFilters["purpose"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anything</SelectItem>
              <SelectItem value="matrimony">Matrimony</SelectItem>
              <SelectItem value="vendor">Listings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Category</Label>
          <Select
            value={filters.category ?? "all"}
            onValueChange={(v) =>
              set("category", v as PaymentReportFilters["category"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {VENDOR_CATEGORIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {VENDOR_CATEGORY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">Plan</Label>
          <Select
            value={filters.planId ?? "all"}
            onValueChange={(v) => set("planId", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>

        <div>
          <Label className="mb-1.5 block text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
        <span>
          {data?.length ?? 0} claim{data?.length === 1 ? "" : "s"}
        </span>
        <span className="text-foreground font-medium">
          {rupees(collected)} approved
        </span>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <QueryFailed error={error} />
      ) : !data?.length ? (
        <EmptyState
          icon={IndianRupee}
          title="Nothing matches"
          description="Widen the dates or clear a filter."
        />
      ) : (
        <div className="space-y-3">
          {data.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Where the money goes                                                       */
/* -------------------------------------------------------------------------- */

type Draft = Omit<PaymentSettings, "updatedAt" | "updatedBy">;

function PaymentDestinations() {
  const { data, isLoading } = usePaymentSettings();
  if (isLoading || !data) return <TableSkeleton />;
  return <DestinationsForm settings={data} />;
}

function DestinationsForm({ settings }: { settings: PaymentSettings }) {
  const save = useSavePaymentSettings();
  const [draft, setDraft] = useState<Draft>(() => {
    const { updatedAt, updatedBy, ...rest } = settings;
    void updatedAt;
    void updatedBy;
    return rest;
  });

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setUpi(index: number, field: "label" | "vpa", value: string) {
    const next = [...draft.upiIds];
    next[index] = { ...next[index], [field]: value };
    set("upiIds", next);
  }

  const ready =
    draft.payeeName.trim().length > 0 &&
    draft.upiIds.some((entry) => entry.vpa.trim().length > 0);

  return (
    <div className="max-w-3xl space-y-4">
      {!ready && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Nobody can pay yet</AlertTitle>
          <AlertDescription>
            A UPI id and the payee name are the minimum. The name is what the
            payer&rsquo;s bank app shows them before they send money — if it is
            wrong or missing, the payment looks like a scam and they stop.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>UPI</CardTitle>
          <CardDescription>
            The first id is the one the app opens by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payeeName">Payee name</Label>
            <Input
              id="payeeName"
              value={draft.payeeName}
              placeholder="Badaga Matrimony Association"
              onChange={(event) => set("payeeName", event.target.value)}
            />
          </div>

          {draft.upiIds.map((entry, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <Input
                value={entry.label}
                placeholder="Label, e.g. Main"
                onChange={(event) => setUpi(index, "label", event.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  value={entry.vpa}
                  placeholder="name@bank"
                  onChange={(event) => setUpi(index, "vpa", event.target.value)}
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    set(
                      "upiIds",
                      draft.upiIds.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() =>
              set("upiIds", [...draft.upiIds, { label: "", vpa: "" }])
            }
          >
            Add a UPI id
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR code</CardTitle>
          <CardDescription>
            Shown on the website for anyone who would rather scan than type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploader
            value={draft.qrImage ? [draft.qrImage] : []}
            onChange={(images) => set("qrImage", images[0] ?? null)}
            articleKey="payments"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank transfer</CardTitle>
          <CardDescription>
            For anyone who cannot use UPI. Shown only to signed-in members.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account name</Label>
            <Input
              id="accountName"
              value={draft.accountName}
              onChange={(event) => set("accountName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              value={draft.accountNumber}
              onChange={(event) => set("accountNumber", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ifsc">IFSC</Label>
            <Input
              id="ifsc"
              value={draft.ifsc}
              onChange={(event) => set("ifsc", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank</Label>
            <Input
              id="bankName"
              value={draft.bankName}
              onChange={(event) => set("bankName", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={draft.branch}
              onChange={(event) => set("branch", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What the payer is told</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              rows={3}
              value={draft.instructions}
              placeholder="Pay the exact amount and put the reference in the note."
              onChange={(event) => set("instructions", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructionsTa">Instructions in Tamil</Label>
            <Textarea
              id="instructionsTa"
              rows={3}
              value={draft.instructionsTa}
              onChange={(event) => set("instructionsTa", event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              <Label htmlFor="acceptingPayments">Accepting payments</Label>
              <p className="text-muted-foreground text-xs">
                Turn this off to hide every &ldquo;pay now&rdquo; route without
                deleting the details above.
              </p>
            </div>
            <Switch
              id="acceptingPayments"
              checked={draft.acceptingPayments}
              onCheckedChange={(checked) => set("acceptingPayments", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
        {save.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save
      </Button>
    </div>
  );
}
