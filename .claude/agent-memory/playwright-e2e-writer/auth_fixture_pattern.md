---
name: Auth fixture pattern
description: How admin and agent test users are set up for Playwright runs in this project
type: project
---

Admin user is seeded by `e2e/global-setup.ts` using credentials from `server/.env.test` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). The global setup drops and recreates the test database on every run, then runs Prisma migrations and the seed script.

No agent is seeded by default. The pattern established in `e2e/auth.spec.ts` is:
- A `test.beforeAll` calls `execSync("bun run <helperScript>", ...)` to run `e2e/helpers/create-agent.ts`.
- The helper mirrors `server/src/seed.ts` exactly (Prisma + `hashPassword` from `better-auth/crypto` + `generateId` from `better-auth`) and is idempotent.
- Agent credentials used across tests: `agent@test.local` / `TestAgentPW123!`
- Admin credentials: read from `process.env.SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (always available because `playwright.config.ts` loads `server/.env.test` via dotenv).

**Why:** No admin user-creation API endpoint exists yet; `disableSignUp: true` blocks the Better Auth sign-up route; the helper script bypasses both by writing directly to the database.

**How to apply:** When any test needs an agent user, import the `create-agent.ts` pattern. Do not add a server endpoint just for tests.
