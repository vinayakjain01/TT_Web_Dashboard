# TT Web Dashboard

Lead funnel + store appointment dashboard for Tarun Tahiliani. Same architecture as
`MM_Web_Dashboard`: a GitHub Action syncs two Google Sheets into Supabase, and a
Next.js app on Vercel reads from Supabase via server-side API routes (each route
falls back to reading the sheets directly if Supabase isn't configured yet - see
**Setup**). The visual design - purple/gold palette, Fraunces + Manrope type, KPI
cards with a colored accent bar, status pills, purple sticky table headers - matches
`MM_Web_Dashboard`'s own dashboard rather than a generic theme; tokens live in
`app/globals.css` and the series colors barred charts use are in
`components/dashboard/BarChartCard.tsx`'s `CHART_PALETTE`.

```
Google Sheets (public "anyone with link" CSV export)
        |
        v
GitHub Action (scripts/sync.ts) - clean, normalize, apply business rules
        |
        v
Supabase Postgres (leads, store_appointments, lead_appointment_matches + views)
        |
        v
Next.js API routes (app/api/*) -> dashboard UI (no auth gate - see below)
```

## Setup

**The dashboard works immediately with no setup** - `npm install && npm run dev` and
it's live at http://localhost:3000, reading straight from the sheets. Every
`app/api/*` route checks `SUPABASE_URL`/`SUPABASE_SECRET_KEY` (`lib/supabase/isConfigured.ts`)
and falls back to fetching and parsing the sheets directly (`lib/dataSource.ts`) when
they're absent, rather than erroring. The header shows a tag ("Preview - reading live
from Google Sheets" vs "Connected to Supabase") so it's always clear which mode is
active. This fallback re-parses on every request instead of reading a pre-built table,
so it's noticeably slower than the Supabase path (a few seconds per tab fetched) -
fine for previewing, not a substitute for actually wiring up Supabase for production.

To wire up the real pipeline:

