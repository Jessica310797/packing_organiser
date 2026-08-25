# Packing Organiser — backend (MVP)

Software-only MVP for an AI packing assistant: no camera hardware yet. The
user creates a trip, then uploads/takes a sequence of photos while packing;
each photo is analysed by Claude's vision model and reconciled against a
persistent per-trip inventory so the same physical item is never counted
twice just because it appears in more than one photo.

## Run it

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm run dev            # starts the app on http://localhost:3000
```

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

- `trips` — destination, dates, duration, activities
- `photos` — one row per uploaded photo, sequence number, processing status
- `inventory_items` — the current packed inventory (active/removed), each
  tagged with its `source` (`vision` or `manual`)
- `item_observations` — provenance: every detection that contributed to or
  was merged into an item, with which photo and which tier matched it
- `review_candidates` — ambiguous detections awaiting a user decision

## API

| Method & path | Purpose |
| --- | --- |
| `POST /trips` | Create a trip (`destination`, `startDate`, `endDate`, `durationDays`, `activities[]`) |
| `GET /trips` / `GET /trips/:id` | List / fetch a trip |
| `POST /trips/:id/photos` | Upload a packing photo (`multipart/form-data`, field `photo`) — runs vision detection + reconciliation, returns the updated inventory and match/add/ambiguous counts |
| `GET /trips/:id/inventory` | Current active inventory |
| `POST /trips/:id/inventory` | Manually add an item |
| `PATCH /trips/:id/inventory/:itemId` | Manually correct an item (name/category/quantity) |
| `DELETE /trips/:id/inventory/:itemId` | Remove an item |
| `GET /trips/:id/review` | List pending ambiguous detections |
| `POST /review/:candidateId/resolve` | Resolve one: `{action: "confirm_match", itemId}` \| `{action: "confirm_new"}` \| `{action: "discard"}` |

## Not built yet

- A real mobile app — `public/` is a minimal browser UI for exercising the
  API locally, not the product's intended interface.
- Comparing the inventory against trip requirements/recommendations (item 9
  in the brief) — deferred until the inventory itself is trustworthy.
