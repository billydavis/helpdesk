---
name: User management test patterns
description: Locator strategies, API seeding approach, and dialog interaction patterns for user CRUD e2e tests
type: feedback
---

Use `page.request.post("/api/admin/users", { data, headers })` inside a logged-in page context to seed users via the API in `beforeEach` — keeps each test independent without coupling to the UI create flow.

For Radix/shadcn Dialog interactions, always scope locators to `page.getByRole("dialog")` before querying labels or buttons — avoids ambiguity when multiple dialogs could be mounted in the DOM.

To target a specific table row, use `page.getByRole("row", { name: /email@domain/i })` — the accessible row name is built from cell text including the email, which is unique enough to be a reliable anchor.

Edit dialog password label renders as "New Password (optional)" — use `getByLabel("New Password")` or a regex if matching by label. The create dialog password label is plain "Password".

The admin row in the UsersTable suppresses the Delete button (role !== admin check in JSX). Test this boundary by asserting the Delete button is not visible on the admin row.

`createUserViaApi` must be called after login because the `/api/admin/users` endpoint requires an authenticated admin session — the page context carries the session cookie.

**Why:** Established during users.spec.ts authoring — these patterns prevent flakiness from cross-test state and ambiguous locators.

**How to apply:** Any future test file covering user CRUD should follow these patterns. Reuse `createUserViaApi` helper or lift it to a shared helpers file if more test files need it.
