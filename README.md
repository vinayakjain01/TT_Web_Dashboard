# TT Web Dashboard

Lead funnel + store appointment dashboard for Tarun Tahiliani. Same architecture as
`MM_Web_Dashboard`: a GitHub Action syncs two Google Sheets into Supabase, and a
Next.js app on Vercel reads only from Supabase via server-side API routes.

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

1. **Create a Supabase project** and run the migration in `supabase/migrations/0001_init.sql`
   against it (Supabase Studio's SQL editor, or `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`).
2. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   and `DATABASE_URL` from that project.
3. `npm install`
4. `npm run sync:dry-run` - fetches and parses both spreadsheets, prints a summary,
   writes nothing. Good smoke test before touching a real database.
5. `npm run sync` - does the same, then truncates and reloads `leads`,
   `store_appointments`, and `lead_appointment_matches` inside one transaction.
6. `npm run dev` and open http://localhost:3000.
7. In GitHub, add `DATABASE_URL` as a repository secret so `.github/workflows/sync.yml`
   can run on its schedule (every 6 hours) or via the manual "Run workflow" button.
8. In Vercel, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as environment variables for
   the deployed app.

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

`config/sheet2Tabs.ts` hardcodes the 8 tabs currently in scope (Jan-Aug 2026) with
their gid, title, and year/month. When the client adds a new month's tab:

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
  catch values that aren't a single resolvable calendar date at all - ranges
  (`"10-11 June"`), bare day numbers with no month (`"1"`), and relative/placeholder
  text (`"1 week"`, `"TBH"`) all appear in the real data and are flagged rather than
  guessed.

## Commands

- `npm run dev` / `npm run build` - the dashboard
- `npm test` - business-logic unit tests
- `npm run sync:dry-run` - fetch + parse + print a summary, no writes
- `npm run sync` - fetch + parse + truncate-and-reload Supabase
