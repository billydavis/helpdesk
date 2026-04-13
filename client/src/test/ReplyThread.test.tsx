import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ReplyThread from "../components/ReplyThread";
import { renderWithProviders } from "./render";
import { TicketStatus, TicketCategory, SenderType, type Ticket } from "core";

const TICKET: Ticket = {
  id: 7,
  subject: "Refund not received",
  fromEmail: "customer@example.com",
  fromName: "John Smith",
  body: "I requested a refund two weeks ago.",
  status: TicketStatus.open,
  category: TicketCategory.refund_request,
  createdAt: "2026-04-10T09:00:00.000Z",
  updatedAt: "2026-04-10T09:00:00.000Z",
  assignedTo: null,
};

const REPLIES_URL = `/api/tickets/${TICKET.id}/replies`;

const AGENT_REPLY = {
  id: 1,
  body: "We are processing your refund.",
  senderType: SenderType.agent,
  createdAt: "2026-04-10T10:00:00.000Z",
  author: { id: "u1", name: "Support Agent", email: "agent@helpdesk.com" },
};

const CUSTOMER_REPLY = {
  id: 2,
  body: "Thank you for the update.",
  senderType: SenderType.customer,
  createdAt: "2026-04-10T11:00:00.000Z",
  author: null,
};

const server = setupServer(
  http.get(REPLIES_URL, () => HttpResponse.json({ replies: [] }))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ReplyThread", () => {
  describe("loading state", () => {
    it("shows skeletons while the request is in-flight", () => {
      server.use(http.get(REPLIES_URL, () => new Promise(() => {})));
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("renders nothing when there are no replies", async () => {
      const { container } = renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(document.querySelectorAll(".animate-pulse").length).toBe(0)
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("agent replies", () => {
    it("renders an agent reply with the author name", async () => {
      server.use(
        http.get(REPLIES_URL, () => HttpResponse.json({ replies: [AGENT_REPLY] }))
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getByText("Support Agent")).toBeInTheDocument()
      );
    });

    it("renders the Agent badge on agent replies", async () => {
      server.use(
        http.get(REPLIES_URL, () => HttpResponse.json({ replies: [AGENT_REPLY] }))
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getAllByText("Agent").length).toBeGreaterThan(0)
      );
    });

    it("renders the reply body", async () => {
      server.use(
        http.get(REPLIES_URL, () => HttpResponse.json({ replies: [AGENT_REPLY] }))
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getByText("We are processing your refund.")).toBeInTheDocument()
      );
    });
  });

  describe("customer replies", () => {
    it("renders a customer reply with the Customer label", async () => {
      server.use(
        http.get(REPLIES_URL, () => HttpResponse.json({ replies: [CUSTOMER_REPLY] }))
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getAllByText("Customer").length).toBeGreaterThan(0)
      );
    });

    it("renders the reply body", async () => {
      server.use(
        http.get(REPLIES_URL, () => HttpResponse.json({ replies: [CUSTOMER_REPLY] }))
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getByText("Thank you for the update.")).toBeInTheDocument()
      );
    });
  });

  describe("mixed replies", () => {
    it("renders all replies in order", async () => {
      server.use(
        http.get(REPLIES_URL, () =>
          HttpResponse.json({ replies: [AGENT_REPLY, CUSTOMER_REPLY] })
        )
      );
      renderWithProviders(<ReplyThread ticket={TICKET} />);
      await waitFor(() =>
        expect(screen.getByText("We are processing your refund.")).toBeInTheDocument()
      );
      expect(screen.getByText("Thank you for the update.")).toBeInTheDocument();
    });
  });
});
