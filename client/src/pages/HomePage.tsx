import { useEffect, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {status && (
        <p className="text-sm text-muted-foreground">API status: {status}</p>
      )}
    </div>
  );
}
