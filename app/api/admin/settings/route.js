import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const settings = await prisma.facilitySetting.findUnique({ where: { id: "singleton" } });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Get admin settings error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil pengaturan fasilitas" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await requireRole("ADMIN");

    const existing = await prisma.facilitySetting.findUnique({ where: { id: "singleton" } });

    const body = await request.json().catch(() => ({}));
    const facilityName =
      typeof body.facilityName === "string" && body.facilityName.trim()
        ? body.facilityName.trim()
        : existing?.facilityName ?? "";
    const tagline = body.tagline !== undefined ? body.tagline : existing?.tagline ?? null;
    const address = body.address !== undefined ? body.address : existing?.address ?? null;
    const phone = body.phone !== undefined ? body.phone : existing?.phone ?? null;
    const logoKey = body.logoKey !== undefined ? body.logoKey || null : existing?.logoKey ?? null;
    const primaryColor =
      typeof body.primaryColor === "string" && body.primaryColor
        ? body.primaryColor
        : existing?.primaryColor ?? "#0f766e";
    const openingNote = body.openingNote !== undefined ? body.openingNote : existing?.openingNote ?? null;

    if (!facilityName) {
      return NextResponse.json({ success: false, error: "Nama fasilitas wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.facilitySetting.upsert({
      where: { id: "singleton" },
      update: { facilityName, tagline, address, phone, logoKey, primaryColor, openingNote },
      create: { id: "singleton", facilityName, tagline, address, phone, logoKey, primaryColor, openingNote },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "FacilitySetting",
      entityId: updated.id,
      summary: `Mengubah pengaturan fasilitas ${updated.facilityName}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Update settings error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengubah pengaturan fasilitas" }, { status: 500 });
  }
}
