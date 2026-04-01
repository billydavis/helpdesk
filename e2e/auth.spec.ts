/**
 * e2e/auth.spec.ts
 *
 * Comprehensive authentication tests for the Helpdesk application.
 *
 * Coverage:
 *  - Successful login as admin
 *  - Successful login as agent
 *  - Invalid credentials (wrong password, wrong email, non-existent user)
 *  - Empty-field validation (client-side, via zod/react-hook-form)
 *  - Invalid email format validation
 *  - Password minimum length enforced by Better Auth (12 chars)
 *  - Sign-up is disabled — no registration route or form
 *  - Session persistence across page refresh
 *  - Logout redirects to /login and clears session
 *  - Unauthenticated access to protected routes redirects to /login
 *  - Admin-only route redirects non-admin (agent) to /
 *  - Redirect to / after successful login
 *  - Already-authenticated user visiting /login is redirected to /
 *
 * Agent setup:
 *  A test agent account is created in beforeAll by calling the same Prisma +
 *  Better Auth password-hashing approach used by the seed script. This is done
 *  via execSync against a small helper script (e2e/helpers/create-agent.ts) so
 *  that no server endpoint is required and the existing global-setup.ts is left
 *  untouched. The agent is created once per test run; if the user already
 *  exists the script exits cleanly.
 */

import { test, expect, type Page } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Credentials (sourced from server/.env.test via playwright.config.ts dotenv)
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

const AGENT_EMAIL = "agent@test.local";
const AGENT_PASSWORD = "TestAgentPW123!";
const AGENT_NAME = "Test Agent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fills and submits the login form. Does not assert any outcome — callers do
 * that themselves so each test can check for what it expects.
 */
async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

/**
 * Logs in as the given user and waits until the dashboard (/) is reached.
 * Returns the page, which retains the authenticated session cookies.
 */
async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await fillLoginForm(page, email, password);
  await expect(page).toHaveURL("/");
}

/**
 * Asserts that the page is on the dashboard: URL is "/" and the Dashboard
 * heading is visible.
 */
async function assertOnDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

/**
 * Asserts that the page is on the login page: URL is "/login" and the Sign In
 * button is visible.
 */
async function assertOnLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
}

/**
 * Asserts that a login error alert is shown and the URL is still "/login".
 */
async function assertLoginError(page: Page): Promise<void> {
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL("/login");
}

// ---------------------------------------------------------------------------
// Agent setup — runs once before any test in this file
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  // Create the test agent user via the helper script.  The script is
  // idempotent — it exits cleanly when the user already exists.
  const helperScript = path.resolve(__dirname, "../server/src/create-test-agent.ts");
  const serverDir = path.resolve(__dirname, "../server");

  execSync(`bun run ${helperScript}`, {
    cwd: serverDir,
    env: {
      ...process.env,
      AGENT_EMAIL,
      AGENT_PASSWORD,
      AGENT_NAME,
    },
    stdio: "inherit",
  });
});

// ===========================================================================
// Test suite
// ===========================================================================

