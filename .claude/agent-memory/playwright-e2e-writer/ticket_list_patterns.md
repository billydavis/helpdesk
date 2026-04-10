---
name: Ticket list test patterns
description: Patterns for testing TicketsPage/TicketsTable — seeding via webhook, row targeting, sort order verification, From field display
type: feedback
---

Use `page.request.post(WEBHOOK_URL, { headers: { "x-webhook-secret": ... }, multipart: { from, subject, text } })` to seed tickets in browser-context tests (page.request carries the auth session cookies). WEBHOOK_URL is `http://localhost:5151/api/webhooks/email`.

To verify sort order (newest first), seed two tickets sequentially then compare `boundingBox().y` values — the newer ticket should have a smaller Y value (higher on the page).

The From column in TicketsTable renders two separate inline elements when fromName is set: a `<span>` with the name and a `<span>` with `(email@example.com)`. Use `row.getByText("Jane Smith")` and `row.getByText("(jane@example.com)")` to assert both are present.

Empty state text is "No tickets yet." — rendered as a `<TableCell>` spanning all 6 columns. The global-setup truncates the Ticket table each run, so an empty-state test placed before any ticket-seeding tests in the same file will reliably see a clean table (workers: 1, sequential execution).

Target a specific ticket row with `page.getByRole("row", { name: new RegExp(subject) })` — the subject appears in a `<TableCell>` which is part of the row's accessible name.

**Why:** TicketsTable renders a shadcn Table with Radix-based Badge for status. No portal or dialog is involved — standard role-based locators work throughout.

**How to apply:** Any time tests seed or assert tickets in the UI, follow this file's patterns for seeding, row targeting, and sort-order verification.
