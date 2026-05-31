import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteStorageObjects } from "@/lib/admin-storage";
import { parseCollectionImages } from "@/lib/collection-folder";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createAdminClient();

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("id, image_url, collection_id")
      .eq("id", id)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { data: collection } = await supabase
      .from("collections")
      .select("images, image_url")
      .eq("id", product.collection_id)
      .maybeSingle();

    if (collection) {
      const gallery = parseCollectionImages(collection.images).filter(
        (url) => url !== product.image_url
      );
      let cover = collection.image_url;
      if (cover === product.image_url) {
        cover = gallery[0] || null;
      }

      await supabase
        .from("collections")
        .update({
          images: gallery,
          image_url: cover,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.collection_id);
    }

    if (product.image_url) {
      await deleteStorageObjects(supabase, [product.image_url]);
    }

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ deleted: true, product_id: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/products/[id]] DELETE", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
