import { useState } from "react";
import axios from "axios";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ticket } from "core";

interface TicketSummaryProps {
  ticket: Ticket;
}

export default function TicketSummary({ ticket }: TicketSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.post<{ summary: string }>(
        `/api/tickets/${ticket.id}/summarize`
      );
      setSummary(data.summary);
    } catch {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSummarize}
        disabled={isLoading}
        className="text-xs gap-1.5 border-border"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        )}
        {summary ? "Regenerate Summary" : "Generate Summary"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-2">
            AI Summary
          </p>
          <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>
        </div>
      )}
    </div>
  );
}
