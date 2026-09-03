"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Loader2, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/reader/language";
import { usePaymentSettings, useSubmitPayment } from "@/hooks/use-payments";
import { newPaymentReference, upiIntentUrl } from "@/lib/api/payments";
import { uploadPaymentProof } from "@/lib/api/storage";
import type {
  ArticleImage,
  PaymentMethod,
  PaymentPurpose,
  SubscriptionPlan,
  VendorCategory,
} from "@/lib/types";

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * Paying, when there is no gateway to do it for you.
 *
 * The shape of this screen follows from that. A gateway would take the money
 * and tell us; here the payer leaves for their bank app, comes back, and tells
 * us — so the two things that matter are that they carry the reference out with
 * them, and that they can prove what they did when they return.
 *
 * The reference is generated once, when the screen opens, and held in state.
 * Regenerating it on a re-render would hand somebody a code that no longer
 * matches the one they just typed into their bank.
 */
export function UpiCheckout({
  plan,
  purpose,
  vendorId,
  vendorName,
  vendorCategory,
  onDone,
}: {
  plan: SubscriptionPlan;
  purpose: PaymentPurpose;
  vendorId?: string;
  vendorName?: string;
  vendorCategory?: VendorCategory;
  onDone?: () => void;
}) {
  const { lang } = useLanguage();
  const ta = lang === "ta";
  const { firebaseUser, profile } = useAuth();
  const { data: settings, isLoading } = usePaymentSettings();
  const submit = useSubmitPayment();

  const reference = useMemo(() => newPaymentReference(), []);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [utr, setUtr] = useState("");
  const [phone, setPhone] = useState("");
  const [proof, setProof] = useState<ArticleImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  const upi = settings?.upiIds.filter((entry) => entry.vpa.trim()) ?? [];
  const canPay = Boolean(settings?.acceptingPayments) && upi.length > 0;

  if (!canPay) {
    return (
      <Alert>
        <AlertTitle>
          {ta ? "தற்போது கட்டணம் ஏற்க முடியாது" : "Payments are closed"}
        </AlertTitle>
        <AlertDescription>
          {ta
            ? "அலுவலகத்தைத் தொடர்பு கொள்ளுங்கள்."
            : "The desk has not opened payments yet. Please contact the association."}
        </AlertDescription>
      </Alert>
    );
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  }

  async function pickProof(file: File | undefined) {
    if (!file || !firebaseUser) return;
    setUploading(true);
    try {
      setProof(await uploadPaymentProof(file, firebaseUser.uid));
    } catch {
      toast.error("That image would not upload. Try a smaller screenshot.");
    } finally {
      setUploading(false);
    }
  }

  function send() {
    submit.mutate(
      {
        reference,
        purpose,
        planId: plan.id,
        planName: plan.name,
        amountInPaise: plan.priceInPaise,
        months: plan.months,
        vendorId: vendorId ?? null,
        vendorName: vendorName ?? "",
        vendorCategory: vendorCategory ?? null,
        method,
        utr,
        proof,
        userName: profile?.displayName ?? "",
        userEmail: profile?.email ?? firebaseUser?.email ?? "",
        // Asked for rather than taken from the account: the desk rings this
        // number when a claim does not match, and the payer knows better than
        // we do which of their numbers is answered.
        userPhone: phone.trim(),
      },
      { onSuccess: () => onDone?.() },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between gap-3">
            <span>{plan.name}</span>
            <span className="text-2xl">{rupees(plan.priceInPaise)}</span>
          </CardTitle>
          <CardDescription>
            {plan.months} month{plan.months === 1 ? "" : "s"}
            {vendorName ? ` · ${vendorName}` : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/*
            The reference leads, before any account number. It is the only thing
            the payer has to carry into their bank app, and it is what lets the
            desk find the payment again if the UTR is mistyped.
          */}
          <div className="border-primary/40 bg-primary/5 rounded-lg border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-xs">
              {ta ? "இந்தக் குறியீட்டைக் குறிப்பில் சேர்க்கவும்" : "Put this in the payment note"}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
              {reference}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => copy(reference)}
            >
              {copied === reference ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {ta ? "நகலெடு" : "Copy"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={method === "upi" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("upi")}
            >
              UPI
            </Button>
            <Button
              variant={method === "bank" ? "default" : "outline"}
              size="sm"
              onClick={() => setMethod("bank")}
            >
              {ta ? "வங்கி" : "Bank transfer"}
            </Button>
          </div>

          {method === "upi" ? (
            <div className="space-y-3">
              {upi.map((entry) => (
                <div
                  key={entry.vpa}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm">{entry.vpa}</p>
                    {entry.label && (
                      <p className="text-muted-foreground text-xs">{entry.label}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copy(entry.vpa)}>
                      {copied === entry.vpa ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    {/*
                      A plain link, not a fetch. On a phone the browser hands
                      upi:// to whichever app claims it; on a desktop nothing
                      claims it, which is why the id above is copyable and the
                      QR is below.
                    */}
                    <Button size="sm" asChild>
                      <a
                        href={upiIntentUrl({
                          vpa: entry.vpa,
                          payeeName: settings?.payeeName ?? "",
                          amountInPaise: plan.priceInPaise,
                          reference,
                        })}
                      >
                        {ta ? "செலுத்து" : "Pay"}
                      </a>
                    </Button>
                  </div>
                </div>
              ))}

              {settings?.qrImage && (
                <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <QrCode className="size-3.5" />
                    {ta ? "ஸ்கேன் செய்யவும்" : "Scan with any UPI app"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={settings.qrImage.url}
                    alt="UPI QR code"
                    className="size-56 object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <Row label={ta ? "பெயர்" : "Name"} value={settings?.accountName} />
              <Row label={ta ? "கணக்கு" : "Account"} value={settings?.accountNumber} />
              <Row label="IFSC" value={settings?.ifsc} />
              <Row label={ta ? "வங்கி" : "Bank"} value={settings?.bankName} />
              <Row label={ta ? "கிளை" : "Branch"} value={settings?.branch} />
            </div>
          )}

          {(ta ? settings?.instructionsTa : settings?.instructions) && (
            <p className="text-muted-foreground text-sm">
              {ta ? settings?.instructionsTa : settings?.instructions}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ta ? "செலுத்திய பிறகு" : "After you have paid"}</CardTitle>
          <CardDescription>
            {ta
              ? "வங்கி தரும் குறிப்பு எண்ணையும், திரைப்படத்தையும் இணைக்கவும். ஒரு நபர் சரிபார்ப்பார்."
              : "Give us the reference number your bank shows, and a screenshot. A person checks it against the account — usually the same day."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="utr">
              {ta ? "UTR / பரிவர்த்தனை எண்" : "UTR / transaction number"}
            </Label>
            <Input
              id="utr"
              value={utr}
              placeholder="e.g. 412345678901"
              onChange={(event) => setUtr(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {ta
                ? "ஒவ்வொரு பரிவர்த்தனைக்கும் ஒரே எண். ஏற்கனவே பயன்படுத்தப்பட்ட எண் ஏற்கப்படாது."
                : "One number per transfer. A number that has already been submitted will not be accepted."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{ta ? "தொலைபேசி" : "Phone"}</Label>
            <Input
              id="phone"
              value={phone}
              inputMode="tel"
              placeholder={ta ? "அலுவலகம் அழைக்க எண்" : "The number the desk should call"}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof">{ta ? "திரைப்படம்" : "Screenshot"}</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("proof")?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {proof ? (ta ? "மாற்று" : "Replace") : (ta ? "தேர்வு" : "Choose")}
              </Button>
              {proof && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proof.url}
                  alt=""
                  className="border-border size-16 rounded-md border object-cover"
                />
              )}
            </div>
            <input
              id="proof"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => pickProof(event.target.files?.[0])}
            />
          </div>

          <Separator />

          <Button
            className="w-full"
            // Six characters is the shortest UTR any Indian bank issues; below
            // that it is a typo, and the rules would refuse it anyway.
            disabled={submit.isPending || utr.trim().length < 6 || uploading}
            onClick={send}
          >
            {submit.isPending && <Loader2 className="size-4 animate-spin" />}
            {ta ? "அனுப்பு" : "Send to the desk"}
          </Button>
          {!proof && (
            <p className="text-muted-foreground text-center text-xs">
              {ta
                ? "திரைப்படம் இல்லாமலும் அனுப்பலாம், ஆனால் சரிபார்ப்பு தாமதமாகும்."
                : "You can send without a screenshot, but it takes longer to check."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