1. **Create a Supabase project** and run the migration in `supabase/migrations/0001_init.sql`
   against it (Supabase Studio's SQL editor, or `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`).
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   and `DATABASE_URL` from that project.
3. `npm run sync:dry-run` - fetches and parses both spreadsheets, prints a summary,
   writes nothing. Good smoke test before touching a real database.
4. `npm run sync` - does the same, then truncates and reloads `leads`,
   `store_appointments`, and `lead_appointment_matches` inside one transaction.
5. Restart `npm run dev` - the header tag should flip to "Connected to Supabase."
6. In GitHub, add `DATABASE_URL` as a repository secret so `.github/workflows/sync.yml`
   can run on its schedule (every 6 hours) or via the manual "Run workflow" button.
7. In Vercel, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as environment variables for
   the deployed app - otherwise the deployed dashboard runs in the same live-sheets
   fallback mode.

### Security - rotate before/after going live

The Supabase credentials and `DATABASE_URL` for this project were shared in plaintext
during planning. Treat anything typed into a chat log as compromised: **rotate the
database password and regenerate the Supabase secret key in the Supabase dashboard**,
then update the GitHub secret and Vercel env vars to match, before (or immediately
after) this goes live.

### No login gate, by explicit instruction

The brief this was built from asked for a Google OAuth gate restricted to the client's
team. That was explicitly overridden during planning: **the dashboard has no
authentication** - anyone with the deployed URL can view it. The OAuth client ID from
planning (`441622883200-....apps.googleusercontent.com`) is unused. If that changes,
gate `app/layout.tsx` (or add `proxy.ts`, Next 16's replacement for `middleware.ts`)
with a Google Sign-In check restricted to the client's Workspace domain or an explicit
email allow-list - confirm which with the client before wiring it up either way.

### How the sync reads the sheets

Both source spreadsheets are shared "anyone with the link can view" - confirmed by
direct fetch. `scripts/sync.ts` reads them via Google's public CSV export
(`/export?format=csv&gid=...`), so **no Google credential is configured**. This is
simpler to operate but has two consequences:

- If sharing settings ever change to restrict access, the sync fails loudly (non-2xx
  or an HTML login page instead of CSV) rather than silently going stale -
  `lib/sheets/fetchSheet.ts` checks for this.
- Store Appointments tab titles (needed for rule 2's year inference) are hardcoded in
  `config/sheet2Tabs.ts` rather than fetched live via the Sheets API's
  `spreadsheets.get`, because that call needs a real credential (an API key or service
  account) that hasn't been provisioned. See **Monthly maintenance** below.

To upgrade to a real service account later: create one in Google Cloud, share both
spreadsheets with its email (Viewer), store its JSON key as a GitHub secret, and swap
`fetchSheetTabCsv` for an authenticated Sheets API v4 call plus a live
`spreadsheets.get` lookup instead of the static config.

### Monthly maintenance: a new tab appears in Store Appointments every month

`config/sheet2Tabs.ts` hardcodes the 20 tabs currently in scope (all 12 months of 2025,
plus Jan-Aug 2026 year-to-date) with their gid, title, and year/month. When the client
adds a new month's tab:

1. Open the Store Appointments spreadsheet, find the new tab's gid from its URL
   (`...#gid=XXXXXXXXX`).
2. Add an entry to `SHEET2_TABS` in `config/sheet2Tabs.ts`.
3. **Inspect that tab's actual data, not just its headers**, before adding its entry to
   `OUTCOME_SOURCE_COLUMNS`. Column layout and even which column holds the real
   `visit_outcome` narrative have both varied tab-to-tab in every month seen so far
   (see the comment above `OUTCOME_SOURCE_COLUMNS` for specifics) - assuming a new
   tab matches the previous one's layout has been wrong more often than right.
4. Run `npm run sync:dry-run` and sanity-check the printed summary before running the
   real sync.

## Business rules implemented (`lib/business/`)

Each module has unit tests in `lib/business/__tests__/` that were validated against
the real spreadsheet data, not just synthetic examples. A few notable findings from
that validation, where the implementation deviates from a literal reading of the
original brief:

- **Divider rows** (`leadParser.ts`): the month-header marker text actually lives in
  the sheet's unlabeled index column, not the Date column. A row is treated as a
  divider (and dropped entirely) only when both Date and Customer Name are blank.
  ~1,000 other rows have a blank Customer Name but a real date and other fields
  populated - those are kept as real, if messy, leads rather than discarded.
- **`visit_outcome` classification** (`visitOutcome.ts`): a literal "contains
  'purchas' -> Purchased" rule misclassifies real rows like `"Visted, did not
  Purchase"` - both phrases contain "purchas". A negation check runs first.
- **Per-tab outcome column** (`config/sheet2Tabs.ts`): only the January tab actually
  has the outcome narrative in "Follow up Date" as the brief describes. Every other
  tab puts a real date there instead and the narrative is in "Notes" (or, for August,
  split across "Product detail" and "Follow up") - discovered by reading actual row
  content, since column headers alone were misleading.
- **Location rollup** (`location.ts`): extended past the brief's example list to also
  fold in `Fort`, `Colaba`, `Kala Ghoda` (Mumbai) and a `Meharuli` misspelling found in
  the real data, at the same confidence as the given examples. `Ballard`/`Ballard
  Estate` are flagged for review exactly as the brief specifies.
- **`date_needs_review`**: extended past the brief's year-ambiguity scenario to also
  catch values that aren't a single resolvable calendar date at all - bare day numbers
  with no month (`"1"`), and relative/placeholder text (`"1 week"`, `"TBH"`) appear in
  the real data and are flagged rather than guessed.
- **Date ranges are now accepted, not flagged** (`dates.ts`): a later batch of tabs
  turned up ranges constantly (`"7-11 jan"`, `"Jan 10-13th 2025"`, `"5/6 Dec"`, even
  `"30 April to 11 May 2026"` spanning two months). The first date in the range is used
  as `date_of_visit`; the full original text is preserved in `visit_date_note` rather
  than lost, and it still goes through the normal year-inference/consistency checks.
- **Vague "no exact day" dates** (`"March 1st week"`) default to the 1st of that month
  and are marked `visit_date_precision = 'approximate'` - the dashboard shows these with
  a `~` prefix and italics so they never look identical to a confirmed date.
- **Time-of-day text mixed into date cells** (`"2nd Jan. around 2pm"`, `"2 PM 20 JAN"`,
  `"26th Feb at 11.00 am"`) is stripped before parsing; the time is discarded, only the
  date is kept. Fixing this also surfaced a latent bug: dates with a comma before the
  year (`"Jan 12, 2025"`) were failing to parse at all until comma-handling was added.
- **Booking-consistency check refined, not weakened** (`resolveBookingDate`): an
  explicit visit year that conflicts with the tab's own year for a booking in *that same
  tab's month* is flagged (`visit_year_explicit_inconsistent`) rather than silently
  "fixed" by reinterpreting the booking's year too - see the Soni Virdi test case. A
  booking in a *different* month than the tab (e.g. a `"31 Dec"` booking inside a
  January tab) still gets the normal prior-year retry regardless of the visit's year -
  that's the exact ambiguity the retry exists to resolve, not a case to restrict.
- **Lead funnel scoped to 2025-2026** at the reporting layer, not by touching ingestion:
  `v_leads_recent` / `v_real_leads_recent` (`supabase/migrations/0002_*.sql`) filter by
  year on top of the complete `leads` table, so every year keeps being synced and the
  scope can change later without re-running anything. The no-Supabase fallback mirrors
  this via `lib/business/reportingScope.ts` so both paths show the same rows.

## Commands

- `npm run dev` / `npm run build` - the dashboard
- `npm test` - business-logic unit tests
- `npm run sync:dry-run` - fetch + parse + print a summary, no writes
- `npm run sync` - fetch + parse + truncate-and-reload Supabase
