/**
 * Seeds the sample matrimony profiles with the Admin SDK.
 *
 * The in-browser seeder cannot do this: a profile's document id is its owner's
 * uid, and the security rules only let a moderator create one for somebody
 * else. Running it here with a service account sidesteps the rules entirely,
 * which is exactly why this file lives in scripts/ and never ships to a client.
 *
 *   node scripts/seed-matrimony.mjs          # create
 *   node scripts/seed-matrimony.mjs --remove # delete everything it created
 *
 * Every document is flagged isSample, so removal is exact.
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const KEY_PATH = "service-account.json";
const BUCKET = "nilgiri-news.firebasestorage.app";

const account = JSON.parse(readFileSync(KEY_PATH, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    storageBucket: BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();

/* -------------------------------------------------------------------------- */
/*  The people                                                                 */
/* -------------------------------------------------------------------------- */

// Invented. Single given names, no surname, and no phone number: India has no
// reserved fictional dialling range, so any plausible number is somebody's.
const PROFILES = [
  {
    id: "sample-mat-01", name: "Bellie", gender: "female", age: 26, heightCm: 158,
    education: "B.Sc Nursing", occupation: "Staff nurse", workLocation: "Coimbatore",
    hometown: "Kotagiri", diet: "vegetarian", maritalStatus: "never_married",
    postedBy: "parent", photoVisibility: "on_accept",
    about: "Working in a hospital in Coimbatore, comes home most weekends. Looking for someone settled, preferably within the district or a short drive from it.",
    fatherOccupation: "Tea grower", motherOccupation: "Homemaker",
    siblings: "One younger brother, studying", birthPlace: "Kotagiri", birthTime: "05:40",
    from: "#9c3464", to: "#d98cae",
  },
  {
    id: "sample-mat-02", name: "Jogi", gender: "male", age: 30, heightCm: 172,
    education: "B.E Mechanical", occupation: "Maintenance engineer", workLocation: "Bengaluru",
    hometown: "Coonoor", diet: "non_vegetarian", maritalStatus: "never_married",
    postedBy: "self", photoVisibility: "members",
    about: "Working in Bengaluru for six years, planning to move back to the hills within a year or two. Family runs a small estate near Coonoor.",
    fatherOccupation: "Retired, estate", motherOccupation: "Homemaker",
    siblings: "One elder sister, married", birthPlace: "Coonoor", birthTime: "22:15",
    from: "#274b6d", to: "#7ba7cf",
  },
  {
    id: "sample-mat-03", name: "Hemmi", gender: "female", age: 24, heightCm: 160,
    education: "M.A English", occupation: "School teacher", workLocation: "Ooty",
    hometown: "Ooty", diet: "vegetarian", maritalStatus: "never_married",
    postedBy: "self", photoVisibility: "on_accept",
    about: "Teaching at a higher secondary school in Ooty. Would prefer someone who intends to stay in the district.",
    fatherOccupation: "Government service", motherOccupation: "Teacher",
    siblings: "Two brothers, both younger", birthPlace: "Ooty", birthTime: "11:05",
    from: "#6d3a5f", to: "#b585a4",
  },
  {
    id: "sample-mat-04", name: "Madha", gender: "male", age: 33, heightCm: 168,
    education: "B.Com", occupation: "Runs a provision store", workLocation: "Kotagiri",
    hometown: "Kotagiri", diet: "non_vegetarian", maritalStatus: "divorced",
    postedBy: "sibling", photoVisibility: "on_accept",
    about: "Runs the family shop in Kotagiri. Divorced four years ago, no children. Looking to settle again with someone from a similar background.",
    fatherOccupation: "Late", motherOccupation: "Homemaker",
    siblings: "One elder sister, married", birthPlace: "Kotagiri", birthTime: "03:20",
    from: "#8a4b1f", to: "#d3a173",
  },
  {
    id: "sample-mat-05", name: "Rangi", gender: "female", age: 28, heightCm: 155,
    education: "MBA Finance", occupation: "Bank officer", workLocation: "Mysuru",
    hometown: "Aravankadu", diet: "eggetarian", maritalStatus: "never_married",
    postedBy: "parent", photoVisibility: "members",
    about: "Posted in Mysuru, transfer to Coimbatore expected next year. Family would like the match to be from the Nilgiris.",
    fatherOccupation: "Estate supervisor", motherOccupation: "Homemaker",
    siblings: "One younger sister, studying", birthPlace: "Aravankadu", birthTime: "18:50",
    from: "#2c6b34", to: "#8cbb6a",
  },
  {
    id: "sample-mat-06", name: "Kariya", gender: "male", age: 27, heightCm: 175,
    education: "Diploma, Agriculture", occupation: "Manages the family estate",
    workLocation: "Kundah", hometown: "Kundah", diet: "non_vegetarian",
    maritalStatus: "never_married", postedBy: "parent", photoVisibility: "on_accept",
    about: "Manages twelve acres of tea and vegetables. Has no intention of leaving the hills, and would prefer someone who feels the same.",
    fatherOccupation: "Tea grower", motherOccupation: "Tea grower",
    siblings: "Two elder brothers, both married", birthPlace: "Kundah", birthTime: "07:10",
    from: "#8a6a1f", to: "#d6b661",
  },
  {
    id: "sample-mat-07", name: "Thangi", gender: "female", age: 31, heightCm: 162,
    education: "B.Sc Computer Science", occupation: "Software tester", workLocation: "Chennai",
    hometown: "Coonoor", diet: "vegetarian", maritalStatus: "widowed",
    postedBy: "relative", photoVisibility: "on_accept",
    about: "Working in Chennai. Widowed two years ago, one daughter aged four. Looking for an understanding partner.",
    fatherOccupation: "Retired teacher", motherOccupation: "Homemaker",
    siblings: "One elder brother, married", birthPlace: "Coonoor", birthTime: "14:35",
    from: "#3f4a48", to: "#8d9c98",
  },
  {
    id: "sample-mat-08", name: "Bella", gender: "male", age: 29, heightCm: 170,
    education: "B.A History, B.Ed", occupation: "Government school teacher",
    workLocation: "Gudalur", hometown: "Gudalur", diet: "vegetarian",
    maritalStatus: "never_married", postedBy: "self", photoVisibility: "members",
    about: "Teaching in a government school near Gudalur. Interested in someone with a similar profession or outlook.",
    fatherOccupation: "Farmer", motherOccupation: "Homemaker",
    siblings: "One younger sister, working", birthPlace: "Gudalur", birthTime: "09:25",
    from: "#1f6140", to: "#7cb894",
  },
];

