"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import type { Ticket, TicketStatus } from "@/lib/types/ticket";
import {
  isMarketTicket,
  ticketStatusColor,
  ticketStatusLabel,
} from "@/lib/types/ticket";
import TicketItemRow from "@/components/TicketItemRow";
import { sumMagicalPriceLines } from "@/lib/magical-price";

type MyTicketsClientProps = {
  userId: string;
};

export default function MyTicketsClient({ userId }: MyTicketsClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[my-tickets]", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setTickets((data as Ticket[]) ?? []);
        setLoading(false);
      }
    };

    loadTickets();

    const poll = setInterval(loadTickets, 4000);

    const channel = supabase
      .channel(`user-tickets-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("[my-tickets] realtime event");
          loadTickets();
        }
      )
      .subscribe((status) => {
        console.log("[my-tickets] channel status:", status);
      });

    return () => {
      isMounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    setUpdatingId(ticketId);
    const { error } = await supabase
      .from("tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("user_id", userId);

    if (error) {
      toast(error.message, "error");
    } else {
      toast("Ticket updated", "success");
      // Reload tickets by triggering a re-fetch
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) setTickets(data as Ticket[]);
    }
    setUpdatingId(null);
  }

  const activeTickets = tickets.filter((t) => t.status !== "deleted");

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (activeTickets.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800">
        <p className="text-zinc-400">You have no active tickets.</p>
        <p className="text-sm text-zinc-600 mt-2">
          Add items to cart, use Market, or create a ticket to place an order.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTickets.map((ticket) => {
        // Calculate total using magical price summing
        const cartPriceLines = ticket.items.map((item) => ({
          price: item.price_label ?? item.price,
          quantity: item.quantity,
        }));
        const cartTotal = sumMagicalPriceLines(cartPriceLines);

        return (
          <div
            key={ticket.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">
                  {isMarketTicket(ticket)
                    ? "Market request"
                    : `Order · ${ticket.total_items} item(s)`}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${ticketStatusColor(ticket.status)}`}
              >
                {ticketStatusLabel(ticket.status)}
              </span>
            </div>

            <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-900">
              {ticket.items.map((item, idx) => (
                <TicketItemRow key={idx} item={item} imageSize="lg" />
              ))}
            </div>

            {/* Total calculation */}
            {!isMarketTicket(ticket) && (
              <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                <span className="text-sm font-semibold text-zinc-400">Total</span>
                <span className="text-lg font-bold text-violet-400">{cartTotal.display}</span>
              </div>
            )}

            {ticket.status === "pending" && (
              <button
                type="button"
                disabled={updatingId === ticket.id}
                onClick={() => updateTicketStatus(ticket.id, "deleted")}
                className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/50"
              >
                Cancel this ticket
              </button>
            )}

            {ticket.status !== "pending" && ticket.status !== "deleted" && (
              <p className="text-xs text-zinc-500">
                This ticket is being processed. Contact support if you need changes.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
