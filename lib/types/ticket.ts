export const TICKET_STATUSES = [
  "pending",
  "in_progress",
  "finished",
  "deleted",
] as const;

/** Statuses the admin can set from the portal */
export const ADMIN_TICKET_STATUSES = ["pending", "in_progress"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type AdminTicketStatus = (typeof ADMIN_TICKET_STATUSES)[number];

export type TicketItem = {
  name: string;
  quantity: number;
  price: number;
  /** Shown price: number or magical letter (k, s, g) */
  price_label?: string;
  image_url?: string;
  collection_name?: string;
  product_id?: string;
  /** market = custom request from Market tab */
  kind?: "product" | "market";
  request_text?: string;
};

export function isMarketTicket(ticket: { items: TicketItem[] }): boolean {
  return ticket.items.some((i) => i.kind === "market");
}

export type Ticket = {
  id: string;
  user_id: string;
  username: string;
  items: TicketItem[];
  total_items: number;
  status: TicketStatus | string;
  created_at: string;
  updated_at: string;
};

export function ticketStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function ticketStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-950/50 border-amber-500/30 text-amber-400";
    case "in_progress":
      return "bg-blue-950/50 border-blue-500/30 text-blue-400";
    case "finished":
      return "bg-emerald-950/50 border-emerald-500/30 text-emerald-400";
    case "deleted":
      return "bg-zinc-900 border-zinc-700 text-zinc-500";
    default:
      return "bg-zinc-900 border-zinc-700 text-zinc-400";
  }
}

export function sortTicketsForAdmin(a: Ticket, b: Ticket) {
  const order: Record<string, number> = {
    pending: 0,
    in_progress: 1,
    finished: 2,
    deleted: 3,
  };
  const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
  if (diff !== 0) return diff;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
