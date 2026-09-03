"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/components/providers/auth-provider";
import { friendlyError } from "@/lib/firebase/errors";
import {
  DuplicateUtrError,
  getPaymentSettings,
  listOwnPayments,
  listPayments,
  savePaymentSettings,
  submitPayment,
  utrAlreadyUsed,
  type PaymentReportFilters,
  type PaymentSubmission,
} from "@/lib/api/payments";
import type { PaymentSettings } from "@/lib/types";

const keys = {
  settings: ["payments", "settings"] as const,
  report: (filters: PaymentReportFilters) =>
    ["payments", "report", filters] as const,
  own: (uid: string) => ["payments", "own", uid] as const,
};

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

export function usePaymentSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: getPaymentSettings,
    staleTime: 5 * 60_000,
  });
}

export function useSavePaymentSettings() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<PaymentSettings, "updatedAt" | "updatedBy">) =>
      savePaymentSettings(input, firebaseUser?.uid ?? ""),
    onSuccess: () => {
      toast.success("Payment details saved.");
      queryClient.invalidateQueries({ queryKey: keys.settings });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}

/* -------------------------------------------------------------------------- */
/*  Claims                                                                     */
/* -------------------------------------------------------------------------- */

export function usePaymentReport(filters: PaymentReportFilters) {
  return useQuery({
    queryKey: keys.report(filters),
    queryFn: () => listPayments(filters),
    staleTime: 30_000,
  });
}

export function useOwnPayments() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? "";
  return useQuery({
    queryKey: keys.own(uid),
    queryFn: () => listOwnPayments(uid),
    enabled: Boolean(uid),
  });
}

/**
 * Records a claim that money was sent.
 *
 * The duplicate is reported as its own message rather than as a failure: a
 * payer who mistypes somebody else's UTR, or who submits twice because the
 * first attempt looked stuck, needs to be told which of those happened.
 */
export function useSubmitPayment() {
  const queryClient = useQueryClient();
  const { firebaseUser } = useAuth();
  return useMutation({
    mutationFn: (input: PaymentSubmission) =>
      submitPayment(firebaseUser?.uid ?? "", input),
    onSuccess: () => {
      toast.success("Sent to the desk. You will hear back once it is checked.");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof DuplicateUtrError
          ? "That reference number has already been submitted. Check the number, or look at your payments below."
          : friendlyError(error),
      ),
  });
}

/** A courtesy check while typing. The rules are what actually enforce it. */
export function useUtrCheck() {
  return useMutation({ mutationFn: (utr: string) => utrAlreadyUsed(utr) });
}

/* -------------------------------------------------------------------------- */
/*  The verdict                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Approves or rejects a claim.
 *
 * Goes through the server rather than writing Firestore directly: the grant
 * lands on documents the rules refuse to every client, and the grant and the
 * verdict have to be one transaction.
 */
export function useReviewPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      verdict: "approved" | "rejected";
      note: string;
    }) => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again.");

      const response = await fetch("/api/payments/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "That did not go through.");
      return data;
    },
    onSuccess: (_, input) => {
      toast.success(
        input.verdict === "approved"
          ? "Approved. The payer has been told and the plan is active."
          : "Rejected. The payer has been told why.",
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["matrimony"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
}
