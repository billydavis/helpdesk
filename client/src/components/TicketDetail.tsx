import { Ticket } from "core";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>
            <span className="font-medium">From:</span>{" "}
            {ticket.fromName
              ? `${ticket.fromName} (${ticket.fromEmail})`
              : ticket.fromEmail}
          </p>
          <p>
            <span className="font-medium">Created:</span>{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Updated:</span>{" "}
            {new Date(ticket.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {ticket.body && (
        <div className="rounded-md border p-4 space-y-3">
          <p className="font-medium">Message</p>
          <p className="text-sm text-muted-foreground">
            From {ticket.fromName ?? ticket.fromEmail}
          </p>
          <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
        </div>
      )}
    </div>
  );
}
