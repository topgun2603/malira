"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UpiCheckout } from "@/components/payments/upi-checkout";
import { useLanguage } from "@/components/reader/language";
import type {
  PaymentPurpose,
  SubscriptionPlan,
  VendorCategory,
} from "@/lib/types";

/**
 * The pay screen, in a dialog.
 *
 * A dialog rather than a page because paying is a detour: somebody is on the
 * profile they wanted, or the listing they are renewing, and sending them to a
 * separate route loses that place. It closes itself once the claim is filed —
 * there is nothing to wait for on screen, since a person has to check it.
 */
export function PayDialog({
  open,
  onOpenChange,
  plan,
  purpose,
  vendorId,
  vendorName,
  vendorCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  purpose: PaymentPurpose;
  vendorId?: string;
  vendorName?: string;
  vendorCategory?: VendorCategory;
}) {
  const { lang } = useLanguage();
  const ta = lang === "ta";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ta ? "கட்டணம் செலுத்து" : "Pay"}</DialogTitle>
          <DialogDescription>
            {ta
              ? "UPI மூலம் செலுத்தி, விவரங்களை இங்கே பதிவு செய்யுங்கள்."
              : "Pay by UPI, then tell us here. A person checks it against the account."}
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <UpiCheckout
            plan={plan}
            purpose={purpose}
            vendorId={vendorId}
            vendorName={vendorName}
            vendorCategory={vendorCategory}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
