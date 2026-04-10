/**
 * e2e/tickets.spec.ts
 *
 * End-to-end tests for the ticket list feature: GET /api/tickets + TicketsPage.
 *
 * Coverage:
 *  - Unauthenticated access to /tickets redirects to /login
 *  - Tickets nav link is visible for authenticated admin
 *  - Tickets nav link is visible for authenticated agent
 *  - Empty state shows "No tickets yet." when no tickets exist
 *  - Seeded tickets appear in the table (subject and from columns visible)
 *  - Newest ticket appears above older ticket (sorted newest first)
 *  - From column shows "Name (email)" format when fromName is present
 *  - From column shows bare email when fromName is absent
 *  - Status badge is visible for a ticket
 *
 * Implementation notes:
 *  - Tickets are seeded via the email webhook (POST /api/webhooks/email with
 *    multipart/form-data), matching the pattern in email-webhook.spec.ts.
 *  - The webhook URL targets the server directly on port 5151; the browser
 *    baseURL is http://localhost:5174 (Vite dev server).
 *  - Each test that needs pre-existing data seeds its own tickets with unique
 *    subjects (suffixed with Date.now()) to stay independent of other tests.
 *  - An agent user is created via the create-test-agent helper so we can
 *    verify the nav link is visible for both roles.
 *  - The global-setup truncates the Ticket table between runs, so tests that
 *    want the empty-state must run before any ticket is seeded — or use the
 *    API to verify state rather than relying on insertion order. We solve this
 *    by navigating to /tickets immediately after login without seeding first.
 */

import { test, expect, type Page } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { Client } from "pg";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

const AGENT_EMAIL = "tickets-agent@test.local";
const AGENT_PASSWORD = "TicketsAgentPW123!";
const AGENT_NAME = "Tickets Agent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Logs in as admin and waits for the dashboard to load.
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Logs in as the test agent and waits for the dashboard to load.
 */
