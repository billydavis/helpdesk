---
name: Summarize feature test patterns
description: Patterns for testing async AI-call features with page.route() interception, loading state assertions, and controlled response sequences
type: feedback
---

For features that trigger an AI/external API call and render state transitions (idle → loading → success/error), use `page.route()` interception throughout rather than hitting the real endpoint.

**Loading state pattern** — To assert a disabled button + spinner before the response lands, hold the route open with a manually resolved Promise:

```ts
let resolveRoute!: () => void;
const routeReleased = new Promise<void>((resolve) => { resolveRoute = resolve; });

await page.route(`**/api/tickets/${id}/summarize`, async (route) => {
  await routeReleased;
  await route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ summary: "..." }) });
});

await page.getByRole("button", { name: "Summarize" }).click();
await expect(button).toBeDisabled();
await expect(button.locator("svg.animate-spin")).toBeVisible();
resolveRoute();
await expect(button).toBeEnabled();
```

**Controlled multi-call sequences** — Use a `callCount` counter inside the route handler and an array of responses to test regeneration without making real network calls:

```ts
let callCount = 0;
const summaries = ["First summary.", "Regenerated summary."];
await page.route(`**/api/tickets/${id}/summarize`, async (route) => {
  const body = summaries[callCount++];
  await route.fulfill({ ..., body: JSON.stringify({ summary: body }) });
});
```

**Lucide spinner locator** — Lucide renders icons as SVG. The Loader2 spinner has the `animate-spin` Tailwind class applied directly on the `<svg>` element:
`button.locator("svg.animate-spin")`

**Why:** The summarize endpoint calls an external AI service; intercepting it keeps tests fast, deterministic, and offline-capable while still exercising the full component state machine.

**How to apply:** Any feature that wraps an async AI/external call with isLoading/error/success state should follow this interception-first approach. Do not try to make real AI calls in e2e tests.
