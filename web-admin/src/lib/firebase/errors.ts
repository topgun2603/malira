/** Firebase error codes are not something an editor should ever read. */
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match an account.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact the Super Admin.",
  "auth/user-not-found": "No account found for that email address.",
  "auth/wrong-password": "That email and password don't match an account.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed":
    "Can't reach the server. Check your internet connection.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "permission-denied": "Your role doesn't allow that action.",
  unavailable: "Can't reach the server. Check your internet connection.",
};

export function friendlyError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (MESSAGES[code]) return MESSAGES[code];
    const short = code.replace(/^[a-z-]+\//, "");
    if (MESSAGES[short]) return MESSAGES[short];
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
