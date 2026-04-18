import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ReplyForm from "../components/ReplyForm";
import { renderWithProviders } from "./render";
import { TicketStatus, TicketCategory, type Ticket } from "core";

const TICKET: Ticket = {
  id: 42,
  subject: "Test ticket",
  fromEmail: "customer@example.com",
  fromName: "Jane Customer",
  body: "I need help.",
  status: TicketStatus.open,
  category: TicketCategory.general_question,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  assignedTo: null,
};

const REPLIES_URL = `/api/tickets/${TICKET.id}/replies`;
const POLISH_URL = `/api/tickets/${TICKET.id}/replies/polish`;

const server = setupServer(
  http.post(REPLIES_URL, () => HttpResponse.json({}, { status: 201 })),
  http.post(POLISH_URL, () => HttpResponse.json({ body: "Polished reply text." })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ReplyForm", () => {
  describe("rendering", () => {
    it("renders the textarea, Polish button, and Send Reply button", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Polish" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
    });

    it("does not show an error alert by default", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.queryByText("Failed to send reply.")).not.toBeInTheDocument();
      expect(screen.queryByText("Failed to polish reply.")).not.toBeInTheDocument();
    });
  });

  describe("disabled state when textarea is empty", () => {
    it("disables the Send Reply button when the textarea is empty", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled();
    });

    it("disables the Polish button when the textarea is empty", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();
    });

    it("enables both buttons once text is typed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");

      expect(screen.getByRole("button", { name: "Send Reply" })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: "Polish" })).not.toBeDisabled();
    });

    it("does not POST when the textarea is empty", async () => {
      let postWasMade = false;
      server.use(
        http.post(REPLIES_URL, () => {
          postWasMade = true;
          return HttpResponse.json({}, { status: 201 });
        })
      );

      renderWithProviders(<ReplyForm ticket={TICKET} />);
      // Button is disabled — clicking it should have no effect
      await userEvent.setup().click(screen.getByRole("button", { name: "Send Reply" }));

      expect(postWasMade).toBe(false);
    });
  });

  describe("send reply — pending state", () => {
    it("shows 'Sending…' and disables the Send Reply button while in-flight", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.post(REPLIES_URL, async () => {
          await blocked;
          return HttpResponse.json({}, { status: 201 });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello there");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled()
      );
      expect(screen.getByRole("button", { name: "Polish" })).toBeDisabled();

      unblock();
    });

    it("disables the textarea while sending", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.post(REPLIES_URL, async () => {
          await blocked;
          return HttpResponse.json({}, { status: 201 });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello there");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText("Write a reply...")).toBeDisabled()
      );

      unblock();
    });
  });

  describe("send reply — success", () => {
    it("clears the textarea after a successful POST", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      const textarea = screen.getByPlaceholderText("Write a reply...");
      await user.type(textarea, "This is my reply.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => expect(textarea).toHaveValue(""));
    });

    it("does not show an error alert after a successful POST", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "This is my reply.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => expect(screen.getByPlaceholderText("Write a reply...")).toHaveValue(""));
      expect(screen.queryByText("Failed to send reply.")).not.toBeInTheDocument();
    });

    it("POSTs to the correct URL with the reply body", async () => {
      const user = userEvent.setup();
      let capturedBody: unknown;
      server.use(
        http.post(REPLIES_URL, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({}, { status: 201 });
        })
      );

      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Check the body.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => expect(screen.getByPlaceholderText("Write a reply...")).toHaveValue(""));
      expect(capturedBody).toEqual({ body: "Check the body." });
    });
  });

  describe("send reply — error state", () => {
    it("shows the error alert when the POST fails", async () => {
      server.use(
        http.post(REPLIES_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "This will fail.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() =>
        expect(screen.getByText("Failed to send reply.")).toBeInTheDocument()
      );
    });

    it("does not clear the textarea after a failed POST", async () => {
      server.use(
        http.post(REPLIES_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      const textarea = screen.getByPlaceholderText("Write a reply...");
      await user.type(textarea, "This will fail.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => screen.getByText("Failed to send reply."));
      expect(textarea).toHaveValue("This will fail.");
    });

    it("re-enables the Send Reply button after a failed POST", async () => {
      server.use(
        http.post(REPLIES_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "This will fail.");
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => screen.getByText("Failed to send reply."));
      expect(screen.getByRole("button", { name: "Send Reply" })).not.toBeDisabled();
    });
  });

  describe("polish — pending state", () => {
    it("shows 'Polishing…' and disables the Polish button while in-flight", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.post(POLISH_URL, async () => {
          await blocked;
          return HttpResponse.json({ body: "Polished." });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Draft reply.");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Polishing…" })).toBeDisabled()
      );

      unblock();
    });

    it("disables the Send Reply button while polishing", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.post(POLISH_URL, async () => {
          await blocked;
          return HttpResponse.json({ body: "Polished." });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Draft reply.");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() => screen.getByRole("button", { name: "Polishing…" }));
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled();

      unblock();
    });

    it("disables the textarea while polishing", async () => {
      let unblock!: () => void;
      const blocked = new Promise<void>((r) => { unblock = r; });
      server.use(
        http.post(POLISH_URL, async () => {
          await blocked;
          return HttpResponse.json({ body: "Polished." });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "Draft reply.");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText("Write a reply...")).toBeDisabled()
      );

      unblock();
    });
  });

  describe("polish — success", () => {
    it("replaces the textarea content with the polished text", async () => {
      server.use(
        http.post(POLISH_URL, () => HttpResponse.json({ body: "Polished reply text." }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText("Write a reply...")).toHaveValue("Polished reply text.")
      );
    });

    it("POSTs the current body to the polish URL", async () => {
      let capturedBody: unknown;
      server.use(
        http.post(POLISH_URL, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ body: "Polished." });
        })
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() => expect(screen.getByPlaceholderText("Write a reply...")).toHaveValue("Polished."));
      expect(capturedBody).toEqual({ body: "rough draft" });
    });

    it("does not show an error alert after successful polish", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText("Write a reply...")).toHaveValue("Polished reply text.")
      );
      expect(screen.queryByText("Failed to polish reply.")).not.toBeInTheDocument();
    });
  });

  describe("polish — error state", () => {
    it("shows the error alert when the polish POST fails", async () => {
      server.use(
        http.post(POLISH_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() =>
        expect(screen.getByText("Failed to polish reply.")).toBeInTheDocument()
      );
    });

    it("does not clear the textarea after a failed polish", async () => {
      server.use(
        http.post(POLISH_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      const textarea = screen.getByPlaceholderText("Write a reply...");
      await user.type(textarea, "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() => screen.getByText("Failed to polish reply."));
      expect(textarea).toHaveValue("rough draft");
    });

    it("re-enables the Polish button after a failed polish", async () => {
      server.use(
        http.post(POLISH_URL, () => HttpResponse.json({ error: "Server error" }, { status: 500 }))
      );

      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.type(screen.getByPlaceholderText("Write a reply..."), "rough draft");
      await user.click(screen.getByRole("button", { name: "Polish" }));

      await waitFor(() => screen.getByText("Failed to polish reply."));
      expect(screen.getByRole("button", { name: "Polish" })).not.toBeDisabled();
    });
  });
});
