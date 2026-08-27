# Nilgiri News — mobile app

The reader app for the Badaga community association in the Nilgiris. It reads
the same Firestore project the admin panel in [`../web-admin`](../web-admin)
writes to, so there is no second backend and no sync step: the desk publishes a
story and it is in the app.

Phase 1 scope — news, events, songs/videos, notifications — plus the matrimony
client. Notifications are the one Phase 1 item still unwired (see
[Before release](#before-release)).

---

## Running it

```bash
flutter pub get
flutter run
```

No sign-in. Every collection the app reads is public under `firestore.rules`,
which is deliberate: a news app whose front page needs an account has failed at
the front page.

**Requirements**

| | |
|---|---|
| Flutter | 3.41+ (built against 3.41.7, Dart 3.11.5) |
| Android | Gradle 9.1.0 / AGP 8.13.0 — the wrapper was raised from the Flutter default because the JDK on this machine is Java 25, which Gradle 8.14 does not support |

---

## How it talks to the web app

Nothing is duplicated by hand. Each piece of the app points at a specific file
on the web side, and the comment in the Dart file says which:

| App | Web |
|---|---|
| `lib/src/data/repositories/news_repository.dart` | `src/lib/api/public-news.ts` — same queries, same page size, same pinned-first sort |
| `lib/src/data/models/*.dart` | `src/lib/types.ts` |
| `lib/src/data/firestore_refs.dart` | `src/lib/firebase/collections.ts` |
| `lib/src/core/theme/palette.dart` | `src/app/globals.css` — every colour is the sRGB conversion of an OKLCH token there |
| `lib/src/core/l10n/strings.dart` | `src/components/reader/language.tsx` — including the fallback rule |
| `lib/src/ui/news/widgets/article_body.dart` | the `.tiptap-content` block in `globals.css` |
| `lib/src/data/models/matrimony.dart` | the MATRIMONY block of `src/lib/types.ts` |
| `lib/src/data/repositories/matrimony_repository.dart` | `src/lib/api/matrimony.ts` — same queries, same client-side filters |
| `lib/src/core/theme/palette.dart` (matrimony rose) | `[data-section="matrimony"]` in `globals.css` |

The composite indexes the app needs are already deployed from
`web-admin/firestore.indexes.json`. The app adds no query shape that is not
already indexed there.

### The one rule worth knowing

Reader-facing queries only ever match `status == "published"`. That is enforced
in three places and they agree: the Firestore rules, the web reader API, and
`NewsRepository`. A direct link to a draft returns nothing even if you have the
document id.

---

## Design

The brief was deep tea-garden green, misty blue-grey, warm paper, saffron kept
for actions — and it is the admin panel's brief, not a new one. `palette.dart`
holds the converted tokens and **no other file in the app writes a colour**.

A few decisions worth stating, because they are not obvious from the code:

- **Type is bundled, not fetched.** Geist and Noto Sans Tamil ship in
  `assets/fonts/`. Tamil is reached through `fontFamilyFallback`, never selected
  by hand, so a bilingual headline keeps one optical weight across both scripts
  — which is the whole reason that pairing was chosen.
- **Body text starts at 17sp**, against Material's 14, and there is a reader
  size control on top of it. The readership skews old.
- **The masthead is the sidebar.** On the web the dark green is a nav rail; here
  it is the masthead. Same division: navigation on the green, editorial on paper.
- **Obituaries lose the accent colour and the press animation**, matching the
  web card. A death notice must not be styled like a match report.
- **Ads are always labelled.** An ad a reader mistakes for reporting costs the
  paper more than it earns the advertiser.
- Full light and dark, both derived from the same tokens.

### Accounts and matrimony

The news half needs no account and never asks for one. Matrimony is the
opposite: **nothing in it is public**, because these are dates of birth,
photographs and family details of people in a small district.

- **Sign-in is email and password**, which is a constraint rather than a
  preference: phone OTP and Google both need the Android app registered in
  Firebase with a SHA-1 fingerprint, and only a *web* app exists in the project
  today. Everything goes through `AuthRepository`, so swapping in phone OTP
  later is a change to that file and the sign-in screen — not to the matrimony
  module. The app only ever creates the `member` role; it deliberately does not
  implement the panel's super-admin bootstrap path.
- **Photographs upload from the phone**, up to five, to `matrimony/{uid}/` —
  the same bucket path, compression target and returned shape as the web's
  `uploadMatrimonyPhoto`. They upload as each one is chosen rather than on Save,
  so a member on a hill connection sees each land instead of watching a form
  hang and then fail all-or-nothing. EXIF is stripped: a phone photograph
  carries GPS coordinates, and a matrimony listing is the last place to publish
  the house somebody was standing in.
- **Restricted photographs are withheld, not hidden.** When privacy is set to
  "only after an accepted interest", the public document gets `photos: []` and
  the real URLs live only in `private/contact`. Nothing is filtered in the UI,
  because a URL written to the public document is readable by every signed-in
  member no matter what the UI does.
- **Contact details are held in a subcollection**, not on the profile document.
  Firestore has no field-level security, so a phone number on the main document
  would be readable by anyone who could read the profile at all. The
  `private/contact` read rule requires an accepted interest in either
  direction — an unearned number is not hidden, it is never sent to the device.
- **Saving a profile always returns it to `pending`.** A member cannot approve
  their own listing, and one edited after approval has not been reviewed in the
  form it is now in. The form says so before you tap, rather than letting a
  live profile vanish unexplained.
- **The minimum marriage age is enforced** — 21 for a man, 18 for a woman.
  That is Indian law, not a setting, and the date picker will not offer a date
  that the save would then reject.
- **The section carries the rose accent** via `SectionTheme`, which is the
  Flutter equivalent of the web's `[data-section]` wrapper: one `Theme` above
  the section and every descendant re-tints. The saffron does not move — it is
  the one loud colour reserved for actions across the whole product.

### Offline

Firestore persistence is on (`main.dart`), so every query answers from disk
before it answers from the network. Saved stories go further: the whole article
is written to `SharedPreferences`, not just its id, so the Saved tab works with
no signal at all. For a readership spread across hill villages that is the
single highest-value line in the app.

---

## Layout

```
lib/
  main.dart                 Firebase init, persistence, preferences preload
  firebase_options.dart     ⚠ see Before release
  src/
    core/                   theme, palette, strings, date formatting
    data/                   models, firestore refs, repositories
    state/                  Riverpod providers, preferences, bookmarks
    ui/
      shell/                five-tab frame, drawer, language toggle
      account/              sign-in, account
      matrimony/            gate, browse, profile, interests, edit
      news/                 feed, article, search, saved
      events/               calendar, event detail
      songs/                songs, playlists
      more/                 settings, about, archive
```

State is Riverpod 3. Routing is go_router with a `StatefulShellRoute`, so each
tab keeps its own scroll position and back stack.

**The frame.** Five tabs — News, Events, **Matrimony**, Songs, More — with
matrimony in the centre, lifted clear of the bar and carrying the unanswered-
interest count. It earns that position by being the only destination that is a
place rather than a feed, and the only one behind an account. Saved moved into
the drawer: a personal shelf visited occasionally, not one of the five things
the app is for.

Each tab lights up in its own section accent, the same three-way split
`globals.css` applies with `[data-section]` — news and events in hill blue,
songs in tea green, matrimony in rose. Routes wrap their pages in
`SectionTheme`, so a page never has to know its own accent, exactly as a web
component never has to.

**The masthead is pinned** and collapses as the feed scrolls: the eyebrow and
date fade, the wordmark shrinks and steps aside for the menu button. The
category rail below it scrolls away — which section somebody is reading is a
choice made once, and it does not need to hold a strip of the screen all
session.

---

## Before release

Three things are known-outstanding. None of them block development.

### 1. Register the Android app in Firebase — required

Only a **web** app exists in the `nilgiri-news` Firebase project, so
`firebase_options.dart` currently reuses the web credentials on Android.
Firestore reads work on that basis, which is why the app runs. What does not
work until a real Android app is registered:

- **Push notifications** (FCM needs a real android appId and a
  `google-services.json`) — and notifications are in Phase 1 scope
- Analytics, Crashlytics, App Check
- Any per-platform API key restriction, since there is one key doing both jobs

The fix is one command:

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=nilgiri-news
```

It overwrites `firebase_options.dart` with real per-platform values. Nothing
else in the app changes.

### 2. A cancelled event vanishes instead of saying it is cancelled

`firestore.rules` exposes events only when `status == "published"`. So when the
desk cancels an event, a reader who saw the notice and opens it again gets
"not available" rather than "Cancelled" — and it disappears from the calendar
silently. The app models the cancelled state and is ready to show it; the rule
is what decides. **This is a call for the association, not a bug to patch in the
client**: either cancelled events stay publicly readable so the app can label
them, or cancelling really does mean erasing.

### 3. Premium cannot be sold in the app

The web sells a ₹499 / 6-month Premium plan through Razorpay. The app
deliberately does **not** implement that checkout: Google Play requires digital
goods consumed in-app to go through Play Billing, at a 15–30% cut. The app
therefore shows the free quota (3 interests a month, the same constant as the
web), shows Premium status if the account already holds it, and points at the
website — it does not open a payment flow it is not allowed to open. Selling it
properly means either Play Billing or keeping purchases web-only; that is a
commercial decision for the association, and it is the same question recorded
as decision 1 in the project notes.

### 4. Search covers recent stories, not the archive

Firestore has no text index. `NewsRepository.searchHeadlines` filters the most
recent 300 published stories on the device, and the search screen says so rather
than letting a reader discover it when an old story does not turn up. A real
archive search needs an external index — a Phase 2 decision, not a quick fix.

### Also worth knowing

- **Sharing links to the web reader**, not to a deep link, so a recipient
  without the app installed lands on something readable. Once the app has a
  published domain and App Links configured, that becomes one URL that opens
  whichever the recipient has.
- **View counts are never written by the app.** The rules do not permit a public
  write to an article, and the web reader does not do it either — `viewCount`
  is populated elsewhere. `mostRead` reads the field; nothing here increments it.
- **Web builds currently fail** on `firebase_core_web` 3.11.0 (an upstream
  `isA` error under dart2js). The Wasm path compiles. Android is unaffected and
  is the target platform.

---

## One gotcha, if you touch dates

`Dates` formats in `en_IN`, and `intl` compiles in only `en_US` — every other
locale must be loaded at runtime. `main()` calls
`initializeDateFormatting('en_IN')` before `runApp` for exactly this reason.

Skipping it does not produce an error screen. `DateFormat` throws from inside
`build()`, which takes out every widget that renders a date — every article
card, every event card, the masthead — while leaving alone the widgets that do
not, like songs and the category chips. The feed reads as "no stories
published" while Firestore is happily returning nine. This shipped once and cost
a real debugging session; `test/date_format_test.dart` now guards it, and
`Dates._format` degrades to an empty string rather than taking a headline down
with it.

## Checks

```bash
flutter analyze                  # clean
flutter test                     # 40 tests
flutter build apk --release
```

Sideloading onto a ColorOS/Realme device is blocked by Play Protect with
`INSTALL_FAILED_VERIFICATION_FAILURE`. The fix is one setting, and it should be
put back afterwards:

```bash
adb shell settings put global verifier_verify_adb_installs 0
adb install -r -d build/app/outputs/flutter-apk/app-release.apk
adb shell settings put global verifier_verify_adb_installs 1
```
