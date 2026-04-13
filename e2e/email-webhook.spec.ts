/**
 * e2e/email-webhook.spec.ts
 *
 * End-to-end tests for the email ingestion webhook: POST /api/webhooks/email
 *
 * Coverage:
 *  - Valid payload with body creates a ticket and returns 200
 *  - Valid payload with bodyHtml (no body) stores raw HTML in the ticket body
 *  - from field in "Name <email>" format is parsed into fromName + fromEmail
 *  - from field as bare email sets fromEmail and leaves fromName null
 *  - Missing `from` field returns 400 with fieldErrors
 *  - Missing `subject` field returns 400 with fieldErrors
 *  - Empty `from` field returns 400 with fieldErrors
 *  - Empty `subject` field returns 400 with fieldErrors
 *
 * Implementation notes:
 *  - The endpoint accepts multipart/form-data (parsed by multer) — all requests
 *    are sent with Playwright's multipart form API to match real SendGrid payloads.
 *  - This is a public, auth-free endpoint; no login is needed.
 *  - The server runs on port 5151 during tests (configured in playwright.config.ts).
 *  - Ticket creation is verified by querying the test database directly via the
 *    `pg` client, mirroring the approach used in global-setup.ts.  This avoids
 *    any dependency on a tickets list UI or read API that may not yet exist.
 *  - The `SENDGRID_WEBHOOK_PUBLIC_KEY` env var must be present in server/.env.test
 *    so the server starts without throwing.  It is not used for crypto in tests —
 *    the middleware only validates request shape (Zod), not the SendGrid signature.
 *
 * Reply detection:
 *  - A second email from the same sender with the same (normalized) subject is
 *    treated as a reply: a Reply row is created and no second Ticket row is added
 *  - Replying to a resolved ticket reopens it to open
 *  - Replying to a closed ticket creates a new ticket (closed is terminal)
 *  - Different fromEmail with the same subject creates a new ticket
 *  - Same fromEmail with a different subject creates a new ticket
 *  - When two tickets share the same sender+subject (ambiguous), a third email
 *    creates a new ticket rather than guessing the wrong thread
 */

import { test, expect } from "@playwright/test";
import { Client } from "pg";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Direct URL to the server — bypasses the Vite proxy used by the browser. */
const WEBHOOK_URL = "http://localhost:5151/api/webhooks/email";

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Opens a pg connection to the test database and returns it.
 * Callers must call client.end() when finished.
 */
async function openDbClient(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();
  return client;
}

/**
 * Queries the most recently created ticket whose subject matches the given
 * value and returns its full row, or null if not found.
 */
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

/**
 * Returns the total number of Ticket rows with the given subject.
 */
