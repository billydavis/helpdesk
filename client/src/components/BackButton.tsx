import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  to: string;
  label: string;
}

export default function BackButton({ to, label }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate(to)}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