async function loginAsAgent(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(AGENT_EMAIL);
  await page.getByLabel("Password").fill(AGENT_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Navigates to /tickets and waits for the page heading.
 */
async function goToTicketsPage(page: Page): Promise<void> {
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
}

/**
 * Posts a ticket via the email webhook using Playwright's request fixture.
 * Returns the response.
 */
async function seedTicket(
  page: Page,
  opts: {
    from: string;
    subject: string;
    text?: string;
  }
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
// Agent setup — runs once before any test in this file
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  // Create a test agent so we can verify the Tickets nav link for that role.
  // The script is idempotent — exits cleanly when the user already exists.
  const helperScript = path.resolve(
    __dirname,
    "../server/src/create-test-agent.ts"
  );
  const serverDir = path.resolve(__dirname, "../server");

  execSync(`bun run ${helperScript}`, {
    cwd: serverDir,
    env: {
      ...process.env,
      AGENT_EMAIL,
      AGENT_PASSWORD,
      AGENT_NAME,
    },
    stdio: "inherit",
  });
});

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Tickets list", () => {
  // -------------------------------------------------------------------------
  // Unauthenticated access
  // -------------------------------------------------------------------------

  test.describe("Unauthenticated access", () => {
    test("visiting /tickets without being logged in redirects to /login", async ({
      page,
    }) => {
      await page.goto("/tickets");
      await expect(page).toHaveURL("/login");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test.describe("Navigation", () => {
    test("admin sees a Tickets nav link after logging in", async ({ page }) => {
      await loginAsAdmin(page);

      await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    });

    test("agent sees a Tickets nav link after logging in", async ({ page }) => {
      await loginAsAgent(page);

      await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
    });

    test("admin can navigate to /tickets via the nav link", async ({ page }) => {
      await loginAsAdmin(page);

      await page.getByRole("link", { name: "Tickets" }).click();

      await expect(page).toHaveURL("/tickets");
      await expect(
        page.getByRole("heading", { name: "Tickets" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Table structure
  // -------------------------------------------------------------------------

  test.describe("Table structure", () => {
    test("Tickets page displays expected column headers", async ({ page }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      await expect(
        page.getByRole("columnheader", { name: "Subject" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "From" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Status" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Category" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  test.describe("Empty state", () => {
    test.beforeAll(async () => {
      const db = new Client({ connectionString: process.env.DATABASE_URL });
      await db.connect();
      await db.query(`TRUNCATE TABLE "Ticket" RESTART IDENTITY CASCADE`);
      await db.end();
    });

    test('shows "No tickets yet." when no tickets have been seeded', async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      await expect(page.getByText("No tickets yet.")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Tickets are listed
  // -------------------------------------------------------------------------

  test.describe("Tickets are listed", () => {
    test("a seeded ticket's subject appears in the table", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Subject visibility test ${Date.now()}`;
      await seedTicket(page, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketsPage(page);

      await expect(page.getByRole("cell", { name: subject })).toBeVisible();
    });

    test("a seeded ticket's email appears in the From column", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `From email test ${Date.now()}`;
      await seedTicket(page, {
        from: "listed@example.com",
        subject,
      });

      await goToTicketsPage(page);

      // The row for this ticket should contain the sender email
      const row = page.getByRole("row", { name: new RegExp(subject) });
      await expect(row).toBeVisible();
      await expect(row.getByText("listed@example.com")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Sort order — newest first
  // -------------------------------------------------------------------------

  test.describe("Sort order", () => {
    test("the newest ticket appears above an older ticket in the table", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const ts = Date.now();
      const olderSubject = `Older ticket ${ts}`;
      const newerSubject = `Newer ticket ${ts}`;

      // Seed older first, then newer
      await seedTicket(page, {
        from: "order-test@example.com",
        subject: olderSubject,
      });
      await seedTicket(page, {
        from: "order-test@example.com",
        subject: newerSubject,
      });

      await goToTicketsPage(page);

      // Both subjects must be present
      await expect(page.getByRole("cell", { name: newerSubject })).toBeVisible();
      await expect(page.getByRole("cell", { name: olderSubject })).toBeVisible();

      // The newer ticket's row should appear before the older ticket's row in
      // the DOM. We compare the vertical positions of the two rows.
      const newerRow = page.getByRole("row", {
        name: new RegExp(newerSubject),
      });
      const olderRow = page.getByRole("row", {
        name: new RegExp(olderSubject),
      });

      const newerBox = await newerRow.boundingBox();
      const olderBox = await olderRow.boundingBox();

      expect(newerBox).not.toBeNull();
      expect(olderBox).not.toBeNull();
      // Newer ticket row has a smaller Y value (higher up on the page)
      expect(newerBox!.y).toBeLessThan(olderBox!.y);
    });
  });

  // -------------------------------------------------------------------------
  // From field display
  // -------------------------------------------------------------------------

  test.describe("From field display", () => {
    test('ticket with a display name shows "Name (email)" in the From column', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Display name from test ${Date.now()}`;
      await seedTicket(page, {
        from: "Jane Smith <jane@example.com>",
        subject,
      });

      await goToTicketsPage(page);

      const row = page.getByRole("row", { name: new RegExp(subject) });
      await expect(row).toBeVisible();

      // Name and email are rendered as separate elements within the cell;
      // both must be visible in the row.
      await expect(row.getByText("Jane Smith")).toBeVisible();
      await expect(row.getByText("(jane@example.com)")).toBeVisible();
    });

    test("ticket with a bare email shows only the email in the From column", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Bare email from test ${Date.now()}`;
      await seedTicket(page, {
        from: "bare@example.com",
        subject,
      });

      await goToTicketsPage(page);

      const row = page.getByRole("row", { name: new RegExp(subject) });
      await expect(row).toBeVisible();

      // The email is rendered as plain text; no parenthesised wrapper present
      await expect(row.getByText("bare@example.com")).toBeVisible();
      // Parenthesised form must NOT appear
      await expect(row.getByText("(bare@example.com)")).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Status badge
  // -------------------------------------------------------------------------

  test.describe("Status badge", () => {
    test("a newly created ticket shows an 'open' status badge", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Status badge test ${Date.now()}`;
      await seedTicket(page, {
        from: "status@example.com",
        subject,
      });

      await goToTicketsPage(page);

      const row = page.getByRole("row", { name: new RegExp(subject) });
      await expect(row).toBeVisible();

      // The status badge renders the status text directly inside a <Badge>
      await expect(row.getByText("open")).toBeVisible();
    });
  });
});
