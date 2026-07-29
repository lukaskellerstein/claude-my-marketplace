# Seeding patterns

Pick the cheapest strategy that produces convincing data and can be re-run. Write it to
`demo/prep/` so the demo is reproducible.

## 1. The project's own seed script — always check first

`package.json` scripts, `prisma/seed.ts`, `db/seeds/`, `manage.py loaddata`, `rails db:seed`,
`Makefile` targets, `docker-compose` fixtures, `*.sql` in a `fixtures/` directory.

If one exists, extend it rather than writing a parallel path — it already knows the schema
constraints. Add a demo-specific profile if the existing seed is minimal:

```bash
# demo/prep/seed.sh
npm run db:reset
npm run db:seed                       # project's baseline
node demo/prep/seed-demo-extras.mjs   # volume + the specific rows the storyboard needs
```

## 2. Write through the app's own API

Most reliable for anything with derived state, search indexes, or events, because the app
computes what it normally computes. Slower, but you cannot produce an invalid record.

```javascript
// demo/prep/seed.mjs
const api = 'http://localhost:5173/api';
const post = (path, body) =>
  fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEMO_TOKEN}` },
    body: JSON.stringify(body),
  }).then((r) => { if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); });

for (const invoice of invoices) await post('/invoices', invoice);
```

## 3. Direct database insert

Fastest for large volumes. Risks: bypasses validation, misses search-index and
derived-column updates, and breaks when the schema moves. Use for bulk padding — the
hundreds of rows that make a list scroll — and use the API for the specific records the
storyboard interacts with.

## 4. Network stubbing (last resort)

The Playwright MCP route tools can fulfil API calls with fixtures, so the UI renders
whatever you supply without any backend.

Legitimate when: the backend is not the subject and cannot be run locally, or a third-party
service would charge or rate-limit.

**Not legitimate** when it makes the app appear to do something it cannot. A demo of stubbed
responses presented as working software is a fabrication. If you stub, say so in the handoff.

## Generating convincing content

Do not reach for a faker library and accept the defaults — generic faker output has a
recognisable texture. Take the domain vocabulary from the codebase: enum values, seed
fixtures, test fixtures, i18n strings, and the README's examples.

```javascript
// Domain-shaped, not generic
const vendors = ['Northwind Logistics', 'Baumann Kälteanlagen', 'Trellis Design Co.',
                 'Okonkwo & Partners', 'Sable Freight'];
const projects = ['Q3 warehouse migration', 'Payments SDK v2', 'EU data residency'];
```

Include on purpose:

- One name long enough to test truncation.
- One failed/rejected/overdue item among the successes — uniform green looks fake.
- One record with an empty optional field.
- Amounts and counts at realistic magnitude, since the narration will quote them.

## Time-relative data

Seed relative to a fixed instant, and freeze the app's clock to the same instant:

```javascript
const NOW = new Date('2026-03-17T09:20:00Z');   // also meta.electron.freezeClock
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600_000).toISOString();

await post('/invoices', { receivedAt: hoursAgo(2),  status: 'matched' });
await post('/invoices', { receivedAt: hoursAgo(27), status: 'needs_review' });
```

Without this, "2 hours ago" becomes "3 hours ago" between takes, and a re-recorded section
no longer matches its neighbours.

## Reset

```bash
# demo/prep/reset.sh — must be idempotent and fast
set -euo pipefail
npm run db:reset --silent
bash demo/prep/seed.sh
```

Sections that mutate data set `"resetBefore": true` so the operator runs this first. If a
full reset is slow, write a narrower reset that undoes only what the demo creates — but keep
it a script, not a sequence of UI clicks.

## Document it

`demo/prep/seed.md` should say, in a few lines: what the demo data represents, which records
the storyboard depends on by name, how to re-seed from nothing, and anything that is stubbed
rather than real. The next person to re-record a section six weeks from now needs this, and
so do you after the context window turns over.
