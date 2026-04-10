# Playwright E2E Writer — Memory Index

- [Auth fixture pattern](auth_fixture_pattern.md) — Admin seeded by global-setup.ts; agent created via execSync + create-agent.ts helper in beforeAll
- [Login form locators](login_form_locators.md) — Reliable selectors for the LoginPage shadcn/ui form
- [Better Auth sign-in behavior](better_auth_signin_behavior.md) — Error surfaces as role="alert" para; short password rejected server-side; disableSignUp returns 403
- [Route protection behavior](route_protection_behavior.md) — ProtectedRoute redirects to /login; AdminRoute redirects agent to /
- [Agent creation helper](agent_creation_helper.md) — e2e/helpers/create-agent.ts mirrors seed.ts using Prisma + hashPassword
- [User management test patterns](user_management_patterns.md) — API seeding in beforeEach, dialog scoping, row targeting by email, admin row has no Delete button
- [Webhook testing patterns](webhook_testing_patterns.md) — multipart/form-data via request fixture, direct DB verify, SENDGRID_WEBHOOK_PUBLIC_KEY placeholder required
- [Ticket list test patterns](ticket_list_patterns.md) — Seed via page.request webhook, row targeting by subject regex, sort order via boundingBox().y, From field two-element rendering
- [Ticket detail and assignment patterns](ticket_detail_patterns.md) — ID resolution via GET /api/tickets search, Radix combobox, icon-only back button, category via direct DB update
