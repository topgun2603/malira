/**
 * Moves restricted photographs into their own document, and frees the grooms.
 *
 * Two changes shipped together and this closes the gap for listings written
 * before either of them.
 *
 * 1. **Photographs left `private/contact`.** They used to sit beside the phone
 *    number, which made "show a subscriber the photographs" and "show a
 *    subscriber the phone number" the same permission — Firestore has no
 *    field-level security, so one document could not answer both. They now live
 *    in `private/photos`, whose rule also admits a subscriber whose plan
 *    carried the override.
 *
 * 2. **A groom's photographs are never restricted.** That is the association's
 *    rule, and the form no longer offers men the choice. Existing male listings
 *    still have their photographs withheld, so this publishes them onto the
 *    public document and sets `photoVisibility` to match — otherwise the rule
 *    would apply only to profiles saved from today.
 *
 *   node scripts/migrate-matrimony-photos.mjs --dry-run   # report, write nothing
 *   node scripts/migrate-matrimony-photos.mjs             # write
 *
 * Idempotent: a listing already in the target shape is skipped, so re-running
 * is free. It never deletes the only copy of anything — `private/contact` keeps
 * its `photos` field until a later save overwrites it, so a bad run can be
 * reversed by pointing the readers back.
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const KEY_PATH = "service-account.json";
const BATCH_LIMIT = 400; // Firestore allows 500 writes per batch.

const dryRun = process.argv.includes("--dry-run");
const account = JSON.parse(readFileSync(KEY_PATH, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
  });
}

const db = getFirestore();

const snapshot = await db.collection("matrimonyProfiles").get();
console.log(`${snapshot.size} listing(s) to check.`);

let batch = db.batch();
let queued = 0;
let movedPhotos = 0;
let freedGrooms = 0;
let skipped = 0;

async function flush() {
  if (queued === 0) return;
  if (!dryRun) await batch.commit();
  batch = db.batch();
  queued = 0;
}

for (const doc of snapshot.docs) {
  const profile = doc.data() ?? {};
  const gender = profile.gender;
  const restricted = profile.photoVisibility === "on_accept";

  const contactRef = doc.ref.collection("private").doc("contact");
  const photosRef = doc.ref.collection("private").doc("photos");

  const [contactSnap, photosSnap] = await Promise.all([
    contactRef.get(),
    photosRef.get(),
  ]);

  // The full set, wherever it currently is. A restricted listing keeps it in
  // contact; an unrestricted one has it on the public document.
  const held = contactSnap.exists ? (contactSnap.data().photos ?? []) : [];
  const published = profile.photos ?? [];
  const all = held.length > 0 ? held : published;

  if (all.length === 0) {
    skipped += 1;
    continue;
  }

  // ---- 2. Grooms are never restricted ------------------------------------
  if (gender === "male" && restricted) {
    batch.update(doc.ref, { photos: all, photoVisibility: "members" });
    // Nothing withheld any more, so the private copy is emptied rather than
    // left behind for the override to serve.
    batch.set(photosRef, { photos: [] }, { merge: true });
    queued += 2;
    freedGrooms += 1;
    if (queued >= BATCH_LIMIT) await flush();
    continue;
  }

  // ---- 1. Restricted photographs move to their own document ---------------
  if (restricted) {
    const already = photosSnap.exists ? (photosSnap.data().photos ?? []) : [];
    if (already.length > 0) {
      skipped += 1;
      continue;
    }
    batch.set(photosRef, { photos: all }, { merge: true });
    queued += 1;
    movedPhotos += 1;
    if (queued >= BATCH_LIMIT) await flush();
    continue;
  }

  skipped += 1;
}

await flush();

console.log(
  dryRun
    ? `[dry run] would move ${movedPhotos}, publish ${freedGrooms} groom listing(s), skip ${skipped}.`
    : `Moved ${movedPhotos}, published ${freedGrooms} groom listing(s), skipped ${skipped}.`,
);
