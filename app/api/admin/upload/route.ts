import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  contentTypeForUpload,
  imageExtension,
  isImageFile,
} from "@/lib/image-files";

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role), then restart npm run dev.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isImageFile(file)) {
      return NextResponse.json(
        { error: "File must be an image (jpg, png, webp, heic, tiff, etc.)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = imageExtension(file.name) || "jpg";
    const contentType = contentTypeForUpload(file);
    const fileName = `upload-${Date.now()}.${fileExt}`;
    const filePath = `catalog/${fileName}`;

    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("jonathon-images")
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[api/upload] Storage upload failed:", uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("jonathon-images")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicData.publicUrl });
  } catch (error: any) {
    console.error("[api/upload] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image. Ensure bucket is public." },
      { status: 500 }
    );
  }
}
