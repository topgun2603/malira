# Nilgiri News — Web Admin Panel

Two things in one app:

1. **The editorial desk** (`/admin`) — authoring, the contributor approval
   workflow, categories, events, songs, notifications, analytics and settings.
2. **The public reader** (`/`) — the news site itself. It is also the reference
   design for the Android app: the Flutter build mirrors these screens and these
   exact Firestore queries.

Nilgiri News is a district news product. It is not tied to any single
organisation — there is no membership, no committee and no owning body anywhere
in the model, and the About page and contact details are content the desk edits
in Settings rather than anything baked into the code.

Phase 1 (news) and Phase 2 (events, songs, notifications, analytics, settings)
are both built. The matrimony module remains out of scope.

**Routes are namespaced:** the desk lives under `/admin/*`, the public reader at
the root. They collided at `/events` otherwise, and would have collided again.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| UI | shadcn/ui (Radix) + Tailwind CSS v4 |
| Data | TanStack Query v5 · TanStack Table v9 |
| Motion | Motion (framer-motion v12+, `motion/react`) |
| Backend | Firebase — Auth, Firestore, Storage |
| Editor | Tiptap |

## Getting started

```bash
cp .env.local.example .env.local   # fill in the six Firebase values
npm install
npm run dev
```

Without `.env.local` the app renders a setup notice instead of a blank page.

### Firebase project setup

