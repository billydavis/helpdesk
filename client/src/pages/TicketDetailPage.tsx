import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Ticket } from "core";
import BackButton from "@/components/BackButton";
import ReplyForm from "@/components/ReplyForm";
import ReplyThread from "@/components/ReplyThread";
import ErrorAlert from "@/components/ErrorAlert";
import TicketDetail from "@/components/TicketDetail";
import TicketDetailSkeleton from "@/components/TicketDetailSkeleton";
import UpdateTicket from "@/components/UpdateTicket";
import TicketSummary from "@/components/TicketSummary";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => axios.get<Ticket>(`/api/tickets/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <BackButton to="/tickets" label="Back to Tickets" />

      {isError && <ErrorAlert message="Failed to load ticket." />}

      {isLoading ? (
        <TicketDetailSkeleton />
      ) : ticket ? (
        <div className="grid grid-cols-[1fr_240px] gap-8 items-start">
          <div className="space-y-5">
            <TicketDetail ticket={ticket} />
            <TicketSummary ticket={ticket} />
            <ReplyThread ticket={ticket} />
            <ReplyForm ticket={ticket} />
          </div>
          <div className="sticky top-6">
            <UpdateTicket ticket={ticket} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
