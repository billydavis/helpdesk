import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ReplyForm from "../components/ReplyForm";
import { renderWithProviders } from "./render";

const TICKET = { id: 42 };
const REPLIES_URL = `/api/tickets/${TICKET.id}/replies`;

const server = setupServer(
  http.post(REPLIES_URL, () => HttpResponse.json({}, { status: 201 })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ReplyForm", () => {
  describe("rendering", () => {
    it("renders the textarea and submit button", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.getByPlaceholderText("Write a reply...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
    });

    it("does not show an error alert by default", () => {
      renderWithProviders(<ReplyForm ticket={TICKET} />);
      expect(screen.queryByText("Failed to send reply.")).not.toBeInTheDocument();
    });
  });

  describe("client-side validation", () => {
    it("shows 'Reply cannot be empty' when submitting a blank textarea", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReplyForm ticket={TICKET} />);

      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() =>
        expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument()
      );
    });

    it("does not POST when the textarea is empty", async () => {
      const user = userEvent.setup();
      let postWasMade = false;
      server.use(
        http.post(REPLIES_URL, () => {
          postWasMade = true;
          return HttpResponse.json({}, { status: 201 });
        })
      );

      renderWithProviders(<ReplyForm ticket={TICKET} />);
      await user.click(screen.getByRole("button", { name: "Send Reply" }));

      await waitFor(() => screen.getByText("Reply cannot be empty"));
      expect(postWasMade).toBe(false);
    });
  });

  describe("pending state", () => {
    it("shows 'Sending…' and disables the button while the request is in-flight", async () => {
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

      unblock();
    });

    it("disables the textarea while the request is in-flight", async () => {
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

  describe("successful submission", () => {
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

  describe("error state", () => {
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

    it("re-enables the button after a failed POST", async () => {
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
});
