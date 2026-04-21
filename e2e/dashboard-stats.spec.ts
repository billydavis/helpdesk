/**
 * e2e/dashboard-stats.spec.ts
 *
 * End-to-end tests for the dashboard stats feature on the home page (/).
 *
 * Coverage:
 *  - All 5 stat cards are visible after login (Total Tickets, Open Tickets,
 *    Resolved by AI, AI Resolution Rate, Avg. Resolution Time)
 *  - Stat values reflect actual DB state seeded per-test
 *  - Loading skeletons are shown while the /api/stats request is in flight
 *  - Error message is shown when /api/stats returns a server error
 *  - AI Resolution Rate shows "0%" when there are no tickets
 *  - Avg. Resolution Time shows "—" when there are no resolved/closed tickets
 *  - /api/stats returns 401 for unauthenticated requests
 *
 * Implementation notes:
 *  - The DB is cleared between suites via direct pg queries so each group
 *    starts from a known state. Tests within a suite seed their own data.
 *  - Tickets are seeded via the email webhook (POST /api/webhooks/email) on
 *    port 5151 — the same pattern used in tickets.spec.ts.
 *  - resolvedByAi and status fields are set via direct DB updates; there is no
 *    UI flow that sets resolvedByAi=true deterministically in tests.
 *  - The loading skeleton test uses page.route() to pause /api/stats indefinitely
 *    so the skeleton remains visible long enough to assert on it.
 *  - The error state test uses page.route() to intercept /api/stats and respond
 *    with HTTP 500, triggering the TanStack Query error state.
 *  - Avg. Resolution Time is computed from createdAt→updatedAt on resolved/closed
 *    tickets. We set updatedAt via a raw SQL UPDATE to get a predictable duration.
 */

import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function openDbClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();
  return client;
}

async function truncateTickets(client: Client): Promise<void> {
  await client.query(`TRUNCATE TABLE "Ticket" RESTART IDENTITY CASCADE`);
}

async function setTicketStatus(
  client: Client,
  ticketId: number,
  status: string
): Promise<void> {
  await client.query(`UPDATE "Ticket" SET status = $1 WHERE id = $2`, [
    status,
    ticketId,
  ]);
}

async function setResolvedByAi(
  client: Client,
  ticketId: number,
  value: boolean
): Promise<void> {
  await client.query(
    `UPDATE "Ticket" SET "resolvedByAi" = $1 WHERE id = $2`,
    [value, ticketId]
  );
}

/**
 * Sets updatedAt to createdAt + offsetMs so the resolution time calculation
 * produces a predictable result for the given ticket.
 */
async function setResolutionTimeOffset(
  client: Client,
  ticketId: number,
  offsetMs: number
): Promise<void> {
  await client.query(
    `UPDATE "Ticket"
     SET "updatedAt" = "createdAt" + ($1 * interval '1 millisecond')
     WHERE id = $2`,
    [offsetMs, ticketId]
  );
}

