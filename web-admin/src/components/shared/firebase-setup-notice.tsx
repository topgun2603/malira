import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown instead of a blank screen when the Firebase env vars are missing.
 * Nothing about a white page tells a new developer what to do next.
 */
export function FirebaseSetupNotice() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Alert>
        <AlertTriangle />
        <AlertTitle>Firebase is not configured yet</AlertTitle>
        <AlertDescription>
          <p>
            Copy <code>.env.local.example</code> to <code>.env.local</code> and fill
            in the six values from your Firebase project (Project settings, General,
            Your apps, Web app). Restart the dev server afterwards.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