/* -------------------------------------------------------------------------- */
/*  Artwork                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * An SVG monogram, not a face.
 *
 * There is no real photograph here to show, and a stock face on a matrimony
 * listing implies a person who does not exist. A monogram reads as "no photo
 * yet", which is the truth.
 */
function avatarSvg({ name, from, to }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <g fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3">
    <path d="M-40 720 L240 600 L440 680 L620 570 L840 660"/>
    <path d="M-40 800 L240 690 L440 760 L620 660 L840 740"/>
    <path d="M-40 880 L240 780 L440 845 L620 750 L840 825"/>
  </g>
  <text x="400" y="430" text-anchor="middle" fill="rgba(255,255,255,0.92)"
        font-family="system-ui, -apple-system, Segoe UI, sans-serif"
        font-size="300" font-weight="600">${initial}</text>
  <text x="400" y="930" text-anchor="middle" fill="rgba(255,255,255,0.62)"
        font-family="system-ui, -apple-system, Segoe UI, sans-serif"
        font-size="30">Sample profile</text>
</svg>`;
}

async function uploadAvatar(profile) {
  const path = `matrimony/${profile.id}/monogram.svg`;
  const file = bucket.file(path);
  const token = randomUUID();

  await file.save(Buffer.from(avatarSvg(profile), "utf8"), {
    contentType: "image/svg+xml",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });

  // Same shape getDownloadURL() produces, so the app treats it identically.
  const url =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(path)}?alt=media&token=${token}`;

  return { url, path, width: 800, height: 1000, caption: "" };
}

/* -------------------------------------------------------------------------- */
/*  Run                                                                        */
/* -------------------------------------------------------------------------- */

async function remove() {
  const snapshot = await db
    .collection("matrimonyProfiles")
    .where("isSample", "==", true)
    .get();

  for (const entry of snapshot.docs) {
    await entry.ref.collection("private").doc("contact").delete().catch(() => {});
    await entry.ref.delete();
  }
  await bucket.deleteFiles({ prefix: "matrimony/sample-mat-" }).catch(() => {});
  console.log(`Removed ${snapshot.size} sample profiles and their artwork.`);
}

async function seed() {
  let created = 0;

  for (const profile of PROFILES) {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - profile.age);

    const photo = await uploadAvatar(profile);
    const restricted = profile.photoVisibility === "on_accept";

    await db.collection("matrimonyProfiles").doc(profile.id).set({
      ownerUid: profile.id,
      postedBy: profile.postedBy,
      name: profile.name,
      gender: profile.gender,
      dob: Timestamp.fromDate(dob),
      birthTime: profile.birthTime,
      birthPlace: profile.birthPlace,
      heightCm: profile.heightCm,
      maritalStatus: profile.maritalStatus,
      diet: profile.diet,
      education: profile.education,
      occupation: profile.occupation,
      workLocation: profile.workLocation,
      hometown: profile.hometown,
      motherTongue: "Badaga",
      about: profile.about,
      fatherOccupation: profile.fatherOccupation,
      motherOccupation: profile.motherOccupation,
      siblings: profile.siblings,
      photoVisibility: profile.photoVisibility,
      // Restricted photos are withheld from the public document, exactly as a
      // real listing would be.
      photos: restricted ? [] : [photo],
      hasPhotos: true,
      status: "approved",
      reviewNote: null,
      reviewedBy: "seed-script",
      reviewedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      viewCount: 0,
      isSample: true,
    });

    await db
      .collection("matrimonyProfiles")
      .doc(profile.id)
      .collection("private")
      .doc("contact")
      .set({
        phone: "Sample profile — no contact number",
        email: "",
        photos: [photo],
        horoscopeNote: "",
        updatedAt: FieldValue.serverTimestamp(),
      });

    created += 1;
    console.log(`  ${profile.id}  ${profile.name.padEnd(8)} ${profile.gender.padEnd(7)} ${restricted ? "photo on accept" : "photo to members"}`);
  }

  console.log(`\nSeeded ${created} profiles.`);
}

const mode = process.argv.includes("--remove") ? remove : seed;
mode()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exit(1);
  });
