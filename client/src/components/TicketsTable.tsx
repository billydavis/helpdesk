import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketStatus, TicketCategory } from "core";

interface Ticket {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent",
  [TicketStatus.resolved]: "bg-green-100 text-green-800 hover:bg-green-100 border-transparent",
  [TicketStatus.closed]: "bg-gray-100 text-gray-600 hover:bg-gray-100 border-transparent",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General Question",
  [TicketCategory.technical_question]: "Technical Question",
  [TicketCategory.refund_request]: "Refund Request",
};

export function TicketsTable() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () =>
      axios.get<{ tickets: Ticket[] }>("/api/tickets").then((r) => r.data.tickets),
  });

  const tickets = data ?? [];

  return (
    <>
      {isError && <p className="text-sm text-destructive">Failed to load tickets.</p>}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No tickets yet.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    #{ticket.id}
                  </TableCell>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.fromName ? (
                      <>
                        <span className="text-foreground">{ticket.fromName}</span>{" "}
                        <span className="text-xs">({ticket.fromEmail})</span>
                      </>
                    ) : (
                      ticket.fromEmail
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_STYLES[ticket.status]}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.category ? (
                      <Badge variant="outline">
                        {CATEGORY_LABELS[ticket.category]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
