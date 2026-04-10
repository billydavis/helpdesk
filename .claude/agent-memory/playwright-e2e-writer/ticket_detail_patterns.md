---
name: Ticket detail and assignment test patterns
description: Patterns for testing the ticket detail page and agent assignment dropdown, including ticket ID resolution and Radix Select interaction
type: project
---

## Ticket ID resolution after webhook seed

The email webhook handler (`server/src/routes/email.ts`) returns `res.sendStatus(200)` with no body — there is no ticket ID in the response. To get the newly created ticket's ID after seeding, immediately query `GET /api/tickets` with `{ search: subject, pageSize: "5" }` and find the matching ticket by exact subject.

```ts
const listResponse = await request.get("/api/tickets", {
  params: { search: opts.subject, pageSize: "5" },
});
const ticket = listBody.tickets.find((t) => t.subject === opts.subject);
return ticket.id;
```

## Radix UI Select (shadcn) — combobox locator

The `SelectTrigger` renders as a `role="combobox"` button. When the trigger has no explicit `aria-label` or `aria-labelledby`, use `page.getByRole("combobox")` (unique on the page).

After clicking the trigger, options appear in a Radix portal — use `page.getByRole("option", { name: ... })` to find them globally (not scoped to the trigger).

To close without selecting: `await page.keyboard.press("Escape")`.

## Back button (icon-only, no aria-label)

The back button in `TicketDetailPage` is a ghost icon-only Button with no text label. Locate it via its parent flex row (the div containing the `<h1>`):

```ts
const headerRow = page.getByRole("heading", { name: "Back to Tickets" }).locator("..");
await headerRow.getByRole("button").click();
```

## Pre-assigning a ticket via API

Use `page.request.patch("/api/tickets/:id", { data: { assignedToId: agent.id } })` to pre-assign a ticket without going through the UI. Get the agent ID first via `GET /api/agents`.

## Category badge testing

The email webhook does not set a category (it's set by the AI pipeline in production). To test the category badge, update the DB directly using the `pg` Client:

```ts
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(`UPDATE "Ticket" SET category = 'technical_question' WHERE id = $1`, [ticketId]);
await db.end();
```

## "Assigned to" label

The "Assigned to" text is rendered as a `<p>` element in the metadata grid, not as an accessible label connected to the Select trigger. Assert it with `page.getByText("Assigned to", { exact: true })` separately from the combobox assertion.

## Multiple comboboxes on the same page

`TicketDetailPage` renders three `role="combobox"` triggers (Status, Category, Assigned to) inside a `grid grid-cols-3` div. Using bare `page.getByRole("combobox")` will be ambiguous. Scope each lookup to its section via the label `<p>` sibling's parent `<div>`:

```ts
const statusSection = page.getByText("Status", { exact: true }).locator("..");
const statusCombobox = statusSection.getByRole("combobox");

const categorySection = page.getByText("Category", { exact: true }).locator("..");
const categoryCombobox = categorySection.getByRole("combobox");
```

After clicking any combobox trigger, `page.getByRole("option", { name })` finds options globally (Radix portal) — no scoping needed for the option list itself.

## Changing status/category via API in test setup

Use `page.request.patch("/api/tickets/:id", { data: { status: "closed" }, headers: { "Content-Type": "application/json" } })` to pre-set status or category without going through the UI. The PATCH endpoint accepts any subset of `{ status, category, assignedToId }`.
