---
name: Better Auth sign-in behavior
description: How Better Auth surfaces errors and enforces constraints relevant to test assertions
type: project
---

- **Error rendering:** When `authClient.signIn.email()` returns an error, LoginPage calls `setError("root", ...)`. React Hook Form renders this as `<p role="alert">` in the DOM. Use `page.getByRole("alert")` to assert server-side sign-in errors.

- **Password minimum length:** `minPasswordLength: 12` is set server-side in `server/src/auth.ts`. The client-side zod schema only checks `min(1)`, so a password of 1–11 characters passes client validation but is rejected by Better Auth. The error still surfaces via `role="alert"`.

- **Sign-up disabled:** `disableSignUp: true` is set in auth config. A `POST /api/auth/sign-up/email` returns HTTP **403**. There is no sign-up UI anywhere in the app.

- **Rate limiting:** `signInLimiter` and `authLimiter` are only applied when `NODE_ENV === "production"`. Tests run with `NODE_ENV=test`, so 429s will not occur — no need to handle them.

- **Session cookies:** Better Auth uses `helpdesk`-prefixed cookies (`advanced.cookiePrefix`). `cookieCache` is enabled with a 5-minute maxAge. Sessions expire after 24 hours.
