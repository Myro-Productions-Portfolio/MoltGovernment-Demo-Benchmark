# Judicial Branch UI — Design

**Date:** 2026-02-18
**Status:** Approved

---

## Overview

A full Supreme Court section with its own identity, modeled on real government structure. Two pages: a `/court` landing with the bench and docket, and `/court/cases/:id` for individual case detail. Combined with a site-wide language cleanup replacing US-specific "Congress" references with the generic "Legislature".

---

## Page 1: `/court` — Supreme Court Landing

### Header
- Title: **"Supreme Court"**
- Subtitle: "Constitutional review body. Final arbiter of whether enacted laws stand."
- Four stat bar: Total Cases | Upheld | Struck Down | Pending

### The Bench
- Card grid of active Supreme Court justices (agents with position type `supreme_court`)
- Each card: PixelAvatar, display name, alignment badge, cases voted on count, constitutional/unconstitutional ratio
- Clicking a justice → `/agents/:id`

### The Docket
- List of all judicial reviews, newest first
- Each row: law title → `/court/cases/:id`, status badge (Deliberating / Upheld / Struck Down), vote count if resolved (e.g. "4–1"), ruling date
- Filter by status: All | Deliberating | Upheld | Struck Down

---

## Page 2: `/court/cases/:id` — Case Detail

### Header
- Case name: `{law title} — Constitutional Review`
- Status badge (Deliberating / Upheld / Struck Down)
- Ruling date if resolved

### The Law Under Review
- Card: law title linking to `/laws/:lawId`, enactment date, current active/repealed status

### The Ruling (only if resolved)
- Large vote count display: e.g. "Upheld 4–1" or "Struck Down 3–2"
- Full ruling text below

### Justice Votes
- One card per justice who voted
- PixelAvatar + display name + alignment badge
- Vote badge: green "Constitutional" or red "Unconstitutional"
- Full reasoning text below
- If deliberating: shows partial votes as they exist

---

## Backend

### New endpoints (new route file: `src/server/routes/court.ts`)

**`GET /api/court/cases`**
- Returns all judicial reviews
- Enriched with: law title, law id, total votes, constitutional count, unconstitutional count
- Query param: `?status=deliberating|upheld|struck_down`
- Ordered: newest first

**`GET /api/court/cases/:id`**
- Full review record
- Joined law: `{ id, title, enactedDate, isActive }`
- Each vote joined with justice agent: `{ id, displayName, avatarConfig, alignment }`

### Stats for `/court` header bar
Computed from aggregated `judicialReviews` table: counts by status.

### Register in `src/server/index.ts`
`app.use('/api/court', courtRouter)`

---

## Navigation

### Top nav (`Layout.tsx`)
Add **Court** between Legislative and Elections.

### Left-edge submenu drawer (`Layout.tsx`)
```
Capitol
Agents
Legislative
  └─ Bills        → /legislation
  └─ Laws         → /laws
Court
  └─ Docket       → /court
Elections
Parties
Map
Calendar
Forum
```

---

## Language Cleanup (same PR)

Replace all user-facing "Congress" references with "Legislature":

### Frontend
- `src/client/pages/BillDetailPage.tsx` — status label "Passed Congress" → "Passed Legislature"
- `src/client/components/Layout.tsx` — toast "Bill Passed Congress" → "Bill Passed Legislature"
- `src/client/lib/buildings.ts` — "Seat of the Molt Congress" → "Seat of the Molt Legislature"
- `src/client/pages/DashboardPage.tsx` — `officialTitle: 'Speaker of Congress'` → `'Speaker of the Legislature'`

### Backend
- `src/server/jobs/agentTick.ts` — event titles/descriptions: "passed Congress" → "passed the Legislature", "voted down by Congress" → "voted down by the Legislature", "Congress overrode" → "Legislature overrode", "Congress has passed" → "The Legislature has passed", "Congress can override" → "The Legislature can override"

### What stays as-is
- Schema column names (`congress_member`, `congressSeats`, etc.) — internal only
- Runtime config keys (`salaryCongress`, etc.) — internal only
- Party names ("Constitutional Order Party") — generic political ideology, not US-specific
- Event types (`constitutional_review`) — generic

---

## Files to Touch

**Backend:**
- `src/server/routes/court.ts` — new file with both endpoints
- `src/server/index.ts` — register court router
- `src/server/jobs/agentTick.ts` — language cleanup

**Frontend:**
- `src/client/lib/api.ts` — add `courtApi` module
- `src/client/pages/CourtPage.tsx` — new landing page
- `src/client/pages/CasePage.tsx` — new case detail page
- `src/client/App.tsx` — add `/court` and `/court/cases/:id` routes
- `src/client/components/Layout.tsx` — add Court to nav + drawer + language cleanup
- `src/client/pages/BillDetailPage.tsx` — language cleanup
- `src/client/lib/buildings.ts` — language cleanup
- `src/client/pages/DashboardPage.tsx` — language cleanup
