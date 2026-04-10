/**
 * e2e/ticket-detail.spec.ts
 *
 * End-to-end tests for the ticket detail page and agent assignment feature.
 *
 * Coverage:
 *
 * Ticket detail page:
 *  - Clicking a ticket subject in the list navigates to /tickets/:id
 *  - Detail page shows subject, status badge, sender info (name + email), received date, message body
 *  - Detail page shows category badge when ticket has a category (verified via direct DB update)
 *  - "Back to Tickets" button returns to /tickets
 *  - Navigating to a non-existent ticket ID shows an error message
 *  - Unauthenticated access to /tickets/:id redirects to /login
 *
 * Assign ticket to agent:
 *  - "Assigned to" dropdown is visible on the detail page
 *  - Dropdown shows "Unassigned" when ticket has no assignment
 *  - Dropdown shows the assigned agent's name when the ticket is already assigned
 *  - Admin can assign a ticket to an agent and the dropdown reflects the selection
 *  - Admin can unassign a ticket (select "Unassigned") and the dropdown reverts
 *  - The agents list in the dropdown includes all non-deleted users
 *
 * Implementation notes:
 *  - Tickets are seeded via the email webhook (POST /api/webhooks/email with
 *    multipart/form-data), matching the pattern used in tickets.spec.ts.
 *  - Agent assignment is exercised through the UI (Select dropdown) — the
 *    resulting PATCH /api/tickets/:id call is verified by re-querying the ticket
 *    after the mutation and checking the dropdown's displayed value.
 *  - To pre-seed an assigned ticket, we assign via page.request.patch() after
 *    obtaining the ticket ID from the seed response, then navigate to the page.
 *  - The Radix UI Select portal renders options outside the trigger element.
 *    After clicking the trigger, options are located with page.getByRole("option").
 *  - A dedicated agent is created once per file via execSync + create-test-agent.ts
 *    so assign/unassign tests have a real user to work with.
 *  - Each test seeds its own ticket with a unique subject (suffixed with Date.now())
 *    to stay isolated from other tests.
 */

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
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

// A dedicated agent for assignment tests — scoped to this file.
const ASSIGN_AGENT_EMAIL = "detail-assign-agent@test.local";
const ASSIGN_AGENT_PASSWORD = "DetailAssignPW123!";
const ASSIGN_AGENT_NAME = "Detail Assign Agent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Posts a ticket via the email webhook, then queries GET /api/tickets to find
 * the newly created ticket by its subject. Returns the numeric ticket ID.
 *
 * The email webhook handler returns a bare 200 (no body), so we resolve the ID
 * by searching the tickets list immediately after creation.
 */
async function seedTicket(
  request: APIRequestContext,
  opts: {
    from: string;
    subject: string;
    text?: string;
  }
): Promise<number> {
  const webhookResponse = await request.post(WEBHOOK_URL, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    multipart: {
      from: opts.from,
      subject: opts.subject,
      text: opts.text ?? "Test ticket body.",
    },
  });
  expect(webhookResponse.status()).toBe(200);

  // Resolve the ticket ID by searching for this subject via the tickets API.
  // The subject may be normalised (Re:/Fwd: stripped) by the webhook handler,
  // so we pass the raw subject value — normalisation only strips leading prefixes,
  // so our unique timestamp-suffixed subjects will survive unmodified.
  const listResponse = await request.get("/api/tickets", {
    params: { search: opts.subject, pageSize: "5" },
  });
  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.json();
  const ticket = (listBody.tickets as Array<{ id: number; subject: string }>).find(
    (t) => t.subject === opts.subject
  );
  if (!ticket) {
    throw new Error(
      `seedTicket: could not find ticket with subject "${opts.subject}" after creation`
    );
  }
  return ticket.id;
}

/**
 * Navigates directly to the detail page for the given ticket ID and waits for
 * the page heading to be visible (always rendered, even while loading).
 */
async function goToTicketDetail(page: Page, ticketId: number): Promise<void> {
  await page.goto(`/tickets/${ticketId}`);
  await expect(
    page.getByRole("heading", { name: "Back to Tickets" })
  ).toBeVisible();
}

/**
 * Fetches the list of agents from the API using the authenticated request
 * context. Returns the agents array.
 */
async function getAgents(
  request: APIRequestContext
): Promise<Array<{ id: string; name: string; email: string }>> {
  const response = await request.get("/api/agents");
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.agents;
}

