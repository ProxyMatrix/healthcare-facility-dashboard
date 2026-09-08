import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, HttpError } from "@/lib/auth";
import { validateImageFile } from "@/lib/validate";
import { uploadObject } from "@/lib/minio";

export const dynamic = "force-dynamic";

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request) {
  try {
    await requireRole("STAFF");

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "File wajib diunggah" }, { status: 400 });
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const sanitizedName = sanitizeFileName(file.name || "foto");
    const objectKey = `doctors/${randomUUID()}-${sanitizedName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject(objectKey, buffer, file.type);

    // Kembalikan objectKey saja, BUKAN URL penuh -- URL dibangun di runtime
    // oleh getPublicUrl() saat data ditampilkan (lihat CLAUDE.md bagian 5).
    return NextResponse.json({ success: true, data: { objectKey } }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengunggah file" }, { status: 500 });
  }
}