async function countTicketsBySubject(client: Client, subject: string): Promise<number> {
  const result = await client.query(
    `SELECT COUNT(*) FROM "Ticket" WHERE subject = $1`,
    [subject]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Returns the most recent Reply row for the given ticketId, or null.
 */
async function findReplyByTicketId(
  client: Client,
  ticketId: number
): Promise<Record<string, unknown> | null> {
  const result = await client.query(
    `SELECT * FROM "Reply" WHERE "ticketId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [ticketId]
  );
  return result.rows[0] ?? null;
}

/**
 * Directly updates a ticket's status in the DB — used in tests to set up
 * pre-conditions (e.g. mark a ticket as resolved or closed before testing
 * the reply-detection behaviour for those states).
 */
async function setTicketStatus(
  client: Client,
  ticketId: number,
  status: string
): Promise<void> {
  await client.query(`UPDATE "Ticket" SET status = $1 WHERE id = $2`, [status, ticketId]);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Email ingestion webhook — POST /api/webhooks/email", () => {
  // Send the webhook secret header with every request in this suite
  test.use({
    extraHTTPHeaders: {
      "x-webhook-secret": process.env.WEBHOOK_SECRET ?? "test-webhook-secret",
    },
  });

  let db: Client;

  test.beforeAll(async () => {
    db = await openDbClient();
  });

  test.afterAll(async () => {
    await db.end();
  });

  // -------------------------------------------------------------------------
  // Happy paths
  // -------------------------------------------------------------------------

  test.describe("Happy paths", () => {
    test("valid payload with text body creates a ticket and returns 200", async ({
      request,
    }) => {
      const subject = `Text body test ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject,
          body: "This is the plain text body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.fromEmail).toBe("sender@example.com");
      expect(ticket!.body).toBe("This is the plain text body.");
      expect(ticket!.status).toBe("open");
      expect(ticket!.category).toBeNull();
    });

    test("valid payload with bodyHtml and no body stores raw HTML", async ({
      request,
    }) => {
      const subject = `HTML body test ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject,
          bodyHtml: "<p>Hello <strong>world</strong></p>",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.body).toBe("<p>Hello <strong>world</strong></p>");
    });

    test("from field in display-name format is parsed into fromName and fromEmail", async ({
      request,
    }) => {
      const subject = `Display name parse test ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "John Smith <john@example.com>",
          subject,
          body: "Hello from John.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.fromName).toBe("John Smith");
      expect(ticket!.fromEmail).toBe("john@example.com");
    });

    test("bare email address sets fromEmail and leaves fromName null", async ({
      request,
    }) => {
      const subject = `Bare email parse test ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "bare@example.com",
          subject,
          body: "No display name here.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.fromEmail).toBe("bare@example.com");
      expect(ticket!.fromName).toBeNull();
    });

    test("bodyHtml is preferred over body when both are present", async ({
      request,
    }) => {
      const subject = `HTML preferred over text ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject,
          body: "Plain text",
          bodyHtml: "<p>HTML wins</p>",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.body).toBe("<p>HTML wins</p>");
    });

    test("ticket is created with status open by default", async ({
      request,
    }) => {
      const subject = `Default status test ${Date.now()}`;

      await request.post(WEBHOOK_URL, {
        multipart: {
          from: "status@example.com",
          subject,
          body: "Checking default status.",
        },
      });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      expect(ticket!.status).toBe("open");
      expect(ticket!.category).toBeNull();
      expect(ticket!.assignedToId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------

  test.describe("Validation errors", () => {
    test("missing from field returns 400 with field error", async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          subject: "Missing from field",
          body: "Some body text.",
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.from).toBeDefined();
    });

    test("missing subject field returns 400 with field error", async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          body: "Some body text.",
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.subject).toBeDefined();
    });

    test("empty from field returns 400 with field error", async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "",
          subject: "Empty from test",
          body: "Some body text.",
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.from).toBeDefined();
    });

    test("empty subject field returns 400 with field error", async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: "",
          body: "Some body text.",
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.subject).toBeDefined();
    });

    test("missing both from and subject returns 400 with both field errors", async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          body: "Only a body, nothing else.",
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.errors).toBeDefined();
      expect(body.errors.from).toBeDefined();
      expect(body.errors.subject).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Webhook secret authentication
  // -------------------------------------------------------------------------

  test.describe("Webhook secret authentication", () => {
    test("absent x-webhook-secret header returns 401", async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: { "x-webhook-secret": "" },
        multipart: {
          from: "sender@example.com",
          subject: "Auth test",
          body: "Body text.",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("wrong x-webhook-secret value returns 401", async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: { "x-webhook-secret": "wrong-secret" },
        multipart: {
          from: "sender@example.com",
          subject: "Auth test",
          body: "Body text.",
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Reply detection
  // -------------------------------------------------------------------------

  test.describe("Reply detection", () => {
    test("second email from same sender+subject creates a Reply, not a new Ticket", async ({
      request,
    }) => {
      const subject = `Reply detection basic test ${Date.now()}`;

      // First email → creates the ticket
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject, body: "Initial message." },
      });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      const ticketId = ticket!.id as number;

      // Second email with Re: prefix → should be detected as a reply
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: `Re: ${subject}`, body: "Follow-up message." },
      });

      // Still only one ticket with this subject
      const ticketCount = await countTicketsBySubject(db, subject);
      expect(ticketCount).toBe(1);

      // A Reply row was created for the original ticket
      const reply = await findReplyByTicketId(db, ticketId);
      expect(reply).not.toBeNull();
      expect(reply!.senderType).toBe("customer");
      expect(reply!.body).toBe("Follow-up message.");
      expect(reply!.authorId).toBeNull();
    });

    test("reply to a resolved ticket reopens it to open", async ({ request }) => {
      const subject = `Reopen resolved ticket test ${Date.now()}`;

      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject, body: "Initial message." },
      });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      const ticketId = ticket!.id as number;

      // Mark the ticket as resolved directly in the DB
      await setTicketStatus(db, ticketId, "resolved");

      // Customer replies → ticket should be reopened
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: `Re: ${subject}`, body: "Still broken!" },
      });

      const updatedTicket = await findTicketBySubject(db, subject);
      expect(updatedTicket!.status).toBe("open");

      const reply = await findReplyByTicketId(db, ticketId);
      expect(reply).not.toBeNull();
      expect(reply!.senderType).toBe("customer");
    });

    test("reply to a closed ticket creates a new ticket instead", async ({ request }) => {
      const subject = `Closed ticket reply test ${Date.now()}`;

      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject, body: "Initial message." },
      });

      const ticket = await findTicketBySubject(db, subject);
      expect(ticket).not.toBeNull();
      const originalTicketId = ticket!.id as number;

      // Mark the ticket as closed
      await setTicketStatus(db, originalTicketId, "closed");

      // Customer replies to a closed ticket → a new ticket should be created
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: `Re: ${subject}`, body: "New issue, same subject." },
      });

      // Two tickets with this subject now exist
      const ticketCount = await countTicketsBySubject(db, subject);
      expect(ticketCount).toBe(2);

      // No reply was attached to the original closed ticket
      const reply = await findReplyByTicketId(db, originalTicketId);
      expect(reply).toBeNull();
    });

    test("email from a different sender with the same subject creates a new ticket", async ({
      request,
    }) => {
      const subject = `Different sender test ${Date.now()}`;

      await request.post(WEBHOOK_URL, {
        multipart: { from: "alice@example.com", subject, body: "Alice's message." },
      });

      // Bob sends an email with the same subject
      await request.post(WEBHOOK_URL, {
        multipart: { from: "bob@example.com", subject: `Re: ${subject}`, body: "Bob's separate issue." },
      });

      // Two separate tickets — one per sender
      const ticketCount = await countTicketsBySubject(db, subject);
      expect(ticketCount).toBe(2);
    });

    test("email from the same sender with a different subject creates a new ticket", async ({
      request,
    }) => {
      const subject1 = `Same sender different subject A ${Date.now()}`;
      const subject2 = `Same sender different subject B ${Date.now()}`;

      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: subject1, body: "First issue." },
      });

      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: subject2, body: "Unrelated second issue." },
      });

      // Each subject produces its own ticket
      const count1 = await countTicketsBySubject(db, subject1);
      const count2 = await countTicketsBySubject(db, subject2);
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    test("ambiguous match (two tickets with same sender+subject) creates a new ticket", async ({
      request,
    }) => {
      const subject = `Ambiguous match test ${Date.now()}`;

      // Create two tickets with the same sender+subject by seeding them both
      // as initial emails (not replies), simulating a duplicated-ticket scenario.
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject, body: "First occurrence." },
      });

      // Close the first one so it doesn't block the second seed from creating a ticket.
      const firstTicket = await findTicketBySubject(db, subject);
      expect(firstTicket).not.toBeNull();
      await setTicketStatus(db, firstTicket!.id as number, "closed");

      // Second ticket with same subject (first is closed so this creates a new one)
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject, body: "Second occurrence." },
      });

      // Reopen both so the lookup sees two non-closed candidates
      const secondTicket = await findTicketBySubject(db, subject);
      await setTicketStatus(db, firstTicket!.id as number, "open");
      expect(secondTicket!.id).not.toBe(firstTicket!.id); // confirm two distinct tickets

      // Now a third email arrives — two non-closed tickets match, so ambiguity → new ticket
      await request.post(WEBHOOK_URL, {
        multipart: { from: "customer@example.com", subject: `Re: ${subject}`, body: "Which thread is this?" },
      });

      const ticketCount = await countTicketsBySubject(db, subject);
      expect(ticketCount).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Subject normalization
  // -------------------------------------------------------------------------

  test.describe("Subject normalization", () => {
    test("Re: prefix is stripped before saving the ticket", async ({
      request,
    }) => {
      const normalizedSubject = `Original subject ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: `Re: ${normalizedSubject}`,
          body: "Reply body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, normalizedSubject);
      expect(ticket).not.toBeNull();
    });

    test("Fwd: prefix is stripped before saving the ticket", async ({
      request,
    }) => {
      const normalizedSubject = `Original subject ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: `Fwd: ${normalizedSubject}`,
          body: "Forwarded body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, normalizedSubject);
      expect(ticket).not.toBeNull();
    });

    test("Fw: prefix is stripped before saving the ticket", async ({
      request,
    }) => {
      const normalizedSubject = `Original subject ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: `Fw: ${normalizedSubject}`,
          body: "Forwarded body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, normalizedSubject);
      expect(ticket).not.toBeNull();
    });

    test("prefix stripping is case-insensitive (RE: FWD: is fully stripped)", async ({
      request,
    }) => {
      const normalizedSubject = `Ticket title ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: `RE: FWD: ${normalizedSubject}`,
          body: "Case insensitive body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, normalizedSubject);
      expect(ticket).not.toBeNull();
    });

    test("nested prefixes are all stripped (Re: Fwd: Re: is fully collapsed)", async ({
      request,
    }) => {
      const normalizedSubject = `Deep thread ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: `Re: Fwd: Re: ${normalizedSubject}`,
          body: "Deep thread body.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, normalizedSubject);
      expect(ticket).not.toBeNull();
    });

    test("subject with no prefix is stored unchanged", async ({ request }) => {
      const plainSubject = `Plain subject ${Date.now()}`;

      const response = await request.post(WEBHOOK_URL, {
        multipart: {
          from: "sender@example.com",
          subject: plainSubject,
          body: "No prefix to strip.",
        },
      });

      expect(response.status()).toBe(200);

      const ticket = await findTicketBySubject(db, plainSubject);
      expect(ticket).not.toBeNull();
    });
  });
});
