import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailSkeleton() {
  return (
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
  );
}