1. **Authentication** → enable **Email/Password** and **Google**. (Phone is for
   the mobile app's OTP login; the panel does not use it.)
2. **Firestore** → create the database in a region close to India (`asia-south1`).
3. **Storage** → create the default bucket.
4. Deploy the rules and indexes in this repo:

   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
   ```

5. Sign in to the panel. **The first account ever to sign in becomes Super
   Admin.** Everyone after that lands as a Contributor and is promoted from
   *Users & roles*. This avoids needing the Admin SDK just to bootstrap.

   The seat is claimed exactly once, guarded by a write-once `settings/bootstrap`
   document written in the same batch as the profile. Checking
   `!exists(users/$(uid))` instead would be trivially true while creating that
   same document, and would let *every* new sign-in claim Super Admin.
6. On the dashboard, click **Add default categories** to seed the seven feed
   categories from the Phase 1 scope, then **Add sample content** to fill the
   reader pages with ten bilingual demo stories and generated lead images.

   Sample documents carry `isSample: true`, and the dashboard keeps showing a
   card for as long as any exist. **Remove them before the app reaches readers** —
   they are demo copy, not reporting.

## Roles

| Role | Can do |
|---|---|
| Super Admin | Everything, including user management and settings |
| Editor | Publish, schedule, review submissions, manage categories, pin |
| Contributor | Write and submit their own articles; sees only their own drafts |
| Playlist Manager | Songs and playlists only (next phase) |

`src/lib/permissions.ts` holds the matrix the UI reads. **`firestore.rules` is
the enforcement layer** and mirrors it. If the two ever disagree, the rules win
and the UI has a bug.

## Editorial workflow

```
draft ──submit──▶ in_review ──approve──▶ published ──▶ unpublished
  ▲                   │                      │
  └─────send back─────┘                   scheduled
```

- Contributors move `draft → in_review` and no further.
- Editors publish, schedule, unpublish, or send back with a note the
  contributor sees on the article.
- Every transition is appended to the `activity` collection, which is
  create-only — the log cannot be rewritten.

## Notable decisions

**Images are compressed in the browser.** Editors paste 6MB phone photos and the
app is read on 3G in the hills, so uploads are resized to 1600px WebP at ~350KB
before a byte leaves the desk (`src/lib/api/storage.ts`).

**YouTube uses oEmbed, not the Data API.** Titles and thumbnails come from
`youtube.com/oembed`, so there is no API key to manage and no daily quota to run
out of. Only the canonical watch URL is stored.

**Keyword search runs in the browser.** Status, category and author filter in
Firestore; the text match filters the returned page. Firestore has no full-text
search, and at a district news desk's volume this is cheaper and more forgiving
than running a search service. If volume ever makes that false, swap in
Typesense behind `listArticles` — no call site changes.

**Tamil is a first-class language.** Noto Sans Tamil is loaded in the editor so a
Tamil headline looks the way it will in the app, which is the only way an editor
can judge its length. Slugs are always built from the English title.

**One token file drives the theme.** `src/app/globals.css` holds the whole
palette in light and dark. No component hardcodes a colour.

**Each reader section carries its own accent**, set by a `data-section`
attribute on the reader shell:

| Section | Light | Dark |
|---|---|---|
| News, events, archive, about | `#145892` hill blue | `#67aaed` |
| Songs | `#1f6140` tea green | `#68bc8e` |
| Matrimony | `#9c3464` rose | `#ee8ab2` |

Custom properties inherit, so overriding `--primary` on that one wrapper
re-tints every button, badge, chip, ring and link beneath it with no component
changes. Only `--primary`, its foreground and `--ring` move: `--accent` stays
saffron site-wide, because it is the one loud colour reserved for actions and
letting it drift per section would leave nothing constant to anchor on. All
three clear 6.8:1 against white.

## Reader pages

| Route | What it is |
|---|---|
| `/` | Landing feed — big lead story, curated carousels, category rail, card grid, poll, most-read |
| `/article/[id]` | Article view — images, YouTube embed, body, tags, WhatsApp share |
| `/events` · `/events/[id]` | Calendar and event detail with map link and organiser contact |
| `/songs` | Playlists and the in-page YouTube player |
| `/archive` | Everything ever published, by month and section |
| `/about` | About text and contact details, rendered from Settings |
| `/matrimony` | Public matrimony landing — marketing only, server-rendered |
| `/matrimony/browse` · `/[id]` · `/me` | Members-only: search, profile, interests |

## Matrimony

The one module that is **not** public. News is open because a feed that needs an
account is not a feed; matrimony is the opposite — dates of birth, photographs
and family details of people in a small district. A signed-in member is the
minimum audience, and contact details are narrower still.

The front door is split in two on purpose: `/matrimony` is plain
server-rendered marketing that touches no member data, and `/matrimony/browse`
is the gated member area. Putting both behind one auth check meant a crawler —
and every first paint — got a spinner instead of the pitch.

The member flow is: **sign in → complete a profile → browse**. Listing comes
before browsing because a service where people can look but never be looked at
empties out fast; the families who list are the ones carrying the risk.

Free members see `FREE_PROFILE_VIEWS` profiles and then a subscribe wall that
states honestly how many are being held back. The wall sits *after* the free
results rather than replacing them — a wall that fires before anything is shown
reads as bait-and-switch.

Hero and section imagery lives in `public/matrimony/`; see the prompts in
`public/matrimony/IMAGE-PROMPTS.md`. Every image slot is layered over a
gradient, so a missing file degrades to a tinted panel rather than a broken
image.

Three design decisions carry the privacy:

1. **A profile's document id is its owner's uid.** One profile per account falls
   out for free, and the rules answer "is this yours?" without a lookup.
2. **Contact details are never on the profile document.** Firestore has no
   field-level security, so a phone number on the main document would be
   readable by anyone who can read the profile. Phone, email and restricted
   photos live in `matrimonyProfiles/{uid}/private/contact`, whose read rule
   requires an accepted interest in either direction.
3. **Interest ids are `${fromUid}__${toUid}`.** Deterministic, so the rules can
   check for a match with `exists()`, and nobody can forge an interest that
   appears to come from someone else.

Photo visibility has two settings, not three. An earlier draft had "blurred" —
a CSS blur is not privacy, because the URL is still in the page — so restricted
photos are withheld from the public document entirely and the card shows a lock.

Editing a profile always returns it to the moderation queue: a member cannot
approve their own listing, and an edited profile has not been reviewed in its
current form. Minimum age is enforced on save (21 for men, 18 for women).

### Accounts

Registration is open at `/login` — a segmented Sign in / Create account control.
A new account is a **Member**: browse news, use matrimony, vote in polls, and
nothing else. Desk roles are granted from *Users & roles*.

### Payments

Sold on the web, never in-app, so no Play Store commission applies (see the
policy note in the conversation: transactions completed outside a Play-
distributed app are exempt entirely).

**Premium is ₹499 for six months** and buys *reach, not consent*: unlimited
interests instead of three a month. **The contact reveal is never for sale** —
it stays behind a mutual accept for free and paid members alike. Selling it
would turn a consent mechanism into a payment mechanism.

The flow, and why it is shaped this way:

| Step | Where | Why |
|---|---|---|
| Create order | `POST /api/payments/order` | Amount comes from the server-side plan table, never the request body |
| Checkout | Razorpay Checkout in the browser | — |
| Verify | `POST /api/payments/verify` | HMAC-SHA256 of `order_id\|payment_id`, compared with `timingSafeEqual` |
| Webhook | `POST /api/payments/webhook` | The reliable path: the browser callback is lost whenever the connection drops on the way back from the bank |

Both paths converge on `grantSubscription`, which is **idempotent on the payment
id** — the callback and the webhook fire for the same payment, and paying while
still subscribed extends from the current expiry rather than overwriting it.

`subscriptions/{uid}` and `payments/{id}` are **read-only to owners and deny all
client writes**. Entitlements are written exclusively by the Admin SDK after a
verified signature, because security rules have no way to know whether money
actually moved.

Required env (see `.env.local.example`): `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT`.
Without them the payment routes return 503 and the rest of the app is unaffected.

**Still owed by whoever runs this:** a named moderator with a same-day
turnaround, a published privacy policy, and a decision on free vs paid. Paid
would pull in Google Play billing at 15–30% plus GST, which is why it is free.

### The role change matrimony forced

New sign-ins used to default to **Contributor**, which can submit articles. With
matrimony open to anyone who signs in, that was a hole rather than a
convenience. The default is now **Member** — a reader with no desk access at
all — and desk roles are granted from *Users & roles*.

## How old stories are handled

Originally: badly. The feed took a flat `limit(40)` with no cursor, so the
forty-first story became unreachable from the site the day it was published —
findable only by someone who already had the link. Nothing was deleted; it was
simply invisible.

Now, three things keep every story reachable:

1. **Cursor pagination.** `listPublishedPage` uses `startAfter`, and the home
   feed has a *Load more* button. Firestore cursors mean page two never re-reads
   page one.
2. **The archive** at `/archive`, filterable by month and section. `listArchiveMonths`
   derives the month list from what actually exists, so no empty months appear.
3. **Nothing ages out.** There is no retention rule and no auto-delete on
   articles. An old story stays published and keeps its URL forever.

**Events are the exception, and deliberately so.** A finished event *should*
leave the calendar. *Tidy past events* on the admin Events page archives one-off
events whose end time has passed, and **rolls recurring events forward** to
their next occurrence instead — an annual festival must never vanish. It is a
button rather than a scheduled Cloud Function because a Function needs the Blaze
plan for a once-a-day sweep over a handful of rows.

## Carousels, polls and advertising

Managed at `/carousels`, `/polls` and `/ads`; all Editor-and-above.

**The lead story is not a carousel.** The first story still runs big and alone at
the top of the feed, pinned-first then newest — `listPublishedArticles` sorts
pinned ahead of everything, so pinning a story in the news list puts it there.

**Carousels are curated and placed, like ads.** An editor picks the stories by
hand and orders them; there is no "newest five" rule, because there is always a
week where the newest five are not the five worth leading with. Five slots:

| Slot | Where |
|---|---|
| `home_top` | Above the lead story |
| `home_after_hero` | Under the lead story |
| `home_feed` | Inside the feed, after the 4th card |
| `home_bottom` | Below the feed |
| `article_end` | After an article |

One running carousel per slot, max 10 stories each, per-carousel autoplay and
interval. Only *published* stories can be selected, and any story that is later
unpublished silently drops out rather than breaking the slider — the reader side
resolves each id with a per-document read, so the rules are evaluated per story.

**Polls.** One running poll per surface (home sidebar, article sidebar, or both).
Readers vote without an account, one vote per browser via `localStorage`. This is
an opinion poll, not a ballot: someone who clears their storage can vote twice.
What the rules *do* guarantee is that a public write can only add one to one
option of a *running* poll — `affectedKeys().hasOnly(['counts','totalVotes'])`
plus `totalVotes == previous + 1` — so the worst case is a skewed poll, never a
corrupted document or a reopened closed one.

**Ads.** Four formats across seven slots:

| Format | Slots |
|---|---|
| Wide banner | Home top · Article top · Article end |
| In-feed card | Home feed (after the 4th story) · Article end |
| Sidebar box | Home sidebar · Article sidebar |
| Popup | Any page, once per reader per day by default |

Picking the slot narrows the formats, so an impossible booking cannot be made.
Weight is **share of voice, not priority**: weight 3 against weight 1 wins three
times in four across page views, rather than burying the smaller advertiser
permanently. Unsold slots collapse to nothing rather than showing a placeholder.

Every format carries a non-removable "Advertisement" label, and the ad creator's
live preview renders the *same* `AdCreative` component the reader gets — so what
the desk approves cannot drift from what runs. Draft ads are not publicly
readable: an unstarted campaign is commercially sensitive.

Both are bilingual behind one toggle in the header. `pick(en, ta)` in
`components/reader/language.tsx` returns Tamil only when the Tamil field is
actually filled, so an English-only article still reads correctly with Tamil
selected — that fallback is why articles can be published without a translation.

`lib/api/public-news.ts` is kept separate from the editorial queries and touches
nothing but `status == "published"`, so "could a draft leak into the feed" is
answerable by reading one short file. Published stories and categories are
readable **without signing in** — a news app whose feed needs an account is not
a news app — while drafts, submissions and scheduled items stay private.

## Layout

```
src/
├─ app/
│  ├─ (reader)/         # public shell: site header + footer
│  │  ├─ page.tsx       # the news landing page at /
│  │  └─ article/[id]/  # public article view
│  ├─ (admin)/          # authenticated shell: sidebar + topbar
│  │  ├─ dashboard/     # stat tiles, latest published, activity
│  │  ├─ news/          # list, new, [id], approvals
│  │  ├─ categories/    # feed tabs, order, active toggle
│  │  ├─ users/         # roles and account enable/disable
│  │  └─ events|playlists|notifications|analytics|settings/   # next phase
│  └─ login/
├─ components/
│  ├─ ui/               # shadcn primitives
│  ├─ news/             # editor, uploader, table, status badge
│  ├─ reader/           # public feed cards, language toggle, site header
│  ├─ layout/           # sidebar, topbar, page header, nav config
│  ├─ providers/        # auth, query, theme
│  ├─ motion/           # restrained entrance primitives
│  └─ shared/           # empty/loading states, placeholders
├─ hooks/               # TanStack Query hooks per collection
└─ lib/
   ├─ api/              # Firestore + Storage access
   ├─ firebase/         # config, collection refs, error copy
   ├─ permissions.ts    # the role matrix the UI reads
   └─ types.ts          # the document shapes
```

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (type-checks as part of the build)
npm run lint    # eslint, including the React Compiler rules
```

## Not in this build

Events, playlists, notifications, analytics and settings are placeholder screens
listing their agreed scope. The matrimony module is out of scope entirely and
has no code, routes or collections here.
