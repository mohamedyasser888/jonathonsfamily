import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseCollectionImages,
  productNameFromFileName,
  productNameFromImageUrl,
} from "@/lib/collection-folder";
import { parseMagicalPrice } from "@/lib/magical-price";
import { deleteStorageObjects } from "@/lib/admin-storage";
import { isValidCollectionAvailability } from "@/lib/collection-availability";

type RouteContext = { params: Promise<{ id: string }> };

async function syncProductsFromFolder(
  supabase: ReturnType<typeof createAdminClient>,
  collectionId: string,
  collectionName: string,
  imageUrls: string[],
  imageNames: string[],
  price: string
) {
  console.log("[syncProducts] Starting sync for collection:", collectionId);
  console.log("[syncProducts] Image URLs:", imageUrls);
  console.log("[syncProducts] Image names:", imageNames);
  console.log("[syncProducts] Price (magical format):", price);

  // Parse the magical price to get numeric value
  const priceParsed = parseMagicalPrice(price);
  if (!priceParsed.valid) {
    throw new Error(`Invalid price format: ${priceParsed.error}`);
  }
  const numericPrice = priceParsed.numeric;
  console.log("[syncProducts] Numeric price:", numericPrice);

  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("id, image_url")
    .eq("collection_id", collectionId);

  if (fetchError) {
    console.error("[syncProducts] Error fetching existing products:", fetchError);
    throw fetchError;
  }

  console.log("[syncProducts] Existing products:", existing?.length || 0);
  const existingUrls = new Set((existing ?? []).map((p) => p.image_url));
  const toInsert = imageUrls
    .filter((url) => url && !existingUrls.has(url))
    .map((url, index) => {
      const name =
        imageNames[index]?.trim() ||
        productNameFromImageUrl(url);
      return {
        collection_id: collectionId,
        name: name || `${collectionName} — ${index + 1}`,
        description: `From folder ${collectionName}`,
        image_url: url,
        price: numericPrice,
      };
    });

  console.log("[syncProducts] Products to insert:", toInsert.length);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("products").insert(toInsert);
    if (error) {
      console.error("[syncProducts] Error inserting products:", error);
      throw error;
    }
  }

  return toInsert.length;
}

/** Append folder pictures + sync products */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const {
      images = [],
      image_names = [],
      default_price,
      sync_only,
      remove_image_urls = [],
      publish,
      availability_status,
    } = body as {
      images?: string[];
      image_names?: string[];
      default_price?: string | number;
      sync_only?: boolean;
      remove_image_urls?: string[];
      publish?: boolean;
      availability_status?: string;
    };

    const supabase = createAdminClient();
    const { data: collection, error: fetchError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !collection) {
      console.error("[api/collections/[id]] Collection not found:", fetchError);
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    console.log("[api/collections/[id]] Collection found:", collection.name);
    console.log("[api/collections/[id]] Collection images:", collection.images);

    if (availability_status !== undefined) {
      if (!isValidCollectionAvailability(availability_status)) {
        return NextResponse.json(
          { error: "Invalid availability_status (normal, leaving_soon, left)" },
          { status: 400 }
        );
      }

      if (collection.published === false) {
        return NextResponse.json(
          { error: "Publish the collection before setting store status" },
          { status: 400 }
        );
      }

      const { data: updated, error: statusError } = await supabase
        .from("collections")
        .update({
          availability_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (statusError) throw statusError;

      return NextResponse.json(updated);
    }

    if (publish === true) {
      const { data: updated, error: pubError } = await supabase
        .from("collections")
        .update({
          published: true,
          availability_status: "normal",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (pubError) throw pubError;

      return NextResponse.json({
        ...updated,
        published: true,
        message: "Collection is now live for users.",
      });
    }

    if (Array.isArray(remove_image_urls) && remove_image_urls.length > 0) {
      const toRemove = new Set(remove_image_urls.filter(Boolean));
      let mergedImages = parseCollectionImages(collection.images).filter(
        (url) => !toRemove.has(url)
      );

      for (const url of toRemove) {
        const { error: prodErr } = await supabase
          .from("products")
          .delete()
          .eq("collection_id", id)
          .eq("image_url", url);
        if (prodErr) throw prodErr;
      }

      await deleteStorageObjects(supabase, [...toRemove]);

      let cover = collection.image_url;
      if (cover && toRemove.has(cover)) {
        cover = mergedImages[0] || null;
      }

      const { error: updateError } = await supabase
        .from("collections")
        .update({
          images: mergedImages,
          image_url: cover,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return NextResponse.json({
        collection_id: id,
        images: mergedImages,
        removed: toRemove.size,
      });
    }

    const priceParsed = parseMagicalPrice(
      default_price !== undefined && default_price !== null && default_price !== ""
        ? String(default_price)
        : "k"
    );
    if (!priceParsed.valid) {
      return NextResponse.json({ error: priceParsed.error }, { status: 400 });
    }
    const price = priceParsed.storage;

    let mergedImages = parseCollectionImages(collection.images);
    console.log("[api/collections/[id]] Parsed images:", mergedImages);

    if (!sync_only && images.length > 0) {
      mergedImages = [...new Set([...mergedImages, ...images])];
      const { error: updateError } = await supabase
        .from("collections")
        .update({
          images: mergedImages,
          image_url: collection.image_url || mergedImages[0] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("[api/collections/[id]] Error updating collection:", updateError);
        throw updateError;
      }
    }

    const urlsToSync = sync_only ? mergedImages : images;
    console.log("[api/collections/[id]] URLs to sync:", urlsToSync);
    const namesForNew = sync_only
      ? mergedImages.map((url) => productNameFromImageUrl(url))
      : image_names.map((n, i) =>
          n?.trim()
            ? productNameFromFileName(n)
            : productNameFromImageUrl(images[i] || "")
        );

    const created = await syncProductsFromFolder(
      supabase,
      id,
      collection.name,
      urlsToSync,
      namesForNew,
      price
    );

    return NextResponse.json({
      collection_id: id,
      images: mergedImages,
      products_created: created,
    });
  } catch (error: unknown) {
    console.error("[api/collections/[id]] PATCH error:", error);
    console.error("[api/collections/[id]] Error type:", typeof error);
    console.error("[api/collections/[id]] Error string:", String(error));
    
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = JSON.stringify(error);
    }
    
    console.error("[api/collections/[id]] Error details:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Delete entire collection, its products, and storage images */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createAdminClient();

    const { data: collection, error: fetchError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const urls = new Set<string>(parseCollectionImages(collection.images));
    if (collection.image_url) urls.add(collection.image_url);

    const { data: products } = await supabase
      .from("products")
      .select("image_url")
      .eq("collection_id", id);
    for (const p of products ?? []) {
      if (p.image_url) urls.add(p.image_url);
    }

    await deleteStorageObjects(supabase, [...urls]);

    const { error: deleteError } = await supabase
      .from("collections")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ deleted: true, collection_id: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/collections/[id]] DELETE", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
