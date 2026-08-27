import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/types";

/** Single document, because there is only ever one app to configure. */
const SETTINGS_DOC = () => doc(db, "settings", "app");

export async function getAppSettings(): Promise<AppSettings> {
  const snapshot = await getDoc(SETTINGS_DOC());
  if (!snapshot.exists()) {
    return { ...DEFAULT_SETTINGS, updatedAt: null, updatedBy: null };
  }
  return { ...DEFAULT_SETTINGS, ...snapshot.data() } as AppSettings;
}

export async function saveAppSettings(
  input: Omit<AppSettings, "updatedAt" | "updatedBy">,
  actor: { uid: string },
): Promise<void> {
  await setDoc(
    SETTINGS_DOC(),
    { ...input, updatedAt: serverTimestamp(), updatedBy: actor.uid },
    { merge: true },
  );
}
