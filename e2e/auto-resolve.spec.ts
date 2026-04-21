/**
 * e2e/auto-resolve.spec.ts
 *
 * End-to-end tests for the AI auto-resolve feature's observable effects on the
 * ticket list UI and API.
 *
 * Coverage:
 *  - Tickets in `new` status are hidden from the default ticket list view
 *  - Tickets in `processing` status are hidden from the default ticket list view
 *  - The default filter on the tickets page shows `open` tickets (not `all`)
 *  - The status filter dropdown does NOT expose `new` or `processing` options
 *  - A ticket promoted from `new` to `open` (escalated) appears in the list
 *  - A ticket promoted from `processing` to `open` (escalated) appears in the list
 *  - A ticket auto-resolved to `resolved` does NOT appear in the default list
 *  - A ticket auto-resolved to `resolved` DOES appear when filtering by "Resolved"
 *
 * Implementation notes:
 *  - All ticket state transitions are done via direct DB writes (pg client +
 *    setTicketStatus). This avoids any dependency on the AI queue worker, which
 *    calls a real LLM and is non-deterministic in a test environment.
 *  - Tickets are seeded via the email webhook endpoint on port 5151. The webhook
 *    creates them with the DB default of `new`, so no status override is needed
 *    for the initial seed.
 *  - The UI only refreshes when navigating to /tickets; each test re-navigates
 *    after any DB state change to trigger a fresh API call.
 *  - The Select dropdown (shadcn/ui + Radix) renders its items in a portal — we
 *    use page.getByRole("option") to locate items inside the open listbox.
 */

import { test, expect, type Page } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import { Client } from "pg";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Direct URL to the backend — bypasses the Vite proxy used by the browser. */
const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

// ---------------------------------------------------------------------------
// DB helpers  (mirrors the pattern in email-webhook.spec.ts)
// ---------------------------------------------------------------------------

async function openDbClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();
  return client;
}

