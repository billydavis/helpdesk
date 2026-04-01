---
name: Agent creation helper
description: e2e/helpers/create-agent.ts — idempotent script to create a test agent user via Prisma
type: project
---

File: `e2e/helpers/create-agent.ts`

Creates an agent user by writing directly to the database using the same technique as `server/src/seed.ts`:
1. Dynamic-imports `PrismaClient` and `Role` from `server/src/generated/prisma/client`
2. Dynamic-imports `PrismaPg` from `@prisma/adapter-pg`
3. Dynamic-imports `hashPassword` from `better-auth/crypto` and `generateId` from `better-auth`
4. Creates both a `User` row (`role: Role.agent`) and an `Account` row (`providerId: "credential"`)

Environment variables it reads (all passed by the test runner via `execSync` env):
- `DATABASE_URL` — already in process.env from playwright.config.ts dotenv load
- `AGENT_EMAIL`
- `AGENT_PASSWORD` (must be >= 12 chars)
- `AGENT_NAME` (optional, defaults to "Test Agent")

The script resolves `serverSrc` relative to `__dirname` using `fileURLToPath(import.meta.url)` so it works regardless of the cwd passed to `execSync`.

It is idempotent: exits cleanly with a log message if the user already exists.

**Usage in tests:**
```ts
import { execSync } from "child_process";
import path from "path";

test.beforeAll(async () => {
  execSync(`bun run ${path.resolve(__dirname, "helpers/create-agent.ts")}`, {
    cwd: path.resolve(__dirname, "../server"),
    env: { ...process.env, AGENT_EMAIL, AGENT_PASSWORD, AGENT_NAME },
    stdio: "inherit",
  });
});
```
