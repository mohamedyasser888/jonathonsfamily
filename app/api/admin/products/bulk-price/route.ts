import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMagicalPrice } from "@/lib/magical-price";

export async function POST(request: NextRequest) {
  try {
    console.log("[api/products/bulk-price] POST request received");
    const session = await getAdminSession();
    if (!session) {
      console.log("[api/products/bulk-price] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collection_id, price } = await request.json();
    console.log("[api/products/bulk-price] Request body:", { collection_id, price });

    if (!collection_id) {
      console.log("[api/products/bulk-price] Error: collection_id required");
      return NextResponse.json(
        { error: "collection_id is required" },
        { status: 400 }
      );
    }

    // If price is already numeric, use it directly. Otherwise parse magical format.
    let numericPrice: number;
    let displayPrice: string;

    if (typeof price === 'number') {
      numericPrice = price;
      displayPrice = String(price);
      console.log("[api/products/bulk-price] Price is numeric:", numericPrice);
    } else {
      const parsedPrice = parseMagicalPrice(price);
      if (!parsedPrice.valid) {
        console.log("[api/products/bulk-price] Invalid price:", parsedPrice.error);
        return NextResponse.json({ error: parsedPrice.error }, { status: 400 });
      }
      numericPrice = parsedPrice.numeric;
      displayPrice = parsedPrice.storage;
      console.log("[api/products/bulk-price] Parsed price numeric:", numericPrice);
      console.log("[api/products/bulk-price] Parsed price display:", displayPrice);
    }

    const supabase = createAdminClient();
    console.log("[api/products/bulk-price] Updating products in collection:", collection_id);

    const { data, error } = await supabase
      .from("products")
      .update({ price: numericPrice, updated_at: new Date().toISOString() })
      .eq("collection_id", collection_id)
      .select("id");

    if (error) {
      console.error("[api/products/bulk-price] Update error:", error);
      console.error("[api/products/bulk-price] Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log("[api/products/bulk-price] Updated products:", data?.length ?? 0);

    return NextResponse.json({
      updated: data?.length ?? 0,
      price: displayPrice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/products/bulk-price] Error:", error);
    console.error("[api/products/bulk-price] Error message:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
