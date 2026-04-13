/**
 * e2e/ticket-replies.spec.ts
 *
 * End-to-end tests for the reply thread feature on the Ticket Detail page.
 *
 * Coverage:
 *
 * Reply thread display:
 *  - The original message body is visible on the detail page
 *  - The reply form (textarea + "Send Reply" button) is present
 *  - When no replies exist, the thread area is empty (no reply cards shown)
 *  - Pre-existing replies are shown with author name and body
 *  - Multiple replies are listed in chronological order (oldest first)
 *
 * Submitting a reply:
 *  - A logged-in agent can submit a reply and it appears in the thread
 *  - After a successful submit the textarea is cleared
 *  - The new reply shows the author's name
 *  - A logged-in admin can also submit a reply
 *
 * Client-side validation:
 *  - Submitting with an empty textarea shows the "Reply cannot be empty" error
 *    and does NOT call POST /api/tickets/:id/replies
 *
 * Error state:
 *  - When the POST /api/tickets/:id/replies endpoint returns a 500 the page
 *    shows "Failed to send reply." without navigating away
 *
 * Implementation notes:
 *  - Tickets are seeded via the email webhook (POST /api/webhooks/email with
 *    multipart/form-data), matching the pattern used in ticket-detail.spec.ts.
 *  - The dedicated test agent (REPLY_AGENT_*) is created once via the
 *    create-test-agent helper so authorship can be verified in the thread.
 *  - Pre-existing replies are seeded directly via POST /api/tickets/:id/replies
 *    using Playwright's request fixture (authenticated as admin or agent),
 *    rather than injecting into the DB, to keep tests independent of Prisma.
 *  - The textarea has no associated <label> — it is located by its placeholder
 *    text "Write a reply...".
 *  - The "Failed to send reply." error state is triggered by intercepting the
 *    POST with page.route() to return a 500 before the request leaves the
 *    browser.
 *  - Each test seeds its own ticket with a unique subject (suffixed with
 *    Date.now()) so tests remain isolated from one another.
 *
 * Badge rendering:
 *  - Agent reply cards have `bg-primary/5` background and an "Agent" badge
 *  - Customer reply cards have `bg-muted/30` background and a "Customer" badge
 *  - Customer replies are seeded directly via seed-customer-reply.ts because
 *    the POST /api/tickets/:id/replies endpoint always sets senderType=agent
 */

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";
const ADMIN_NAME = "Admin";

// A dedicated agent scoped to this file.
const REPLY_AGENT_EMAIL = "reply-agent@test.local";
const REPLY_AGENT_PASSWORD = "ReplyAgentPW123!";
const REPLY_AGENT_NAME = "Reply Agent";

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

