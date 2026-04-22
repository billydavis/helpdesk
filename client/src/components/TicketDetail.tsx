import DOMPurify from "dompurify";
import { Ticket } from "core";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="font-display text-xl font-bold leading-tight tracking-tight text-foreground">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="text-foreground/50 font-medium">From</span>{" "}
            {ticket.fromName
              ? `${ticket.fromName} (${ticket.fromEmail})`
              : ticket.fromEmail}
          </span>
          <span>
            <span className="text-foreground/50 font-medium">Received</span>{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </span>
          <span>
            <span className="text-foreground/50 font-medium">Updated</span>{" "}
            {new Date(ticket.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {ticket.body && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Original Message
            </p>
            <p className="text-xs text-muted-foreground">
              {ticket.fromName ?? ticket.fromEmail}
            </p>
          </div>
          <div className="border-t border-border/50 pt-3">
            <div
              className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticket.body) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
