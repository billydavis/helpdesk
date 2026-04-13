import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import TicketDetail from "../components/TicketDetail";
import { renderWithProviders } from "./render";
import { TicketStatus, TicketCategory, type Ticket } from "core";

const BASE_TICKET: Ticket = {
  id: 1,
  subject: "Printer keeps jamming",
  fromEmail: "customer@example.com",
  fromName: "Jane Doe",
  body: "It jams every time I print more than one page.",
  status: TicketStatus.open,
  category: TicketCategory.technical_question,
  createdAt: "2026-04-12T10:00:00.000Z",
  updatedAt: "2026-04-12T11:30:00.000Z",
  assignedTo: null,
};

describe("TicketDetail", () => {
  describe("subject", () => {
    it("renders the ticket subject", () => {
      renderWithProviders(<TicketDetail ticket={BASE_TICKET} />);
      expect(screen.getByRole("heading", { name: "Printer keeps jamming" })).toBeInTheDocument();
    });
  });

  describe("sender", () => {
    it("shows name and email when fromName is present", () => {
      renderWithProviders(<TicketDetail ticket={BASE_TICKET} />);
      expect(screen.getByText("Jane Doe (customer@example.com)")).toBeInTheDocument();
    });

    it("shows only email when fromName is null", () => {
      renderWithProviders(<TicketDetail ticket={{ ...BASE_TICKET, fromName: null }} />);
      expect(screen.getByText("customer@example.com")).toBeInTheDocument();
      expect(screen.queryByText(/\(customer@example\.com\)/)).not.toBeInTheDocument();
    });
  });

  describe("timestamps", () => {
    it("renders the created date", () => {
      renderWithProviders(<TicketDetail ticket={BASE_TICKET} />);
      expect(
        screen.getByText(new Date(BASE_TICKET.createdAt).toLocaleString())
      ).toBeInTheDocument();
    });

    it("renders the updated date", () => {
      renderWithProviders(<TicketDetail ticket={BASE_TICKET} />);
      expect(
        screen.getByText(new Date(BASE_TICKET.updatedAt).toLocaleString())
      ).toBeInTheDocument();
    });
  });

  describe("message body", () => {
    it("renders the body text when present", () => {
      renderWithProviders(<TicketDetail ticket={BASE_TICKET} />);
      expect(
        screen.getByText("It jams every time I print more than one page.")
      ).toBeInTheDocument();
    });

    it("does not render the message section when body is null", () => {
      renderWithProviders(<TicketDetail ticket={{ ...BASE_TICKET, body: null }} />);
      expect(screen.queryByText("Message")).not.toBeInTheDocument();
      expect(
        screen.queryByText("It jams every time I print more than one page.")
      ).not.toBeInTheDocument();
    });
  });
});