// ---------------------------------------------------------------------------
// File-level setup: ensure the dedicated assign agent exists
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
      AGENT_EMAIL: ASSIGN_AGENT_EMAIL,
      AGENT_PASSWORD: ASSIGN_AGENT_PASSWORD,
      AGENT_NAME: ASSIGN_AGENT_NAME,
    },
    stdio: "inherit",
  });
});

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Ticket detail page", () => {
  // -------------------------------------------------------------------------
  // Access control
  // -------------------------------------------------------------------------

  test.describe("Access control", () => {
    test("visiting /tickets/1 without being logged in redirects to /login", async ({
      page,
    }) => {
      await page.goto("/tickets/1");
      await expect(page).toHaveURL("/login");
    });
  });

  // -------------------------------------------------------------------------
  // Navigation from the list
  // -------------------------------------------------------------------------

  test.describe("Navigation from the list", () => {
    test("clicking a ticket subject navigates to /tickets/:id", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Nav to detail test ${Date.now()}`;
      await seedTicket(page.request, { from: "nav@example.com", subject });

      await page.goto("/tickets");
      await expect(
        page.getByRole("heading", { name: "Tickets" })
      ).toBeVisible();

      // The subject is rendered as an anchor link in the table
      await page.getByRole("link", { name: subject }).click();

      // URL should now be /tickets/<some numeric id>
      await expect(page).toHaveURL(/\/tickets\/\d+/);
    });

    test('"Back to Tickets" button returns to /tickets', async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Back button test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "back@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);
      await expect(
        page.getByRole("heading", { name: "Back to Tickets" })
      ).toBeVisible();

      // The ArrowLeft icon button sits in a flex row next to the "Back to Tickets"
      // heading. The button has no text label so we locate it via its parent
      // container — the div that also contains the heading.
      const headerRow = page.getByRole("heading", { name: "Back to Tickets" }).locator("..");
      await headerRow.getByRole("button").click();

      await expect(page).toHaveURL("/tickets");
      await expect(
        page.getByRole("heading", { name: "Tickets" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Page content
  // -------------------------------------------------------------------------

  test.describe("Page content", () => {
    test("detail page shows the ticket subject", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Subject display test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "subject@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // Subject is rendered inside a CardTitle
      await expect(
        page.getByText(subject, { exact: true })
      ).toBeVisible();
    });

    test("detail page shows the open status badge", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Status badge detail test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "statusbadge@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // The status badge renders the status text directly
      await expect(page.getByText("open")).toBeVisible();
    });

    test("detail page shows sender name and email when fromName is present", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Sender name display test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "Alice Sender <alice.sender@example.com>",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // The From section renders "Alice Sender (alice.sender@example.com)"
      await expect(page.getByText("Alice Sender")).toBeVisible();
      await expect(
        page.getByText("(alice.sender@example.com)")
      ).toBeVisible();
    });

    test("detail page shows bare email when fromName is absent", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Bare sender email test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "bare.sender@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // Email appears without parentheses wrapper
      await expect(page.getByText("bare.sender@example.com")).toBeVisible();
      await expect(
        page.getByText("(bare.sender@example.com)")
      ).not.toBeVisible();
    });

    test("detail page shows the received date", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Received date test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "date@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // The "Received" label must be visible as a metadata field header
      await expect(
        page.getByText("Received", { exact: true })
      ).toBeVisible();

      // A formatted date string should appear beneath it. We check for the
      // current year as a proxy — toLocaleString() will always include it.
      const currentYear = new Date().getFullYear().toString();
      await expect(page.getByText(new RegExp(currentYear))).toBeVisible();
    });

    test("detail page shows the message body", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Body display test ${Date.now()}`;
      const body = "This is a unique message body for the detail page test.";
      const ticketId = await seedTicket(page.request, {
        from: "body@example.com",
        subject,
        text: body,
      });

      await page.goto(`/tickets/${ticketId}`);

      await expect(page.getByText(body)).toBeVisible();
    });

    test("detail page shows a category badge when the ticket has a category", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Category badge test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "category@example.com",
        subject,
      });

      // Set the category directly in the DB — the email webhook does not set it;
      // in production it is set by the AI pipeline. We use pg here to simulate
      // that path without depending on the AI pipeline in tests.
      const db = new Client({
        connectionString: process.env.DATABASE_URL,
      });
      await db.connect();
      await db.query(
        `UPDATE "Ticket" SET category = 'technical_question' WHERE id = $1`,
        [ticketId]
      );
      await db.end();

      await page.goto(`/tickets/${ticketId}`);

      // CATEGORY_LABELS['technical_question'] = 'Technical Question'
      await expect(page.getByText("Technical Question")).toBeVisible();
    });

    test("navigating to a non-existent ticket ID shows an error message", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Use a very large ID that will never exist in the test DB
      await page.goto("/tickets/999999999");

      await expect(
        page.getByText("Failed to load ticket.")
      ).toBeVisible();
    });
  });
});

