/**
 * e2e/ticket-summarize.spec.ts
 *
 * End-to-end tests for the AI ticket summarize feature on the Ticket Detail page.
 *
 * Coverage:
 *
 * Summarize button visibility:
 *  - The "Summarize" button with a Sparkles icon is visible on the ticket detail page
 *
 * Loading state:
 *  - Clicking "Summarize" disables the button and shows the Loader2 spinner while
 *    the request is in flight
 *
 * Successful summarization:
 *  - After the API responds, the "AI Summary" label and summary text are displayed
 *  - The button label changes to "Regenerate Summary" once a summary is shown
 *
 * Regeneration:
 *  - Clicking "Regenerate Summary" calls POST /api/tickets/:id/summarize again and
 *    updates the displayed summary with the new response
 *
 * Error state:
 *  - When the POST /api/tickets/:id/summarize endpoint returns a 500, the error
 *    message "Failed to generate summary. Please try again." is displayed
 *  - The button remains enabled after an error so the user can retry
 *
 * Implementation notes:
 *  - Tickets are seeded via the email webhook (POST /api/webhooks/email with
 *    multipart/form-data), matching the pattern used in ticket-detail.spec.ts.
 *  - The summarize endpoint makes a live AI API call in real environments; in
 *    tests we intercept POST /api/tickets/:id/summarize with page.route() to
 *    return a controlled { summary: string } response. This keeps tests fast,
 *    deterministic, and independent of external AI service availability.
 *  - The loading state test intercepts the route with a delayed response so
 *    the button's disabled/spinner state can be asserted before the response
 *    lands. A Promise that resolves after the assertion is used to synchronise.
 *  - The TicketSummary component renders between the TicketDetail card and the
 *    ReplyThread section. The button is located by its accessible role + name,
 *    not by class or icon type.
 *  - Each test seeds its own ticket with a unique subject (suffixed with
 *    Date.now()) so tests remain isolated from one another.
 */

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "test-webhook-secret";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

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
 * Seeds a ticket via the email webhook and resolves its numeric ID from the
 * tickets list API. Pattern matches the other ticket spec files.
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
 * Navigates to the ticket detail page and waits until the comboboxes (Status,
 * Category, Assigned to) are present, indicating the ticket data has loaded.
 */
