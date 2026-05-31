import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMagicalPrice } from "@/lib/magical-price";

// GET: Retrieve all products
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[api/products] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new product
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, image_url, price, collection_id } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    if (!image_url?.trim()) {
      return NextResponse.json({ error: "Product image is required" }, { status: 400 });
    }

    if (!collection_id) {
      return NextResponse.json({ error: "Product collection is required" }, { status: 400 });
    }

    const parsedPrice = parseMagicalPrice(price);
    if (!parsedPrice.valid) {
      return NextResponse.json({ error: parsedPrice.error }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        image_url: image_url.trim(),
        price: parsedPrice.storage,
        collection_id: collection_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[api/products] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create product. Make sure policies are configured." },
      { status: 500 }
    );
  }
}
