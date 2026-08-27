"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HeartHandshake, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { FullPageSpinner } from "@/components/shared/states";

/**
 * Matrimony is members-only.
 *
 * News is public because a news feed that needs an account is not a news feed.
 * Matrimony is the opposite: these are dates of birth, photographs and family
 * details of people in a small district, and none of it should be one search
 * result away from the open web.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Checking your session..." />;

  if (!firebaseUser) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 sm:px-6">
        <span className="bg-primary/10 text-primary mb-5 flex size-12 items-center justify-center rounded-xl">
          <HeartHandshake className="size-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Matrimony</h1>
        <p className="text-muted-foreground mt-2 text-center text-sm leading-relaxed">
          Profiles are visible to signed-in members only. Nothing here is
          reachable from the public web or from a search engine.
        </p>

        <Card className="mt-6 w-full">
          <CardContent className="space-y-3 p-5">
            <div className="text-muted-foreground flex items-start gap-2.5 text-sm">
              <Lock className="text-primary mt-0.5 size-4 shrink-0" />
              <p>
                Phone numbers are never listed. They are exchanged only when both
                sides accept an interest.
              </p>
            </div>
            <Button className="w-full" asChild>
              <Link href="/login?next=/matrimony/browse">
                Sign in to continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
