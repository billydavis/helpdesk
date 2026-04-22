import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { SenderType, Ticket } from "core";

interface Reply {
  id: number;
  body: string;
  bodyHtml: string | null;
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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (replies.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Conversation
      </p>
      {replies.map((reply) => {
        const isAgent = reply.senderType === SenderType.agent;
        return (
          <div
            key={reply.id}
            className={`rounded-lg border p-4 space-y-2.5 ${
              isAgent
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {isAgent ? (reply.author?.name ?? "Agent") : "Customer"}
                </p>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    isAgent
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isAgent ? "Agent" : "Customer"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleString()}
              </p>
            </div>
            {reply.bodyHtml ? (
              <div
                className="text-sm leading-relaxed text-foreground/85"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.bodyHtml) }}
              />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">{reply.body}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
