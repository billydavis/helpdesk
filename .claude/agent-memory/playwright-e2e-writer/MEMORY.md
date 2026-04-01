# Playwright E2E Writer — Memory Index

- [Auth fixture pattern](auth_fixture_pattern.md) — Admin seeded by global-setup.ts; agent created via execSync + create-agent.ts helper in beforeAll
- [Login form locators](login_form_locators.md) — Reliable selectors for the LoginPage shadcn/ui form
- [Better Auth sign-in behavior](better_auth_signin_behavior.md) — Error surfaces as role="alert" para; short password rejected server-side; disableSignUp returns 403
- [Route protection behavior](route_protection_behavior.md) — ProtectedRoute redirects to /login; AdminRoute redirects agent to /
- [Agent creation helper](agent_creation_helper.md) — e2e/helpers/create-agent.ts mirrors seed.ts using Prisma + hashPassword
