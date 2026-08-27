/**
 * Adds the search keys to user documents written before they existed.
 *
 * Users & roles searches by a Firestore range scan, which needs the field it
 * scans to already be lower-cased — `displayNameLower` and `emailLower`. New
 * accounts get them at sign-up, and an existing account heals itself the next
 * time its owner signs in, but until then it is invisible to search. This walks
 * the collection once and closes that gap.
 *
 *   node scripts/backfill-user-search.mjs --dry-run   # report, write nothing
 *   node scripts/backfill-user-search.mjs             # write
 *
 * Idempotent: a document whose keys already match is skipped, so re-running is
 * free. Nothing but those two fields is ever written — roles are not touched.
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

const snapshot = await db.collection("users").get();
console.log(`${snapshot.size} account(s) in the directory.`);

let batch = db.batch();
let pending = 0;
let written = 0;
let skipped = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const displayNameLower = String(data.displayName ?? "").trim().toLowerCase();
  const emailLower = String(data.email ?? "").trim().toLowerCase();

  if (data.displayNameLower === displayNameLower && data.emailLower === emailLower) {
    skipped += 1;
    continue;
  }

  console.log(`  ${dryRun ? "would set" : "set"}  ${displayNameLower || "(no name)"} · ${emailLower}`);

  if (!dryRun) {
    batch.update(doc.ref, { displayNameLower, emailLower });
    pending += 1;
    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  written += 1;
}

if (!dryRun && pending > 0) await batch.commit();

console.log(
  dryRun
    ? `\nDry run: ${written} would be updated, ${skipped} already current.`
    : `\nUpdated ${written}, ${skipped} already current.`,
);
