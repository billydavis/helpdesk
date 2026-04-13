import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketStatus, TicketCategory, Ticket, Agent } from "core";
import { CATEGORY_LABELS } from "@/lib/ticket-styles";

interface UpdateTicketProps {
  ticket: Ticket;
}

const UNASSIGNED = "__unassigned__";
const NO_CATEGORY = "__none__";

export default function UpdateTicket({ ticket }: UpdateTicketProps) {
  const queryClient = useQueryClient();

  const { data: agentsData } = useQuery({
    queryKey: ["agents"],
    queryFn: () =>
      axios.get<{ agents: Agent[] }>("/api/agents").then((r) => r.data),
  });

  const agents = agentsData?.agents ?? [];

  const patchMutation = useMutation({
    mutationFn: (data: { assignedToId?: string | null; status?: TicketStatus; category?: TicketCategory | null }) =>
      axios.patch(`/api/tickets/${ticket.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
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
  );
}
