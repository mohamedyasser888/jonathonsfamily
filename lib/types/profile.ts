import type { CollectionAvailability } from "@/lib/collection-availability";

/** public.profiles — id, email, username, password, avatar_url (picture link) */
export type Profile = {
  id: string;
  email: string;
  username?: string | null;
  password?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Collection = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[] | null;
  published?: boolean;
  availability_status?: CollectionAvailability;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  image_url: string;
  price: string | number;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  product?: Product;
};

export type { Ticket, TicketItem, TicketStatus } from "./ticket";