async function goToTicketDetail(page: Page, ticketId: number): Promise<void> {
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("combobox").first()).toBeVisible();
}

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Ticket summarize", () => {
  // -------------------------------------------------------------------------
  // Summarize button visibility
  // -------------------------------------------------------------------------

  test.describe("Button visibility", () => {
    test("Summarize button is visible on the ticket detail page", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize button visibility test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // The button renders with accessible name "Summarize" before any summary
      // has been requested.
      await expect(
        page.getByRole("button", { name: "Summarize" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  test.describe("Loading state", () => {
    test("button is disabled and shows a spinner while the request is in flight", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize loading state test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // Allow the test to unblock the intercepted route after assertions pass.
      let resolveRoute!: () => void;
      const routeReleased = new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      // Intercept the summarize endpoint and hold the response until we have
      // had a chance to assert the loading state.
      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          // Wait until the test tells us to release the response.
          await routeReleased;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ summary: "Test summary for loading state." }),
          });
        } else {
          await route.continue();
        }
      });

      // Trigger the summarize request.
      await page.getByRole("button", { name: "Summarize" }).click();

      // While the route is held, the button should be disabled.
      const button = page.getByRole("button", { name: /Summarize|Regenerate Summary/ });
      await expect(button).toBeDisabled();

      // The Loader2 spinner SVG is rendered inside the button when isLoading is
      // true. Lucide renders it as an <svg> with a class containing "animate-spin".
      await expect(button.locator("svg.animate-spin")).toBeVisible();

      // Release the intercepted route so the test can proceed to completion.
      resolveRoute();

      // Wait for the button to become enabled again (loading finished).
      await expect(button).toBeEnabled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful summarization
  // -------------------------------------------------------------------------

  test.describe("Successful summarization", () => {
    test("AI Summary label and summary text are displayed after the API responds", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize success test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
        text: "I need help with my order.",
      });

      await goToTicketDetail(page, ticketId);

      const summaryText = "The customer reported an issue with their order.";

      // Intercept and return a controlled summary response.
      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ summary: summaryText }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole("button", { name: "Summarize" }).click();

      // The "AI Summary" heading label must appear in the summary box.
      await expect(page.getByText("AI Summary")).toBeVisible();

      // The returned summary text must be rendered below the label.
      await expect(page.getByText(summaryText)).toBeVisible();
    });

    test('button label changes to "Regenerate Summary" after a summary is shown', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize label change test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ summary: "A concise summary." }),
          });
        } else {
          await route.continue();
        }
      });

      // Initially the button reads "Summarize".
      await expect(
        page.getByRole("button", { name: "Summarize" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Summarize" }).click();

      // After the summary appears, the button must read "Regenerate Summary".
      await expect(
        page.getByRole("button", { name: "Regenerate Summary" })
      ).toBeVisible();

      // The old "Summarize"-only button label must no longer be present.
      // Use exact:true so "Regenerate Summary" does not match this check.
      await expect(
        page.getByRole("button", { name: "Summarize", exact: true })
      ).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Regeneration
  // -------------------------------------------------------------------------

  test.describe("Regeneration", () => {
    test('clicking "Regenerate Summary" calls the API again and updates the summary', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Regenerate summary test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // Track the number of POST calls made to the summarize endpoint.
      let callCount = 0;
      const summaries = [
        "First summary of this ticket.",
        "Regenerated summary with new content.",
      ];

      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          const responseBody = summaries[callCount] ?? summaries[summaries.length - 1];
          callCount++;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ summary: responseBody }),
          });
        } else {
          await route.continue();
        }
      });

      // First call: click "Summarize".
      await page.getByRole("button", { name: "Summarize" }).click();
      await expect(page.getByText(summaries[0])).toBeVisible();
      expect(callCount).toBe(1);

      // Second call: click "Regenerate Summary".
      await page.getByRole("button", { name: "Regenerate Summary" }).click();

      // The displayed summary must update to the new value.
      await expect(page.getByText(summaries[1])).toBeVisible();

      // The first summary must no longer be shown.
      await expect(page.getByText(summaries[0])).not.toBeVisible();

      // Exactly two POST requests must have been made.
      expect(callCount).toBe(2);
    });

    test('"Regenerate Summary" button remains visible after regenerating', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Regenerate button persistence test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ summary: "Any summary will do." }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole("button", { name: "Summarize" }).click();
      await expect(page.getByRole("button", { name: "Regenerate Summary" })).toBeVisible();

      // Regenerate a second time and confirm the button stays as "Regenerate Summary".
      await page.getByRole("button", { name: "Regenerate Summary" }).click();
      await expect(
        page.getByRole("button", { name: "Regenerate Summary" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  test.describe("Error state", () => {
    test('a failed POST shows "Failed to generate summary. Please try again."', async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize error state test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      // Intercept and return a server error so the component's catch block runs.
      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal server error" }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole("button", { name: "Summarize" }).click();

      // The error paragraph defined in the JSX:
      //   {error && <p className="text-sm text-destructive">{error}</p>}
      await expect(
        page.getByText("Failed to generate summary. Please try again.")
      ).toBeVisible();
    });

    test("button is re-enabled after an error so the user can retry", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `Summarize retry after error test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal server error" }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole("button", { name: "Summarize" }).click();

      // Error message must be shown.
      await expect(
        page.getByText("Failed to generate summary. Please try again.")
      ).toBeVisible();

      // The button must be enabled (isLoading is false after the error), allowing
      // the user to click again without a page reload.
      await expect(
        page.getByRole("button", { name: "Summarize" })
      ).toBeEnabled();
    });

    test("no AI Summary box is rendered when an error occurs", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      const subject = `No summary box on error test ${Date.now()}`;
      const ticketId = await seedTicket(page.request, {
        from: "customer@example.com",
        subject,
      });

      await goToTicketDetail(page, ticketId);

      await page.route(`**/api/tickets/${ticketId}/summarize`, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Internal server error" }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole("button", { name: "Summarize" }).click();

      // Wait for the error to appear to confirm the request has completed.
      await expect(
        page.getByText("Failed to generate summary. Please try again.")
      ).toBeVisible();

      // The "AI Summary" label must NOT appear — summary is null after an error.
      await expect(page.getByText("AI Summary")).not.toBeVisible();
    });
  });
});
