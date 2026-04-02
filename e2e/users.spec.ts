/**
 * e2e/users.spec.ts
 *
 * Happy-path e2e tests for the user management feature.
 *
 * Coverage:
 *  - List users: navigate to /users, verify table columns and existing admin row
 *  - Create user: open dialog, fill form, submit, verify new row appears in table
 *  - Edit user: click Edit button for a user, update name + email, save, verify changes
 *  - Delete user: click Delete button for a user, confirm in dialog, verify row removed
 *
 * Setup:
 *  - Admin logs in fresh per test (no storageState file — consistent with auth.spec.ts
 *    pattern used in this repo which also does not use storageState files).
 *  - A "target" agent user is created via the create-test-agent helper in beforeAll so
 *    that the edit and delete tests always have a known user to operate on.
 *  - Each test that mutates a user creates its own uniquely-named user via the API
 *    directly in beforeEach, avoiding cross-test state bleed.
 */

import { test, expect, type Page } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

// ---------------------------------------------------------------------------
// Credentials (sourced from server/.env.test via playwright.config.ts dotenv)
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "TestAdminPW123!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Logs in as admin and waits for the dashboard to load.
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Navigates to the Users page and waits for the table heading to be visible.
 */
async function goToUsersPage(page: Page): Promise<void> {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

/**
 * Creates a user directly via the API (using the authenticated page context)
 * so that tests which need a pre-existing user don't depend on the UI create flow.
 */
async function createUserViaApi(
  page: Page,
  user: { name: string; email: string; password: string }
): Promise<void> {
  const response = await page.request.post("/api/admin/users", {
    data: user,
    headers: { "Content-Type": "application/json" },
  });
  expect(response.status()).toBe(201);
}

/**
 * Spawns the create-test-agent helper script to ensure the given user exists.
 * The script is idempotent — exits cleanly if the user already exists.
 */
function ensureAgentExists(email: string, password: string, name: string): void {
  const helperScript = path.resolve(
    __dirname,
    "../server/src/create-test-agent.ts"
  );
  const serverDir = path.resolve(__dirname, "../server");

  execSync(`bun run ${helperScript}`, {
    cwd: serverDir,
    env: {
      ...process.env,
      AGENT_EMAIL: email,
      AGENT_PASSWORD: password,
      AGENT_NAME: name,
    },
    stdio: "inherit",
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("User management", () => {
  // -------------------------------------------------------------------------
  // List users
  // -------------------------------------------------------------------------

  test.describe("List users", () => {
    test("admin can navigate to the Users page via the nav link", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      await page.getByRole("link", { name: "Users" }).click();

      await expect(page).toHaveURL("/users");
      await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    });

    test("Users page displays the table with expected column headers", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      // The table should have Name, Email, Role, Created column headers
      await expect(
        page.getByRole("columnheader", { name: "Name" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Email" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Role" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Created" })
      ).toBeVisible();
    });

    test("Users page shows the seeded admin user in the table", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      // The admin user seeded by global-setup should appear in the table
      await expect(page.getByRole("cell", { name: ADMIN_EMAIL })).toBeVisible();
    });

    test("Users page shows a New User button", async ({ page }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      await expect(
        page.getByRole("button", { name: "New User" })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Create user
  // -------------------------------------------------------------------------

  test.describe("Create user", () => {
    test("admin can open the Create User dialog", async ({ page }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      await page.getByRole("button", { name: "New User" }).click();

      // The dialog should appear with the correct title and fields
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Create User" })
      ).toBeVisible();
      await expect(dialog.getByLabel("Name")).toBeVisible();
      await expect(dialog.getByLabel("Email")).toBeVisible();
      await expect(dialog.getByLabel("Password")).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Create User" })
      ).toBeVisible();
    });

    test("admin can create a new agent user and see them in the table", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      await page.getByRole("button", { name: "New User" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("Alice New");
      await dialog.getByLabel("Email").fill("alice.new@test.local");
      await dialog.getByLabel("Password").fill("AlicePassword123!");
      await dialog.getByRole("button", { name: "Create User" }).click();

      // Dialog should close after successful creation
      await expect(dialog).not.toBeVisible();

      // The new user should appear in the table
      await expect(
        page.getByRole("cell", { name: "Alice New" })
      ).toBeVisible();
      await expect(
        page.getByRole("cell", { name: "alice.new@test.local" })
      ).toBeVisible();
    });

    test("newly created user has the agent role badge", async ({ page }) => {
      await loginAsAdmin(page);
      await goToUsersPage(page);

      await page.getByRole("button", { name: "New User" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("Bob Badge");
      await dialog.getByLabel("Email").fill("bob.badge@test.local");
      await dialog.getByLabel("Password").fill("BobPassword123!");
      await dialog.getByRole("button", { name: "Create User" }).click();

      await expect(dialog).not.toBeVisible();

      // Find the row for the newly created user and check the role badge
      const row = page.getByRole("row", { name: /bob\.badge@test\.local/i });
      await expect(row.getByText("agent")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Edit user
  // -------------------------------------------------------------------------

  test.describe("Edit user", () => {
    let editEmail: string;

    // Create a fresh user via the API before each edit test so tests are independent
    test.beforeEach(async ({ page }) => {
      editEmail = `edit-target-${Date.now()}@test.local`;
      await loginAsAdmin(page);
      await createUserViaApi(page, {
        name: "Edit Target",
        email: editEmail,
        password: "EditTarget123!",
      });
    });

    test("admin can open the Edit User dialog for a user", async ({ page }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(editEmail, "i") });
      await row.getByRole("button", { name: "Edit" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Edit User" })
      ).toBeVisible();
    });

    test("Edit dialog is pre-populated with the user's current name and email", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(editEmail, "i") });
      await row.getByRole("button", { name: "Edit" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Name")).toHaveValue("Edit Target");
      await expect(dialog.getByLabel("Email")).toHaveValue(editEmail);
    });

    test("admin can update a user's name and see the change reflected in the table", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(editEmail, "i") });
      await row.getByRole("button", { name: "Edit" }).click();

      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").clear();
      await dialog.getByLabel("Name").fill("Edit Target Renamed");

      await dialog.getByRole("button", { name: "Save Changes" }).click();

      await expect(dialog).not.toBeVisible();

      await expect(
        page.getByRole("cell", { name: "Edit Target Renamed" })
      ).toBeVisible();
      await expect(
        page.getByRole("cell", { name: editEmail })
      ).toBeVisible();
    });

    test("admin can update a user's email and see the change reflected in the table", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(editEmail, "i") });
      await row.getByRole("button", { name: "Edit" }).click();

      const dialog = page.getByRole("dialog");

      const updatedEmail = editEmail.replace("@", "-updated@");
      await dialog.getByLabel("Email").clear();
      await dialog.getByLabel("Email").fill(updatedEmail);

      await dialog.getByRole("button", { name: "Save Changes" }).click();

      await expect(dialog).not.toBeVisible();

      await expect(
        page.getByRole("cell", { name: updatedEmail })
      ).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Delete user
  // -------------------------------------------------------------------------

  test.describe("Delete user", () => {
    let deleteEmail: string;

    // Create a fresh user via the API before each delete test so tests are independent
    test.beforeEach(async ({ page }) => {
      deleteEmail = `delete-target-${Date.now()}@test.local`;
      await loginAsAdmin(page);
      await createUserViaApi(page, {
        name: "Delete Target",
        email: deleteEmail,
        password: "DeleteTarget123!",
      });
    });

    test("admin can open the Delete User confirmation dialog", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(deleteEmail, "i") });
      await row.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Delete User" })
      ).toBeVisible();
      // The dialog should name the user being deleted
      await expect(dialog.getByText("Delete Target")).toBeVisible();
      // Both Cancel and Delete buttons should be present
      await expect(
        dialog.getByRole("button", { name: "Cancel" })
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Delete" })
      ).toBeVisible();
    });

    test("admin can delete a user and the row is removed from the table", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(deleteEmail, "i") });
      await row.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Delete" }).click();

      // Dialog closes after successful deletion
      await expect(dialog).not.toBeVisible();

      // The deleted user's email should no longer appear in the table
      await expect(
        page.getByRole("cell", { name: deleteEmail })
      ).not.toBeVisible();
    });

    test("cancelling the Delete dialog leaves the user in the table", async ({
      page,
    }) => {
      await goToUsersPage(page);

      const row = page.getByRole("row", { name: new RegExp(deleteEmail, "i") });
      await row.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Cancel" }).click();

      // Dialog closes
      await expect(dialog).not.toBeVisible();

      // The user should still be in the table
      await expect(
        page.getByRole("cell", { name: deleteEmail })
      ).toBeVisible();
    });

    test("the admin user row does not have a Delete button", async ({
      page,
    }) => {
      await goToUsersPage(page);

      // The admin row should have an Edit button but no Delete button —
      // the table suppresses Delete for role === admin
      const adminRow = page.getByRole("row", { name: new RegExp(ADMIN_EMAIL, "i") });
      await expect(adminRow.getByRole("button", { name: "Edit" })).toBeVisible();
      await expect(
        adminRow.getByRole("button", { name: "Delete" })
      ).not.toBeVisible();
    });
  });
});
