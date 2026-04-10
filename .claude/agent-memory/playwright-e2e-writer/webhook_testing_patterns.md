---
name: Webhook testing patterns
description: Patterns for testing the email ingestion webhook — multipart/form-data, DB verification, env var requirement
type: feedback
---

## POST /api/webhooks/email — key facts

- Endpoint is public (no auth required); mounted before `express.json()` in `server/src/index.ts`
- Parsed by `multer({ storage: multer.memoryStorage() })` — must send as `multipart/form-data`
- Validated by `inboundEmailSchema` (Zod in core): `from` + `subject` required min(1); `text` + `html` optional
- Returns 400 with `{ errors: { fieldErrors } }` on validation failure (Zod flatten)
- Always returns 200 on success, even on DB errors (swallowed with console.error)

## SENDGRID_WEBHOOK_PUBLIC_KEY

The server throws at startup if this env var is missing (`server/src/routes/email.ts` line 7-9).
A placeholder value is sufficient for tests — the middleware does NOT verify the SendGrid signature;
it only does Zod shape validation. Added to both `server/.env.test` and `server/.env.test.example`.

## Playwright API testing approach

Use the `request` fixture (not page/browser) for pure HTTP endpoint tests:

```ts
const response = await request.post(WEBHOOK_URL, {
  multipart: { from: "...", subject: "...", text: "..." },
});
```

Target the server directly: `http://localhost:5151/api/webhooks/email` — bypass the Vite proxy.

## DB verification

Query the `"Ticket"` table directly with a pg Client (same pattern as global-setup.ts):

```ts
const client = new Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();
const result = await client.query(
  `SELECT * FROM "Ticket" WHERE subject = $1 ORDER BY "createdAt" DESC LIMIT 1`,
  [subject]
);
```

Use unique subjects per test (`${description} ${Date.now()}`) to avoid cross-test collisions.
Open one client in beforeAll / close in afterAll to avoid per-test connection overhead.

**Why:** No read API for tickets existed at time of writing. Direct DB query is the reliable approach used elsewhere in this codebase (global-setup.ts).

**How to apply:** Any webhook or background-processing test where the effect is a DB row, not a UI change.
