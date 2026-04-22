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

  const body = form.watch("body");

  const replyMutation = useMutation({
    mutationFn: (data: ReplyFormValues) =>
      axios.post(`/api/tickets/${ticket.id}/replies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies", ticket.id] });
      form.reset();
    },
  });

  const polishMutation = useMutation({
    mutationFn: (data: ReplyFormValues) =>
      axios.post<{ body: string }>(`/api/tickets/${ticket.id}/replies/polish`, data),
    onSuccess: (response) => {
      form.setValue("body", response.data.body);
    },
  });

  const isBusy = replyMutation.isPending || polishMutation.isPending;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Reply
      </p>
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
                    placeholder="Write a reply…"
                    disabled={isBusy}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {replyMutation.isError && <ErrorAlert message="Failed to send reply." />}
          {polishMutation.isError && <ErrorAlert message="Failed to polish reply." />}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!body || isBusy}
              onClick={() => polishMutation.mutate({ body })}
              className="gap-1.5 border-border"
            >
              <span className="text-primary text-xs">✦</span>
              {polishMutation.isPending ? "Polishing…" : "Polish"}
            </Button>
            <Button type="submit" size="sm" disabled={!body || isBusy}>
              {replyMutation.isPending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
