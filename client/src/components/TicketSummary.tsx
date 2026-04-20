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
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {summary ? "Regenerate Summary" : "Summarize"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="rounded-md border border-dashed p-4 bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            AI Summary
          </p>
          <p className="text-sm">{summary}</p>
        </div>
      )}
    </div>
  );
}
