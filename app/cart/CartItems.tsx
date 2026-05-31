"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PriceDisplay from "@/components/PriceDisplay";
import {
  formatPriceDisplay,
  numericToMagicalPrice,
  parseMagicalPrice,
  sumMagicalPriceLines,
} from "@/lib/magical-price";

interface CartProduct {
  id: string;
  name: string;
  image_url: string;
  price: string | number;
  description: string;
  collection_id?: string;
  collections?: {
    name: string;
  } | {
    name: string;
  }[] | null;
}

interface RawCartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  products: CartProduct | CartProduct[] | null;
}

interface CartItemsProps {
  initialItems: RawCartItem[];
  userId: string;
  username: string;
}

export default function CartItems({ initialItems, userId, username }: CartItemsProps) {
  const [items, setItems] = useState<RawCartItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Normalize product retrieval (in case products returned as single object or array)
  const getProduct = (item: RawCartItem): CartProduct | null => {
    if (!item.products) return null;
    if (Array.isArray(item.products)) {
      return item.products[0] || null;
    }
    return item.products;
  };

  async function handleRemove(itemId: string, productName: string) {
    try {
      const { error } = await supabase.from("cart").delete().eq("id", itemId);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast(`Removed "${productName}" from cart`, "info");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast("Failed to remove item", "error");
    }
  }

  async function handleQuantityChange(itemId: string, newQuantity: number) {
    if (newQuantity < 1) return;
    try {
      const { error } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("id", itemId);
      if (error) throw error;
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      toast("Failed to update quantity", "error");
    }
  }

  async function handleCreateTicket() {
    if (items.length === 0) return;
    setLoading(true);

    try {
      // Build order summary for tickets
      const orderedItems = items.map((item) => {
        const prod = getProduct(item);
        
        let collectionName = "Store";
        if (prod?.collections) {
          if (Array.isArray(prod.collections)) {
            collectionName = prod.collections[0]?.name || "Store";
          } else {
            collectionName = prod.collections.name || "Store";
          }
        }

        const priceLabel = prod?.price != null ? String(prod.price) : "0";
        const parsed = parseMagicalPrice(priceLabel);

        // Convert numeric price to magical format for display in ticket
        const displayPrice = parsed.valid
          ? (parsed.isMagical ? parsed.display : numericToMagicalPrice(parsed.numeric))
          : priceLabel;

        return {
          kind: "product" as const,
          name: prod?.name || "Unknown Product",
          quantity: item.quantity,
          price: parsed.valid ? parsed.numeric : 0,
          price_label: displayPrice,
          image_url: prod?.image_url || "",
          collection_name: collectionName,
          product_id: prod?.id,
        };
      });

      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      // Create ticket in database
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          user_id: userId,
          username: username || "User",
          items: orderedItems,
          total_items: totalItems,
          status: "pending",
        })
        .select()
        .single();

      if (ticketError) {
        console.error("[cart] ticket insert failed:", ticketError);
        throw new Error(ticketError.message);
      }

      console.log("[cart] ticket created:", ticketData?.id);

      // Clear the cart for the user
      const { error: clearError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", userId);

      if (clearError) throw clearError;

      setItems([]);
      toast("Ticket created successfully!", "success");
      router.push("/tickets");
      router.refresh();
    } catch (err) {
      console.error("Ticket creation failed:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to create ticket";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const cartPriceLines = items.map((item) => {
    const prod = getProduct(item);
    // Convert numeric price back to magical format for display
    const priceValue = prod?.price != null ? Number(prod.price) : 0;
    const magicalPrice = priceValue > 0 ? numericToMagicalPrice(priceValue) : "0";
    return {
      price: magicalPrice,
      quantity: item.quantity,
    };
  });
  const cartTotal = sumMagicalPriceLines(cartPriceLines);

  if (items.length === 0) {
    return (
      <div className="text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 py-16 animate-fade-in">
        <svg className="w-12 h-12 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h3 className="text-lg font-bold text-zinc-300">Your cart is empty</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2">
          Add items from a collection, then confirm here to create your ticket.
        </p>
        <div className="mt-6">
          <Link
            href="/collections"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white shadow-md shadow-violet-500/15 transition-all duration-200"
          >
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => {
          const prod = getProduct(item);
          if (!prod) return null;

          return (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-850 bg-zinc-900/25 backdrop-blur-md"
            >
              {/* Product Image */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-zinc-800">
                {prod.image_url ? (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                    No image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{prod.name}</h3>
                {(() => {
                  let collectionName = "";
                  if (prod.collections) {
                    collectionName = Array.isArray(prod.collections)
                      ? prod.collections[0]?.name || ""
                      : prod.collections.name || "";
                  }
                  return collectionName ? (
                    <span className="inline-block mt-1 text-[10px] bg-zinc-900 text-violet-400 px-2 py-0.5 rounded border border-zinc-800">
                      {collectionName}
                    </span>
                  ) : null;
                })()}
                <p className="text-xs text-zinc-500 line-clamp-1 mt-1">{prod.description}</p>
                <div className="text-sm font-black text-violet-400 mt-2">
                  <PriceDisplay price={prod.price} />
                </div>
              </div>

              {/* Quantity Controls & Remove */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden">
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold text-white">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleRemove(item.id, prod.name)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary & Ticket creation */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight border-b border-zinc-850 pb-3">
            Order Summary
          </h2>

          <div className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Total Items</span>
              <span className="font-semibold text-white">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Shipping</span>
              <span className="text-emerald-400 font-semibold uppercase text-xs">Free</span>
            </div>
            <div className="border-t border-zinc-850 pt-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between font-black text-white text-base">
                <span>Total cost</span>
                <span className="text-lg text-violet-400">{cartTotal.display}</span>
              </div>
              {cartTotal.hasMagical && (
                <p className="text-[10px] text-zinc-500 text-right">
                  Same letter amounts are summed (e.g. 8g + 2g → 10g).
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleCreateTicket}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/15"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            )}
            Create Ticket
          </button>

          <p className="text-[11px] text-zinc-500 text-center leading-normal">
            Creating a ticket submits your order to the administrative portal for approval.
          </p>
        </div>
      </div>
    </div>
  );
}
