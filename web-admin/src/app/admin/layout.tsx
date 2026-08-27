"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuth } from "@/components/providers/auth-provider";
import { FirebaseSetupNotice } from "@/components/shared/firebase-setup-notice";
import { FullPageSpinner } from "@/components/shared/states";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading, configured, profileError, signOut } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !firebaseUser) {
      router.replace("/login");
    }
  }, [loading, configured, firebaseUser, router]);

  if (!configured) return <FirebaseSetupNotice />;

  /**
   * Signed in, but Firestore would not give us the profile. This is nearly
   * always undeployed security rules, and it used to present as a spinner that
   * never resolved — which tells the person nothing at all.
   */
  if (!loading && firebaseUser && !profile && profileError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6">
        <div className="w-full space-y-4">
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Signed in, but your profile could not be loaded</AlertTitle>
            <AlertDescription>
              <p>{profileError}</p>
              <p>
                If this is a fresh project, the Firestore rules in this repo have
                probably not been deployed yet:
              </p>
              <p>
                <code>
                  npx firebase-tools deploy --only
                  firestore:rules,firestore:indexes,storage
                </code>
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Try again</Button>
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !firebaseUser || !profile) {
    return <FullPageSpinner label="Loading your desk..." />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
