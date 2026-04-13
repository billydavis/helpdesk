import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { createReplySchema, Ticket } from "core";
import ErrorAlert from "@/components/ErrorAlert";

type ReplyFormValues = z.infer<typeof createReplySchema>;

interface ReplyFormProps {
  ticket: Ticket;
}

export default function ReplyForm({ ticket }: ReplyFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: "" },
  });

  const replyMutation = useMutation({
    mutationFn: (data: ReplyFormValues) =>
      axios.post(`/api/tickets/${ticket.id}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies", ticket.id] });
      form.reset();
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => replyMutation.mutate(data))}
        className="space-y-3"
      >
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  placeholder="Write a reply..."
                  disabled={replyMutation.isPending}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {replyMutation.isError && (
          <ErrorAlert message="Failed to send reply." />
        )}
        <Button type="submit" disabled={replyMutation.isPending}>
          {replyMutation.isPending ? "Sending…" : "Send Reply"}
        </Button>
      </form>
    </Form>
  );
}
