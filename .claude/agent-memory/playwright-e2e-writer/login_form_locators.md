---
name: Login form locators
description: Reliable Playwright locators for the LoginPage shadcn/ui form elements
type: project
---

The LoginPage (`client/src/pages/LoginPage.tsx`) renders a shadcn/ui Card with a standard email/password form. Labels use `htmlFor` pointing to input `id`s, so `getByLabel` works cleanly.

| Element | Locator |
|---|---|
| Email input | `page.getByLabel("Email")` |
| Password input | `page.getByLabel("Password")` |
| Submit button | `page.getByRole("button", { name: "Sign In" })` |
| Page heading | `page.getByRole("heading", { name: "Helpdesk" })` |
| Subheading / description | `page.getByText("Sign in to your account")` |
| Client validation error (email) | `page.getByText("Enter a valid email address")` |
| Client validation error (password) | `page.getByText("Password is required")` |
| Server error (root error) | `page.getByRole("alert")` — rendered as `<p role="alert">` by react-hook-form `errors.root` |

Post-login nav elements (in Layout.tsx):
| Element | Locator |
|---|---|
| Sign Out button | `page.getByRole("button", { name: "Sign Out" })` |
| Users nav link (admin only) | `page.getByRole("link", { name: "Users" })` |
| Dashboard heading | `page.getByRole("heading", { name: "Dashboard" })` |