async function loginAsAgent(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(REPLY_AGENT_EMAIL);
  await page.getByLabel("Password").fill(REPLY_AGENT_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Seeds a ticket via the email webhook and resolves its numeric ID from the
 * tickets list API.
 */
async function seedTicket(
  request: APIRequestContext,
  opts: { from: string; subject: string; text?: string }
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

  const listResponse = await request.get("/api/tickets", {
    params: { search: opts.subject, pageSize: "5" },
  });
  expect(listResponse.status()).toBe(200);
  const listBody = await listResponse.json();
  const ticket = (
    listBody.tickets as Array<{ id: number; subject: string }>
  ).find((t) => t.subject === opts.subject);
  if (!ticket) {
    throw new Error(
      `seedTicket: could not find ticket with subject "${opts.subject}" after creation`
    );
  }
  return ticket.id;
}

/**
 * Posts an agent reply to the given ticket via the API (requires the request
 * context to already be authenticated via the browser session cookie).
 * senderType is always set to "agent" by the server.
 */
async function seedReply(
  request: APIRequestContext,
  ticketId: number,
  body: string
): Promise<void> {
  const response = await request.post(`/api/tickets/${ticketId}/replies`, {
    data: { body },
    headers: { "Content-Type": "application/json" },
  });
  expect(response.status()).toBe(201);
}

/**
 * Seeds a customer reply directly into the DB via seed-customer-reply.ts.
 * Used for badge rendering tests where senderType must be "customer".
 */
function seedCustomerReply(ticketId: number, body: string): void {
  const helperScript = path.resolve(
    __dirname,
    "../server/src/seed-customer-reply.ts"
  );
  const serverDir = path.resolve(__dirname, "../server");
  execSync(`bun run ${helperScript}`, {
    cwd: serverDir,
    env: {
      ...process.env,
      TICKET_ID: String(ticketId),
      REPLY_BODY: body,
    },
    stdio: "inherit",
  });
}

/**
 * Navigates to the ticket detail page and waits until the comboboxes in the
 * right sidebar are present, which signals that the ticket data has loaded.
 */
async function goToTicketDetail(page: Page, ticketId: number): Promise<void> {
  await page.goto(`/tickets/${ticketId}`);
  // Wait for the ticket data to load — the first combobox (Status) appears
  // once the ticket query resolves.
  await expect(page.getByRole("combobox").first()).toBeVisible();
}

// ---------------------------------------------------------------------------
// File-level setup: ensure the dedicated reply agent exists
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
      AGENT_EMAIL: REPLY_AGENT_EMAIL,
      AGENT_PASSWORD: REPLY_AGENT_PASSWORD,
      AGENT_NAME: REPLY_AGENT_NAME,
    },
    stdio: "inherit",
  });
});

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Ticket reply thread", () => {
  // -------------------------------------------------------------------------
  // Reply thread display
  // -------------------------------------------------------------------------

  test.describe("Reply thread display", () => {
    test("original message body is visible on the detail page", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Original message display test ${Date.now()}`;
      const body = "This is the original support request body.";
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
        text: body,
      });

      await goToTicketDetail(page, ticketId);

      // The original message is rendered inside a bordered card with a "Message"
      // heading above the body text.
      await expect(page.getByText("Message", { exact: true })).toBeVisible();
      await expect(page.getByText(body)).toBeVisible();
    });

    test("reply form with textarea and Send Reply button is present", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Reply form visibility test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      await expect(
        page.getByPlaceholder("Write a reply...")
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send Reply" })
      ).toBeVisible();
    });

    test("no reply cards are shown when the ticket has no replies", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `No replies state test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // The reply thread section only renders cards when replies.length > 0.
      // We verify by checking that no reply author names appear above the form.
      // The original message card has role="region" implied by the border; we
      // check by the absence of the agent or admin name in a reply card context.
      // There should be exactly one bordered card (the original message card).
      await expect(page.getByText("Message", { exact: true })).toBeVisible();

      // The admin's name should NOT appear in a reply card (only the form and
      // the original message are present).
      const replyCards = page.locator(".bg-muted\\/30");
      await expect(replyCards).toHaveCount(0);
    });

    test("a pre-existing reply is shown with author name and body", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Pre-existing reply display test ${Date.now()}`;
      const replyBody = "This is a pre-seeded reply for display testing.";
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Seed the reply via the API as admin (the authenticated request context
      // shares the browser's session cookie).
      await seedReply(page.request, ticketId, replyBody);

      await goToTicketDetail(page, ticketId);

      // The reply card renders author name and body text.
      await expect(page.getByText(ADMIN_NAME, { exact: true })).toBeVisible();
      await expect(page.getByText(replyBody)).toBeVisible();
    });

    test("multiple replies are listed in chronological order (oldest first)", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Chronological replies test ${Date.now()}`;
      const firstReply = "First reply — should appear at the top.";
      const secondReply = "Second reply — should appear below the first.";

      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Seed replies sequentially so createdAt ordering is deterministic.
      await seedReply(page.request, ticketId, firstReply);
      await seedReply(page.request, ticketId, secondReply);

      await goToTicketDetail(page, ticketId);

      // Both replies must be visible.
      await expect(page.getByText(firstReply)).toBeVisible();
      await expect(page.getByText(secondReply)).toBeVisible();

      // The first reply's card should appear above the second reply's card in
      // the DOM. Compare vertical positions via bounding boxes.
      // Agent reply cards use the bg-primary/5 class.
      const firstCard = page
        .locator(".bg-primary\\/5")
        .filter({ hasText: firstReply });
      const secondCard = page
        .locator(".bg-primary\\/5")
        .filter({ hasText: secondReply });

      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();

      expect(firstBox).not.toBeNull();
      expect(secondBox).not.toBeNull();
      // Older reply has a smaller Y value (higher up on the page).
      expect(firstBox!.y).toBeLessThan(secondBox!.y);
    });
  });

  // -------------------------------------------------------------------------
  // Submitting a reply
  // -------------------------------------------------------------------------

  test.describe("Submitting a reply", () => {
    test("agent can submit a reply and it appears in the thread", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Agent submit reply test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Log in as the agent to verify that non-admin users can also reply.
      await loginAsAgent(page);

      await goToTicketDetail(page, ticketId);

      const replyText = "This is a reply from the dedicated reply agent.";
      await page.getByPlaceholder("Write a reply...").fill(replyText);
      await page.getByRole("button", { name: "Send Reply" }).click();

      // The new reply card must appear in the thread.
      await expect(page.getByText(replyText)).toBeVisible();
    });

    test("textarea is cleared after a successful reply submission", async ({
      page,
    }) => {
      await loginAsAgent(page);

      const subject = `Textarea clear after submit test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      const replyText = "Reply that should clear the textarea after submit.";
      const textarea = page.getByPlaceholder("Write a reply...");
      await textarea.fill(replyText);
      await page.getByRole("button", { name: "Send Reply" }).click();

      // Wait for the reply to appear in the thread (confirms the mutation settled)
      // then assert the textarea is empty.
      await expect(page.getByText(replyText)).toBeVisible();
      await expect(textarea).toHaveValue("");
    });

    test("new reply shows the author's name in the reply card", async ({
      page,
    }) => {
      await loginAsAgent(page);

      const subject = `Author name display test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      const replyText = "Authorship verification reply.";
      await page.getByPlaceholder("Write a reply...").fill(replyText);
      await page.getByRole("button", { name: "Send Reply" }).click();

      // The reply card renders the author's name as a bolded heading.
      await expect(page.getByText(replyText)).toBeVisible();
      await expect(
        page.getByText(REPLY_AGENT_NAME, { exact: true })
      ).toBeVisible();
    });

    test("admin can submit a reply and it appears in the thread", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Admin submit reply test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      const replyText = "Admin reply for submit test.";
      await page.getByPlaceholder("Write a reply...").fill(replyText);
      await page.getByRole("button", { name: "Send Reply" }).click();

      await expect(page.getByText(replyText)).toBeVisible();
    });

    test("replies persist after page reload", async ({ page }) => {
      await loginAsAdmin(page);

      const subject = `Reply persistence test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      const replyText = "This reply must survive a page reload.";
      await page.getByPlaceholder("Write a reply...").fill(replyText);
      await page.getByRole("button", { name: "Send Reply" }).click();

      // Confirm it appeared before reloading.
      await expect(page.getByText(replyText)).toBeVisible();

      // Reload and verify the reply is still fetched from the server.
      await page.reload();
      await expect(page.getByRole("combobox").first()).toBeVisible();
      await expect(page.getByText(replyText)).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Client-side validation
  // -------------------------------------------------------------------------

  test.describe("Client-side validation", () => {
    test("submitting an empty textarea shows the validation error and does not POST", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Empty reply validation test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // Track whether a POST to the replies endpoint is made.
      let postWasMade = false;
      await page.route(`**/api/tickets/${ticketId}/replies`, (route) => {
        if (route.request().method() === "POST") {
          postWasMade = true;
        }
        // Fulfill the route normally so the test doesn't break other requests.
        route.continue();
      });

      // The textarea is empty by default — submit without filling it.
      await page.getByRole("button", { name: "Send Reply" }).click();

      // The Zod resolver should surface the "Reply cannot be empty" error via
      // <FormMessage /> below the textarea.
      await expect(
        page.getByText("Reply cannot be empty")
      ).toBeVisible();

      // No network request should have been made.
      expect(postWasMade).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Badge rendering
  // -------------------------------------------------------------------------

  test.describe("Badge rendering", () => {
    test("agent reply card shows an 'Agent' badge with primary styling", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Agent badge rendering test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Seed an agent reply via the API (senderType is always "agent").
      await seedReply(page.request, ticketId, "Agent reply for badge test.");

      await goToTicketDetail(page, ticketId);

      // The agent reply card uses bg-primary/5 background.
      const agentCard = page.locator(".bg-primary\\/5").first();
      await expect(agentCard).toBeVisible();

      // The "Agent" badge is rendered inside the card.
      await expect(agentCard.getByText("Agent", { exact: true })).toBeVisible();
    });

    test("customer reply card shows a 'Customer' badge with muted styling", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Customer badge rendering test ${Date.now()}`;
      const replyBody = "Customer reply for badge test.";
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Seed a customer reply directly via DB — the POST endpoint always sets
      // senderType=agent so this must bypass the API.
      seedCustomerReply(ticketId, replyBody);

      await goToTicketDetail(page, ticketId);

      // The customer reply card uses bg-muted/30 background.
      const customerCard = page.locator(".bg-muted\\/30").first();
      await expect(customerCard).toBeVisible();

      // The "Customer" badge is rendered inside the card.
      await expect(
        customerCard.getByText("Customer", { exact: true })
      ).toBeVisible();

      // The body text is visible in the customer card.
      await expect(customerCard.getByText(replyBody)).toBeVisible();
    });

    test("agent and customer replies are visually distinct on the same page", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Mixed badge distinction test ${Date.now()}`;
      const agentReplyBody = "This is an agent reply.";
      const customerReplyBody = "This is a customer reply.";

      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      // Seed one agent reply and one customer reply.
      await seedReply(page.request, ticketId, agentReplyBody);
      seedCustomerReply(ticketId, customerReplyBody);

      await goToTicketDetail(page, ticketId);

      // Agent card: primary background + "Agent" badge.
      const agentCard = page
        .locator(".bg-primary\\/5")
        .filter({ hasText: agentReplyBody });
      await expect(agentCard).toBeVisible();
      await expect(agentCard.getByText("Agent", { exact: true })).toBeVisible();

      // Customer card: muted background + "Customer" badge.
      const customerCard = page
        .locator(".bg-muted\\/30")
        .filter({ hasText: customerReplyBody });
      await expect(customerCard).toBeVisible();
      await expect(
        customerCard.getByText("Customer", { exact: true })
      ).toBeVisible();

      // The two cards must be distinct elements — not the same node.
      const agentBox = await agentCard.boundingBox();
      const customerBox = await customerCard.boundingBox();
      expect(agentBox).not.toBeNull();
      expect(customerBox).not.toBeNull();
      expect(agentBox!.y).not.toBe(customerBox!.y);
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  test.describe("Error state", () => {
    test('a failed POST shows "Failed to send reply." without navigating away', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Failed send reply test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // Intercept the POST and force a server error so replyMutation.isError
      // becomes true, which renders the "Failed to send reply." paragraph.
      await page.route(`**/api/tickets/${ticketId}/replies`, (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal server error" }),
          });
        } else {
          route.continue();
        }
      });

      await page.getByPlaceholder("Write a reply...").fill("Trigger an error.");
      await page.getByRole("button", { name: "Send Reply" }).click();

      // The error paragraph defined in the JSX:
      //   {replyMutation.isError && (
      //     <p className="text-sm text-destructive">Failed to send reply.</p>
      //   )}
      await expect(
        page.getByText("Failed to send reply.")
      ).toBeVisible();

      // The user must still be on the same ticket detail page.
      await expect(page).toHaveURL(`/tickets/${ticketId}`);
    });
  });
});
