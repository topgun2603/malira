# Nilgiri News

The association's newsroom, in two halves that share one Firebase project.

**Live:** <https://malira-rouge.vercel.app>

| | |
|---|---|
| [`web-admin/`](web-admin) | Next.js. The editorial desk *and* the public reader site. Deployed to Vercel. |
| [`mobile_app/`](mobile_app) | Flutter. The reader app for Android and iOS. |

Both talk to the same Firestore collections and are policed by the same
`web-admin/firestore.rules` and `web-admin/storage.rules`. A change to a
collection name belongs in `web-admin/src/lib/firebase/collections.ts` **and**
`mobile_app/lib/src/data/firestore_refs.dart` — the two are kept deliberately
identical.

## Running it

```bash
# The desk and reader site
cd web-admin
cp .env.local.example .env.local   # then fill it in — see below
npm install
npm run dev

# The app
cd mobile_app
flutter pub get
flutter run
```

## Configuration

`web-admin/.env.local` is **not** in this repository and must never be. Copy
`.env.local.example` and fill it from the Firebase and Razorpay consoles.

The `NEXT_PUBLIC_FIREBASE_*` values are not secrets — they are identifiers that
ship inside the browser bundle by design, and access is controlled by the rules
files rather than by hiding them. These three are secrets:

| Variable | Why it matters |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Bypasses **every** rule in the project. Raw JSON or base64. Never prefix it `NEXT_PUBLIC_`. |
| `RAZORPAY_KEY_SECRET` | Signs and verifies payments. |
| `RAZORPAY_WEBHOOK_SECRET` | Proves a webhook really came from Razorpay. |

Without `FIREBASE_SERVICE_ACCOUNT` the panel still runs; sending a push and
granting a subscription return a plain "not configured" error instead of
pretending to have worked.

## Deploying

**web-admin → Vercel.** The project's Root Directory is `web-admin`, so Vercel
builds only that folder and ignores the Flutter half. Leaving it at the
repository root is the one setting that breaks a monorepo deploy: the build
looks for a `package.json` beside the Flutter project, finds none, detects the
framework as "Other" and ships nothing — every path then 404s.

Two things follow from that setting, and both have bitten this project:

* Root Directory is resolved against whatever gets uploaded, so `vercel deploy`
  must run from the **repository root**. Running it inside `web-admin/` makes
  Vercel look for `web-admin/web-admin`.
* The CLI would then upload the whole monorepo and trip the 15,000-file limit
  on the Flutter build output alone, which is what [`.vercelignore`](.vercelignore)
  is for.

Recreating the Vercel project resets both Root Directory and every environment
variable to defaults. If the site starts returning 404 everywhere, check that
setting first. Pushing to `main`
deploys to production; every other branch and pull request gets its own preview
URL. The environment variables above have to be set in *Project Settings →
Environment Variables* — Vercel never reads `.env.local`.

**Firebase rules and indexes.** Not deployed by Vercel, and easy to forget:

```bash
cd web-admin
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

**mobile_app.** CI builds a per-ABI release APK on every push and attaches it to
the run as an artifact, signed with debug keys — fine for putting a build on a
tester's phone, not for the Play Store. Release signing needs a keystore, and a
keystore does not belong in a repository.

## CI

| Workflow | Runs on | Does |
|---|---|---|
| [`web.yml`](.github/workflows/web.yml) | changes under `web-admin/` | `tsc --noEmit`, `eslint`, `next build` |
| [`mobile.yml`](.github/workflows/mobile.yml) | changes under `mobile_app/` | `flutter analyze`, `flutter test`, release APK artifact |
| [`deploy.yml`](.github/workflows/deploy.yml) | pushes to `main` touching `web-admin/` | `vercel deploy --prod` |

Both CI workflows carry a `paths:` filter, and GitHub cannot diff the push that
*creates* a branch — so the very first push to a new branch runs neither. Use
**Run workflow** on the Actions tab, or push again.

`deploy.yml` needs one repository secret, `VERCEL_TOKEN` (create at
<https://vercel.com/account/tokens>, add under *Settings → Secrets and
variables → Actions*). Without it the job explains itself in the run summary
and skips rather than failing. The org and project ids in the workflow are
identifiers, not secrets. **No Firebase or Razorpay credential passes through
Actions** — those live on the Vercel project.

Vercel's own Git integration is connected to this repository and reports a
check back to each commit, but on this account's Hobby plan the deployments it
creates come back `BLOCKED`: the record is written and the build never starts.
`deploy.yml` exists because deploying with the CLI and a token sidesteps the
integration. If the plan changes, the integration can take over and this
workflow can be deleted.

Neither workflow needs a credential. The web build runs with no Firebase
config at all, because `src/lib/firebase/config.ts` falls back to inert
placeholders — so CI compiles every page without a secret ever reaching it.
