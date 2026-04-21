---
name: Dashboard stats test patterns
description: Patterns for testing the /api/stats endpoint and HomePage stat cards, including DB seeding, skeleton detection, and error-state interception
type: project
---

## Stat card DOM traversal

`StatCard` renders: `<Card> > <CardHeader> > <CardTitle>text</CardTitle>` and `<Card> > <CardContent> > <p>value</p>`.

To scope assertions to a single card by title and then find its value:

```ts
const card = page.getByText("Total Tickets").locator("../.."); // CardTitle → CardHeader → Card
await expect(card.getByText("0", { exact: true })).toBeVisible();
```

Use `exact: true` for numeric values like `"0"` to avoid matching `"0%"` in adjacent cards.

## Skeleton detection

The local shadcn `Skeleton` component renders as `<div class="animate-pulse rounded-md bg-muted">` — it has no semantic role or `data-slot` attribute. Use:

```ts
const skeleton = page.locator(".animate-pulse").first();
await expect(skeleton).toBeVisible();
```

## Gating a request to assert loading state

Use a Promise gate to block the route handler until after assertions:

```ts
let resolveRequest!: () => void;
const requestHeld = new Promise<void>((resolve) => { resolveRequest = resolve; });

await page.route("**/api/stats", async (route) => {
  await requestHeld;
  await route.continue();
});

// navigate / act
await expect(page).toHaveURL("/");
await expect(page.locator(".animate-pulse").first()).toBeVisible();
resolveRequest(); // unblock
await expect(page.getByText("Total Tickets")).toBeVisible(); // data arrived
```

## Error state testing

Intercept with `route.fulfill()` before navigating:

```ts
await page.route("**/api/stats", (route) => {
  route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "..." }) });
});
await loginAsAdmin(page);
await expect(page.getByText("Failed to load dashboard stats.")).toBeVisible();
```

## Authenticated direct server requests (stat verification)

`page.request` doesn't share browser cookies. Extract them and pass manually:

```ts
async function getCookieHeader(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

const r = await page.request.get("http://localhost:5151/api/stats", {
  headers: { Cookie: await getCookieHeader(page) },
});
const stats = await r.json();
```

## DB helpers for stats seeding

```ts
async function setResolvedByAi(client, id, value) {
  await client.query(`UPDATE "Ticket" SET "resolvedByAi" = $1 WHERE id = $2`, [value, id]);
}

async function setResolutionTimeOffset(client, id, offsetMs) {
  await client.query(
    `UPDATE "Ticket" SET "updatedAt" = "createdAt" + ($1 * interval '1 millisecond') WHERE id = $2`,
    [offsetMs, id]
  );
}
```

## TanStack Query cache invalidation in tests

Default `staleTime` is 0. Navigate away and back to force a re-fetch:

```ts
await page.goto("/tickets");
await page.goto("/");
```

**Why:** TanStack Query marks data stale on unmount; remounting the route triggers a background refetch. This is more reliable than `page.reload()` which can restore cached state.
