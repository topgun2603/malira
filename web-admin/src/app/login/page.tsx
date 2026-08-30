"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { RkMark } from "@/components/shared/rk-mark";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/providers/auth-provider";
import { FirebaseSetupNotice } from "@/components/shared/firebase-setup-notice";
import { FullPageSpinner } from "@/components/shared/states";
import { FadeIn } from "@/components/motion/primitives";
import { friendlyError } from "@/lib/firebase/errors";

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const {
    firebaseUser,
    loading,
    configured,
    signInWithPassword,
    registerWithPassword,
    signInWithGoogle,
  } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Members arrive here from a gated page and must land back on it, not on a
  // desk they have no access to.
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") ? next : "/admin/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && firebaseUser) router.replace(destination);
  }, [loading, firebaseUser, router, destination]);

  if (!configured) return <FirebaseSetupNotice />;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      if (mode === "register") {
        await registerWithPassword(values.name ?? "", values.email, values.password);
      } else {
        await signInWithPassword(values.email, values.password);
      }
      router.replace(destination);
    } catch (cause) {
      setError(friendlyError(cause));
    }
  }

  async function onGoogle() {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      router.replace(destination);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Tea-terrace ridges: the one decorative flourish in the whole panel. */}
      <div
        aria-hidden
        className="from-primary/10 via-background to-background pointer-events-none absolute inset-0 bg-gradient-to-br"
      />
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute -top-40 -right-32 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-brand-saffron/10 pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full blur-3xl"
      />

      <FadeIn className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <RkMark className="mb-4 size-12 rounded-xl shadow-sm" />
          <h1 className="text-xl font-semibold tracking-tight">RK Matrimony Admin</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "register"
              ? "Create a free reader account."
              : "Sign in to your account."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {/* Two options, so a segmented control beats a link buried below. */}
            <div className="bg-muted mb-5 grid grid-cols-2 gap-1 rounded-lg p-1">
              {(["signin", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={
                    mode === value
                      ? "bg-background rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm"
                  }
                >
                  {value === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="As it should appear on your profile"
                    {...form.register("name")}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@nilgirinews.in"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {mode === "register" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onGoogle}
              disabled={googleBusy}
            >
              {googleBusy && <Loader2 className="size-4 animate-spin" />}
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
          A new account is a reader account: browse news, and use matrimony.
          Access to the editorial desk is granted separately by a Super Admin.
        </p>
      </FadeIn>
    </main>
  );
}

/**
 * useSearchParams opts a route into client rendering, so the form needs a
 * Suspense boundary for the page to prerender at all.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