async function findTicketBySubject(
  client: Client,
  subject: string
): Promise<{ id: number } | null> {
  const result = await client.query<{ id: number }>(
    `SELECT id FROM "Ticket" WHERE subject = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [subject]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Page / request helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

async function seedTicket(
  page: Page,
  opts: { from: string; subject: string; text?: string }
): Promise<void> {
  const response = await page.request.post(WEBHOOK_URL, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    multipart: {
      from: opts.from,
      subject: opts.subject,
      text: opts.text ?? "Test ticket body.",
    },
  });
  expect(response.status()).toBe(200);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Dashboard stats", () => {
  // =========================================================================
  // Unauthenticated access
  // =========================================================================

  test.describe("Unauthenticated access", () => {
    test("/api/stats returns 401 when not logged in", async ({ page }) => {
      const response = await page.request.get(
        "http://localhost:5151/api/stats"
      );
      expect(response.status()).toBe(401);
    });

    test("visiting / without being logged in redirects to /login", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });
  });

  // =========================================================================
  // Stat card rendering — zero-ticket baseline
  // =========================================================================

  test.describe("Zero-ticket baseline", () => {
    let db: Client;

    test.beforeAll(async () => {
      db = await openDbClient();
      await truncateTickets(db);
    });

    test.afterAll(async () => {
      await db.end();
    });

    test("all 5 stat card titles are visible on the dashboard", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await expect(
        page.getByText("Total Tickets")
      ).toBeVisible();
      await expect(page.getByText("Open Tickets")).toBeVisible();
      await expect(page.getByText("Resolved by AI")).toBeVisible();
      await expect(page.getByText("AI Resolution Rate")).toBeVisible();
      await expect(page.getByText("Avg. Resolution Time")).toBeVisible();
    });

    test("Total Tickets shows 0 when there are no tickets", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Traverse up from CardTitle → CardHeader → Card, then find the value <p>
      const card = page.getByText("Total Tickets").locator("../..");
      await expect(card.getByText("0", { exact: true })).toBeVisible();
    });

    test("Open Tickets shows 0 when there are no tickets", async ({ page }) => {
      await loginAsAdmin(page);

      const card = page.getByText("Open Tickets").locator("../..");
      await expect(card.getByText("0", { exact: true })).toBeVisible();
    });

    test("Resolved by AI shows 0 when there are no tickets", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const card = page.getByText("Resolved by AI").locator("../..");
      await expect(card.getByText("0", { exact: true })).toBeVisible();
    });

    test('AI Resolution Rate shows "0%" when there are no tickets', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const card = page.getByText("AI Resolution Rate").locator("../..");
      await expect(card.getByText("0%", { exact: true })).toBeVisible();
    });

    test('Avg. Resolution Time shows "—" when there are no resolved tickets', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const card = page.getByText("Avg. Resolution Time").locator("../..");
      await expect(card.getByText("—")).toBeVisible();
    });

    test('"no resolved tickets yet" description is shown for Avg. Resolution Time', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await expect(page.getByText("no resolved tickets yet")).toBeVisible();
    });
  });

  // =========================================================================
  // Stat card values — seeded data
  // =========================================================================

  test.describe("Seeded data values", () => {
    let db: Client;

    test.beforeAll(async () => {
      db = await openDbClient();
      await truncateTickets(db);
    });

    test.afterAll(async () => {
      await db.end();
    });

    test("Total Tickets reflects the count of all tickets in the DB", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const ts = Date.now();
      // Seed 2 tickets
      await seedTicket(page, {
        from: "a@example.com",
        subject: `Stats total test A ${ts}`,
      });
      await seedTicket(page, {
        from: "b@example.com",
        subject: `Stats total test B ${ts}`,
      });

      // Navigate away and back so TanStack Query re-fetches
      await page.goto("/tickets");
      await page.goto("/");

      // The DB already had 0 tickets; we added 2
      const card = page.getByText("Total Tickets").locator("../..");
      await expect(card.getByText("2", { exact: true })).toBeVisible();
    });

    test("Open Tickets reflects tickets with status=open", async ({ page }) => {
      await loginAsAdmin(page);

      const ts = Date.now();
      const subject = `Stats open count test ${ts}`;
      await seedTicket(page, { from: "c@example.com", subject });

      // Promote to open
      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      await setTicketStatus(db, ticket!.id, "open");

      await page.goto("/tickets");
      await page.goto("/");

      // We now have 3 total (from beforeAll suite state); open count = 1
      // Use a more targeted assertion: the Open Tickets card must show at
      // least 1 and match the exact count the API returns.
      const apiResponse = await page.request.get(
        "http://localhost:5151/api/stats",
        { headers: { Cookie: await getCookieHeader(page) } }
      );
      const stats = await apiResponse.json();

      const card = page.getByText("Open Tickets").locator("../..");
      await expect(
        card.getByText(String(stats.openTickets))
      ).toBeVisible();
    });

    test("Resolved by AI count increments when a ticket is marked resolvedByAi", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const ts = Date.now();
      const subject = `Stats ai resolved test ${ts}`;
      await seedTicket(page, { from: "d@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      await setTicketStatus(db, ticket!.id, "resolved");
      await setResolvedByAi(db, ticket!.id, true);

      await page.goto("/tickets");
      await page.goto("/");

      // Confirm the API agrees and the UI card matches
      const apiResponse = await page.request.get(
        "http://localhost:5151/api/stats",
        { headers: { Cookie: await getCookieHeader(page) } }
      );
      const stats = await apiResponse.json();
      expect(stats.aiResolvedTickets).toBeGreaterThanOrEqual(1);

      const card = page.getByText("Resolved by AI").locator("../..");
      await expect(
        card.getByText(String(stats.aiResolvedTickets))
      ).toBeVisible();
    });

    test("AI Resolution Rate percentage matches the API value", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.goto("/tickets");
      await page.goto("/");

      const apiResponse = await page.request.get(
        "http://localhost:5151/api/stats",
        { headers: { Cookie: await getCookieHeader(page) } }
      );
      const stats = await apiResponse.json();

      const card = page.getByText("AI Resolution Rate").locator("../..");
      await expect(
        card.getByText(`${stats.aiResolvedPercent}%`)
      ).toBeVisible();
    });

    test("Avg. Resolution Time is displayed as a duration when resolved tickets exist", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const ts = Date.now();
      const subject = `Stats avg time test ${ts}`;
      await seedTicket(page, { from: "e@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      // Set status to resolved and fix the resolution time to exactly 1 hour
      await setTicketStatus(db, ticket!.id, "resolved");
      await setResolutionTimeOffset(db, ticket!.id, 3_600_000); // 1 hour

      await page.goto("/tickets");
      await page.goto("/");

      // The Avg. Resolution Time card must show a duration string (not "—")
      const card = page.getByText("Avg. Resolution Time").locator("../..");
      // A 1-hour offset renders as "1h 0m"
      await expect(card.getByText(/\d+h \d+m|\d+m|\d+s/)).toBeVisible();
      // Must NOT show the empty-state em-dash
      await expect(card.getByText("—")).not.toBeVisible();
    });

    test('"for resolved & closed tickets" description appears when avg time is available', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // At least one resolved ticket exists from the prior test in this suite
      await page.goto("/");

      await expect(
        page.getByText("for resolved & closed tickets")
      ).toBeVisible();
    });
  });

  // =========================================================================
  // Loading skeleton
  // =========================================================================

  test.describe("Loading state", () => {
    test("stat card skeletons are shown while /api/stats is loading", async ({
      page,
    }) => {
      // Intercept /api/stats and hold it open so the skeleton stays visible
      // long enough to assert on it.
      let resolveRequest!: () => void;
      const requestHeld = new Promise<void>((resolve) => {
        resolveRequest = resolve;
      });

      await page.route("**/api/stats", async (route) => {
        // Park here until the test has asserted on the skeleton, then let
        // the real request through so the page cleans up properly.
        await requestHeld;
        await route.continue();
      });

      // Navigate to the login page and submit credentials. We deliberately
      // do NOT await the URL settling to "/" here — instead we just click
      // Sign In and immediately check for skeletons, which appear the moment
      // the component mounts on the dashboard before the held request resolves.
      await page.goto("/login");
      await page.getByLabel("Email").fill(ADMIN_EMAIL);
      await page.getByLabel("Password").fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Wait for the URL to become "/" (the dashboard rendered) — the stats
      // fetch is in flight and blocked by our route handler at this point.
      await expect(page).toHaveURL("/");

      // The shadcn Skeleton component is a <div class="animate-pulse ...">
      // We target by the Tailwind class since the component has no semantic role.
      const skeleton = page.locator(".animate-pulse").first();
      await expect(skeleton).toBeVisible();

      // Unblock the request — skeletons should give way to stat card titles
      resolveRequest();

      await expect(page.getByText("Total Tickets")).toBeVisible();
    });
  });

  // =========================================================================
  // Error state
  // =========================================================================

  test.describe("Error state", () => {
    test('shows "Failed to load dashboard stats." when /api/stats returns 500', async ({
      page,
    }) => {
      // Intercept ONLY the stats endpoint and return a 500
      await page.route("**/api/stats", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });

      await loginAsAdmin(page);

      await expect(
        page.getByText("Failed to load dashboard stats.")
      ).toBeVisible();
    });

    test("no stat cards are rendered when the API returns an error", async ({
      page,
    }) => {
      await page.route("**/api/stats", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });

      await loginAsAdmin(page);

      // Stat card titles must not appear on the page in the error state
      await expect(page.getByText("Total Tickets")).not.toBeVisible();
      await expect(page.getByText("Open Tickets")).not.toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// Utility: extract the session cookie string from the browser context so we
// can make authenticated server-direct requests (bypassing the Vite proxy)
// for value verification.
// ---------------------------------------------------------------------------

async function getCookieHeader(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
