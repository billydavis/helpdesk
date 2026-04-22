import { TicketsTable } from "@/components/TicketsTable";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage and respond to support requests</p>
      </div>
      <TicketsTable />
    </div>
  );
}
