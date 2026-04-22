import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { DashboardStats } from "core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  accent?: boolean;
}

function StatCard({ title, value, description, accent }: StatCardProps) {
  return (
    <Card className="border-border bg-card shadow-none relative overflow-hidden">
      {accent && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-display text-3xl font-bold tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <Skeleton className="h-3 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20" />
        <Skeleton className="mt-1.5 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  count: { label: "Tickets", color: "var(--primary)" },
};

export default function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats"],
    queryFn: () => axios.get<DashboardStats>("/api/tickets/stats").then((r) => r.data),
  });

  const chartData = data?.ticketsPerDay.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Support queue overview</p>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Failed to load dashboard stats.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <StatCard title="Total Tickets" value={data.totalTickets} />
            <StatCard title="Open Tickets" value={data.openTickets} accent />
            <StatCard
              title="Resolved by AI"
              value={data.aiResolvedTickets}
              description="tickets auto-resolved"
            />
            <StatCard
              title="AI Resolution Rate"
              value={`${data.aiResolvedPercent}%`}
              description="of all tickets"
            />
            <StatCard
              title="Avg. Resolution Time"
              value={data.avgResolutionTimeMs != null ? formatDuration(data.avgResolutionTimeMs) : "—"}
              description={
                data.avgResolutionTimeMs != null
                  ? "resolved & closed"
                  : "no resolved tickets yet"
              }
            />
          </>
        ) : null}
      </div>

      <Card className="border-border bg-card shadow-none">
        <CardHeader>
          <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Tickets — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : chartData ? (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
