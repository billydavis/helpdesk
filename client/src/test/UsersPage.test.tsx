import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import UsersPage from "../pages/UsersPage";
import { renderWithProviders } from "./render";

const USERS = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent", createdAt: "2024-02-01T00:00:00.000Z" },
];

const server = setupServer(
  http.get("/api/admin/users", () => HttpResponse.json({ users: USERS })),
  http.post("/api/admin/users", () => HttpResponse.json({ success: true }, { status: 201 })),
  http.patch("/api/admin/users/:id", () => HttpResponse.json({ success: true })),
  http.delete("/api/admin/users/:id", () => HttpResponse.json({ success: true })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("UsersPage", () => {
  describe("loading state", () => {
    it("shows skeleton rows while fetching", () => {
      renderWithProviders(<UsersPage />);
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("user list", () => {
    it("renders all users after loading", async () => {
      renderWithProviders(<UsersPage />);
      await waitFor(() => expect(screen.getByText("Alice Admin")).toBeInTheDocument());
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("shows the correct role badges", async () => {
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("agent")).toBeInTheDocument();
    });

    it("shows empty state when no users are returned", async () => {
      server.use(http.get("/api/admin/users", () => HttpResponse.json({ users: [] })));
      renderWithProviders(<UsersPage />);
      await waitFor(() => expect(screen.getByText("No users found.")).toBeInTheDocument());
    });

    it("shows error message when fetch fails", async () => {
      server.use(http.get("/api/admin/users", () => HttpResponse.json({}, { status: 500 })));
      renderWithProviders(<UsersPage />);
      await waitFor(() =>
        expect(screen.getByText("Failed to load users.")).toBeInTheDocument()
      );
    });
  });

  describe("create user modal", () => {
    it("dialog is closed by default", () => {
      renderWithProviders(<UsersPage />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens on New User click and closes with the X button", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("closes when clicking outside the dialog", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Radix closes on pointerdown outside; body has pointer-events:none while dialog is open
      fireEvent.pointerDown(document.body);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("closes when pressing Escape", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows validation errors for empty submission", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() => {
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument();
        expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      });
    });

    it("shows an error when name is too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "ab");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");
      await user.type(screen.getByLabelText("Password"), "supersecret");
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() =>
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
      );
      expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
      expect(screen.queryByText("Password must be at least 8 characters")).not.toBeInTheDocument();
    });

    it("shows an error for an invalid email address", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.type(screen.getByLabelText("Password"), "supersecret");
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() =>
        expect(screen.getByText("Enter a valid email address")).toBeInTheDocument()
      );
      expect(screen.queryByText("Name must be at least 3 characters")).not.toBeInTheDocument();
      expect(screen.queryByText("Password must be at least 8 characters")).not.toBeInTheDocument();
    });

    it("shows an error when password is too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");
      await user.type(screen.getByLabelText("Password"), "short");
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() =>
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
      );
      expect(screen.queryByText("Name must be at least 3 characters")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter a valid email address")).not.toBeInTheDocument();
    });

    it("disables the submit button and shows 'Creating…' while the request is in-flight", async () => {
      let unblock: () => void;
      const blocked = new Promise<void>(r => { unblock = r; });
      server.use(
        http.post("/api/admin/users", async () => {
          await blocked;
          return HttpResponse.json({ success: true }, { status: 201 });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");
      await user.type(screen.getByLabelText("Password"), "supersecret");
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled()
      );

      unblock!();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("resets the form fields when the dialog is closed and reopened", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");

      await user.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "New User" }));
      expect(screen.getByLabelText("Name")).toHaveValue("");
      expect(screen.getByLabelText("Email")).toHaveValue("");
      expect(screen.getByLabelText("Password")).toHaveValue("");
    });

    it("submits the form and closes the modal on success", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");
      await user.type(screen.getByLabelText("Password"), "supersecret");

      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows a server error on failed create", async () => {
      server.use(
        http.post("/api/admin/users", () =>
          HttpResponse.json({ error: "A user with that email already exists." }, { status: 409 })
        )
      );

      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      await user.click(screen.getByRole("button", { name: "New User" }));
      await user.type(screen.getByLabelText("Name"), "Carol New");
      await user.type(screen.getByLabelText("Email"), "carol@example.com");
      await user.type(screen.getByLabelText("Password"), "supersecret");
      await user.click(screen.getByRole("button", { name: "Create User" }));

      await waitFor(() =>
        expect(screen.getByText("A user with that email already exists.")).toBeInTheDocument()
      );
    });
  });

  describe("edit user", () => {
    it("each row has an Edit button", async () => {
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const dataRows = screen.getAllByRole("row").slice(1);
      for (const row of dataRows) {
        expect(within(row).getByRole("button", { name: /edit/i })).toBeInTheDocument();
      }
    });

    it("opens the dialog pre-populated with the user's data", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("Alice Admin");
      expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
      expect(screen.getByLabelText(/new password/i)).toHaveValue("");
    });

    it("saves changes and closes the dialog on success", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      await user.clear(screen.getByLabelText("Name"));
      await user.type(screen.getByLabelText("Name"), "Alice Updated");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("saves successfully when the password field is left blank", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      // leave password blank
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("saves successfully when a valid new password is provided", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      await user.type(screen.getByLabelText(/new password/i), "newpassword123");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("shows a validation error when the name is too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      await user.clear(screen.getByLabelText("Name"));
      await user.type(screen.getByLabelText("Name"), "Ab");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() =>
        expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
      );
    });

    it("shows a validation error for an invalid email", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      await user.clear(screen.getByLabelText("Email"));
      await user.type(screen.getByLabelText("Email"), "not-an-email");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() =>
        expect(screen.getByText("Enter a valid email address")).toBeInTheDocument()
      );
    });

    it("shows a validation error when the new password is too short", async () => {
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));

      await user.type(screen.getByLabelText(/new password/i), "short");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() =>
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
      );
    });

    it("shows a server error on a failed update", async () => {
      server.use(
        http.patch("/api/admin/users/:id", () =>
          HttpResponse.json({ error: "A user with that email already exists." }, { status: 409 })
        )
      );

      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() =>
        expect(screen.getByText("A user with that email already exists.")).toBeInTheDocument()
      );
    });

    it("disables the submit button and shows 'Saving…' while the request is in-flight", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.patch("/api/admin/users/:id", async () => {
          await blocked;
          return HttpResponse.json({ success: true });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Alice Admin"));

      const row = screen.getByText("Alice Admin").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: /edit/i }));
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
      );

      unblock();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });

  describe("delete user", () => {
    it("removes a user after confirmed deletion", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const user = userEvent.setup();

      server.use(
        http.get("/api/admin/users", ({ request }) => {
          // Return empty list after delete so invalidation reflects the change
          return HttpResponse.json({ users: USERS });
        })
      );

      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Bob Agent"));

      server.use(http.get("/api/admin/users", () => HttpResponse.json({ users: [USERS[0]] })));

      const row = screen.getByText("Bob Agent").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(screen.queryByText("Bob Agent")).not.toBeInTheDocument());
      vi.restoreAllMocks();
    });

    it("does not delete when confirmation is cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Bob Agent"));

      const row = screen.getByText("Bob Agent").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: "Delete" }));

      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("shows an error message when deletion fails", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      server.use(
        http.delete("/api/admin/users/:id", () =>
          HttpResponse.json({ error: "You cannot delete your own account." }, { status: 400 })
        )
      );

      const user = userEvent.setup();
      renderWithProviders(<UsersPage />);
      await waitFor(() => screen.getByText("Bob Agent"));

      const row = screen.getByText("Bob Agent").closest("tr")!;
      await user.click(within(row).getByRole("button", { name: "Delete" }));

      await waitFor(() =>
        expect(screen.getByText("You cannot delete your own account.")).toBeInTheDocument()
      );
      vi.restoreAllMocks();
    });
  });
});