// ===========================================================================
// Assign ticket to agent
// ===========================================================================

test.describe("Assign ticket to agent", () => {
  // -------------------------------------------------------------------------
  // Dropdown visibility
  // -------------------------------------------------------------------------

  test.describe("Dropdown visibility", () => {
    test('"Assigned to" dropdown is visible on the ticket detail page', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Dropdown visibility test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "dropdown@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // The Select trigger renders with role="combobox" in Radix UI
      await expect(
        page.getByRole("combobox")
      ).toBeVisible();
    });

    test('dropdown shows "Unassigned" when ticket has no assignment', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Unassigned default test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "unassigned@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // The trigger should display "Unassigned" as the selected value
      await expect(
        page.getByRole("combobox")
      ).toHaveText("Unassigned");
    });

    test("dropdown lists all agents from GET /api/agents", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Agents list test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "agentslist@example.com",
        subject,
      });

      // Fetch agents via the API so we know exactly who should be in the list
      const agents = await getAgents(page.request);
      expect(agents.length).toBeGreaterThan(0);

      await page.goto(`/tickets/${ticketId}`);

      // Open the dropdown
      await page.getByRole("combobox").click();

      // The "Unassigned" option must always be present
      await expect(
        page.getByRole("option", { name: "Unassigned" })
      ).toBeVisible();

      // Every agent returned by the API must appear as an option
      for (const agent of agents) {
        await expect(
          page.getByRole("option", { name: agent.name })
        ).toBeVisible();
      }

      // Close the dropdown by pressing Escape
      await page.keyboard.press("Escape");
    });
  });

  // -------------------------------------------------------------------------
  // Assigning an agent
  // -------------------------------------------------------------------------

  test.describe("Assigning an agent", () => {
    test("admin can assign a ticket to an agent", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Assign agent test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "assign@example.com",
        subject,
      });

      await page.goto(`/tickets/${ticketId}`);

      // Open the "Assigned to" dropdown
      await page.getByRole("combobox").click();

      // Select the dedicated assign agent
      await page.getByRole("option", { name: ASSIGN_AGENT_NAME }).click();

      // The dropdown trigger should now display the agent's name.
      // Wait for the mutation to settle — TanStack Query invalidates and
      // refetches, so the displayed value updates from the re-fetched ticket.
      await expect(
        page.getByRole("combobox")
      ).toHaveText(ASSIGN_AGENT_NAME);
    });

    test("assigned agent name persists after page reload", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Persist assignment test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "persist@example.com",
        subject,
      });

      // Assign via the API directly so the test doesn't depend on the UI for setup
      const agents = await getAgents(page.request);
      const assignAgent = agents.find(
        (a) => a.email === ASSIGN_AGENT_EMAIL
      );
      expect(assignAgent).toBeDefined();

      const patchResponse = await page.request.patch(
        `/api/tickets/${ticketId}`,
        {
          data: { assignedToId: assignAgent!.id },
          headers: { "Content-Type": "application/json" },
        }
      );
      expect(patchResponse.status()).toBe(200);

      // Navigate to the page fresh — not via the UI assign flow
      await page.goto(`/tickets/${ticketId}`);

      // The dropdown should show the assigned agent's name on initial load
      await expect(
        page.getByRole("combobox")
      ).toHaveText(ASSIGN_AGENT_NAME);
    });

    test("admin can unassign a ticket by selecting Unassigned", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Unassign test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "unassign@example.com",
        subject,
      });

      // Pre-assign via API
      const agents = await getAgents(page.request);
      const assignAgent = agents.find(
        (a) => a.email === ASSIGN_AGENT_EMAIL
      );
      expect(assignAgent).toBeDefined();

      await page.request.patch(`/api/tickets/${ticketId}`, {
        data: { assignedToId: assignAgent!.id },
        headers: { "Content-Type": "application/json" },
      });

      await page.goto(`/tickets/${ticketId}`);

      // Confirm the ticket is shown as assigned
      await expect(
        page.getByRole("combobox")
      ).toHaveText(ASSIGN_AGENT_NAME);

      // Open the dropdown and select "Unassigned"
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Unassigned" }).click();

      // Dropdown should revert to "Unassigned"
      await expect(
        page.getByRole("combobox")
      ).toHaveText("Unassigned");
    });
  });
});
