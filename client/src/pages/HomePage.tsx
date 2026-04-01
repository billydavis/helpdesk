import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function HomePage() {
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => axios.get<{ status: string }>("/api/health").then((r) => r.data),
  });

  const status = isError ? "error" : (data?.status ?? null);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {status && (
        <p className="text-sm text-muted-foreground">API status: {status}</p>
      )}
    </div>
  );
}
