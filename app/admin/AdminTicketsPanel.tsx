"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { Ticket } from "@/lib/types/ticket";
import { isMarketTicket } from "@/lib/types/ticket";
import {
  ADMIN_TICKET_STATUSES,
  sortTicketsForAdmin,
  ticketStatusColor,
  ticketStatusLabel,
  type AdminTicketStatus,
} from "@/lib/types/ticket";
import TicketItemRow from "@/components/TicketItemRow";
import { sumMagicalPriceLines } from "@/lib/magical-price";

type AdminTicketsPanelProps = {
  onCountChange?: (count: number) => void;
};

export default function AdminTicketsPanel({
  onCountChange,
}: AdminTicketsPanelProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [newTicketIds, setNewTicketIds] = useState<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tickets", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load tickets");
      }

      const data = (await res.json()) as Ticket[];
      const visible = data
        .filter((t) => t.status !== "deleted")
        .sort(sortTicketsForAdmin);

      const incoming = new Set<string>();
      for (const t of visible) {
        if (!knownIdsRef.current.has(t.id)) incoming.add(t.id);
      }
      if (knownIdsRef.current.size > 0 && incoming.size > 0) {
        setNewTicketIds(incoming);
        setTimeout(() => setNewTicketIds(new Set()), 8000);
      }
      visible.forEach((t) => knownIdsRef.current.add(t.id));

      setTickets(visible);
      setLastSync(new Date());
      onCountChange?.(visible.length);
    } catch (err) {
      console.error("[admin-tickets]", err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 3000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  async function updateStatus(ticketId: string, status: AdminTicketStatus) {
    setLoadingId(ticketId);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast(`Set to ${ticketStatusLabel(status)}`, "success");
      await loadTickets();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function removeTicket(ticketId: string) {
    if (!confirm("Remove this ticket from the portal?")) return;
    setLoadingId(ticketId);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      toast("Ticket removed", "info");
      await loadTickets();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setLoadingId(null);
    }
  }

  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "in_progress"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Customer orders (live)
          </h3>
          <p className="text-[11px] text-zinc-600 mt-1">
            New user tickets appear here automatically every few seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-500">
            {lastSync
              ? `Updated ${lastSync.toLocaleTimeString()}`
              : "Connecting…"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-400">
          Pending: {pendingCount}
        </span>
        <span className="px-2 py-1 rounded-lg bg-blue-950/40 border border-blue-500/20 text-blue-400">
          In progress: {inProgressCount}
        </span>
        <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
          Total active: {tickets.length}
        </span>
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-y-auto pr-2 space-y-4 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
        {loading && tickets.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-16">
            No orders yet. When a user creates a ticket from the cart, it will
            show up here.
          </p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                newTicketIds.has(ticket.id)
                  ? "border-emerald-500/50 bg-emerald-950/20 ring-1 ring-emerald-500/30"
                  : "border-zinc-850 bg-zinc-900/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {newTicketIds.has(ticket.id) && (
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    New order
                  </span>
                )}
                {isMarketTicket(ticket) && (
                  <span className="text-[10px] font-bold uppercase text-fuchsia-400 bg-fuchsia-950/40 border border-fuchsia-500/30 px-2 py-0.5 rounded">
                    Market
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white">
                  {ticket.username}{" "}
                  <span className="text-zinc-500 font-normal">
                    · {isMarketTicket(ticket) ? "custom request" : `${ticket.total_items} items`}
                  </span>
                </h4>
                <span className="text-[10px] text-zinc-500">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>

              <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-900">
                {ticket.items.map((item, idx) => (
                  <TicketItemRow key={idx} item={item} imageSize="lg" />
                ))}
              </div>

              {/* Total calculation */}
              {!isMarketTicket(ticket) && (() => {
                const cartPriceLines = ticket.items.map((item) => ({
                  price: item.price_label ?? item.price,
                  quantity: item.quantity,
                }));
                const cartTotal = sumMagicalPriceLines(cartPriceLines);
                return (
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                    <span className="text-sm font-semibold text-zinc-400">Total</span>
                    <span className="text-lg font-bold text-violet-400">{cartTotal.display}</span>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
                <label className="text-[10px] text-zinc-500 uppercase font-bold">
                  Set status
                </label>
                <select
                  value={
                    ADMIN_TICKET_STATUSES.includes(
                      ticket.status as AdminTicketStatus
                    )
                      ? ticket.status
                      : "pending"
                  }
                  disabled={loadingId === ticket.id}
                  onChange={(e) =>
                    updateStatus(
                      ticket.id,
                      e.target.value as AdminTicketStatus
                    )
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 min-w-[140px]"
                >
                  {ADMIN_TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ticketStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${ticketStatusColor(ticket.status)}`}
                >
                  {ticketStatusLabel(ticket.status)}
                </span>
                <button
                  type="button"
                  disabled={loadingId === ticket.id}
                  onClick={() => removeTicket(ticket.id)}
                  className="ml-auto rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