async function findTicketBySubject(
  client: Client,
  subject: string
): Promise<Record<string, unknown> | null> {
  const result = await client.query(
    `SELECT * FROM "Ticket" WHERE subject = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [subject]
  );
  return result.rows[0] ?? null;
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

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

async function goToTicketsPage(page: Page): Promise<void> {
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
}

/**
 * Seeds a ticket via the email webhook. The DB default status is `new`,
 * matching the auto-resolve flow starting point.
 */
async function seedTicket(
  page: Page,
  opts: { from: string; subject: string }
): Promise<void> {
  const response = await page.request.post(WEBHOOK_URL, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    multipart: {
      from: opts.from,
      subject: opts.subject,
      body: "Auto-resolve test ticket body.",
    },
  });
  expect(response.status()).toBe(200);
}

// ---------------------------------------------------------------------------
// Agent setup — create a test agent (idempotent)
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  const helperScript = path.resolve(
    __dirname,
    "../server/src/create-test-agent.ts"
  );
  const serverDir = path.resolve(__dirname, "../server");

  execSync(`bun run ${helperScript}`, {
    cwd: serverDir,
    env: {
      ...process.env,
      AGENT_EMAIL: "auto-resolve-agent@test.local",
      AGENT_PASSWORD: "AutoResolveAgentPW123!",
      AGENT_NAME: "Auto Resolve Agent",
    },
    stdio: "inherit",
  });
});

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Auto-resolve — ticket list visibility", () => {
  let db: Client;

  test.beforeAll(async () => {
    db = await openDbClient();
  });

  test.afterAll(async () => {
    await db.end();
  });

  // -------------------------------------------------------------------------
  // Hidden statuses — new and processing
  // -------------------------------------------------------------------------

  test.describe("new and processing tickets are hidden from the list", () => {
    test("a ticket in `new` status does not appear in the default ticket list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `New status hidden test ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      // Confirm the ticket was created with `new` status (the DB default)
      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.status).toBe("new");

      await goToTicketsPage(page);

      // The ticket subject must NOT appear — new is invisible to agents
      await expect(page.getByRole("cell", { name: subject })).not.toBeVisible();
    });

    test("a ticket in `processing` status does not appear in the default ticket list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Processing status hidden test ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      // Simulate the queue worker picking the ticket up
      await setTicketStatus(db, ticket!.id as number, "processing");

      await goToTicketsPage(page);

      await expect(
        page.getByRole("cell", { name: subject })
      ).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Default filter is `open`
  // -------------------------------------------------------------------------

  test.describe("default filter shows open tickets", () => {
    test("the tickets page defaults to showing open tickets only", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const openSubject = `Default filter open ticket ${Date.now()}`;
      const newSubject = `Default filter new ticket ${Date.now()}`;

      // Seed one ticket and escalate it to `open`
      await seedTicket(page, { from: "customer@example.com", subject: openSubject });
      const openTicket = await findTicketBySubject(db, openSubject);
      expect(openTicket).not.toBeNull();
      await setTicketStatus(db, openTicket!.id as number, "open");

      // Seed a second ticket and leave it as `new`
      await seedTicket(page, { from: "customer@example.com", subject: newSubject });
      const newTicket = await findTicketBySubject(db, newSubject);
      expect(newTicket).not.toBeNull();
      expect(newTicket!.status).toBe("new");

      await goToTicketsPage(page);

      // The open ticket should be visible
      await expect(
        page.getByRole("cell", { name: openSubject })
      ).toBeVisible();

      // The new ticket must be absent — the default filter is `open`, not `all`
      await expect(
        page.getByRole("cell", { name: newSubject })
      ).not.toBeVisible();
    });

    test("the status filter trigger shows 'Open' as the selected value by default", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      // The Select trigger button renders the current value as its text
      await expect(
        page.getByRole("combobox").filter({ hasText: "Open" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Filter dropdown does not expose new or processing
  // -------------------------------------------------------------------------

  test.describe("status filter dropdown options", () => {
    test("status filter dropdown does not include a 'new' option", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      // Open the status Select dropdown — the first combobox on the page
      const statusTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /open|all statuses/i })
        .first();
      await statusTrigger.click();

      // The listbox is rendered in a Radix portal; query globally by role
      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();

      // `new` and `processing` must not appear as selectable options
      await expect(
        listbox.getByRole("option", { name: /^new$/i })
      ).not.toBeVisible();
    });

    test("status filter dropdown does not include a 'processing' option", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      const statusTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /open|all statuses/i })
        .first();
      await statusTrigger.click();

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();

      await expect(
        listbox.getByRole("option", { name: /^processing$/i })
      ).not.toBeVisible();
    });

    test("status filter dropdown includes All statuses, Open, Resolved, and Closed", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToTicketsPage(page);

      const statusTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /open|all statuses/i })
        .first();
      await statusTrigger.click();

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();

      await expect(
        listbox.getByRole("option", { name: "All statuses" })
      ).toBeVisible();
      await expect(
        listbox.getByRole("option", { name: "Open" })
      ).toBeVisible();
      await expect(
        listbox.getByRole("option", { name: "Resolved" })
      ).toBeVisible();
      await expect(
        listbox.getByRole("option", { name: "Closed" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Escalated tickets (new/processing → open) appear in the list
  // -------------------------------------------------------------------------

  test.describe("escalated tickets appear in the list", () => {
    test("a ticket promoted from `new` to `open` appears in the default list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Escalated from new ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.status).toBe("new");

      // Simulate AI escalation decision: new → open
      await setTicketStatus(db, ticket!.id as number, "open");

      await goToTicketsPage(page);

      // Now the ticket should be visible in the default `open` filter view
      await expect(page.getByRole("cell", { name: subject })).toBeVisible();
    });

    test("a ticket promoted from `processing` to `open` appears in the default list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Escalated from processing ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      // Simulate worker picking it up (new → processing) then escalating (processing → open)
      await setTicketStatus(db, ticket!.id as number, "processing");
      await setTicketStatus(db, ticket!.id as number, "open");

      await goToTicketsPage(page);

      await expect(page.getByRole("cell", { name: subject })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Auto-resolved tickets (new/processing → resolved)
  // -------------------------------------------------------------------------

  test.describe("auto-resolved tickets", () => {
    test("an auto-resolved ticket does NOT appear in the default (open) list", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Auto-resolved hidden ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      // Simulate AI successfully resolving the ticket
      await setTicketStatus(db, ticket!.id as number, "resolved");

      await goToTicketsPage(page);

      // Default filter is `open` — resolved ticket must not show up
      await expect(
        page.getByRole("cell", { name: subject })
      ).not.toBeVisible();
    });

    test("an auto-resolved ticket DOES appear when filtering by Resolved", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Auto-resolved visible on filter ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      // Simulate AI successfully resolving the ticket
      await setTicketStatus(db, ticket!.id as number, "resolved");

      await goToTicketsPage(page);

      // Open the status filter dropdown and select "Resolved"
      const statusTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /open|all statuses/i })
        .first();
      await statusTrigger.click();

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await listbox.getByRole("option", { name: "Resolved" }).click();

      // After selecting Resolved, the ticket should appear
      await expect(page.getByRole("cell", { name: subject })).toBeVisible();
    });

    test("an auto-resolved ticket shows a 'resolved' status badge when filtered", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Auto-resolved badge check ${Date.now()}`;
      await seedTicket(page, { from: "customer@example.com", subject });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();

      await setTicketStatus(db, ticket!.id as number, "resolved");

      await goToTicketsPage(page);

      // Switch to Resolved filter
      const statusTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /open|all statuses/i })
        .first();
      await statusTrigger.click();

      const listbox = page.getByRole("listbox");
      await expect(listbox).toBeVisible();
      await listbox.getByRole("option", { name: "Resolved" }).click();

      // Locate the ticket's row and verify the status badge text
      const row = page.getByRole("row", { name: new RegExp(subject) });
      await expect(row).toBeVisible();
      await expect(row.getByText("resolved")).toBeVisible();
    });
  });
});
