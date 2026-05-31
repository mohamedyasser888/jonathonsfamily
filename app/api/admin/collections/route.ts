import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  productNameFromFileName,
  productNameFromImageUrl,
} from "@/lib/collection-folder";
import { parseMagicalPrice } from "@/lib/magical-price";

const DEFAULT_ITEM_PRICE = "k";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/collections] GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      image_url,
      images,
      image_names,
      default_price,
      gallery_only,
    } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Collection folder name is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const priceParsed = parseMagicalPrice(
      default_price !== undefined && default_price !== null && default_price !== ""
        ? String(default_price)
        : DEFAULT_ITEM_PRICE
    );
    if (!priceParsed.valid) {
      return NextResponse.json({ error: priceParsed.error }, { status: 400 });
    }
    const price = priceParsed.storage;

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or("email.eq.admin,email.eq.admin@jonathon.com")
      .limit(1);

    let createdBy = "";
    if (adminProfiles?.length) {
      createdBy = adminProfiles[0].id;
    } else {
      const { data: anyProfiles } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      if (anyProfiles?.length) {
        createdBy = anyProfiles[0].id;
      } else {
        return NextResponse.json(
          {
            error:
              "No user profiles found. Register one user first (acts as collection owner).",
          },
          { status: 400 }
        );
      }
    }

    const gallery: string[] = Array.isArray(images) ? images : [];
    const names: string[] = Array.isArray(image_names) ? image_names : [];

    const cover =
      image_url?.trim() || (gallery.length > 0 ? gallery[0] : null);

    const { data: collection, error } = await supabase
      .from("collections")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        image_url: cover,
        images: gallery,
        created_by: createdBy,
        published: !gallery_only,
      })
      .select()
      .single();

    if (error) {
      console.error("[api/collections] Insert error:", error);
      throw error;
    }

    if (gallery.length > 0 && !gallery_only) {
      const products = gallery.map((url, index) => {
        const label =
          names[index]?.trim()
            ? productNameFromFileName(names[index])
            : productNameFromImageUrl(url);
        return {
          collection_id: collection.id,
          name: label || `${name.trim()} — ${index + 1}`,
          description: description?.trim() || `From folder ${name.trim()}`,
          image_url: url,
          price,
        };
      });

      const { error: productsError } = await supabase
        .from("products")
        .insert(products);

      if (productsError) {
        console.error("[api/collections] Product auto-create error:", productsError);
      }
    }

    return NextResponse.json({
      ...collection,
      items_in_folder: gallery.length,
      gallery_only: Boolean(gallery_only),
      published: !gallery_only,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/collections] POST error:", message);
    return NextResponse.json(
      { error: message || "Failed to create collection." },
      { status: 500 }
    );
  }
}
