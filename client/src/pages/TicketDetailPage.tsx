import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketStatus, TicketCategory } from "core";
import { ArrowLeft } from "lucide-react";
import { STATUS_STYLES, CATEGORY_LABELS } from "@/lib/ticket-styles";

interface TicketDetail {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  body: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () =>
      axios.get<TicketDetail>(`/api/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Back to Tickets</h1>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Failed to load ticket.</p>
      )}

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : ticket ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className={STATUS_STYLES[ticket.status]}>
                  {ticket.status}
                </Badge>
                {ticket.category && (
                  <Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">From</p>
                <p className="font-medium">
                  {ticket.fromName ? (
                    <>
                      {ticket.fromName}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({ticket.fromEmail})
                      </span>
                    </>
                  ) : (
                    ticket.fromEmail
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Received</p>
                <p className="font-medium">
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {ticket.body && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Message</p>
                <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {ticket.body}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
