import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus, TicketCategory } from "core";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/ticket-styles";

interface Agent {
  id: string;
  name: string;
  email: string;
}

interface TicketDetail {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  body: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: Agent | null;
}

const UNASSIGNED = "__unassigned__";
const NO_CATEGORY = "__none__";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () =>
      axios.get<TicketDetail>(`/api/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: () =>
      axios.get<{ agents: Agent[] }>("/api/agents").then((r) => r.data),
  });

  const agents = agentsData?.agents ?? [];

  const patchMutation = useMutation({
    mutationFn: (data: { assignedToId?: string | null; status?: TicketStatus; category?: TicketCategory | null }) =>
      axios.patch(`/api/tickets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/tickets")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Button>

      {isError && (
        <p className="text-sm text-destructive">Failed to load ticket.</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-[1fr_200px] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-7 w-96" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full mt-2" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ) : ticket ? (
        <div className="grid grid-cols-[1fr_200px] gap-8 items-start">
          {/* Left column — read-only content */}
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

          {/* Right column — editable fields */}
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">Status</p>
              <Select
                value={ticket.status}
                onValueChange={(v) => patchMutation.mutate({ status: v as TicketStatus })}
                disabled={patchMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TicketStatus.open}>Open</SelectItem>
                  <SelectItem value={TicketStatus.resolved}>Resolved</SelectItem>
                  <SelectItem value={TicketStatus.closed}>Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-muted-foreground mb-2">Category</p>
              <Select
                value={ticket.category ?? NO_CATEGORY}
                onValueChange={(v) =>
                  patchMutation.mutate({ category: v === NO_CATEGORY ? null : (v as TicketCategory) })
                }
                disabled={patchMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>None</SelectItem>
                  {Object.values(TicketCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-muted-foreground mb-2">Assigned to</p>
              <Select
                value={ticket.assignedTo?.id ?? UNASSIGNED}
                onValueChange={(v) =>
                  patchMutation.mutate({ assignedToId: v === UNASSIGNED ? null : v })
                }
                disabled={patchMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