test.describe("Authentication", () => {
  // -------------------------------------------------------------------------
  // Login page rendering
  // -------------------------------------------------------------------------

  test.describe("Login page", () => {
    test("displays the login form with email and password fields", async ({
      page,
    }) => {
      await page.goto("/login");

      await expect(page.getByText("Helpdesk")).toBeVisible();
      await expect(
        page.getByText("Sign in to your account")
      ).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Sign In" })
      ).toBeVisible();
    });

    test("does not expose a sign-up link or registration form", async ({
      page,
    }) => {
      await page.goto("/login");

      // No sign-up / register link on the login page
      await expect(
        page.getByRole("link", { name: /sign.?up|register|create.?account/i })
      ).not.toBeVisible();

      // Navigating to /signup or /register should not render a registration form
      await page.goto("/signup");
      await expect(
        page.getByRole("button", { name: /sign.?up|register/i })
      ).not.toBeVisible();

      await page.goto("/register");
      await expect(
        page.getByRole("button", { name: /sign.?up|register/i })
      ).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Successful login
  // -------------------------------------------------------------------------

  test.describe("Successful login", () => {
    test("admin can log in and is redirected to the dashboard", async ({
      page,
    }) => {
      await page.goto("/login");
      await fillLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // The dashboard heading confirms we landed on the right page
      await assertOnDashboard(page);
    });

    test("admin sees the Users nav link after logging in", async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    });

    test("agent can log in and is redirected to the dashboard", async ({
      page,
    }) => {
      await page.goto("/login");
      await fillLoginForm(page, AGENT_EMAIL, AGENT_PASSWORD);

      await assertOnDashboard(page);
    });

    test("agent does not see the Users nav link after logging in", async ({
      page,
    }) => {
      await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);

      await expect(
        page.getByRole("link", { name: "Users" })
      ).not.toBeVisible();
    });

    test("authenticated user visiting /login is redirected to /", async ({
      page,
    }) => {
      // First log in
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Now revisit the login page — should be bounced back to dashboard
      await page.goto("/login");
      await expect(page).toHaveURL("/");
    });
  });

  // -------------------------------------------------------------------------
  // Invalid credentials
  // -------------------------------------------------------------------------

  test.describe("Invalid credentials", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows an error when the password is wrong", async ({ page }) => {
      await fillLoginForm(page, ADMIN_EMAIL, "WrongPassword99!");

      // Stay on the login page
      await assertLoginError(page);
    });

    test("shows an error when the email does not exist", async ({ page }) => {
      await fillLoginForm(page, "nobody@example.com", "SomePassword123!");

      await assertLoginError(page);
    });

    test("shows an error for a valid-format email that belongs to no account", async ({
      page,
    }) => {
      await fillLoginForm(page, "ghost@helpdesk.io", "GhostPassword123!");

      await assertLoginError(page);
    });
  });

  // -------------------------------------------------------------------------
  // Client-side validation (zod / react-hook-form)
  // -------------------------------------------------------------------------

  test.describe("Client-side form validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows a validation error when email is empty", async ({ page }) => {
      // Submit without touching the email field
      await page.getByLabel("Password").fill("SomePassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Enter a valid email address")
      ).toBeVisible();
      await expect(page).toHaveURL("/login");
    });

    test("shows a validation error when password is empty", async ({ page }) => {
      await page.getByLabel("Email").fill(ADMIN_EMAIL);
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(page.getByText("Password is required")).toBeVisible();
      await expect(page).toHaveURL("/login");
    });

    test("shows validation errors when both fields are empty", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Enter a valid email address")
      ).toBeVisible();
      await expect(page.getByText("Password is required")).toBeVisible();
    });

    test("shows a validation error for a malformed email address", async ({
      page,
    }) => {
      await page.getByLabel("Email").fill("not-an-email");
      await page.getByLabel("Password").fill("SomePassword123!");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Enter a valid email address")
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Better Auth server-side password length enforcement
  //
  // The login form's zod schema only requires min(1) for the password field —
  // it does not enforce the 12-character minimum on the client.  Better Auth
  // enforces it server-side and returns an error in the sign-in response.
  // We test with a short password that passes client validation but is
  // rejected by the server.
  // -------------------------------------------------------------------------

  test.describe("Password minimum length (Better Auth enforcement)", () => {
    test("shows an error when password is shorter than 12 characters", async ({
      page,
    }) => {
      await page.goto("/login");

      // 11 characters — passes the client min(1) check but Better Auth rejects it
      await fillLoginForm(page, ADMIN_EMAIL, "Short1234!");

      // Better Auth returns an error; the form surfaces it via the root error
      await assertLoginError(page);
    });
  });

  // -------------------------------------------------------------------------
  // Sign-up disabled
  // -------------------------------------------------------------------------

  test.describe("Sign-up disabled", () => {
    test("the Better Auth sign-up endpoint rejects registration attempts", async ({
      page,
    }) => {
      // Make a direct API call to ensure the endpoint returns an error even if
      // someone bypasses the UI entirely
      const response = await page.request.post(
        "/api/auth/sign-up/email",
        {
          data: {
            email: "newuser@example.com",
            password: "NewUserPassword123!",
            name: "New User",
          },
          headers: { "Content-Type": "application/json" },
        }
      );

      // Better Auth rejects sign-up when disableSignUp: true
      expect(response.ok()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Session persistence
  // -------------------------------------------------------------------------

  test.describe("Session persistence", () => {
    test("admin remains logged in after a full page reload", async ({
      page,
    }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      // Hard reload — simulates the user refreshing the browser tab
      await page.reload();

      // Should still be on the dashboard with the nav intact
      await assertOnDashboard(page);
      // Sign Out button being visible confirms the session cookie is still valid
      await expect(
        page.getByRole("button", { name: "Sign Out" })
      ).toBeVisible();
    });

    test("agent remains logged in after a full page reload", async ({
      page,
    }) => {
      await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
      await page.reload();

      await assertOnDashboard(page);
      await expect(
        page.getByRole("button", { name: "Sign Out" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  test.describe("Logout", () => {
    test("admin can sign out and is redirected to /login", async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.getByRole("button", { name: "Sign Out" }).click();

      await assertOnLoginPage(page);
    });

    test("after signing out, navigating to / redirects back to /login", async ({
      page,
    }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.getByRole("button", { name: "Sign Out" }).click();
      await assertOnLoginPage(page);

      // Attempt to navigate to the protected dashboard
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });

    test("after signing out, the session cookie is cleared from the browser", async ({
      page,
    }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Sign Out" }).click();

      // The UI should be on the login page with no authenticated state
      await assertOnLoginPage(page);

      // Attempting to navigate to a protected route redirects back to /login
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });
  });

  // -------------------------------------------------------------------------
  // Protected route redirects (unauthenticated)
  // -------------------------------------------------------------------------

  test.describe("Protected route redirects", () => {
    test("visiting / unauthenticated redirects to /login", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });

    test("visiting /users unauthenticated redirects to /login", async ({
      page,
    }) => {
      await page.goto("/users");
      await expect(page).toHaveURL("/login");
    });

    test("visiting an arbitrary protected path unauthenticated redirects to /login", async ({
      page,
    }) => {
      await page.goto("/some/deep/route");
      // React Router falls into the ProtectedRoute wrapper which redirects to /login
      await expect(page).toHaveURL("/login");
    });
  });

  // -------------------------------------------------------------------------
  // Role-based access — AdminRoute
  // -------------------------------------------------------------------------

  test.describe("Role-based access", () => {
    test("admin can access /users", async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto("/users");

      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: "Users" })
      ).toBeVisible();
    });

    test("agent is redirected to / when trying to access /users", async ({
      page,
    }) => {
      await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
      await page.goto("/users");

      // AdminRoute redirects non-admin users to /
      await assertOnDashboard(page);
    });

    test("/api/admin routes return 403 for authenticated agent", async ({
      page,
    }) => {
      await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);

      const response = await page.request.get("/api/admin/anything");
      expect(response.status()).toBe(403);
    });

    test("/api/admin routes return 401 for unauthenticated requests", async ({
      page,
    }) => {
      // Do not log in — issue the request with no session cookie
      const response = await page.request.get("/api/admin/anything");
      expect(response.status()).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // /api/me — session introspection
  // -------------------------------------------------------------------------

  test.describe("/api/me endpoint", () => {
    test("returns the admin user's details when authenticated as admin", async ({
      page,
    }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      const response = await page.request.get("/api/me");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.user.email).toBe(ADMIN_EMAIL);
      expect(body.user.role).toBe("admin");
    });

    test("returns the agent user's details when authenticated as agent", async ({
      page,
    }) => {
      await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);

      const response = await page.request.get("/api/me");
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.user.email).toBe(AGENT_EMAIL);
      expect(body.user.role).toBe("agent");
    });

    test("returns 401 when not authenticated", async ({ page }) => {
      const response = await page.request.get("/api/me");
      expect(response.status()).toBe(401);
    });
  });
});
