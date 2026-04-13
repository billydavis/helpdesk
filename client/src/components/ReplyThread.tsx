import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { SenderType, Ticket } from "core";

interface Reply {
  id: number;
  body: string;
  senderType: SenderType;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
}

interface ReplyThreadProps {
  ticket: Ticket;
}

export default function ReplyThread({ ticket }: ReplyThreadProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["ticket-replies", ticket.id],
    queryFn: () =>
      axios.get<{ replies: Reply[] }>(`/api/tickets/${ticket.id}/replies`).then((r) => r.data),
  });

  const replies = data?.replies ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => {
        const isAgent = reply.senderType === SenderType.agent;
        return (
          <div
            key={reply.id}
            className={`rounded-md border p-4 space-y-2 ${isAgent ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {isAgent ? (reply.author?.name ?? "Agent") : "Customer"}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isAgent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {isAgent ? "Agent" : "Customer"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
          </div>
        );
      })}
    </div>
  );
}
