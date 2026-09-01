# Packing Organiser — backend (MVP)

Software-only MVP for an AI packing assistant: no camera hardware yet. The
user creates a trip, then uploads/takes a sequence of photos while packing;
each photo is analysed by Claude's vision model and reconciled against a
persistent per-trip inventory so the same physical item is never counted
twice just because it appears in more than one photo.

## Run it

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY and JWT_SECRET
npm run dev            # starts the app on http://localhost:3000
```

`JWT_SECRET` is required (the server refuses to start without it) — generate one with
`openssl rand -hex 32`. Keep it stable once you're using the app for real:
changing it invalidates every existing login.

Open **http://localhost:3000** — there's a small built-in web UI (no separate
frontend project or build step) so you can create a trip, upload/take packing
photos, and watch the inventory update after each one, live. It also shows a
"needs your review" queue for anything the reconciler was unsure about, and
lets you add/edit/remove items manually. This UI is a thin wrapper over the
API below — the mobile app is the next step, not this.

```bash
npm run typecheck
npm test
```

## The core problem: persistent inventory across sequential photos

This was the piece worth solving carefully first, since every other feature
(manual edits, display, comparing against trip requirements) sits on top of
it. The approach is a **two-tier reconciler** (`src/inventory/reconciler.ts`):

1. **Tier 1 — heuristic (free, deterministic).** Each freshly detected item's
   name/category is normalized (`src/normalize.ts`: lowercased, articles and
   quantity words like "a pair of" stripped, simple plurals singularized,
   with an exception list for words that are inherently plural — "shorts",
   "sunglasses", etc.) and compared against the trip's existing active
   inventory. An exact normalized match — the common case of the same item
   photographed again from a different angle — is resolved instantly with no
   API call.

2. **Tier 2 — LLM reconciliation.** Whatever tier 1 couldn't resolve (both
   the leftover detections *and* the leftover inventory items — already-
   matched items are excluded) goes to a single Claude tool-use call
   (`src/inventory/llmMatcher.ts`) that returns, per detection, one of:
   - `match` — same physical item as an existing one (handles paraphrasing,
     e.g. "navy shirt" vs "blue t-shirt"),
   - `new` — genuinely not in the inventory yet,
   - `ambiguous` — can't confidently tell.

   `ambiguous` detections are **never** auto-merged or auto-added. They're
   queued as `review_candidates` for the user to resolve manually (matched to
   an existing item, confirmed as new, or discarded). The reconciler is
   deliberately conservative in every other malformed/uncertain case too — a
   missing decision, or a match pointing at an already-claimed or unknown
   item id, also falls back to `ambiguous` rather than guessing. Silently
   fabricating or dropping items would be worse than asking once.

This is proven out in `test/reconciler.test.ts`, including a simulation of
three sequential photos of an overlapping suitcase that converges on the
correct unique item count without hitting the real API (the LLM tier is
injected via an `LLMMatcher` interface and scripted in tests).

**Known MVP simplification:** re-matching an item across photos doesn't
currently adjust its quantity (e.g. going from 2 socks visible to 3 across
photos won't auto-bump the count) — quantity correction is left to the manual
edit endpoint for now. Solving that well needs either quantity-aware matching
or per-instance (not per-type) tracking, which is a reasonable next increment
once the type-level dedup above is validated with real photos.

## Data model (`src/db.ts`, SQLite via better-sqlite3)

- `trips` — destination, purpose, dates, duration, activities
- `photos` — one row per uploaded photo, sequence number, processing status
- `inventory_items` — the current packed inventory (active/removed), each
  tagged with its `source` (`vision` or `manual`)
- `item_observations` — provenance: every detection that contributed to or
  was merged into an item, with which photo and which tier matched it
- `review_candidates` — ambiguous detections awaiting a user decision
- `wardrobe_items` — a separate, trip-independent closet (see below)
- `packing_lists` / `packing_list_items` — reusable, trip-independent packing
  lists (see below)

## Accounts

Email + password, `src/auth/`. Passwords are hashed with bcrypt; sessions are
a JWT (30-day expiry) the client sends as `Authorization: Bearer <token>`.
Every `/trips` and `/wardrobe` route requires one and only ever returns data
owned by that token's user — trying to read or edit someone else's trip
returns a plain 404, not a 403, so existence isn't leaked either. The one
exception is `GET /trips/:id/photos/:photoId/file`: it's left unauthenticated
because `<Image>` can't attach a custom header cross-platform, so it's
protected only by the photo id being an unguessable UUID (an "unlisted
link" model, same as most photo-hosting URLs) — every route that reveals a
photo's *existence* still requires the owning user's token.

No password reset, email verification, or refresh-token rotation yet — a
reasonable MVP simplification, not a finished auth system.

## API

| Method & path | Purpose |
| --- | --- |
| `POST /auth/signup` | Create an account (`email`, `password`, optional `name`) — returns `{user, token}` |
| `POST /auth/login` | `{email, password}` — returns `{user, token}` |
| `GET /auth/me` | The authenticated user |
| `POST /trips` | Create a trip (`destination`, `purpose`, `startDate`, `endDate`, `durationDays`, `activities[]`) |
| `GET /trips` / `GET /trips/:id` | List / fetch a trip |
| `POST /trips/:id/photos` | Upload a packing photo (`multipart/form-data`, field `photo`) — runs vision detection + reconciliation, returns the updated inventory and match/add/ambiguous counts |
| `GET /trips/:id/photos` | List a trip's uploaded photos (each with a `url` to fetch the file) |
| `GET /trips/:id/photos/:photoId/file` | The raw photo file (used e.g. as a trip cover thumbnail) |
| `GET /trips/:id/weather` | Best-effort forecast for the trip's start date: `{available: true, tempC, condition, emoji}` or `{available: false}` |
| `GET /trips/:id/inventory` | Current active inventory |
| `POST /trips/:id/inventory` | Manually add an item |
| `PATCH /trips/:id/inventory/:itemId` | Manually correct an item (name/category/quantity) |
| `DELETE /trips/:id/inventory/:itemId` | Remove an item |
| `GET /trips/:id/review` | List pending ambiguous detections |
| `POST /review/:candidateId/resolve` | Resolve one: `{action: "confirm_match", itemId}` \| `{action: "confirm_new"}` \| `{action: "discard"}` |
| `GET /wardrobe` / `POST /wardrobe` | List / manually add to the user's general wardrobe (independent of any trip) |
| `PATCH /wardrobe/:itemId` / `DELETE /wardrobe/:itemId` | Correct / remove a wardrobe item |
| `GET /packing-lists` | List the user's reusable packing lists |
| `POST /packing-lists` | Create a list (`category`: `travel_type` \| `destination` \| `activity`, `name`) — auto-prefilled with starter items when the name matches a known template; returns `{list, items}` |
| `GET /packing-lists/:id` | Fetch one list with its items — returns `{list, items}` |
| `PATCH /packing-lists/:id` | Rename a list |
| `DELETE /packing-lists/:id` | Delete a list (and its items, via cascade) |
| `POST /packing-lists/:id/items` | Add an item to a list |
| `PATCH /packing-lists/:id/items/:itemId` | Correct an item (name/category/quantity) |
| `DELETE /packing-lists/:id/items/:itemId` | Remove an item |

## Weather

Uses [Open-Meteo](https://open-meteo.com) (`src/weather/`) — free, no API key
or signup required. Geocodes the trip's destination, then fetches a forecast
for its start date. Open-Meteo's free forecast only covers roughly the next
16 days, so most trips booked further ahead will just get
`{available: false}` — there's no fallback to historical/climate averages
for longer horizons yet. Business logic (`weatherService.ts`) is unit-tested
against a mocked client (`test/weatherService.test.ts`); the actual network
calls (`openMeteoClient.ts`) obviously need real internet access to verify.

## Wardrobe

A second, trip-independent inventory: what the user owns in general (their
closet), manually maintained via the endpoints above. It's deliberately not
auto-populated from trip inventories yet — that's the natural seed for
future packing recommendations (comparing what's in the wardrobe against
what a new trip's purpose/activities suggest), but the recommendation logic
itself isn't built.

## Packing lists

A third kind of list, independent of the wardrobe and of any one trip: a
user builds up a reusable list per travel type (e.g. "Plane"), destination
(e.g. "Lisbon"), or activity (e.g. "Hiking"), then draws on it for any future
trip that matches. Creating a list with a name that matches an existing
recommendation template (`src/recommendations/packingTemplates.ts`) seeds it
with that template's starter items; any other name just starts empty —
nothing is fabricated. This reuses the same rule-based template dictionaries
the trip recommendation engine already draws from, so the two stay in sync
by construction rather than by convention.

## Not built yet

- Using the wardrobe to seed packing recommendations (recommendations
  currently come from a rule-based purpose/activity/weather engine, not
  from what's actually in the user's closet).
- Password reset, email verification, refresh-token rotation.
